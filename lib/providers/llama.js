const logger = require('../diagnostics/logger');
// const mask = require('../diagnostics/mask'); // Unused for now

/**
 * Llama Provider
 * Real implementation for local or remote Llama instances
 */
async function run(modelName, prompt, context = {}) {
  logger.debug(`Llama provider called with model: ${modelName}`);
  
  // Get Llama base URL from context or environment
  const baseUrl = context.secrets?.LLAMA_URL || process.env.LLAMA_URL || 'http://127.0.0.1:11434';
  
  logger.debug(`Using Llama at: ${baseUrl}`);

  try {
    // Check if Llama is running
    await checkLlamaHealth(baseUrl);
    
    logger.debug(`Sending request to Llama: ${modelName}, ${prompt.length} chars`);

    if (context.stream) {
      // Handle streaming response
      return await handleStreamingResponse(baseUrl, modelName, prompt, context);
    } else {
      // Handle single-shot response
      return await handleSingleResponse(baseUrl, modelName, prompt, context);
    }

  } catch (error) {
    logger.error(`Llama provider error: ${error.message}`);
    
    // Handle specific Llama errors
    if (error.message.includes('ECONNREFUSED')) {
      throw new Error('Llama is not running. Please start Llama with: llama serve');
    } else if (error.message.includes('model not found')) {
      throw new Error(`Model '${modelName}' not found. Pull it with: llama pull ${modelName}`);
    }
    
    throw error;
  }
}

/**
 * Check if Llama is running and healthy
 */
async function checkLlamaHealth(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Llama health check failed: ${response.status}`);
    }
  } catch (error) {
    throw new Error(`Cannot connect to Llama at ${baseUrl}: ${error.message}`);
  }
}

/**
 * Handle single-shot response from Llama
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
      repeat_penalty: context.repeatPenalty || 1.1,
      stop: context.stopSequences || [],
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
    throw new Error(`Llama API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.response) {
    throw new Error('No response received from Llama');
  }

  logger.debug(`Llama response received: ${data.response.length} chars`);
  
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
 * Handle streaming response from Llama
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
      repeat_penalty: context.repeatPenalty || 1.1,
      stop: context.stopSequences || [],
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
    throw new Error(`Llama API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
    
  let fullContent = '';
  const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
        
      if (done) break;
        
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
        
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6));
            
          if (data.response) {
            fullContent += data.response;
              
            // Update usage if available
            if (data.prompt_eval_count) usage.promptTokens = data.prompt_eval_count;
            if (data.eval_count) usage.completionTokens = data.eval_count;
          }
            
          if (data.done) {
            usage.totalTokens = usage.promptTokens + usage.completionTokens;
            return {
              content: fullContent,
              usage,
              model: modelName,
              finishReason: 'stop',
            };
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
    
  // Fallback if stream ends unexpectedly
  usage.totalTokens = usage.promptTokens + usage.completionTokens;
  return {
    content: fullContent,
    usage,
    model: modelName,
    finishReason: 'length',
  };
}

module.exports = run;
