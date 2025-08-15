module.exports = {
  // Server configuration
  port: 5000,
  agentsDir: './agents',
  
  // Default AI provider settings
  defaultProvider: 'openai',
  defaultModel: 'gpt-4o',
  
  // Security settings
  enableAuth: true,
  apiKeys: [
    // Add your API keys here for server authentication
    // 'your-api-key-1',
    // 'your-api-key-2'
  ],
  
  // CORS settings
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5000'],
    credentials: true
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
};
