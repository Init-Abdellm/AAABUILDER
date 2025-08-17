import { EnhancedAgentParser, AgentAST } from '../parser/enhanced-parser';
import { ProviderRouter, ProviderValidator } from '../providers';

/**
 * Step Execution Result
 */
export interface StepExecutionResult {
    stepId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startTime: Date;
    endTime?: Date;
    duration?: number;
    input?: any;
    output?: any;
    error?: string;
    variables?: Record<string, any>;
    metadata?: Record<string, any>;
}

/**
 * Debug Session
 */
export interface DebugSession {
    sessionId: string;
    agentId: string;
    ast: AgentAST;
    currentStep: number;
    variables: Record<string, any>;
    stepResults: StepExecutionResult[];
    breakpoints: Set<string>;
    status: 'running' | 'paused' | 'completed' | 'error';
    startTime: Date;
    endTime?: Date;
}

/**
 * Breakpoint
 */
export interface Breakpoint {
    stepId: string;
    condition?: string;
    enabled: boolean;
    hitCount: number;
}

/**
 * Agent Debugger
 * Provides step-by-step debugging capabilities for agent execution
 */
export class AgentDebugger {
    private sessions: Map<string, DebugSession> = new Map();
    private parser: EnhancedAgentParser;
    private providerRouter?: ProviderRouter;
    private validator?: ProviderValidator;

    constructor(providerRouter?: ProviderRouter) {
        this.parser = new EnhancedAgentParser();
        this.providerRouter = providerRouter;
        if (providerRouter) {
            this.validator = new ProviderValidator(providerRouter);
        }
    }

    /**
     * Start a new debug session
     */
    async startDebugSession(agentContent: string, input: Record<string, any> = {}): Promise<string> {
        const sessionId = this.generateSessionId();

        // Parse the agent
        const parseResult = this.parser.parse(agentContent);
        if (!parseResult.ast) {
            throw new Error(`Failed to parse agent: ${parseResult.validation.errors.map(e => e.message).join(', ')}`);
        }

        // Validate against providers if available
        if (this.validator) {
            const validation = await this.validator.validateAgent(parseResult.ast);
            if (!validation.valid) {
                console.warn('Agent validation warnings:', validation.warnings);
                console.warn('Agent validation errors:', validation.errors);
            }
        }

        // Initialize variables
        const variables: Record<string, any> = { ...input };

        // Process agent variables
        for (const [varName, varConfig] of Object.entries(parseResult.ast.vars)) {
            if (varConfig.type === 'input' && varConfig.from) {
                variables[varName] = input[varConfig.from] || varConfig.default;
            } else if (varConfig.type === 'literal') {
                variables[varName] = varConfig.default;
            } else if (varConfig.type === 'env' && varConfig.from) {
                variables[varName] = process.env[varConfig.from] || varConfig.default;
            }
        }

        const session: DebugSession = {
            sessionId,
            agentId: parseResult.ast.id,
            ast: parseResult.ast,
            currentStep: 0,
            variables,
            stepResults: [],
            breakpoints: new Set(),
            status: 'running',
            startTime: new Date()
        };

        this.sessions.set(sessionId, session);

        console.log(`🐛 Debug session started: ${sessionId}`);
        console.log(`   Agent: ${parseResult.ast.id}`);
        console.log(`   Steps: ${parseResult.ast.steps.length}`);
        console.log(`   Variables: ${Object.keys(variables).join(', ')}`);

        return sessionId;
    }

