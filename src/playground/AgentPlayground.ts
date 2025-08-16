import * as readline from 'readline';
import { EnhancedAgentParser } from '../parser/enhanced-parser';
import { createProviderRouter, ProviderRouter } from '../providers';
import { AgentDebugger } from '../debug/AgentDebugger';
import { AgentTester } from '../testing/AgentTester';

/**
 * Playground Command
 */
export interface PlaygroundCommand {
    name: string;
    description: string;
    aliases?: string[];
    handler: (args: string[]) => Promise<void>;
}

/**
 * Agent Playground
 * Interactive development environment for agent files
 */
export class AgentPlayground {
    private rl: readline.Interface;
    private parser: EnhancedAgentParser;
    private providerRouter?: ProviderRouter;
    private debugger?: AgentDebugger;
    private tester?: AgentTester;
    private currentAgent?: string;
    private currentSession?: string;
    private commands: Map<string, PlaygroundCommand> = new Map();

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'agent> '
        });

        this.parser = new EnhancedAgentParser();
        this.setupCommands();
    }

    /**
     * Start the interactive playground
     */
    async start(): Promise<void> {
        console.log('🎮 AAABuilder Agent Playground');
        console.log('==============================');
        console.log('Interactive development environment for AI agents');
        console.log('Type "help" for available commands or "exit" to quit\n');

        // Initialize provider system
        try {
            console.log('🚀 Initializing provider system...');
            this.providerRouter = await createProviderRouter({
                scikitLearn: { enabled: true },
                whisper: { enabled: true },
                yolo: { enabled: true }
            });

            this.debugger = new AgentDebugger(this.providerRouter);
            this.tester = new AgentTester(this.providerRouter);

            console.log('✅ Provider system initialized\n');
        } catch (error) {
            console.warn('⚠️  Provider system initialization failed, using mock providers');
            this.debugger = new AgentDebugger();
            this.tester = new AgentTester();
        }

        this.rl.prompt();

        this.rl.on('line', async (input) => {
            const trimmed = input.trim();
            if (trimmed) {
                await this.handleCommand(trimmed);
            }
            this.rl.prompt();
        });

        this.rl.on('close', () => {
            console.log('\n👋 Goodbye!');
            process.exit(0);
        });
    }

    /**
     * Handle user command
     */
    private async handleCommand(input: string): Promise<void> {
        const [commandName, ...args] = input.split(' ');
        const command = this.commands.get(commandName.toLowerCase());

        if (command) {
            try {
                await command.handler(args);
            } catch (error) {
                console.error(`❌ Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } else {
            console.log(`❓ Unknown command: ${commandName}. Type "help" for available commands.`);
        }
    }

    /**
     * Setup available commands
     */
    private setupCommands(): void {
        // Help command
        this.addCommand({
            name: 'help',
            description: 'Show available commands',
            aliases: ['h', '?'],
            handler: async () => {
                console.log('\n📚 Available Commands:');
                console.log('=====================');

                for (const command of this.commands.values()) {
                    const aliases = command.aliases ? ` (${command.aliases.join(', ')})` : '';
                    console.log(`  ${command.name}${aliases} - ${command.description}`);
                }
                console.log();
            }
        });

        // Load agent command
        this.addCommand({
            name: 'load',
            description: 'Load an agent file',
            aliases: ['l'],
            handler: async (args) => {
                if (args.length === 0) {
                    console.log('Usage: load <file-path>');
                    return;
                }

                const filePath = args[0];
                try {
                    const fs = await import('fs/promises');
                    const content = await fs.readFile(filePath, 'utf-8');
                    this.currentAgent = content;
                    console.log(`✅ Loaded agent from: ${filePath}`);

                    // Parse and validate
                    const parseResult = this.parser.parse(content);
                    if (parseResult.ast) {
                        console.log(`   Agent ID: ${parseResult.ast.id}`);
                        console.log(`   Steps: ${parseResult.ast.steps.length}`);
                        console.log(`   Variables: ${Object.keys(parseResult.ast.vars).length}`);
                    } else {
                        console.log('⚠️  Agent has parse errors');
                    }
                } catch (error) {
                    console.error(`❌ Failed to load file: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        });

        // Create agent command
        this.addCommand({
            name: 'create',
            description: 'Create a new agent interactively',
            aliases: ['new'],
            handler: async () => {
                console.log('\n🆕 Creating new agent...');

                const agentId = await this.prompt('Agent ID: ');
                const description = await this.prompt('Description: ');

                const agentTemplate = `@agent ${agentId} v1
description: "${description}"

trigger:
  type: http
  method: POST
  path: /${agentId}

vars:
  message:
    type: input
    from: body
    required: true

steps:
  - id: process
    kind: llm
    provider: openai
    model: gpt-4o
    prompt: "Process this message: {message}"
    save: result

outputs:
  response: "{result}"
@end`;

                this.currentAgent = agentTemplate;
                console.log('✅ Agent template created');
                console.log('\nUse "show" to view the agent or "edit" to modify it');
            }
        });

        // Show agent command
        this.addCommand({
            name: 'show',
            description: 'Show current agent content',
            aliases: ['s'],
            handler: async () => {
                if (!this.currentAgent) {
                    console.log('❌ No agent loaded. Use "load" or "create" first.');
                    return;
                }

                console.log('\n📄 Current Agent:');
                console.log('=================');
                console.log(this.currentAgent);
                console.log();
            }
        });

        // Parse command
        this.addCommand({
            name: 'parse',
            description: 'Parse and validate current agent',
            aliases: ['p'],
            handler: async () => {
                if (!this.currentAgent) {
                    console.log('❌ No agent loaded. Use "load" or "create" first.');
                    return;
                }

                console.log('🔍 Parsing agent...');
                const parseResult = this.parser.parse(this.currentAgent);

                if (parseResult.ast) {
                    console.log('✅ Parse successful');
                    console.log(`   Agent ID: ${parseResult.ast.id}`);
                    console.log(`   Version: v${parseResult.ast.version}`);
                    console.log(`   Description: ${parseResult.ast.description || 'None'}`);
                    console.log(`   Steps: ${parseResult.ast.steps.length}`);
                    console.log(`   Variables: ${Object.keys(parseResult.ast.vars).length}`);
                    console.log(`   Outputs: ${Object.keys(parseResult.ast.outputs).length}`);
                } else {
                    console.log('❌ Parse failed');
                }

                if (parseResult.validation.errors.length > 0) {
                    console.log('\n❌ Errors:');
                    parseResult.validation.errors.forEach(error => {
                        console.log(`   Line ${error.line}: ${error.message}`);
                    });
                }

                if (parseResult.validation.warnings.length > 0) {
                    console.log('\n⚠️  Warnings:');
                    parseResult.validation.warnings.forEach(warning => {
                        console.log(`   Line ${warning.line}: ${warning.message}`);
                    });
                }
            }
        });

        // Debug command
        this.addCommand({
            name: 'debug',
            description: 'Start debugging session',
            aliases: ['d'],
            handler: async (args) => {
                if (!this.currentAgent || !this.debugger) {
                    console.log('❌ No agent loaded or debugger not available.');
                    return;
                }

                // Parse input
                const input: Record<string, any> = {};
                if (args.length > 0) {
                    try {
                        const inputStr = args.join(' ');
                        Object.assign(input, JSON.parse(inputStr));
                    } catch (error) {
                        console.log('⚠️  Invalid JSON input, using empty input');
                    }
                }

                try {
                    this.currentSession = await this.debugger.startDebugSession(this.currentAgent, input);
                    console.log(`🐛 Debug session started: ${this.currentSession}`);
                    console.log('Use "step", "continue", "vars", or "stop" to control debugging');
                } catch (error) {
                    console.error(`❌ Failed to start debug session: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        });

        // Step command
        this.addCommand({
            name: 'step',
            description: 'Execute next step in debug session',
            handler: async () => {
                if (!this.currentSession || !this.debugger) {
                    console.log('❌ No active debug session. Use "debug" first.');
                    return;
                }

                try {
                    const result = await this.debugger.stepNext(this.currentSession);
                    if (result) {
                        console.log(`⏭️  Step executed: ${result.stepId} (${result.status})`);
                        if (result.duration) {
                            console.log(`   Duration: ${result.duration}ms`);
                        }
                        if (result.error) {
                            console.log(`   Error: ${result.error}`);
                        }
                    } else {
                        console.log('✅ Debug session completed');
                        this.currentSession = undefined;
                    }
                } catch (error) {
                    console.error(`❌ Step execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        });

        // Continue command
        this.addCommand({
            name: 'continue',
            description: 'Continue execution until completion or breakpoint',
            aliases: ['c'],
            handler: async () => {
                if (!this.currentSession || !this.debugger) {
                    console.log('❌ No active debug session. Use "debug" first.');
                    return;
                }

                try {
                    const results = await this.debugger.continue(this.currentSession);
                    console.log(`▶️  Executed ${results.length} steps`);

                    const session = this.debugger.getSessionState(this.currentSession);
                    if (session?.status === 'completed') {
                        console.log('✅ Debug session completed');
                        this.currentSession = undefined;
                    } else if (session?.status === 'paused') {
                        console.log('⏸️  Execution paused at breakpoint');
                    } else if (session?.status === 'error') {
                        console.log('❌ Execution failed');
                        this.currentSession = undefined;
                    }
                } catch (error) {
                    console.error(`❌ Continue failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        });

        // Variables command
        this.addCommand({
            name: 'vars',
            description: 'Show current variables in debug session',
            aliases: ['v'],
            handler: async () => {
                if (!this.currentSession || !this.debugger) {
                    console.log('❌ No active debug session. Use "debug" first.');
                    return;
                }

                const session = this.debugger.getSessionState(this.currentSession);
                if (!session) {
                    console.log('❌ Debug session not found');
                    return;
                }

                console.log('\n📊 Current Variables:');
                console.log('====================');
                for (const [name, value] of Object.entries(session.variables)) {
                    const valueStr = typeof value === 'string'
                        ? `"${value}"`
                        : JSON.stringify(value, null, 2);
                    console.log(`  ${name}: ${valueStr}`);
                }
                console.log();
            }
        });

        // Test command
        this.addCommand({
            name: 'test',
            description: 'Run tests on current agent',
            aliases: ['t'],
            handler: async (args) => {
                if (!this.currentAgent || !this.tester) {
                    console.log('❌ No agent loaded or tester not available.');
                    return;
                }

                if (args.length > 0 && args[0] === 'generate') {
                    // Generate test cases
                    console.log('🧪 Generating test cases...');
                    const testCases = this.tester.generateTestCases(this.currentAgent);

                    console.log(`Generated ${testCases.length} test cases:`);
                    testCases.forEach((testCase, index) => {
                        console.log(`  ${index + 1}. ${testCase.name}`);
                        console.log(`     ${testCase.description}`);
                        console.log(`     Input: ${JSON.stringify(testCase.input)}`);
                    });
                    return;
                }

                // Run basic test
                console.log('🧪 Running basic test...');
                const testCase = {
                    name: 'Basic test',
                    description: 'Basic functionality test',
                    input: {}
                };

                const result = await this.tester.runTestCase(this.currentAgent, testCase);

                if (result.passed) {
                    console.log(`✅ Test passed (${result.duration}ms)`);
                } else {
                    console.log(`❌ Test failed (${result.duration}ms)`);
                    if (result.error) {
                        console.log(`   Error: ${result.error}`);
                    }
                }
            }
        });

        // Validate command
        this.addCommand({
            name: 'validate',
            description: 'Validate agent against available providers',
            handler: async () => {
                if (!this.currentAgent || !this.tester) {
                    console.log('❌ No agent loaded or tester not available.');
                    return;
                }

                console.log('🔍 Validating agent...');
                const validation = await this.tester.validateAgent(this.currentAgent);

                if (validation.valid) {
                    console.log('✅ Agent is valid');
                } else {
                    console.log('❌ Agent validation failed');
                }

                if (validation.parseErrors.length > 0) {
                    console.log('\n❌ Parse Errors:');
                    validation.parseErrors.forEach(error => {
                        console.log(`   Line ${error.line}: ${error.message}`);
                    });
                }

                if (validation.validationErrors.length > 0) {
                    console.log('\n❌ Validation Errors:');
                    validation.validationErrors.forEach(error => {
                        console.log(`   ${error}`);
                    });
                }

                if (validation.warnings.length > 0) {
                    console.log('\n⚠️  Warnings:');
                    validation.warnings.forEach(warning => {
                        console.log(`   ${warning}`);
                    });
                }

                if (validation.recommendations.length > 0) {
                    console.log('\n💡 Recommendations:');
                    validation.recommendations.forEach(rec => {
                        console.log(`   ${rec}`);
                    });
                }
            }
        });

        // Providers command
        this.addCommand({
            name: 'providers',
            description: 'Show available providers and models',
            handler: async () => {
                if (!this.providerRouter) {
                    console.log('❌ Provider system not available.');
                    return;
                }

                console.log('🔌 Available Providers:');
                console.log('======================');

                const models = await this.providerRouter.getAllModels();
                const stats = this.providerRouter.getProviderStats();

                console.log(`Total Models: ${models.length}`);
                console.log(`Active Providers: ${stats.enabledProviders}`);

                // Group by provider
                const modelsByProvider = models.reduce((acc, model) => {
                    if (!acc[model.provider]) acc[model.provider] = [];
                    acc[model.provider].push(model);
                    return acc;
                }, {} as Record<string, any[]>);

                for (const [provider, providerModels] of Object.entries(modelsByProvider)) {
                    console.log(`\n${provider} (${providerModels.length} models):`);
                    providerModels.slice(0, 5).forEach(model => {
                        console.log(`  - ${model.name} (${model.id})`);
                    });
                    if (providerModels.length > 5) {
                        console.log(`  ... and ${providerModels.length - 5} more`);
                    }
                }
            }
        });

        // Clear command
        this.addCommand({
            name: 'clear',
            description: 'Clear the screen',
            handler: async () => {
                console.clear();
                console.log('🎮 AAABuilder Agent Playground');
                console.log('==============================\n');
            }
        });

        // Exit command
        this.addCommand({
            name: 'exit',
            description: 'Exit the playground',
            aliases: ['quit', 'q'],
            handler: async () => {
                console.log('\n👋 Goodbye!');
                process.exit(0);
            }
        });
    }

    /**
     * Add a command to the playground
     */
    private addCommand(command: PlaygroundCommand): void {
        this.commands.set(command.name, command);

        // Add aliases
        if (command.aliases) {
            for (const alias of command.aliases) {
                this.commands.set(alias, command);
            }
        }
    }

    /**
     * Prompt user for input
     */
    private prompt(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim());
            });
        });
    }
}

// Export for CLI usage
export async function startPlayground(): Promise<void> {
    const playground = new AgentPlayground();
    await playground.start();
}

// CLI entry point
if (require.main === module) {
    startPlayground().catch(console.error);
}