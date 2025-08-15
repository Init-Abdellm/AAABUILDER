const OpenAI = require('openai');
const logger = require('../diagnostics/logger');
const mask = require('../diagnostics/mask');

/**
 * OpenAI Provider
 * Real implementation using OpenAI SDK with streaming support
 */
async function run(modelName, prompt, context = {}) {
  logger.debug(`OpenAI provider called with model: ${modelName}`);
  
  // Check for API key
  const apiKey = context.secrets?.OPENAI || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Set OPENAI_API_KEY environment variable or configure in secrets.');
  }

  logger.debug(`Using OpenAI API key: ${mask.maskSecret(apiKey)}`);

  try {
    const client = new OpenAI({ apiKey });
    
    // Prepare messages
    const messages = [];
    
    // Add system message if provided
    if (context.globalPrompt) {
      messages.push({ role: 'system', content: context.globalPrompt });
    }
    
    // Add user message
    messages.push({ role: 'user', content: prompt });

    // Prepare request options
    const requestOptions = {
      model: modelName,
      messages,
      max_tokens: context.maxTokens || 1000,
      temperature: context.temperature || 0.7,
      stream: context.stream || false,
    };

    // Add optional parameters
    if (context.topP !== undefined) requestOptions.top_p = context.topP;
    if (context.frequencyPenalty !== undefined) requestOptions.frequency_penalty = context.frequencyPenalty;
    if (context.presencePenalty !== undefined) requestOptions.presence_penalty = context.presencePenalty;

    logger.debug(`Sending request to OpenAI: ${modelName}, ${prompt.length} chars`);

    if (context.stream) {
      // Handle streaming response
      return await handleStreamingResponse(client, requestOptions, context);
    } else {
      // Handle single-shot response
      const response = await client.chat.completions.create(requestOptions);
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response received from OpenAI');
      }

      const content = response.choices[0].message.content;
      logger.debug(`OpenAI response received: ${content.length} chars`);
      
      return {
        content,
        usage: response.usage,
        model: response.model,
        finishReason: response.choices[0].finish_reason,
      };
    }

  } catch (error) {
    logger.error(`OpenAI provider error: ${error.message}`);
    
    // Handle specific OpenAI errors
    if (error.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your credentials.');
    } else if (error.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again later.');
    } else if (error.status === 400) {
      throw new Error(`OpenAI request error: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Handle streaming responses from OpenAI
 */
async function handleStreamingResponse(client, requestOptions, context) {
  return new Promise((resolve, reject) => {
    const stream = client.chat.completions.create(requestOptions);
    
    let fullContent = '';
    let usage = null;
    
    stream.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            resolve({
              content: fullContent,
              usage,
              model: requestOptions.model,
              finishReason: 'stop',
              stream: true,
            });
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0]?.delta?.content) {
              const content = parsed.choices[0].delta.content;
              fullContent += content;
              
              // Emit streaming event if callback provided
              if (context.onStreamChunk) {
                context.onStreamChunk(content, fullContent);
              }
            }
            
            if (parsed.usage) {
              usage = parsed.usage;
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    });
    
    stream.on('error', (error) => {
      reject(error);
    });
    
    stream.on('end', () => {
      resolve({
        content: fullContent,
        usage,
        model: requestOptions.model,
        finishReason: 'stop',
        stream: true,
      });
    });
  });
}

module.exports = run;
