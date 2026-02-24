import { Injectable } from '@angular/core';
import { Exchange } from '../models/exchange.model';

@Injectable({ providedIn: 'root' })
export class ExportService {
    exportToMarkdown(exchanges: Exchange[]): void {
        const lines: string[] = [];
        lines.push('# OpenAI API Proxy – Session Export');
        lines.push('');
        lines.push(`*Exported: ${new Date().toLocaleString()}*`);
        lines.push('');
        lines.push('---');
        lines.push('');

        for (const ex of exchanges) {
            lines.push(`## [${ex.id}] ${ex.method} ${ex.path}`);
            lines.push('');
            lines.push(`**Timestamp:** ${new Date(ex.timestamp).toLocaleString()}`);
            if (ex.duration !== null) {
                lines.push(`**Duration:** ${ex.duration}ms`);
            }
            lines.push('');

            // Request
            lines.push('### Request');
            lines.push('');
            lines.push('**Headers:**');
            lines.push('```json');
            lines.push(JSON.stringify(ex.requestHeaders, null, 2));
            lines.push('```');
            lines.push('');
            if (ex.requestBody) {
                lines.push('**Body:**');
                lines.push('```json');
                lines.push(typeof ex.requestBody === 'string' ? ex.requestBody : JSON.stringify(ex.requestBody, null, 2));
                lines.push('```');
                lines.push('');
            }

            // Response
            lines.push('### Response');
            lines.push('');
            lines.push(`**Status:** ${ex.responseStatus ?? 'N/A'}`);
            lines.push('');
            if (ex.responseBody) {
                lines.push('**Body:**');
                lines.push('```json');
                try {
                    const bodyStr = typeof ex.responseBody === 'string'
                        ? ex.responseBody
                        : JSON.stringify(ex.responseBody, null, 2);
                    lines.push(bodyStr);
                } catch {
                    lines.push(String(ex.responseBody));
                }
                lines.push('```');
                lines.push('');
            }

            // Tool calls
            if (ex.toolCalls && ex.toolCalls.length > 0) {
                lines.push('### Tool Calls');
                lines.push('');
                for (const tc of ex.toolCalls) {
                    lines.push(`#### \`${tc.function?.name ?? 'unknown'}\``);
                    lines.push('');
                    if (tc.function?.arguments) {
                        lines.push('**Arguments:**');
                        lines.push('```json');
                        try {
                            lines.push(JSON.stringify(JSON.parse(tc.function.arguments), null, 2));
                        } catch {
                            lines.push(tc.function.arguments);
                        }
                        lines.push('```');
                    }
                    lines.push('');
                }
            }

            lines.push('---');
            lines.push('');
        }

        const content = lines.join('\n');
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proxy-session-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
