const logger = require('../diagnostics/logger');
const mask = require('../diagnostics/mask');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecretsManager {
  constructor() {
    this.encryptionKey = process.env.AAAB_ENCRYPTION_KEY || this.generateEncryptionKey();
    this.secretsFile = path.join(process.cwd(), '.aaab-secrets');
  }

  /**
   * Generate a random encryption key if none is provided
   */
  generateEncryptionKey() {
    const key = crypto.randomBytes(32).toString('hex');
    logger.warn('No AAAB_ENCRYPTION_KEY found. Generated temporary key. Set AAAB_ENCRYPTION_KEY for production.');
    return key;
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedText) {
    try {
      const parts = encryptedText.split(':');
      const _iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error(`Failed to decrypt secret: ${error.message}`);
      return null;
    }
  }

  /**
   * Save secrets to local encrypted file
   */
  saveSecrets(secrets) {
    try {
      const encryptedSecrets = {};
      for (const [key, value] of Object.entries(secrets)) {
        if (value) {
          encryptedSecrets[key] = this.encrypt(value);
        }
      }
      
      fs.writeFileSync(this.secretsFile, JSON.stringify(encryptedSecrets, null, 2));
      logger.debug(`Saved ${Object.keys(encryptedSecrets).length} secrets to ${this.secretsFile}`);
    } catch (error) {
      logger.error(`Failed to save secrets: ${error.message}`);
    }
  }

  /**
   * Load secrets from local encrypted file
   */
  loadSecrets() {
    try {
      if (!fs.existsSync(this.secretsFile)) {
        return {};
      }
      
      const encryptedData = fs.readFileSync(this.secretsFile, 'utf8');
      const encryptedSecrets = JSON.parse(encryptedData);
      const decryptedSecrets = {};
      
      for (const [key, encryptedValue] of Object.entries(encryptedSecrets)) {
        const decryptedValue = this.decrypt(encryptedValue);
        if (decryptedValue) {
          decryptedSecrets[key] = decryptedValue;
        }
      }
      
      logger.debug(`Loaded ${Object.keys(decryptedSecrets).length} secrets from ${this.secretsFile}`);
      return decryptedSecrets;
    } catch (error) {
      logger.error(`Failed to load secrets: ${error.message}`);
      return {};
    }
  }

  async resolveSecrets(secretsConfig) {
    logger.debug('Resolving secrets');
    
    const resolvedSecrets = {};
    const localSecrets = this.loadSecrets();

    for (const [alias, config] of Object.entries(secretsConfig)) {
      try {
        let value = null;
        
        // Priority order: env var > local encrypted file > cloud secret store
        if (config.type === 'env') {
          // Try environment variable first
          value = process.env[config.value];
          
          if (!value) {
            logger.debug(`Environment variable '${config.value}' not found for secret '${alias}'`);
          } else {
            logger.debug(`Resolved secret '${alias}' from env:${config.value}: ${mask.maskSecret(value)}`);
          }
        } else if (config.type === 'local') {
          // Try local encrypted storage
          value = localSecrets[config.value];
          
          if (!value) {
            logger.debug(`Local secret '${config.value}' not found for secret '${alias}'`);
          } else {
            logger.debug(`Resolved secret '${alias}' from local storage: ${mask.maskSecret(value)}`);
          }
        } else if (config.type === 'aws') {
          // Try AWS Secrets Manager
          try {
            value = await this.resolveFromAWS(config.value);
            logger.debug(`Resolved secret '${alias}' from AWS: ${mask.maskSecret(value)}`);
          } catch (error) {
            logger.warn(`AWS secret '${config.value}' not accessible: ${error.message}`);
          }
        } else if (config.type === 'gcp') {
          // Try GCP Secret Manager
          try {
            value = await this.resolveFromGCP(config.value);
            logger.debug(`Resolved secret '${alias}' from GCP: ${mask.maskSecret(value)}`);
          } catch (error) {
            logger.warn(`GCP secret '${config.value}' not accessible: ${error.message}`);
          }
        } else if (config.type === 'vault') {
          // Try HashiCorp Vault
          try {
            value = await this.resolveFromVault(config.value);
            logger.debug(`Resolved secret '${alias}' from Vault: ${mask.maskSecret(value)}`);
          } catch (error) {
            logger.warn(`Vault secret '${config.value}' not accessible: ${error.message}`);
          }
        } else {
          logger.warn(`Unknown secret type '${config.type}' for secret '${alias}'`);
        }

        // If still no value, try common environment variable patterns
        if (!value) {
          const commonEnvVars = [
            `${alias.toUpperCase()}_API_KEY`,
            `${alias.toUpperCase()}_KEY`,
            `${alias.toUpperCase()}_TOKEN`,
            `${alias.toUpperCase()}_SECRET`,
          ];
          
          for (const envVar of commonEnvVars) {
            if (process.env[envVar]) {
              value = process.env[envVar];
              logger.debug(`Resolved secret '${alias}' from common env var ${envVar}: ${mask.maskSecret(value)}`);
              break;
            }
          }
        }

        resolvedSecrets[alias] = value;
        
        // Save to local storage if it's a new secret
        if (value && !localSecrets[alias]) {
          localSecrets[alias] = value;
          this.saveSecrets(localSecrets);
        }
        
      } catch (error) {
        logger.error(`Failed to resolve secret '${alias}': ${error.message}`);
        resolvedSecrets[alias] = null;
      }
    }

    return resolvedSecrets;
  }

  validateSecrets(secrets) {
    const missing = [];
    
    for (const [alias, value] of Object.entries(secrets)) {
      if (!value) {
        missing.push(alias);
      }
    }

    return {
      valid: missing.length === 0,
      missing: missing,
    };
  }

  /**
   * Store a new secret locally
   */
  storeSecret(alias, value, _type = 'local') {
    try {
      const localSecrets = this.loadSecrets();
      localSecrets[alias] = value;
      this.saveSecrets(localSecrets);
      
      logger.info(`Secret '${alias}' stored locally`);
      return true;
    } catch (error) {
      logger.error(`Failed to store secret '${alias}': ${error.message}`);
      return false;
    }
  }

  /**
   * Remove a secret from local storage
   */
  removeSecret(alias) {
    try {
      const localSecrets = this.loadSecrets();
      delete localSecrets[alias];
      this.saveSecrets(localSecrets);
      
      logger.info(`Secret '${alias}' removed from local storage`);
      return true;
    } catch (error) {
      logger.error(`Failed to remove secret '${alias}': ${error.message}`);
      return false;
    }
  }

  /**
   * List all stored secrets (without revealing values)
   */
  listSecrets() {
    try {
      const localSecrets = this.loadSecrets();
      return Object.keys(localSecrets).map(key => ({
        alias: key,
        type: 'local',
        hasValue: true,
      }));
    } catch (error) {
      logger.error(`Failed to list secrets: ${error.message}`);
      return [];
    }
  }

  // Cloud secret store integrations (implemented as stubs for now)
  async resolveFromVault(_vaultPath) {
    // TODO: Implement HashiCorp Vault integration
    throw new Error('Vault integration not yet implemented. Use environment variables or local storage.');
  }

  async resolveFromAWS(_secretName) {
    // TODO: Implement AWS Secrets Manager integration
    throw new Error('AWS Secrets Manager integration not yet implemented. Use environment variables or local storage.');
  }

  async resolveFromGCP(_secretName) {
    // TODO: Implement GCP Secret Manager integration
    throw new Error('GCP Secret Manager integration not yet implemented. Use environment variables or local storage.');
  }
}

module.exports = new SecretsManager();
