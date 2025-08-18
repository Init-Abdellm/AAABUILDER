Templates
=========

Browse
```bash
npm run templates
```

Create project
```bash
npm run create           # interactive
aaab-create list         # list via CLI
aaab-create new basic-chatbot my-bot
```

Template anatomy
- Agent: `agents/<name>.agent`
- README & config guidance
- Example inputs

Locations
- Top-level `templates/` directory enumerates available templates.
- Scaffolder definitions live in `src/scaffolding/ProjectScaffolder.ts`.

