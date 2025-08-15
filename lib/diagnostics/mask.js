/**
 * Utility for masking sensitive data in logs and output
 */
class SensitiveDataMasker {
  constructor() {
    // Patterns for detecting sensitive data
    this.patterns = [
      // API Keys
      { pattern: /sk-[a-zA-Z0-9]{40,}/g, replacement: 'sk-****' }, // OpenAI
      { pattern: /hf_[a-zA-Z0-9]{40,}/g, replacement: 'hf_****' }, // Hugging Face
      { pattern: /AIza[a-zA-Z0-9_-]{35}/g, replacement: 'AIza****' }, // Google
      
      // Generic patterns
      { pattern: /Bearer\s+[a-zA-Z0-9_-]{20,}/g, replacement: 'Bearer ****' },
      { pattern: /token["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}/gi, replacement: 'token: "****"' },
      { pattern: /key["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}/gi, replacement: 'key: "****"' },
      { pattern: /password["\s]*[:=]["\s]*[^\s"]{8,}/gi, replacement: 'password: "****"' },
      
      // Email addresses (partial masking)
      { pattern: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, replacement: '****@$2' },
    ];
  }

  maskSensitiveData(text) {
    if (typeof text !== 'string') {
      return text;
    }

    let maskedText = text;
    
    for (const { pattern, replacement } of this.patterns) {
      maskedText = maskedText.replace(pattern, replacement);
    }

    return maskedText;
  }

  maskSecret(secret) {
    if (!secret || typeof secret !== 'string') {
      return secret;
    }

    if (secret.length <= 8) {
      return '****';
    }

    // Show first 4 and last 4 characters
    return secret.substring(0, 4) + '*'.repeat(Math.max(4, secret.length - 8)) + secret.substring(secret.length - 4);
  }

  maskObject(obj) {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.maskSensitiveData(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.maskObject(item));
    }

    if (typeof obj === 'object') {
      const masked = {};
      for (const [key, value] of Object.entries(obj)) {
        // Mask values for known sensitive keys
        if (this.isSensitiveKey(key)) {
          masked[key] = this.maskSecret(value);
        } else {
          masked[key] = this.maskObject(value);
        }
      }
      return masked;
    }

    return obj;
  }

  isSensitiveKey(key) {
    const sensitiveKeys = [
      'password', 'pass', 'pwd',
      'secret', 'key', 'token', 'auth',
      'api_key', 'apikey', 'api-key',
      'access_token', 'refresh_token',
      'authorization', 'bearer',
    ];

    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey));
  }
}

module.exports = new SensitiveDataMasker();
