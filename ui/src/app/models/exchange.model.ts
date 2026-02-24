export interface Exchange {
    id: number;
    timestamp: string;
    method: string;
    path: string;
    requestHeaders: Record<string, string>;
    requestBody: any;
    responseStatus: number | null;
    responseHeaders: Record<string, string>;
    responseBody: any;
    toolCalls: ToolCall[];
    duration: number | null;
    isStream: boolean;
}

export interface ToolCall {
    id?: string;
    type?: string;
    function?: {
        name: string;
        arguments: string;
    };
}
