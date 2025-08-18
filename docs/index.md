AAABuilder — Agent as a Backend
================================

AAABuilder is a TypeScript-first framework that turns agent workflows into production-grade backend APIs. Define automation in a [`.agent`](agent.md) file, and AAABuilder parses, validates, and executes it via a unified provider system (LLMs, Computer Vision, Audio, Traditional ML), with debugging, testing, and documentation generation built-in.

Core value
- **Infra-as-code for agents**: Versioned, reviewable [`.agent`](agent.md) files are the contract.
- **Unified providers**: Route tasks across OpenAI, Gemini, Hugging Face, Ollama, LLaMA, and traditional ML/CV/audio providers via one interface.
- **Operational rigor**: Validation, linting, auto-correction, optimized routing, health checks, and structured logging.

Quick links
- Getting Started → `quickstart.md`
- CLI Reference → `cli.md`
- Architecture → `architecture.md`
- Providers → `providers.md`
- Parser & Agent Format → `parser.md`
- Examples & Templates → `examples.md`, `templates.md`
- HTTP Server & API → `server.md`

What’s included
- Parser, Validator, Linter, Suggestor, Corrector
- Orchestrator and Templated Renderer
- Unified Provider Router and Model Registry
- Debugger, Playground, Testing framework
- Documentation generator and project scaffolding

Requirements
- Node.js >= 18, npm >= 8

Repository layout (high-level)
```
src/
  providers/         # Unified provider system (Router, Registry, Optimizer)
  parser/            # Enhanced parser for .agent files
  documentation/     # Docs generator CLI
  debugging/         # Step-by-step debugger & playground
  scaffolding/       # Project scaffolding CLI & templates
lib/                 # Compiled JS (runtime CLI and server)
bin/aaab.js          # CLI entrypoint
examples/            # Example agent usage
templates/           # Starter agent templates
```

License
- Apache-2.0

