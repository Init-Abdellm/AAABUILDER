Parser & Agent Format
=====================

Enhanced Parser
- `src/parser/enhanced-parser.ts` parses [`.agent`](agent.md) files to AST with error recovery, warnings, and validation.
- Supports sections: `description`, `trigger`, `secrets`, `vars`, `steps`, `outputs`.

Minimal example
```yaml
@agent chatbot v1
description: "AI-powered chatbot"

trigger:
  type: http
  method: POST
  path: /chat

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
  - id: chat
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: |
      Reply to: {message}
    save: response

outputs:
  response: "{response}"
@end
```

Validation pipeline
- Schema validation → linter rules → suggestions → auto-correct (safe defaults)

