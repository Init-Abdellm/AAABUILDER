HTTP Server & API
=================

Start server
```bash
npm start
# or
aaab serve --port 5000
```

Servers
- Minimal server: `lib/server/simple-server.js`
- Express server: `lib/server/express-server.js`

Agent routes
- Each HTTP-triggered agent becomes an endpoint (e.g., `POST /<path>` from agent `trigger` section).
- Request body/headers map to `vars` via `type: input` and `from` selectors.

Response mapping
- `outputs` section defines response fields; orchestrator injects saved step results.

