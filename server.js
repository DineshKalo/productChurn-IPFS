const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Import IPFS service
const ipfsService = require('./services/ipfs');

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'retail-ml-ipfs-service',
    version: '1.0.0',
    features: ['IPFS Storage', 'Model Management', 'TFT Model Support'],
    timestamp: new Date().toISOString()
  });
});

// Upload model to IPFS
app.post('/api/ipfs/upload-model', async (req, res) => {
  try {
    const { modelData, metadata } = req.body;
    
    if (!modelData) {
      return res.status(400).json({
        success: false,
        error: 'Model data is required'
      });
    }

    console.log('📦 Uploading model to IPFS...');
    
    const ipfsResult = await ipfsService.uploadToIPFS(
      JSON.stringify(modelData, null, 2),
      metadata || {}
    );

    console.log('✅ Model uploaded to IPFS:', ipfsResult.ipfsHash);

    res.json({
      success: true,
      data: {
        ipfs: ipfsResult,
        message: 'Model stored successfully on IPFS',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error uploading to IPFS:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get model from IPFS
app.get('/api/ipfs/model/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    console.log(`📥 Fetching model from IPFS: ${hash}`);
    const modelData = await ipfsService.getFromIPFS(hash);
    
    res.json({
      success: true,
      data: {
        ipfsHash: hash,
        modelData: JSON.parse(modelData),
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Upload any file to IPFS
app.post('/api/ipfs/upload', async (req, res) => {
  try {
    const { data, metadata, fileName = 'file.json' } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required'
      });
    }

    const ipfsResult = await ipfsService.uploadToIPFS(
      typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      metadata || {}
    );

    res.json({
      success: true,
      data: ipfsResult
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List pinned files
app.get('/api/ipfs/files', async (req, res) => {
  try {
    const files = await ipfsService.listPinnedFiles();
    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test IPFS connection
app.get('/api/ipfs/test', async (req, res) => {
  try {
    const testResult = await ipfsService.testConnection();
    res.json({
      success: true,
      data: testResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Store TFT model with metadata
app.post('/api/ml/store-model', async (req, res) => {
  try {
    const { 
      model_weights,
      model_architecture,
      training_config,
      performance_metrics,
      model_metadata 
    } = req.body;

    const modelPackage = {
      type: 'tft_churn_model',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      model_weights: model_weights,
      model_architecture: model_architecture,
      training_config: training_config,
      performance_metrics: performance_metrics,
      metadata: model_metadata || {}
    };

    console.log('🧠 Storing TFT model on IPFS...');

    const ipfsResult = await ipfsService.uploadToIPFS(
      JSON.stringify(modelPackage, null, 2),
      {
        modelName: model_metadata?.name || 'retail-churn-tft',
        version: model_metadata?.version || '1.0.0',
        accuracy: performance_metrics?.accuracy || 0,
        modelType: 'temporal_fusion_transformer',
        timestamp: new Date().toISOString()
      }
    );

    console.log('✅ TFT Model stored on IPFS:', ipfsResult.ipfsHash);

    res.json({
      success: true,
      data: {
        modelId: ipfsResult.ipfsHash,
        ipfsHash: ipfsResult.ipfsHash,
        ipfsUrl: ipfsResult.ipfsUrl,
        timestamp: new Date().toISOString(),
        message: 'TFT model stored successfully on IPFS'
      }
    });

  } catch (error) {
    console.error('❌ Error storing TFT model:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Retrieve TFT model
app.get('/api/ml/get-model/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    console.log(`📥 Retrieving TFT model: ${hash}`);
    const modelData = await ipfsService.getFromIPFS(hash);
    const modelPackage = JSON.parse(modelData);
    
    res.json({
      success: true,
      data: {
        ipfsHash: hash,
        modelPackage: modelPackage,
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get service info
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'Retail ML IPFS Service',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        uploadModel: 'POST /api/ipfs/upload-model',
        getModel: 'GET /api/ipfs/model/:hash',
        storeTFModel: 'POST /api/ml/store-model',
        getTFModel: 'GET /api/ml/get-model/:hash',
        testConnection: 'GET /api/ipfs/test'
      },
      supportedModels: ['TFT', 'Generic ML Models'],
      storage: 'IPFS via Pinata'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Unhandled Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Retail ML IPFS Service running on port ${PORT}
📡 Health check: http://localhost:${PORT}/health
🌐 IPFS Enabled: Yes
💡 API Endpoints:
   GET  /health
   POST /api/ipfs/upload-model
   GET  /api/ipfs/model/:hash
   POST /api/ml/store-model
   GET  /api/ml/get-model/:hash
   GET  /api/ipfs/test
   GET  /api/info

🎯 Ready for ML model storage!
  `);
});

module.exports = app;