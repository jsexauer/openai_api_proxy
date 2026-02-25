import { Injectable } from '@angular/core';
import { Exchange } from '../models/exchange.model';

@Injectable({ providedIn: 'root' })
export class ExportService {
    exportToMarkdown(exchange: Exchange): void {
        const lines: string[] = [];
        lines.push('# OpenAI API Proxy – Conversation Export');
        lines.push('');
        lines.push(`*Exported: ${new Date().toLocaleString()}*`);
        lines.push('');
        lines.push('---');
        lines.push('');

        lines.push(`## [${exchange.id}] ${exchange.method} ${exchange.path}`);
        lines.push(`**Timestamp:** ${new Date(exchange.timestamp).toLocaleString()}`);
        if (exchange.duration !== null) {
            lines.push(`**Duration:** ${exchange.duration}ms`);
        }
        lines.push(`**Status:** ${exchange.responseStatus ?? 'N/A'}`);
        lines.push('');

        // Extract conversation messages
        let messages: any[] = [];
        const reqBody = exchange.requestBody;
        if (reqBody && typeof reqBody === 'object' && reqBody.messages) {
            messages = [...reqBody.messages];
        }

        // Add response to the conversation if it exists
        const resBody = exchange.responseBody;
        if (resBody && typeof resBody === 'object' && resBody.choices && resBody.choices.length > 0) {
            const choice = resBody.choices[0];
            if (choice.message) {
                messages.push(choice.message);
            }
        }

        if (messages.length > 0) {
            lines.push('## Conversation');
            lines.push('');

            for (const msg of messages) {
                let role = msg.role || 'unknown';
                lines.push(`### ${role.toUpperCase()}`);
                lines.push('');

                if (msg.content) {
                    if (typeof msg.content === 'string') {
                        lines.push(msg.content);
                    } else if (Array.isArray(msg.content)) {
                        for (const part of msg.content) {
                            if (part.type === 'text') {
                                lines.push(part.text);
                            } else if (part.type === 'image_url') {
                                lines.push(`*[Image]* \`${part.image_url?.url}\``);
                            } else {
                                lines.push('```json');
                                lines.push(JSON.stringify(part, null, 2));
                                lines.push('```');
                            }
                        }
                    } else {
                        lines.push('```json');
                        lines.push(JSON.stringify(msg.content, null, 2));
                        lines.push('```');
                    }
                    lines.push('');
                }

                if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
                    for (const call of msg.tool_calls) {
                        lines.push(`**🔧 Tool Call:** \`${call.function?.name}\``);
                        lines.push('');
                        lines.push('**Arguments:**');
                        lines.push('```json');
                        try {
                            lines.push(JSON.stringify(JSON.parse(call.function?.arguments || '{}'), null, 2));
                        } catch {
                            lines.push(call.function?.arguments || '');
                        }
                        lines.push('```');
                        lines.push('');
                    }
                }

                if (msg.tool_call_id) {
                    lines.push(`*(Responding to tool call)*`);
                    lines.push('');
                }
            }
        }

        // Raw Request & Response if there are no messages, or just as a collapsible section
        lines.push('## Raw Data');
        lines.push('');

        lines.push('<details><summary><b>Request Headers</b></summary>');
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(exchange.requestHeaders, null, 2));
        lines.push('```');
        lines.push('</details>');
        lines.push('');

        if (reqBody) {
            lines.push('<details><summary><b>Request Body</b></summary>');
            lines.push('');
            lines.push('```json');
            lines.push(typeof reqBody === 'string' ? reqBody : JSON.stringify(reqBody, null, 2));
            lines.push('```');
            lines.push('</details>');
            lines.push('');
        }

        if (resBody) {
            lines.push('<details><summary><b>Response Body</b></summary>');
            lines.push('');
            lines.push('```json');
            try {
                const bodyStr = typeof resBody === 'string'
                    ? resBody
                    : JSON.stringify(resBody, null, 2);
                lines.push(bodyStr);
            } catch {
                lines.push(String(resBody));
            }
            lines.push('```');
            lines.push('</details>');
            lines.push('');
        }

        const content = lines.join('\n');
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // sanitize title for filename
        const filenameSafeTime = new Date(exchange.timestamp).toISOString().replace(/[:.]/g, '-');
        a.download = `conversation-${exchange.id}-${filenameSafeTime}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
