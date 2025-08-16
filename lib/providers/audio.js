const logger = require('../diagnostics/logger');
// const mask = require('../diagnostics/mask'); // Unused for now
const fs = require('fs');
// const path = require('path'); // Unused for now

/**
 * Audio Provider
 * Supports OpenAI Whisper (STT) and various TTS services
 */
async function run(operation, input, context = {}) {
  logger.debug(`Audio provider called with operation: ${operation}`);
  
  switch (operation) {
  case 'stt':
  case 'speech-to-text':
    return await speechToText(input, context);
  case 'tts':
  case 'text-to-speech':
    return await textToSpeech(input, context);
  default:
    throw new Error(`Unknown audio operation: ${operation}`);
  }
}

/**
 * Speech-to-Text using OpenAI Whisper
 */
async function speechToText(audioPath, context) {
  const apiKey = context.secrets?.OPENAI || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found for Whisper model');
  }

  try {
    // Check if audio file exists
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    // Check file size (Whisper has a 25MB limit)
    const stats = fs.statSync(audioPath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 25) {
      throw new Error(`Audio file too large: ${fileSizeInMB.toFixed(2)}MB. Whisper supports up to 25MB.`);
    }

    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey });
    
    logger.debug(`Transcribing audio file: ${audioPath} (${fileSizeInMB.toFixed(2)}MB)`);
    
    const audioFile = fs.createReadStream(audioPath);
    const response = await client.audio.transcriptions.create({
      file: audioFile,
      model: context.model || 'whisper-1',
      language: context.language,
      prompt: context.prompt,
      response_format: 'verbose_json',
      temperature: context.temperature || 0,
    });

    logger.debug(`Transcription completed: ${response.text.length} chars`);
    
    return {
      content: response.text,
      language: response.language,
      duration: response.duration,
      segments: response.segments,
      type: 'speech-to-text',
      model: context.model || 'whisper-1',
    };

  } catch (error) {
    logger.error(`Whisper STT error: ${error.message}`);
    throw error;
  }
}

/**
 * Text-to-Speech using OpenAI TTS
 */
async function textToSpeech(text, context) {
  const apiKey = context.secrets?.OPENAI || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found for TTS model');
  }

  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Text input is required for TTS');
    }

    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey });
    
    logger.debug(`Generating speech for text: ${text.length} chars`);
    
    const response = await client.audio.speech.create({
      model: context.model || 'tts-1',
      voice: context.voice || 'alloy',
      input: text,
      response_format: 'mp3',
      speed: context.speed || 1.0,
    });

    // Save audio to file if output path specified
    let outputPath = context.outputPath;
    if (!outputPath) {
      const timestamp = Date.now();
      outputPath = `tts_output_${timestamp}.mp3`;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    
    logger.debug(`TTS completed, saved to: ${outputPath}`);
    
    return {
      content: 'Audio generated successfully',
      outputPath,
      duration: context.duration || 'unknown',
      voice: context.voice || 'alloy',
      type: 'text-to-speech',
      model: context.model || 'tts-1',
    };

  } catch (error) {
    logger.error(`OpenAI TTS error: ${error.message}`);
    throw error;
  }
}

/**
 * Audio-specific operations
 */
const operations = {
  stt: async (audioPath, context) => {
    return await speechToText(audioPath, context);
  },
  
  tts: async (text, context) => {
    return await textToSpeech(text, context);
  },
  
  transcribe: async (audioPath, context) => {
    return await speechToText(audioPath, context);
  },
  
  synthesize: async (text, context) => {
    return await textToSpeech(text, context);
  },
};

/**
 * Get supported audio formats
 */
function getSupportedFormats() {
  return {
    input: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
    output: ['mp3', 'opus', 'aac', 'flac'],
    voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  };
}

module.exports = { run, operations, getSupportedFormats };