    /**
     * Execute the next step in debug mode
     */
    async stepNext(sessionId: string): Promise<StepExecutionResult | null> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Debug session not found: ${sessionId}`);
        }

        if (session.currentStep >= session.ast.steps.length) {
            session.status = 'completed';
            session.endTime = new Date();
            console.log(`✅ Debug session completed: ${sessionId}`);
            return null;
        }

        const step = session.ast.steps[session.currentStep];
        const stepResult: StepExecutionResult = {
            stepId: step.id,
            status: 'running',
            startTime: new Date(),
            variables: { ...session.variables }
        };

        try {
            console.log(`\n🔍 Executing step: ${step.id}`);
            console.log(`   Kind: ${step.kind || 'unknown'}`);
            console.log(`   Provider: ${step.provider || 'none'}`);
            console.log(`   Model: ${step.model || 'none'}`);

            // Check if step should be skipped due to condition
            if (step.when && !this.evaluateCondition(step.when, session.variables)) {
                stepResult.status = 'skipped';
                stepResult.endTime = new Date();
                stepResult.duration = stepResult.endTime.getTime() - stepResult.startTime.getTime();
                console.log(`⏭️  Step skipped due to condition: ${step.when}`);
            } else {
                // Execute the step
                const result = await this.executeStep(step, session.variables);
                stepResult.output = result;
                stepResult.status = 'completed';
                stepResult.endTime = new Date();
                stepResult.duration = stepResult.endTime.getTime() - stepResult.startTime.getTime();

                // Save result to variables if specified
                if (step.save) {
                    session.variables[step.save] = result;
                    console.log(`💾 Saved result to variable: ${step.save}`);
                }

                console.log(`✅ Step completed in ${stepResult.duration}ms`);
            }
        } catch (error) {
            stepResult.status = 'failed';
            stepResult.error = error instanceof Error ? error.message : 'Unknown error';
            stepResult.endTime = new Date();
            stepResult.duration = stepResult.endTime.getTime() - stepResult.startTime.getTime();

            console.error(`❌ Step failed: ${stepResult.error}`);
            session.status = 'error';
        }

        session.stepResults.push(stepResult);
        session.currentStep++;

        return stepResult;
    }

    /**
     * Continue execution until next breakpoint or completion
     */
    async continue(sessionId: string): Promise<StepExecutionResult[]> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Debug session not found: ${sessionId}`);
        }

        const results: StepExecutionResult[] = [];

        while (session.currentStep < session.ast.steps.length && session.status === 'running') {
            const step = session.ast.steps[session.currentStep];

            // Check for breakpoint
            if (session.breakpoints.has(step.id)) {
                session.status = 'paused';
                console.log(`🛑 Breakpoint hit at step: ${step.id}`);
                break;
            }

            const result = await this.stepNext(sessionId);
            if (result) {
                results.push(result);
            }

            if (session.status === 'error') {
                break;
            }
        }

        return results;
    }

    /**
     * Set a breakpoint on a step
     */
    setBreakpoint(sessionId: string, stepId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Debug session not found: ${sessionId}`);
        }

        session.breakpoints.add(stepId);
        console.log(`🔴 Breakpoint set on step: ${stepId}`);
    }

    /**
     * Remove a breakpoint
     */
    removeBreakpoint(sessionId: string, stepId: string): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Debug session not found: ${sessionId}`);
        }

        session.breakpoints.delete(stepId);
        console.log(`⚪ Breakpoint removed from step: ${stepId}`);
    }

    /**
     * Get current session state
     */
    getSessionState(sessionId: string): DebugSession | null {
        return this.sessions.get(sessionId) || null;
    }

    /**
     * Get variable value
     */
    getVariable(sessionId: string, variableName: string): any {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Debug session not found: ${sessionId}`);
        }

        return session.variables[variableName];
    }

    /**
     * Set variable value
     */
    setVariable(sessionId: string, variableName: string, value: any): void {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Debug session not found: ${sessionId}`);
        }

        session.variables[variableName] = value;
        console.log(`📝 Variable set: ${variableName} = ${JSON.stringify(value)}`);
    }

    /**
     * Get execution trace
     */
    getExecutionTrace(sessionId: string): {
        session: DebugSession;
        trace: string[];
    } {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Debug session not found: ${sessionId}`);
        }

        const trace: string[] = [];

        trace.push(`Debug Session: ${sessionId}`);
        trace.push(`Agent: ${session.agentId}`);
        trace.push(`Status: ${session.status}`);
        trace.push(`Started: ${session.startTime.toISOString()}`);

        if (session.endTime) {
            const duration = session.endTime.getTime() - session.startTime.getTime();
            trace.push(`Completed: ${session.endTime.toISOString()} (${duration}ms)`);
        }

        trace.push(`\nVariables:`);
        for (const [name, value] of Object.entries(session.variables)) {
            trace.push(`  ${name}: ${JSON.stringify(value)}`);
        }

        trace.push(`\nStep Execution:`);
        for (const result of session.stepResults) {
            const duration = result.duration ? `${result.duration}ms` : 'N/A';
            trace.push(`  ${result.stepId}: ${result.status} (${duration})`);

            if (result.error) {
                trace.push(`    Error: ${result.error}`);
            }

            if (result.output) {
                const output = typeof result.output === 'string'
                    ? result.output.substring(0, 100) + (result.output.length > 100 ? '...' : '')
                    : JSON.stringify(result.output).substring(0, 100);
                trace.push(`    Output: ${output}`);
            }
        }

        return { session, trace };
    }

    /**
     * Stop debug session
     */
    stopSession(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'completed';
            session.endTime = new Date();
            this.sessions.delete(sessionId);
            console.log(`🛑 Debug session stopped: ${sessionId}`);
        }
    }

    /**
     * List all active sessions
     */
    listSessions(): DebugSession[] {
        return Array.from(this.sessions.values());
    }

    // Private helper methods

    private generateSessionId(): string {
        return `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
        try {
            // Simple condition evaluation - replace variables in condition
            let evaluatedCondition = condition;

            // Replace variable references like {variable_name}
            evaluatedCondition = evaluatedCondition.replace(/\{([^}]+)\}/g, (match, varName) => {
                const value = variables[varName];
                return JSON.stringify(value);
            });

            // For safety, only allow simple comparisons
            const safeCondition = evaluatedCondition.match(/^[^;{}()]*$/);
            if (!safeCondition) {
                console.warn(`Unsafe condition detected: ${condition}`);
                return true; // Default to true for safety
            }

            // Use Function constructor for evaluation (safer than eval)
            return new Function('return ' + evaluatedCondition)();
        } catch (error) {
            console.warn(`Failed to evaluate condition: ${condition}`, error);
            return true; // Default to true if evaluation fails
        }
    }

    private async executeStep(step: any, variables: Record<string, any>): Promise<any> {
        // Replace variables in step configuration
        const processedStep = this.replaceVariables(step, variables);

        // Mock execution based on step type
        switch (step.kind) {
            case 'llm':
                return await this.executeLLMStep(processedStep);

            case 'http':
                return await this.executeHttpStep(processedStep);

            case 'function':
                return await this.executeFunctionStep(processedStep);

            case 'vision':
                return await this.executeVisionStep(processedStep);

            case 'audio':
                return await this.executeAudioStep(processedStep);

            default:
                return await this.executeGenericStep(processedStep);
        }
    }

    private replaceVariables(obj: any, variables: Record<string, any>): any {
        if (typeof obj === 'string') {
            return obj.replace(/\{([^}]+)\}/g, (match, varName) => {
                return variables[varName] !== undefined ? variables[varName] : match;
            });
        } else if (Array.isArray(obj)) {
            return obj.map(item => this.replaceVariables(item, variables));
        } else if (obj && typeof obj === 'object') {
            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.replaceVariables(value, variables);
            }
            return result;
        }
        return obj;
    }

    private async executeLLMStep(step: any): Promise<any> {
        console.log(`🤖 Executing LLM step with prompt: ${step.prompt?.substring(0, 100)}...`);

        if (this.providerRouter && step.provider && step.model) {
            try {
                const request = {
                    model: step.model,
                    input: step.prompt || step.input,
                    parameters: step.parameters || {}
                };

                const response = await this.providerRouter.executeRequest(request);
                return response.content;
            } catch (error) {
                console.warn(`Provider execution failed, using mock response:`, error);
            }
        }

        // Mock response
        return {
            content: `Mock LLM response for prompt: ${step.prompt?.substring(0, 50)}...`,
            model: step.model || 'mock-model',
            usage: {
                promptTokens: 10,
                completionTokens: 20,
                totalTokens: 30
            }
        };
    }

    private async executeHttpStep(step: any): Promise<any> {
        console.log(`🌐 Executing HTTP step: ${step.method || 'GET'} ${step.url}`);

        // Mock HTTP response
        return {
            status: 200,
            statusText: 'OK',
            data: { message: 'Mock HTTP response', url: step.url },
            headers: { 'content-type': 'application/json' }
        };
    }

    private async executeFunctionStep(step: any): Promise<any> {
        console.log(`⚙️ Executing function step: ${step.function}`);

        // Mock function execution
        return {
            result: `Mock function result for: ${step.function}`,
            args: step.args || {},
            executionTime: Math.random() * 100
        };
    }

    private async executeVisionStep(step: any): Promise<any> {
        console.log(`👁️ Executing vision step with model: ${step.model}`);

        // Mock vision response
        return {
            objects: [
                { class: 'person', confidence: 0.95, bbox: [100, 100, 200, 300] },
                { class: 'car', confidence: 0.87, bbox: [300, 150, 500, 250] }
            ],
            model: step.model || 'mock-vision-model'
        };
    }

    private async executeAudioStep(step: any): Promise<any> {
        console.log(`🎵 Executing audio step with model: ${step.model}`);

        // Mock audio response
        return {
            transcription: 'Mock transcription of audio input',
            confidence: 0.92,
            language: 'en',
            duration: 5.2,
            model: step.model || 'mock-audio-model'
        };
    }

    private async executeGenericStep(step: any): Promise<any> {
        console.log(`🔧 Executing generic step: ${step.id}`);

        // Mock generic response
        return {
            stepId: step.id,
            result: 'Mock step execution result',
            timestamp: new Date().toISOString()
        };
    }
}