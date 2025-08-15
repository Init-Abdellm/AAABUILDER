const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../diagnostics/logger');
const mask = require('../diagnostics/mask');

/**
 * Google Gemini Provider
 * Real implementation using Google Generative AI SDK with streaming support
 */
async function run(modelName, prompt, context = {}) {
  logger.debug(`Gemini provider called with model: ${modelName}`);
  
  // Check for API key
  const apiKey = context.secrets?.GEMINI || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not found. Set GEMINI_API_KEY environment variable or configure in secrets.');
  }

  logger.debug(`Using Gemini API key: ${mask.maskSecret(apiKey)}`);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Map model names to Gemini models
    const modelMap = {
      'gemini-pro': 'gemini-pro',
      'gemini-1.5-pro': 'gemini-1.5-pro',
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'gemini-pro-vision': 'gemini-pro-vision',
    };
    
    const geminiModel = modelMap[modelName] || modelName;
    const model = genAI.getGenerativeModel({ model: geminiModel });
    
    // Prepare generation config
    const generationConfig = {
      maxOutputTokens: context.maxTokens || 1000,
      temperature: context.temperature || 0.7,
    };
    
    if (context.topP !== undefined) generationConfig.topP = context.topP;
    if (context.topK !== undefined) generationConfig.topK = context.topK;

    logger.debug(`Sending request to Gemini: ${geminiModel}, ${prompt.length} chars`);

    if (context.stream) {
      // Handle streaming response
      return await handleStreamingResponse(model, prompt, generationConfig, context);
    } else {
      // Handle single-shot response
      const result = await model.generateContent(prompt, generationConfig);
      const response = await result.response;
      
      if (!response || !response.text) {
        throw new Error('No response received from Gemini');
      }

      const content = response.text();
      logger.debug(`Gemini response received: ${content.length} chars`);
      
      return {
        content,
        usage: {
          promptTokens: result.usageMetadata?.promptTokenCount || 0,
          completionTokens: result.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: result.usageMetadata?.totalTokenCount || 0,
        },
        model: geminiModel,
        finishReason: 'stop',
      };
    }

  } catch (error) {
    logger.error(`Gemini provider error: ${error.message}`);
    
    // Handle specific Gemini errors
    if (error.message.includes('API_KEY_INVALID')) {
      throw new Error('Invalid Gemini API key. Please check your credentials.');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      throw new Error('Gemini quota exceeded. Please try again later.');
    } else if (error.message.includes('SAFETY')) {
      throw new Error('Gemini safety filter triggered. Please modify your prompt.');
    }
    
    throw error;
  }
}

/**
 * Handle streaming responses from Gemini
 */
async function handleStreamingResponse(model, prompt, generationConfig, context) {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await model.generateContentStream(prompt, generationConfig);
      
      let fullContent = '';
      let usage = null;
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullContent += chunkText;
          
          // Emit streaming event if callback provided
          if (context.onStreamChunk) {
            context.onStreamChunk(chunkText, fullContent);
          }
        }
      }
      
      // Get usage metadata from the result
      if (result.usageMetadata) {
        usage = {
          promptTokens: result.usageMetadata.promptTokenCount || 0,
          completionTokens: result.usageMetadata.candidatesTokenCount || 0,
          totalTokens: result.usageMetadata.totalTokenCount || 0,
        };
      }
      
      resolve({
        content: fullContent,
        usage,
        model: generationConfig.model,
        finishReason: 'stop',
        stream: true,
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = run;
