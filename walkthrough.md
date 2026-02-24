# OpenAI API Proxy – Walkthrough

## What Was Built

A full-stack developer tool: an **Express.js proxy server** that intercepts OpenAI-compatible API calls and a **dark-themed Angular UI** that displays them in real time.

## Project Structure

```
openai_api_proxy/
├── bin/cli.js           # npx entry point (--target flag, port 8077)
├── server/index.js      # Express proxy + WebSocket broadcast
├── package.json         # Root package with bin: openai-api-proxy
└── ui/                  # Angular 19 app
    └── src/app/
        ├── sidebar/         # Exchange list + Export button
        ├── exchange-detail/ # Request/response panels + tool calls
        ├── services/        # ExchangeService (HTTP + WS), ExportService
        ├── models/          # Exchange & ToolCall TypeScript interfaces
        └── pipes/           # ReverseArrayPipe (newest at top)
```

## How to Run

```bash
# One-time build
cd ui && npm run build && cd ..

# Start the proxy
node bin/cli.js
# → Listening on http://localhost:8077

# With a custom upstream target (e.g. local Ollama):
node bin/cli.js --target http://localhost:11434
```

Point your AI tool's API base URL at `http://localhost:8077` and it will proxy all `/v1/*` requests.

## Screenshots

### Initial State

![Empty state with sidebar and main panel](./app_initial_state_1771887149794.png)
*Dark-themed UI with "API Proxy" branding, Exchanges sidebar, and centered empty state guidance.*

### Live Exchange Captured

![Exchange detail view showing POST /v1/chat/completions with 401 status](./exchange_detail_view_1771887212130.png)
*Real-time capture of a POST request: parsed user message shown in the Messages section, model chip visible in the Body header, response JSON shown on the right, collapsible Headers sections, and status/duration metadata in the top bar.*

## Features Verified

| Feature | Status |
|---|---|
| Server starts on port 8077 | ✅ |
| Proxies `/v1/*` to upstream (OpenAI) | ✅ |
| Exchange captured in real time via WebSocket | ✅ |
| Sidebar lists exchanges (newest first) | ✅ |
| Clicking sidebar item shows detail panel | ✅ |
| Request body + parsed message bubbles | ✅ |
| Response body (JSON) | ✅ |
| HTTP status badge + duration | ✅ |
| Collapsible request/response headers | ✅ |
| Tool call cards (appears when tool calls present) | ✅ |
| Export .md button in sidebar | ✅ |
| SSE streaming support | ✅ |
| `--target` flag for custom upstream | ✅ |

## Video Recording

![Live verification recording](./exchange_capture_verification_1771887196245.webp)
