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

// Add this endpoint to your server.js file

// List all stored models
app.get('/api/ml/list-models', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0,
      sortBy = 'date', // date, name, accuracy
      order = 'desc' // asc, desc
    } = req.query;

    console.log('📋 Fetching list of stored models...');
    
    // Get all pinned files from Pinata
    const pinnedFiles = await ipfsService.listPinnedFiles(parseInt(limit));
    
    if (!pinnedFiles.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve model list',
        details: pinnedFiles.error
      });
    }

    // Filter and format model data
    const models = pinnedFiles.rows
      .filter(file => {
        // Filter only ML model files
        return file.metadata?.keyvalues?.type === 'ml-model' || 
               file.metadata?.keyvalues?.modelType === 'temporal_fusion_transformer' ||
               file.name?.includes('model') ||
               file.name?.includes('tft');
      })
      .map(file => ({
        modelId: file.ipfsHash,
        ipfsHash: file.ipfsHash,
        name: file.name,
        modelType: file.metadata?.keyvalues?.modelType || 'unknown',
        version: file.metadata?.keyvalues?.version || '1.0.0',
        accuracy: parseFloat(file.metadata?.keyvalues?.accuracy || 0),
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        uploadedAt: file.timestamp,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${file.ipfsHash}`,
        publicUrl: `https://ipfs.io/ipfs/${file.ipfsHash}`,
        metadata: file.metadata?.keyvalues || {},
        gateways: {
          pinata: `https://gateway.pinata.cloud/ipfs/${file.ipfsHash}`,
          ipfsIo: `https://ipfs.io/ipfs/${file.ipfsHash}`,
          cloudflare: `https://cloudflare-ipfs.com/ipfs/${file.ipfsHash}`
        }
      }));

    // Sort models
    const sortedModels = sortModels(models, sortBy, order);

    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedModels = sortedModels.slice(startIndex, endIndex);

    console.log(`✅ Found ${models.length} models, returning ${paginatedModels.length}`);

    res.json({
      success: true,
      data: {
        models: paginatedModels,
        pagination: {
          total: models.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          returned: paginatedModels.length,
          hasMore: endIndex < models.length
        },
        summary: {
          totalModels: models.length,
          totalSize: models.reduce((sum, m) => sum + m.size, 0),
          totalSizeFormatted: formatBytes(models.reduce((sum, m) => sum + m.size, 0)),
          modelTypes: [...new Set(models.map(m => m.modelType))],
          averageAccuracy: models.length > 0 
            ? (models.reduce((sum, m) => sum + m.accuracy, 0) / models.length).toFixed(4)
            : 0
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error listing models:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific model details with full metadata
app.get('/api/ml/model-details/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!ipfsService.isValidIPFSHash(hash)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IPFS hash format'
      });
    }

    console.log(`📊 Fetching detailed model info: ${hash}`);
    
    // Get pin status and metadata
    const pinStatus = await ipfsService.getPinStatus(hash);
    
    // Get actual model data
    const modelData = await ipfsService.getFromIPFS(hash);
    const modelPackage = JSON.parse(modelData);

    res.json({
      success: true,
      data: {
        ipfsHash: hash,
        pinned: pinStatus.pinned,
        pinInfo: pinStatus.data || null,
        modelPackage: modelPackage,
        gateways: ipfsService.getGateways(hash),
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error fetching model details:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search models by criteria
app.get('/api/ml/search-models', async (req, res) => {
  try {
    const { 
      query,
      modelType,
      minAccuracy,
      maxAccuracy,
      fromDate,
      toDate,
      limit = 50
    } = req.query;

    console.log('🔍 Searching models with criteria...');
    
    const pinnedFiles = await ipfsService.listPinnedFiles(parseInt(limit) * 2);
    
    if (!pinnedFiles.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to search models'
      });
    }

    let models = pinnedFiles.rows
      .filter(file => {
        return file.metadata?.keyvalues?.type === 'ml-model' || 
               file.metadata?.keyvalues?.modelType === 'temporal_fusion_transformer' ||
               file.name?.includes('model');
      })
      .map(file => ({
        modelId: file.ipfsHash,
        ipfsHash: file.ipfsHash,
        name: file.name,
        modelType: file.metadata?.keyvalues?.modelType || 'unknown',
        version: file.metadata?.keyvalues?.version || '1.0.0',
        accuracy: parseFloat(file.metadata?.keyvalues?.accuracy || 0),
        uploadedAt: file.timestamp,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${file.ipfsHash}`,
        metadata: file.metadata?.keyvalues || {}
      }));

    // Apply filters
    if (query) {
      const searchQuery = query.toLowerCase();
      models = models.filter(m => 
        m.name.toLowerCase().includes(searchQuery) ||
        m.modelType.toLowerCase().includes(searchQuery) ||
        m.version.includes(searchQuery)
      );
    }

    if (modelType) {
      models = models.filter(m => m.modelType === modelType);
    }

    if (minAccuracy) {
      models = models.filter(m => m.accuracy >= parseFloat(minAccuracy));
    }

    if (maxAccuracy) {
      models = models.filter(m => m.accuracy <= parseFloat(maxAccuracy));
    }

    if (fromDate) {
      const from = new Date(fromDate);
      models = models.filter(m => new Date(m.uploadedAt) >= from);
    }

    if (toDate) {
      const to = new Date(toDate);
      models = models.filter(m => new Date(m.uploadedAt) <= to);
    }

    // Limit results
    models = models.slice(0, parseInt(limit));

    console.log(`✅ Search returned ${models.length} models`);

    res.json({
      success: true,
      data: {
        models: models,
        count: models.length,
        searchCriteria: {
          query,
          modelType,
          minAccuracy,
          maxAccuracy,
          fromDate,
          toDate
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error searching models:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get model statistics
app.get('/api/ml/statistics', async (req, res) => {
  try {
    console.log('📊 Calculating model statistics...');
    
    const pinnedFiles = await ipfsService.listPinnedFiles(1000);
    
    if (!pinnedFiles.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve statistics'
      });
    }

    const models = pinnedFiles.rows.filter(file => {
      return file.metadata?.keyvalues?.type === 'ml-model' || 
             file.metadata?.keyvalues?.modelType === 'temporal_fusion_transformer' ||
             file.name?.includes('model');
    });

    const stats = {
      totalModels: models.length,
      totalStorage: models.reduce((sum, m) => sum + m.size, 0),
      totalStorageFormatted: formatBytes(models.reduce((sum, m) => sum + m.size, 0)),
      
      modelsByType: {},
      accuracyDistribution: {
        high: 0,    // > 0.9
        medium: 0,  // 0.7 - 0.9
        low: 0      // < 0.7
      },
      
      recentUploads: {
        last24h: 0,
        last7d: 0,
        last30d: 0
      },
      
      averageAccuracy: 0,
      bestModel: null,
      latestModel: null
    };

    const now = new Date();
    let totalAccuracy = 0;
    let validAccuracyCount = 0;
    let bestAccuracy = 0;
    let bestModel = null;

    models.forEach(file => {
      const modelType = file.metadata?.keyvalues?.modelType || 'unknown';
      stats.modelsByType[modelType] = (stats.modelsByType[modelType] || 0) + 1;

      const accuracy = parseFloat(file.metadata?.keyvalues?.accuracy || 0);
      if (accuracy > 0) {
        totalAccuracy += accuracy;
        validAccuracyCount++;

        if (accuracy > 0.9) stats.accuracyDistribution.high++;
        else if (accuracy >= 0.7) stats.accuracyDistribution.medium++;
        else stats.accuracyDistribution.low++;

        if (accuracy > bestAccuracy) {
          bestAccuracy = accuracy;
          bestModel = {
            name: file.name,
            ipfsHash: file.ipfsHash,
            accuracy: accuracy,
            modelType: modelType
          };
        }
      }

      const uploadDate = new Date(file.timestamp);
      const hoursDiff = (now - uploadDate) / (1000 * 60 * 60);
      
      if (hoursDiff <= 24) stats.recentUploads.last24h++;
      if (hoursDiff <= 168) stats.recentUploads.last7d++;
      if (hoursDiff <= 720) stats.recentUploads.last30d++;
    });

    if (validAccuracyCount > 0) {
      stats.averageAccuracy = (totalAccuracy / validAccuracyCount).toFixed(4);
    }

    stats.bestModel = bestModel;
    
    if (models.length > 0) {
      const latestFile = models.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      )[0];
      
      stats.latestModel = {
        name: latestFile.name,
        ipfsHash: latestFile.ipfsHash,
        uploadedAt: latestFile.timestamp,
        modelType: latestFile.metadata?.keyvalues?.modelType || 'unknown'
      };
    }

    console.log('✅ Statistics calculated');

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error calculating statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Helper function to sort models
function sortModels(models, sortBy, order) {
  const sorted = [...models].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = new Date(b.uploadedAt) - new Date(a.uploadedAt);
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'accuracy':
        comparison = b.accuracy - a.accuracy;
        break;
      case 'size':
        comparison = b.size - a.size;
        break;
      default:
        comparison = new Date(b.uploadedAt) - new Date(a.uploadedAt);
    }
    
    return order === 'asc' ? -comparison : comparison;
  });
  
  return sorted;
}

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