#!/usr/bin/env node

/**
 * Comprehensive demo of .agent file capabilities for UI applications
 * Shows all the AI/ML features that can be configured in .agent files
 */

const fs = require('fs');
const parser = require('../lib/parser/parser');
const orchestrator = require('../lib/core/orchestrator');

// Helper function to execute agent
async function runAgent(agentFile, input) {
  const content = fs.readFileSync(agentFile, 'utf8');
  const ast = parser.parse(content);
  return await orchestrator.execute(ast, input);
}

// Demo all capabilities
async function demonstrateCapabilities() {
  console.log('🚀 AAABuilder .agent File Capabilities Demo');
  console.log('═'.repeat(60));
  console.log('All the AI/ML features you can use in UI applications');
  console.log('═'.repeat(60));
  console.log();

  const capabilities = [
    {
      category: '🧠 Large Language Models (LLM)',
      description: 'Text generation, conversation, reasoning, code generation',
      providers: ['OpenAI (GPT-4, GPT-3.5)', 'Anthropic (Claude)', 'Google (Gemini)', 'Ollama (Local)', 'Hugging Face'],
      useCases: [
        'Chatbots and virtual assistants',
        'Content generation and writing',
        'Code generation and debugging',
        'Language translation',
        'Text summarization',
        'Question answering systems',
        'Creative writing and storytelling'
      ],
      agentExample: `
@agent smart-assistant v1
var user_message = input.message
var conversation_history = input.history

step analyze:
  kind llm
  provider openai
  model gpt-4o
  prompt "Analyze and respond to: {user_message}"
  save response

output response
      `
    },
    {
      category: '👁️ Computer Vision',
      description: 'Image analysis, object detection, OCR, classification',
      providers: ['OpenAI Vision', 'YOLO', 'TensorFlow.js', 'Hugging Face Vision', 'Tesseract OCR'],
      useCases: [
        'Image classification and tagging',
        'Object detection and counting',
        'OCR (text extraction from images)',
        'Face recognition and analysis',
        'Medical image analysis',
        'Quality control in manufacturing',
        'Content moderation',
        'Augmented reality features'
      ],
      agentExample: `
@agent vision-analyzer v1
var image_file = input.image

step classify:
  kind vision
  provider openai
  model gpt-4o-vision
  input "{image_file}"
  operation classify
  save classification

step detect_objects:
  kind vision
  provider yolo
  model yolo-v8
  input "{image_file}"
  operation detect
  save objects

step extract_text:
  kind vision
  provider ocr
  model tesseract
  input "{image_file}"
  operation ocr
  save extracted_text

output "{classification} | {objects} | {extracted_text}"
      `
    },
    {
      category: '🎵 Audio Processing',
      description: 'Speech-to-text, text-to-speech, audio analysis',
      providers: ['OpenAI Whisper', 'Google Speech', 'Azure Speech', 'Local TTS/STT'],
      useCases: [
        'Voice assistants and voice commands',
        'Transcription services',
        'Audio content creation',
        'Language learning apps',
        'Accessibility features',
        'Podcast and meeting transcription',
        'Voice authentication',
        'Audio content analysis'
      ],
      agentExample: `
@agent voice-assistant v1
var audio_input = input.audio
var text_input = input.text
var operation = input.operation

step transcribe:
  kind audio
  operation stt
  input "{audio_input}"
  model whisper-1
  when "{operation} == 'stt'"
  save transcription

step synthesize:
  kind audio
  operation tts
  input "{text_input}"
  voice alloy
  model tts-1
  when "{operation} == 'tts'"
  save audio_output

step process_speech:
  kind llm
  provider openai
  model gpt-4o
  prompt "Process this speech: {transcription}"
  when "{transcription}"
  save processed_response

output "{transcription} | {audio_output} | {processed_response}"
      `
    },
    {
      category: '🤖 Traditional Machine Learning',
      description: 'Classification, regression, clustering, data analysis',
      providers: ['Scikit-learn', 'XGBoost', 'LightGBM', 'TensorFlow.js'],
      useCases: [
        'Predictive analytics',
        'Recommendation systems',
        'Fraud detection',
        'Customer segmentation',
        'Price optimization',
        'Risk assessment',
        'Anomaly detection',
        'Data classification'
      ],
      agentExample: `
@agent ml-predictor v1
var training_data = input.data
var prediction_input = input.predict
var operation = input.operation

step train_model:
  kind ml
  provider scikit-learn
  model random-forest
  action train
  input "{training_data}"
  when "{operation} == 'train'"
  save trained_model

step predict:
  kind ml
  provider scikit-learn
  model "{trained_model}"
  action predict
  input "{prediction_input}"
  when "{operation} == 'predict'"
  save prediction

output "{trained_model} | {prediction}"
      `
    },
    {
      category: '🔍 Vector Databases & RAG',
      description: 'Semantic search, knowledge retrieval, embeddings',
      providers: ['Pinecone', 'Weaviate', 'Qdrant', 'OpenAI Embeddings'],
      useCases: [
        'Knowledge base search',
        'Document retrieval systems',
        'Semantic search engines',
        'Recommendation systems',
        'Content discovery',
        'FAQ systems',
        'Research assistants',
        'Memory systems for AI'
      ],
      agentExample: `
@agent knowledge-search v1
var query = input.query
var documents = input.documents
var operation = input.operation

step embed_query:
  kind vectordb
  provider pinecone
  operation embed
  input "{query}"
  save query_embedding

step search:
  kind vectordb
  provider pinecone
  operation search
  query "{query_embedding}"
  collection knowledge-base
  topK 5
  save search_results

step generate_answer:
  kind llm
  provider openai
  model gpt-4o
  prompt "Answer based on: {search_results}. Question: {query}"
  save answer

output "{answer}"
      `
    },
    {
      category: '🌐 HTTP & API Integration',
      description: 'External API calls, webhooks, data fetching',
      providers: ['HTTP Client', 'REST APIs', 'GraphQL', 'Webhooks'],
      useCases: [
        'Third-party service integration',
        'Data synchronization',
        'Notification systems',
        'Payment processing',
        'Social media integration',
        'Weather and news feeds',
        'Database operations',
        'Microservices communication'
      ],
      agentExample: `
@agent api-integrator v1
var api_endpoint = input.endpoint
var payload = input.data
var method = input.method

step api_call:
  kind http
  action "{method}"
  url "{api_endpoint}"
  headers {"Content-Type": "application/json"}
  body "{payload}"
  save api_response

step process_response:
  kind llm
  provider openai
  model gpt-4o
  prompt "Process this API response: {api_response}"
  save processed_data

output "{processed_data}"
      `
    },
    {
      category: '🔧 Fine-tuning & Model Training',
      description: 'Custom model training, fine-tuning, optimization',
      providers: ['OpenAI Fine-tuning', 'Hugging Face', 'Custom Training'],
      useCases: [
        'Domain-specific models',
        'Brand voice customization',
        'Specialized classification',
        'Custom language models',
        'Industry-specific AI',
        'Personalized recommendations',
        'Custom vision models',
        'Specialized chatbots'
      ],
      agentExample: `
@agent model-trainer v1
var training_data = input.training_data
var model_name = input.model_name
var operation = input.operation

step fine_tune:
  kind finetune
  provider openai
  base_model gpt-3.5-turbo
  training_file "{training_data}"
  model_name "{model_name}"
  when "{operation} == 'train'"
  save fine_tuned_model

step use_custom_model:
  kind llm
  provider openai
  model "{fine_tuned_model}"
  prompt "Use custom knowledge: {input.query}"
  when "{operation} == 'inference'"
  save custom_response

output "{fine_tuned_model} | {custom_response}"
      `
    }
  ];

  // Display all capabilities
  capabilities.forEach((capability, index) => {
    console.log(`${index + 1}. ${capability.category}`);
    console.log(`   ${capability.description}`);
    console.log(`   📦 Providers: ${capability.providers.join(', ')}`);
    console.log(`   🎯 Use Cases:`);
    capability.useCases.forEach(useCase => {
      console.log(`      • ${useCase}`);
    });
    console.log(`   📝 Example .agent configuration:`);
    console.log(capability.agentExample.trim());
    console.log();
  });

  // Show complex multimodal example
  console.log('🌟 COMPLEX MULTIMODAL EXAMPLE');
  console.log('═'.repeat(40));
  console.log('A complete AI assistant that uses multiple capabilities:');
  console.log();

  const complexExample = `
@agent multimodal-assistant v1
description: "Complete AI assistant with vision, speech, and intelligence"

secrets:
  - name: OPENAI_API_KEY
    type: env
    value: OPENAI_API_KEY

vars:
  operation:
    type: string
    from: input
    required: true
  content:
    type: string
    from: input
    required: false
  image:
    type: string
    from: input
    required: false
  audio:
    type: string
    from: input
    required: false
  history:
    type: array
    from: input
    required: false

steps:
  # Speech-to-Text Processing
  - id: transcribe_audio
    type: audio
    operation: stt
    input: "{audio}"
    model: whisper-1
    when: "{operation} == 'voice' && {audio}"
    save: transcribed_text

  # Vision Analysis
  - id: analyze_image
    type: vision
    provider: openai
    model: gpt-4o-vision
    input: "{image}"
    operation: analyze
    when: "{operation} == 'vision' && {image}"
    save: image_analysis

  # OCR Text Extraction
  - id: extract_text
    type: vision
    provider: ocr
    model: tesseract
    input: "{image}"
    operation: ocr
    when: "{operation} == 'ocr' && {image}"
    save: extracted_text

  # Knowledge Search
  - id: search_knowledge
    type: vectordb
    provider: pinecone
    operation: search
    query: "{transcribed_text} {content}"
    collection: knowledge-base
    topK: 3
    when: "{operation} == 'search'"
    save: knowledge_results

  # Intelligent Processing
  - id: process_multimodal
    type: llm
    provider: openai
    model: gpt-4o
    prompt: |
      You are a multimodal AI assistant. Process this information:
      
      Text Input: {content}
      Transcribed Speech: {transcribed_text}
      Image Analysis: {image_analysis}
      Extracted Text: {extracted_text}
      Knowledge Results: {knowledge_results}
      Conversation History: {history}
      
      Provide a comprehensive, helpful response based on all available information.
    save: ai_response

  # Text-to-Speech Output
  - id: synthesize_speech
    type: audio
    operation: tts
    input: "{ai_response}"
    voice: alloy
    model: tts-1
    when: "{operation} == 'voice'"
    save: speech_output

  # API Integration
  - id: external_api
    type: http
    action: POST
    url: "https://api.example.com/process"
    headers: {"Content-Type": "application/json"}
    body: {"response": "{ai_response}", "type": "{operation}"}
    when: "{operation} == 'api'"
    save: api_result

outputs:
  response: "{ai_response}"
  speech: "{speech_output}"
  analysis: "{image_analysis}"
  transcription: "{transcribed_text}"
  api_result: "{api_result}"
  `;

  console.log(complexExample.trim());
  console.log();

  // Show UI application examples
  console.log('📱 UI APPLICATION EXAMPLES');
  console.log('═'.repeat(30));
  console.log();

  const uiExamples = [
    {
      app: '🏥 Medical Diagnosis App',
      features: [
        'Vision: Analyze medical images (X-rays, scans)',
        'LLM: Generate diagnosis suggestions',
        'Speech: Voice commands for doctors',
        'API: Integration with hospital systems',
        'Vector DB: Medical knowledge base search'
      ],
      workflow: 'Image Upload → Vision Analysis → Knowledge Search → LLM Diagnosis → TTS Report'
    },
    {
      app: '🎓 Educational Assistant',
      features: [
        'Vision: Read textbook pages and diagrams',
        'Speech: Voice questions and explanations',
        'LLM: Personalized tutoring',
        'ML: Learning progress tracking',
        'API: Curriculum integration'
      ],
      workflow: 'Voice Question → STT → Knowledge Search → LLM Explanation → TTS Response'
    },
    {
      app: '🏪 Smart Shopping Assistant',
      features: [
        'Vision: Product recognition and comparison',
        'LLM: Shopping recommendations',
        'Speech: Voice shopping lists',
        'API: Price comparison and inventory',
        'ML: Preference learning'
      ],
      workflow: 'Product Photo → Vision Analysis → Price API → LLM Recommendation → Voice Response'
    },
    {
      app: '🚗 Autonomous Vehicle Interface',
      features: [
        'Vision: Road and object detection',
        'Speech: Voice commands and alerts',
        'LLM: Natural language navigation',
        'ML: Route optimization',
        'API: Traffic and weather data'
      ],
      workflow: 'Camera Feed → Vision Processing → ML Decision → LLM Explanation → Voice Alert'
    },
    {
      app: '🏠 Smart Home Controller',
      features: [
        'Speech: Voice control of devices',
        'Vision: Security monitoring',
        'LLM: Natural language automation',
        'API: IoT device integration',
        'ML: Usage pattern learning'
      ],
      workflow: 'Voice Command → STT → LLM Intent → API Control → TTS Confirmation'
    }
  ];

  uiExamples.forEach((example, index) => {
    console.log(`${index + 1}. ${example.app}`);
    console.log(`   Features:`);
    example.features.forEach(feature => {
      console.log(`      • ${feature}`);
    });
    console.log(`   Workflow: ${example.workflow}`);
    console.log();
  });

  // Show integration patterns
  console.log('🔗 INTEGRATION PATTERNS FOR UI APPS');
  console.log('═'.repeat(40));
  console.log();

  const integrationPatterns = [
    {
      pattern: 'React/Vue Web App',
      code: `
// Frontend JavaScript
async function processUserInput(type, data) {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: type, content: data })
  });
  return await response.json();
}

// Usage
const result = await processUserInput('vision', imageFile);
displayResult(result.response);
      `
    },
    {
      pattern: 'React Native Mobile App',
      code: `
// Mobile app integration
import { runAgent } from './agent-runner';

const VoiceAssistant = () => {
  const handleVoiceInput = async (audioFile) => {
    const result = await runAgent('voice-assistant.agent', {
      operation: 'voice',
      audio: audioFile
    });
    
    // Play TTS response
    playAudio(result.speech);
    
    // Show text response
    setResponse(result.response);
  };
};
      `
    },
    {
      pattern: 'Desktop Electron App',
      code: `
// Electron main process
const { runAgent } = require('./lib/agent-runner');

ipcMain.handle('process-multimodal', async (event, data) => {
  const result = await runAgent('multimodal-assistant.agent', data);
  return result;
});

// Renderer process
const result = await ipcRenderer.invoke('process-multimodal', {
  operation: 'vision',
  image: imageData
});
      `
    }
  ];

  integrationPatterns.forEach((pattern, index) => {
    console.log(`${index + 1}. ${pattern.pattern}`);
    console.log(pattern.code.trim());
    console.log();
  });

  console.log('🎯 KEY BENEFITS FOR UI APPLICATIONS');
  console.log('═'.repeat(40));
  console.log('✅ Single .agent file configures entire AI pipeline');
  console.log('✅ No complex AI/ML code in your UI application');
  console.log('✅ Easy to modify AI behavior without code changes');
  console.log('✅ Supports all major AI providers and models');
  console.log('✅ Built-in error handling and retry logic');
  console.log('✅ Seamless multimodal AI integration');
  console.log('✅ Production-ready with monitoring and logging');
  console.log();

  console.log('🚀 GETTING STARTED');
  console.log('═'.repeat(20));
  console.log('1. Create your .agent file with desired capabilities');
  console.log('2. Use the simple JavaScript integration: runAgent(file, input)');
  console.log('3. Build your UI around the AI responses');
  console.log('4. Deploy with confidence - it\'s production ready!');
  console.log();
}

// Run the demo
if (require.main === module) {
  demonstrateCapabilities().catch(console.error);
}

module.exports = { demonstrateCapabilities };