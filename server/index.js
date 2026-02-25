'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const fetch = require('node-fetch');

const exchanges = [];
let nextId = 1;
const wssClients = new Set();

function broadcast(data) {
    const msg = JSON.stringify(data);
    for (const client of wssClients) {
        if (client.readyState === 1 /* OPEN */) {
            client.send(msg);
        }
    }
}

function startServer(port) {
    const app = express();
    const server = http.createServer(app);

    // WebSocket server attached to same HTTP server
    const wss = new WebSocketServer({ server });
    wss.on('connection', (ws) => {
        wssClients.add(ws);
        ws.on('close', () => wssClients.delete(ws));
    });

    app.use(cors());

    // Raw body capture for proxy routes BEFORE bodyParser
    app.use('/v1', (req, res, next) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
            req.rawBody = Buffer.concat(chunks);
            req.body = req.rawBody.length > 0 ? (() => {
                try { return JSON.parse(req.rawBody.toString('utf8')); } catch { return req.rawBody.toString('utf8'); }
            })() : {};
            next();
        });
    });

    // Proxy handler for /v1/*
    app.all('/v1/*', async (req, res) => {
        const target = process.env.PROXY_TARGET
        if (!target) {
            res.status(500).json({ error: 'PROXY_TARGET not set' });
            return;
        }
        const upstreamUrl = `${target}${req.originalUrl}`;
        console.log(`Proxying to: ${upstreamUrl}`);

        const requestHeaders = { ...req.headers };
        delete requestHeaders['host'];

        const requestBody = req.rawBody && req.rawBody.length > 0 ? req.rawBody : undefined;
        const isStream = req.body && req.body.stream === true;

        const exchange = {
            id: nextId++,
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl,
            requestHeaders,
            requestBody: req.body,
            responseStatus: null,
            responseHeaders: {},
            responseBody: null,
            responseBodyRaw: '',
            toolCalls: [],
            duration: null,
            isStream,
        };

        const startTime = Date.now();

        try {
            const upstreamRes = await fetch(upstreamUrl, {
                method: req.method,
                headers: requestHeaders,
                body: requestBody,
            });

            exchange.responseStatus = upstreamRes.status;
            exchange.responseHeaders = Object.fromEntries(upstreamRes.headers.entries());

            // Copy status and headers to client
            res.status(upstreamRes.status);
            for (const [key, value] of upstreamRes.headers.entries()) {
                // Don't copy transfer-encoding to avoid issues
                if (key.toLowerCase() !== 'transfer-encoding') {
                    res.setHeader(key, value);
                }
            }

            const contentType = upstreamRes.headers.get('content-type') || '';

            if (isStream || contentType.includes('text/event-stream')) {
                // Streaming SSE response
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                const chunks = [];
                upstreamRes.body.on('data', (chunk) => {
                    chunks.push(chunk);
                    res.write(chunk);
                });

                upstreamRes.body.on('end', () => {
                    res.end();
                    exchange.duration = Date.now() - startTime;
                    const fullText = Buffer.concat(chunks).toString('utf8');
                    exchange.responseBodyRaw = fullText;
                    exchange.responseBody = parseSSEBody(fullText);
                    exchange.toolCalls = extractToolCalls(exchange.responseBody);
                    addExchange(exchange);
                });

                upstreamRes.body.on('error', (err) => {
                    res.end();
                    exchange.duration = Date.now() - startTime;
                    exchange.responseBody = { error: err.message };
                    addExchange(exchange);
                });
            } else {
                // Non-streaming response
                const buffer = await upstreamRes.buffer();
                res.send(buffer);
                exchange.duration = Date.now() - startTime;

                const text = buffer.toString('utf8');
                exchange.responseBodyRaw = text;
                try {
                    exchange.responseBody = JSON.parse(text);
                } catch {
                    exchange.responseBody = text;
                }
                exchange.toolCalls = extractToolCalls(exchange.responseBody);
                addExchange(exchange);
            }
        } catch (err) {
            exchange.duration = Date.now() - startTime;
            exchange.responseStatus = 502;
            exchange.responseBody = { error: err.message };
            addExchange(exchange);
            if (!res.headersSent) {
                res.status(502).json({ error: err.message });
            }
        }
    });

    // REST API for stored exchanges
    app.use(bodyParser.json());
    app.get('/api/exchanges', (req, res) => res.json(exchanges));
    app.get('/api/exchanges/:id', (req, res) => {
        const ex = exchanges.find((e) => e.id === parseInt(req.params.id));
        if (!ex) return res.status(404).json({ error: 'Not found' });
        res.json(ex);
    });

    // Serve Angular static files
    const uiDist = path.join(__dirname, '..', 'ui', 'dist', 'ui', 'browser');
    app.use(express.static(uiDist));
    app.get('*', (req, res) => {
        res.sendFile(path.join(uiDist, 'index.html'));
    });

    server.listen(port, () => {
        console.log(`\n  🚀  OpenAI API Proxy running at http://localhost:${port}`);
        console.log(`  Proxying to: ${process.env.PROXY_TARGET}`);
        console.log(`  Open http://localhost:${port} in your browser to view the UI\n`);
    });

    return server;
}

function addExchange(exchange) {
    exchanges.push(exchange);
    broadcast({ type: 'exchange', data: sanitizeExchange(exchange) });
}

function sanitizeExchange(ex) {
    // Limit very large bodies for websocket broadcast
    return {
        ...ex,
        responseBodyRaw: undefined,
    };
}

function parseSSEBody(raw) {
    const lines = raw.split('\n');
    const messages = [];
    for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
                messages.push(JSON.parse(line.slice(6)));
            } catch { /* skip */ }
        }
    }
    return messages.length > 0 ? messages : raw;
}

function extractToolCalls(body) {
    if (!body) return [];
    const calls = [];

    const extractFromChoice = (choice) => {
        if (choice && choice.message && choice.message.tool_calls) {
            calls.push(...choice.message.tool_calls);
        }
        if (choice && choice.delta && choice.delta.tool_calls) {
            calls.push(...choice.delta.tool_calls);
        }
    };

    if (Array.isArray(body)) {
        body.forEach((chunk) => {
            if (chunk.choices) chunk.choices.forEach(extractFromChoice);
        });
    } else if (body && body.choices) {
        body.choices.forEach(extractFromChoice);
    }

    return calls;
}

module.exports = { startServer };
