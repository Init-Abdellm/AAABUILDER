Architecture
============

Overview
- [`.agent`](agent.md) files are parsed to an AST, validated, linted, optionally auto-corrected, then executed by the orchestrator.
- The provider router resolves tasks to concrete providers via the model registry and optimizer.
- Servers expose agents as HTTP endpoints; the playground and debugger support development.

Key components
- Parser (`src/parser/enhanced-parser.ts`): Tokenizes and parses [`.agent`](agent.md) with validation.
- Validator/Linter/Suggestor/Corrector (`lib/validate/*`): Safety and productivity tooling.
- Orchestrator (`lib/core/orchestrator.js`): Executes steps, when-conditions, retries, timeouts.
- Renderer (`lib/core/renderer.js`): Renders `{var}` placeholders from inputs and state.
- Secrets (`lib/core/secrets.js`): Resolves `env:VAR` and masks logs.
- Providers (`src/providers/*`): Unified capability routing across AI/ML backends.
- Model Registry (`src/providers/ModelRegistry.ts`): Provider registration, health checks, caching.
- Optimizer (`src/providers/ModelOptimizer.ts`): Caching/batching strategies.
- Router (`src/providers/ProviderRouter.ts`): Capability-based routing and fallbacks.
- Servers (`lib/server/*.js`): Minimal/Express servers to host agents.
- Scaffolding (`src/scaffolding/*`): Template-based project creation.
- Documentation (`src/documentation/*`): CLI to generate docs and OpenAPI.

Flow
1. Load [`.agent`](agent.md) file.
2. Parse → AST → validate/lint → correct if requested.
3. Register providers; health check and optimize.
4. Orchestrator executes steps; renderer injects variables; secrets are resolved; logs are structured.
5. Results are returned; outputs mapped to response.

