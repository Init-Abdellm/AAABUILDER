Getting Started
===============

Prerequisites
- Node.js >= 18
- npm >= 8

Install (local clone)
```bash
git clone https://github.com/<your-org>/AAABuilder
cd AAABuilder
npm install
npm run build
```

Run the minimal HTTP server
```bash
npm start
# or
npm run serve
```

Generate docs
```bash
npm run docs         # markdown
npm run docs:html    # HTML
npm run docs:openapi # OpenAPI
```

Create a new project from a template
```bash
npm run templates
npm run create       # interactive creator
```

Your first agent
Create `agents/hello.agent`:
```yaml
@agent hello v1
description: "Hello agent"

trigger:
  type: http
  method: POST
  path: /hello

secrets:
  - name: OPENAI_API_KEY
    type: env
    value: OPENAI_API_KEY

vars:
  message:
    type: input
    from: body
    required: true

steps:
  - id: reply
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: |
      Respond cheerfully to: {message}
    save: response

outputs:
  response: "{response}"
@end
```

Start server and test
```bash
npm start
curl -X POST http://localhost:5000/hello -H "Content-Type: application/json" -d '{"message":"Hi"}'
```

