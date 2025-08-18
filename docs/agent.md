.agent file format
===================

The `.agent` file is the core contract of AAABuilder. It defines an end‑to‑end automation workflow declaratively: inputs, secrets, steps, routing, conditions, retries, and outputs. AAABuilder parses this file into an AST, validates and lint‑checks it, optionally auto‑corrects issues, and executes it via the unified provider system.

Why `.agent`?
- Single source of truth for automation and orchestration
- Versionable, reviewable, and testable like code
- Provider‑agnostic: same spec works across LLMs, Vision, Audio, and Traditional ML
- Portable across infrastructure (local, containers, CI/CD, cloud)

Minimal example
```yaml
@agent hello v1
description: "Say hello"

secrets:
  - name: OPENAI_API_KEY
    type: env
    value: OPENAI_API_KEY

variables:
  name:
    type: input
    path: name
    required: true

steps:
  - id: greet
    type: llm
    provider: openai
    model: gpt-4o
    prompt: "Greet {name} warmly"
    save: greeting

outputs:
  message: "{greeting}"
@end
```

Common sections
- `secrets`: declarative secret bindings (env, file, vault)
- `variables`: input contracts and validation
- `steps`: ordered operations of types: `llm`, `vision`, `audio`, `ml`, `http`, `condition`
- `parameters`: model/provider parameters per step
- `retry`/`timeout`: reliability controls per step
- `when` conditions and nested steps for branching
- `outputs`: explicit final outputs and formatting

Tooling
- Parser and validator: catches schema issues and best‑practice linting
- Debugger: step through execution, inspect variables and trace
- Tester: generate tests, benchmark performance
- Docs generator: produce reference docs for your agents

See also: `parser.md`, `providers.md`, `examples.md`, `templates.md`.


