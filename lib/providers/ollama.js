const logger = require('../diagnostics/logger');

/**
 * Ollama Provider
 * Real implementation for local Ollama instances with streaming support
 */
async function run(modelName, prompt, context = {}) {
  logger.debug(`Ollama provider called with model: ${modelName}`);
  
  // Handle model name aliases for models with colons that the parser can't handle
  const modelAliases = {
    'deepseek': 'deepseek-r1:8b',
    'deepseek-r1': 'deepseek-r1:8b',
    'qwen2': 'qwen2.5-coder:1.5b',
    'qwen2-coder': 'qwen2.5-coder:1.5b',
    'qwen': 'qwen2.5-coder:1.5b'
  };
  
  const actualModelName = modelAliases[modelName] || modelName;
  logger.debug(`Model name resolved: ${modelName} -> ${actualModelName}`);
  
  // Get Ollama base URL from context or environment
  const baseUrl = context.secrets?.OLLAMA_URL || process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  
  logger.debug(`Using Ollama at: ${baseUrl}`);

  try {
    // Check if Ollama is running
    await checkOllamaHealth(baseUrl);
    
    logger.debug(`Sending request to Ollama: ${modelName}, ${prompt.length} chars`);

    if (context.stream) {
      // Handle streaming response
      return await handleStreamingResponse(baseUrl, actualModelName, prompt, context);
    } else {
      // Handle single-shot response
      return await handleSingleResponse(baseUrl, actualModelName, prompt, context);
    }

  } catch (error) {
    logger.error(`Ollama provider error: ${error.message}`);
    
    // Handle specific Ollama errors
    if (error.message.includes('ECONNREFUSED')) {
      throw new Error('Ollama is not running. Please start Ollama with: ollama serve');
    } else if (error.message.includes('model not found')) {
      throw new Error(`Model '${modelName}' not found. Pull it with: ollama pull ${modelName}`);
    }
    
    throw error;
  }
}

/**
 * Check if Ollama is running and healthy
 */
async function checkOllamaHealth(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama health check failed: ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Cannot connect to Ollama at ${baseUrl}: ${error.message}`);
  }
}

/**
 * Handle single-shot response from Ollama
 */
async function handleSingleResponse(baseUrl, modelName, prompt, context) {
  const requestBody = {
    model: modelName,
    prompt: prompt,
    stream: false,
    options: {
      temperature: context.temperature || 0.7,
      top_p: context.topP || 0.9,
      top_k: context.topK || 40,
      num_predict: context.maxTokens || 1000,
    },
  };

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.response) {
    throw new Error('No response received from Ollama');
  }

  logger.debug(`Ollama response received: ${data.response.length} chars`);
  
  return {
    content: data.response,
    usage: {
      promptTokens: data.prompt_eval_count || 0,
      completionTokens: data.eval_count || 0,
      totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
    },
    model: modelName,
    finishReason: data.done ? 'stop' : 'length',
  };
}

/**
 * Handle streaming response from Ollama
 */
async function handleStreamingResponse(baseUrl, modelName, prompt, context) {
  const requestBody = {
    model: modelName,
    prompt: prompt,
    stream: true,
    options: {
      temperature: context.temperature || 0.7,
      top_p: context.topP || 0.9,
      top_k: context.topK || 40,
      num_predict: context.maxTokens || 1000,
    },
  };

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
    
  let fullContent = '';
  const usage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  let isDone = false;

  while (!isDone) {
    const { done, value } = await reader.read();
      
    if (done) {
      break;
    }

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
          
        if (data.response) {
          fullContent += data.response;
            
          // Emit streaming event if callback provided
          if (context.onStreamChunk) {
            context.onStreamChunk(data.response, fullContent);
          }
        }
          
        if (data.prompt_eval_count !== undefined) {
          usage.promptTokens = data.prompt_eval_count;
        }
          
        if (data.eval_count !== undefined) {
          usage.completionTokens = data.eval_count;
        }
          
        if (data.done) {
          isDone = true;
          usage.totalTokens = usage.promptTokens + usage.completionTokens;
          break;
        }
      } catch (e) {
        // Ignore parsing errors for incomplete chunks
      }
    }
  }

  return {
    content: fullContent,
    usage,
    model: modelName,
    finishReason: 'stop',
    stream: true,
  };
}

module.exports = run;
