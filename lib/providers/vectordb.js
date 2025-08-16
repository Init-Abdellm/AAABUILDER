const logger = require('../diagnostics/logger');
// const mask = require('../diagnostics/mask'); // Unused for now

/**
 * Vector Database Provider
 * Supports multiple vector DB backends: Pinecone, Weaviate, Qdrant
 */
class VectorDBProvider {
  constructor(backend = 'pinecone') {
    this.backend = backend;
    this.client = null;
    this.initialized = false;
  }

  /**
   * Initialize the vector database connection
   */
  async initialize(config) {
    try {
      switch (this.backend) {
      case 'pinecone':
        await this.initializePinecone(config);
        break;
      case 'weaviate':
        await this.initializeWeaviate(config);
        break;
      case 'qdrant':
        await this.initializeQdrant(config);
        break;
      default:
        throw new Error(`Unsupported vector database backend: ${this.backend}`);
      }
      this.initialized = true;
      logger.debug(`Vector database ${this.backend} initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize ${this.backend}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Initialize Pinecone
   */
  async initializePinecone(config) {
    const { Pinecone } = require('@pinecone-database/pinecone');
    
    if (!config.apiKey) {
      throw new Error('Pinecone API key is required');
    }
    
    this.client = new Pinecone({
      apiKey: config.apiKey,
      environment: config.environment || 'us-west1-gcp',
    });
    
    // Test connection
    await this.client.listIndexes();
  }

  /**
   * Initialize Weaviate
   */
  async initializeWeaviate(config) {
    const weaviate = require('weaviate-client');
    
    this.client = weaviate.client({
      scheme: config.scheme || 'https',
      host: config.host || 'localhost:8080',
      apiKey: config.apiKey ? weaviate.apiKey(config.apiKey) : undefined,
      headers: config.headers || {},
    });
    
    // Test connection
    await this.client.schema.getter().do();
  }

  /**
   * Initialize Qdrant
   */
  async initializeQdrant(config) {
    const { QdrantClient } = require('@qdrant/qdrant-js');
    
    this.client = new QdrantClient({
      url: config.url || 'http://localhost:6333',
      apiKey: config.apiKey,
    });
    
    // Test connection
    await this.client.getCollections();
  }

  /**
   * Create a collection/index
   */
  async createCollection(name, config = {}) {
    if (!this.initialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      switch (this.backend) {
      case 'pinecone':
        return await this.createPineconeIndex(name, config);
      case 'weaviate':
        return await this.createWeaviateCollection(name, config);
      case 'qdrant':
        return await this.createQdrantCollection(name, config);
      }
    } catch (error) {
      logger.error(`Failed to create collection ${name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create Pinecone index
   */
  async createPineconeIndex(name, config) {
    const dimension = config.dimension || 1536; // Default for OpenAI embeddings
    
    await this.client.createIndex({
      name,
      dimension,
      metric: config.metric || 'cosine',
      spec: {
        serverless: {
          cloud: config.cloud || 'aws',
          region: config.region || 'us-west-2',
        },
      },
    });
    
    return { name, dimension, metric: config.metric || 'cosine' };
  }

  /**
   * Create Weaviate collection
   */
  async createWeaviateCollection(name, config) {
    const dimension = config.dimension || 1536;
    
    const classObj = {
      class: name,
      vectorizer: 'text2vec-openai',
      vectorIndexConfig: {
        distance: config.metric || 'cosine',
      },
      properties: [
        {
          name: 'content',
          dataType: ['text'],
          description: 'The content to be vectorized',
        },
        {
          name: 'metadata',
          dataType: ['text'],
          description: 'Additional metadata',
        },
      ],
    };
    
    await this.client.schema.classCreator().withClass(classObj).do();
    return { name, dimension, metric: config.metric || 'cosine' };
  }

  /**
   * Create Qdrant collection
   */
  async createQdrantCollection(name, config) {
    const dimension = config.dimension || 1536;
    
    await this.client.createCollection(name, {
      vectors: {
        size: dimension,
        distance: config.metric || 'Cosine',
      },
    });
    
    return { name, dimension, metric: config.metric || 'cosine' };
  }

  /**
   * Add documents to collection
   */
  async addDocuments(collectionName, documents, embeddings) {
    if (!this.initialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      switch (this.backend) {
      case 'pinecone':
        return await this.addToPinecone(collectionName, documents, embeddings);
      case 'weaviate':
        return await this.addToWeaviate(collectionName, documents, embeddings);
      case 'qdrant':
        return await this.addToQdrant(collectionName, documents, embeddings);
      }
    } catch (error) {
      logger.error(`Failed to add documents to ${collectionName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add to Pinecone
   */
  async addToPinecone(collectionName, documents, embeddings) {
    const index = this.client.index(collectionName);
    
    const vectors = documents.map((doc, i) => ({
      id: doc.id || `doc_${Date.now()}_${i}`,
      values: embeddings[i],
      metadata: {
        content: doc.content,
        ...doc.metadata,
      },
    }));
    
    const result = await index.upsert(vectors);
    return { added: result.upsertedCount, total: documents.length };
  }

  /**
   * Add to Weaviate
   */
  async addToWeaviate(collectionName, documents, embeddings) {
    const batch = this.client.batch.objectsBatcher();
    
    documents.forEach((doc, i) => {
      const obj = {
        class: collectionName,
        properties: {
          content: doc.content,
          metadata: JSON.stringify(doc.metadata || {}),
        },
        vector: embeddings[i],
      };
      batch.withObject(obj);
    });
    
    const result = await batch.do();
    return { added: result.length, total: documents.length };
  }

  /**
   * Add to Qdrant
   */
  async addToQdrant(collectionName, documents, embeddings) {
    const points = documents.map((doc, i) => ({
      id: doc.id || `doc_${Date.now()}_${i}`,
      vector: embeddings[i],
      payload: {
        content: doc.content,
        metadata: doc.metadata || {},
      },
    }));
    
    await this.client.upsert(collectionName, { points });
    return { added: documents.length, total: documents.length };
  }

  /**
   * Search for similar documents
   */
  async search(collectionName, query, topK = 5, filter = {}) {
    if (!this.initialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      switch (this.backend) {
      case 'pinecone':
        return await this.searchPinecone(collectionName, query, topK, filter);
      case 'weaviate':
        return await this.searchWeaviate(collectionName, query, topK, filter);
      case 'qdrant':
        return await this.searchQdrant(collectionName, query, topK, filter);
      }
    } catch (error) {
      logger.error(`Search failed in ${collectionName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search Pinecone
   */
  async searchPinecone(collectionName, query, topK, filter) {
    const index = this.client.index(collectionName);
    
    const searchResponse = await index.query({
      vector: query,
      topK,
      includeMetadata: true,
      filter: filter,
    });
    
    return searchResponse.matches.map(match => ({
      id: match.id,
      score: match.score,
      content: match.metadata.content,
      metadata: match.metadata,
    }));
  }

  /**
   * Search Weaviate
   */
  async searchWeaviate(collectionName, query, topK, _filter) {
    const result = await this.client.graphql
      .get()
      .withClassName(collectionName)
      .withFields('content metadata _additional { distance }')
      .withNearVector({ vector: query })
      .withLimit(topK)
      .do();
    
    return result.data.Get[collectionName].map(item => ({
      id: item._additional.id,
      score: 1 - item._additional.distance,
      content: item.content,
      metadata: JSON.parse(item.metadata || '{}'),
    }));
  }

  /**
   * Search Qdrant
   */
  async searchQdrant(collectionName, query, topK, filter) {
    const result = await this.client.search(collectionName, {
      vector: query,
      limit: topK,
      filter: filter,
    });
    
    return result.map(item => ({
      id: item.id,
      score: item.score,
      content: item.payload.content,
      metadata: item.payload.metadata,
    }));
  }

  /**
   * Delete collection
   */
  async deleteCollection(name) {
    if (!this.initialized) {
      throw new Error('Vector database not initialized');
    }

    try {
      switch (this.backend) {
      case 'pinecone':
        await this.client.deleteIndex(name);
        break;
      case 'weaviate':
        await this.client.schema.classDeleter().withClassName(name).do();
        break;
      case 'qdrant':
        await this.client.deleteCollection(name);
        break;
      }
      logger.debug(`Collection ${name} deleted successfully`);
      return { deleted: true, name };
    } catch (error) {
      logger.error(`Failed to delete collection ${name}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = VectorDBProvider;
