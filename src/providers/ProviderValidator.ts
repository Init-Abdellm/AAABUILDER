import { ProviderRouter } from './ProviderRouter';
import { AgentAST } from '../parser/enhanced-parser';

/**
 * Provider Validator
 * Validates agent configurations against available providers
 */
export class ProviderValidator {
  private providerRouter: ProviderRouter;

  constructor(providerRouter: ProviderRouter) {
    this.providerRouter = providerRouter;
  }

  /**
   * Validate an agent AST against available providers
   */
  async validateAgent(ast: AgentAST): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get all available models
      const availableModels = await this.providerRouter.getAllModels();
      const availableProviders = new Set(availableModels.map(m => m.provider));
      const availableModelIds = new Set(availableModels.map(m => m.id));

      // Validate each step
      for (const step of ast.steps) {
        // Check if provider is specified and available
        if (step.provider) {
          if (!availableProviders.has(step.provider)) {
            errors.push(`Step "${step.id}": Provider "${step.provider}" is not available. Available providers: ${Array.from(availableProviders).join(', ')}`);
          }
        }

        // Check if model is specified and available
        if (step.model) {
          if (!availableModelIds.has(step.model)) {
            // Check if it's a provider-specific model format
            const providerModels = availableModels.filter(m => 
              step.provider ? m.provider === step.provider : true
            );
            
            if (providerModels.length === 0) {
              warnings.push(`Step "${step.id}": Model "${step.model}" not found. No models available for provider "${step.provider || 'any'}"`);
            } else {
              warnings.push(`Step "${step.id}": Model "${step.model}" not found. Available models: ${providerModels.map(m => m.id).slice(0, 5).join(', ')}${providerModels.length > 5 ? '...' : ''}`);
            }
          }
        }

        // Validate provider-model compatibility
        if (step.provider && step.model) {
          const compatibleModels = availableModels.filter(m => 
            m.provider === step.provider && m.id === step.model
          );
          
          if (compatibleModels.length === 0) {
            errors.push(`Step "${step.id}": Model "${step.model}" is not compatible with provider "${step.provider}"`);
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Provider validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings
      };
    }
  }

  /**
   * Get recommended models for a step
   */
  async getRecommendedModels(step: {
    id: string;
    provider?: string;
    kind?: string;
  }): Promise<{
    id: string;
    name: string;
    provider: string;
    reason: string;
  }[]> {
    try {
      const availableModels = await this.providerRouter.getAllModels();
      
      // Filter by provider if specified
      let candidates = step.provider 
        ? availableModels.filter(m => m.provider === step.provider)
        : availableModels;

      // Filter by step kind/type
      if (step.kind) {
        const kindCapabilityMap: Record<string, string[]> = {
          'llm': ['text-generation', 'text-completion'],
          'vision': ['image-classification', 'image-analysis', 'object-detection'],
          'audio': ['speech-to-text', 'text-to-speech', 'audio-analysis'],
          'embedding': ['text-embedding'],
          'classification': ['text-classification', 'image-classification'],
        };

        const requiredCapabilities = kindCapabilityMap[step.kind] || [];
        if (requiredCapabilities.length > 0) {
          candidates = candidates.filter(model => 
            requiredCapabilities.some(cap => 
              model.capabilities.capabilities.includes(cap as any)
            )
          );
        }
      }

      // Sort by availability and popularity
      candidates.sort((a, b) => {
        if (a.available !== b.available) {
          return a.available ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      // Return top 5 recommendations
      return candidates.slice(0, 5).map(model => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        reason: this.getRecommendationReason(model, step)
      }));
    } catch (error) {
      return [];
    }
  }

  private getRecommendationReason(model: any, step: any): string {
    const reasons: string[] = [];
    
    if (model.available) {
      reasons.push('available');
    }
    
    if (step.provider && model.provider === step.provider) {
      reasons.push('matches requested provider');
    }
    
    if (step.kind) {
      const kindCapabilityMap: Record<string, string[]> = {
        'llm': ['text-generation', 'text-completion'],
        'vision': ['image-classification', 'image-analysis'],
        'audio': ['speech-to-text', 'text-to-speech'],
      };
      
      const requiredCapabilities = kindCapabilityMap[step.kind] || [];
      const matchingCapabilities = requiredCapabilities.filter(cap => 
        model.capabilities.capabilities.includes(cap)
      );
      
      if (matchingCapabilities.length > 0) {
        reasons.push(`supports ${matchingCapabilities.join(', ')}`);
      }
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'general compatibility';
  }
}