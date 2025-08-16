const logger = require('../diagnostics/logger');
// const mask = require('../diagnostics/mask'); // Unused for now
const fs = require('fs');
const path = require('path');

/**
 * Computer Vision Provider
 * Supports OpenAI Vision models and HuggingFace computer vision models
 */
async function run(modelName, imagePath, context = {}) {
  logger.debug(`Vision provider called with model: ${modelName}, image: ${imagePath}`);
  
  // Determine provider type based on model name
  if (modelName.includes('gpt-4') || modelName.includes('vision')) {
    return await runOpenAIVision(modelName, imagePath, context);
  } else {
    return await runHuggingFaceVision(modelName, imagePath, context);
  }
}

/**
 * Run OpenAI Vision models
 */
async function runOpenAIVision(modelName, imagePath, context) {
  const apiKey = context.secrets?.OPENAI || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found for vision model');
  }

  try {
    // Read and encode image
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey });
    
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: context.prompt || 'Analyze this image and describe what you see.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/${getImageFormat(imagePath)};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: context.maxTokens || 1000,
      temperature: context.temperature || 0.7,
    });

    const content = response.choices[0].message.content;
    
    return {
      content,
      usage: response.usage,
      model: modelName,
      finishReason: response.choices[0].finish_reason,
      type: 'vision-analysis',
    };

  } catch (error) {
    logger.error(`OpenAI Vision error: ${error.message}`);
    throw error;
  }
}

/**
 * Run HuggingFace Vision models
 */
async function runHuggingFaceVision(modelName, imagePath, context) {
  const apiKey = context.secrets?.HF || process.env.HUGGINGFACE_KEY;
  if (!apiKey) {
    throw new Error('HuggingFace API key not found for vision model');
  }

  try {
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${modelName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace Vision API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Handle different vision model outputs
    let content;
    if (Array.isArray(data)) {
      if (data[0]?.label) {
        // Classification model
        content = `Classification: ${data[0].label} (confidence: ${(data[0].score * 100).toFixed(2)}%)`;
      } else if (data[0]?.generated_text) {
        // Captioning model
        content = data[0].generated_text;
      } else {
        content = JSON.stringify(data[0]);
      }
    } else if (data.label) {
      content = `Classification: ${data.label} (confidence: ${(data.score * 100).toFixed(2)}%)`;
    } else if (data.generated_text) {
      content = data.generated_text;
    } else {
      content = JSON.stringify(data);
    }

    return {
      content,
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: modelName,
      finishReason: 'stop',
      type: 'vision-analysis',
    };

  } catch (error) {
    logger.error(`HuggingFace Vision error: ${error.message}`);
    throw error;
  }
}

/**
 * Get image format from file extension
 */
function getImageFormat(imagePath) {
  const ext = path.extname(imagePath).toLowerCase();
  const formatMap = {
    '.jpg': 'jpeg',
    '.jpeg': 'jpeg',
    '.png': 'png',
    '.gif': 'gif',
    '.webp': 'webp',
  };
  return formatMap[ext] || 'jpeg';
}

/**
 * Vision-specific operations
 */
const operations = {
  classify: async (modelName, imagePath, context) => {
    context.prompt = 'Classify this image and provide the top 3 most likely categories with confidence scores.';
    return await run(modelName, imagePath, context);
  },
  
  describe: async (modelName, imagePath, context) => {
    context.prompt = 'Describe this image in detail, including objects, people, actions, and setting.';
    return await run(modelName, imagePath, context);
  },
  
  caption: async (modelName, imagePath, context) => {
    context.prompt = 'Generate a concise, descriptive caption for this image.';
    return await run(modelName, imagePath, context);
  },
  
  analyze: async (modelName, imagePath, context) => {
    context.prompt = 'Analyze this image comprehensively. Identify objects, people, text, emotions, and provide insights about the scene.';
    return await run(modelName, imagePath, context);
  },
};

module.exports = { run, operations };
