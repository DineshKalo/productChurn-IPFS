const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

class IPFSService {
  constructor() {
    this.pinataApiKey = process.env.PINATA_API_KEY;
    this.pinataSecret = process.env.PINATA_API_SECRET;
    this.pinataJWT = process.env.PINATA_JWT;
    
    this.baseURL = 'https://api.pinata.cloud';
    
    // Validate configuration
    this.validateConfig();
  }

  validateConfig() {
    const missing = [];
    if (!this.pinataApiKey) missing.push('PINATA_API_KEY');
    if (!this.pinataSecret) missing.push('PINATA_API_SECRET');
    if (!this.pinataJWT) missing.push('PINATA_JWT');
    
    if (missing.length > 0) {
      console.warn('⚠️  Missing IPFS configuration:', missing.join(', '));
      console.log('💡 Get keys from: https://pinata.cloud');
    }
  }

  async uploadToIPFS(data, metadata = {}) {
    try {
      console.log('📤 Uploading to IPFS via Pinata...');
      
      const formData = new FormData();
      
      // Create JSON blob with data and metadata
      const uploadData = {
        data: data,
        metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString(),
          service: 'retail-ml-ipfs-service',
          version: '1.0.0'
        }
      };

      // Convert to buffer for FormData
      const jsonBuffer = Buffer.from(JSON.stringify(uploadData, null, 2));
      
      formData.append('file', jsonBuffer, {
        filename: `model-${Date.now()}.json`,
        contentType: 'application/json'
      });
      
      // Pinata metadata
      const pinataMetadata = JSON.stringify({
        name: metadata.modelName || `retail-model-${Date.now()}`,
        keyvalues: {
          version: metadata.version || '1.0.0',
          type: metadata.modelType || 'ml-model',
          accuracy: metadata.accuracy?.toString() || '0',
          timestamp: metadata.timestamp || Date.now().toString(),
          service: 'retail-churn-prediction'
        }
      });
      formData.append('pinataMetadata', pinataMetadata);

      // Pinata options
      const pinataOptions = JSON.stringify({
        cidVersion: 0,
        wrapWithDirectory: false
      });
      formData.append('pinataOptions', pinataOptions);

      const response = await axios.post(
        `${this.baseURL}/pinning/pinFileToIPFS`,
        formData,
        {
          maxBodyLength: Infinity,
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.pinataJWT}`
          },
          timeout: 30000
        }
      );

      console.log('✅ IPFS upload successful:', response.data.IpfsHash);

      return {
        ipfsHash: response.data.IpfsHash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
        pinSize: response.data.PinSize,
        timestamp: response.data.Timestamp,
        publicUrl: `https://ipfs.io/ipfs/${response.data.IpfsHash}`
      };

    } catch (error) {
      console.error('❌ IPFS upload failed:', error.response?.data || error.message);
      
      // Provide helpful error messages
      let errorMessage = error.response?.data?.error || error.message;
      
      if (error.response?.status === 401) {
        errorMessage = 'Invalid Pinata API credentials. Check your PINATA_JWT token.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Pinata API key does not have required permissions.';
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = 'Network error: Cannot reach Pinata API. Check your internet connection.';
      }
      
      throw new Error(`IPFS upload failed: ${errorMessage}`);
    }
  }

  async getFromIPFS(ipfsHash) {
    try {
      console.log(`📥 Fetching from IPFS: ${ipfsHash}`);
      
      // Try Pinata gateway first (faster and more reliable)
      const response = await axios.get(
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        {
          timeout: 30000,
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      console.log('✅ IPFS fetch successful from Pinata gateway');
      return JSON.stringify(response.data);

    } catch (error) {
      console.error('❌ IPFS fetch from Pinata failed:', error.message);
      
      // Fallback to public IPFS gateway
      try {
        console.log('🔄 Trying public IPFS gateway...');
        const response = await axios.get(
          `https://ipfs.io/ipfs/${ipfsHash}`,
          {
            timeout: 30000,
            headers: {
              'Accept': 'application/json'
            }
          }
        );
        
        console.log('✅ IPFS fetch from public gateway successful');
        return JSON.stringify(response.data);
        
      } catch (fallbackError) {
        console.error('❌ IPFS fetch from public gateway failed:', fallbackError.message);
        
        // Last fallback: Cloudflare IPFS gateway
        try {
          console.log('🔄 Trying Cloudflare IPFS gateway...');
          const response = await axios.get(
            `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
            {
              timeout: 30000,
              headers: {
                'Accept': 'application/json'
              }
            }
          );
          
          console.log('✅ IPFS fetch from Cloudflare gateway successful');
          return JSON.stringify(response.data);
          
        } catch (finalError) {
          throw new Error(`Failed to fetch from IPFS: ${finalError.message}`);
        }
      }
    }
  }

  async testConnection() {
    try {
      console.log('🔗 Testing Pinata connection...');
      
      const response = await axios.get(
        `${this.baseURL}/data/testAuthentication`,
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`
          },
          timeout: 10000
        }
      );
      
      return {
        success: true,
        message: '✅ Pinata connection successful',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Pinata connection test failed:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        message: '❌ Failed to connect to Pinata',
        timestamp: new Date().toISOString()
      };
    }
  }

  async listPinnedFiles(limit = 1000, status = 'all') {
  try {
    console.log('📋 Listing pinned files...');
    
    let allFiles = [];
    let pageOffset = 0;
    const pageLimit = 100; // Pinata's max per page
    
    // Paginate through all files
    while (true) {
      let url = `${this.baseURL}/data/pinList?pageLimit=${pageLimit}&pageOffset=${pageOffset}`;
      
      if (status !== 'all') {
        url += `&status=${status}`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.pinataJWT}`
        },
        timeout: 30000
      });
      
      if (!response.data.rows || response.data.rows.length === 0) {
        break;
      }
      
      allFiles = [...allFiles, ...response.data.rows];
      pageOffset += pageLimit;
      
      // Stop if we've reached the requested limit or no more files
      if (allFiles.length >= limit || response.data.rows.length < pageLimit) {
        break;
      }
    }
    
    console.log(`✅ Found ${allFiles.length} total files`);
    
    return {
      success: true,
      count: allFiles.length,
      rows: allFiles.map(file => ({
        ipfs_pin_hash: file.ipfs_pin_hash,
        name: file.metadata ? file.metadata.name : `file-${file.ipfs_pin_hash.substring(0, 8)}`,
        size: file.size,
        date_pinned: file.date_pinned,
        metadata: file.metadata || {},
        status: 'pinned'
      })),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to list pinned files:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      message: 'Failed to list pinned files',
      timestamp: new Date().toISOString()
    };
  }
}

  async listUnpinnedFiles(limit = 100) {
  try {
    console.log('📋 Listing unpinned files...');
    
    const response = await axios.get(
      `${this.baseURL}/data/pinList?status=unpinned&pageLimit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.pinataJWT}`
        },
        timeout: 15000
      }
    );
    
    console.log(`✅ Found ${response.data.count} unpinned files`);
    
    return {
      success: true,
      count: response.data.count,
      rows: response.data.rows.map(file => ({
        ipfs_pin_hash: file.ipfs_pin_hash,
        name: file.metadata ? file.metadata.name : `unpinned-${file.ipfs_pin_hash.substring(0, 8)}`,
        size: file.size,
        date_pinned: file.date_pinned,
        metadata: file.metadata || {},
        status: 'unpinned'
      })),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to list unpinned files:', error.response?.data || error.message);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message,
      message: 'Failed to list unpinned files',
      timestamp: new Date().toISOString()
    };
  }
}

async listAllFiles(limit = 1000) {
  try {
    console.log('📋 Listing all files (pinned + unpinned)...');
    
    const [pinnedResult, unpinnedResult] = await Promise.all([
      this.listPinnedFiles(limit, 'all'),
      this.listUnpinnedFiles(limit)
    ]);
    
    const allFiles = [
      ...(pinnedResult.success ? pinnedResult.rows : []),
      ...(unpinnedResult.success ? unpinnedResult.rows : [])
    ];
    
    console.log(`✅ Found ${allFiles.length} total files (${pinnedResult.rows?.length || 0} pinned, ${unpinnedResult.rows?.length || 0} unpinned)`);
    
    return {
      success: true,
      count: allFiles.length,
      rows: allFiles,
      pinnedCount: pinnedResult.rows?.length || 0,
      unpinnedCount: unpinnedResult.rows?.length || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Failed to list all files:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to list all files',
      timestamp: new Date().toISOString()
    };
  }
}

  async unpinFile(ipfsHash) {
    try {
      console.log(`🗑️  Unpinning file: ${ipfsHash}`);
      
      const response = await axios.delete(
        `${this.baseURL}/pinning/unpin/${ipfsHash}`,
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`
          },
          timeout: 15000
        }
      );
      
      console.log('✅ File unpinned successfully');
      
      return {
        success: true,
        message: 'File unpinned successfully',
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to unpin file:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        message: 'Failed to unpin file',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getPinStatus(ipfsHash) {
    try {
      console.log(`🔍 Checking pin status: ${ipfsHash}`);
      
      const response = await axios.get(
        `${this.baseURL}/data/pinList?hashContains=${ipfsHash}`,
        {
          headers: {
            'Authorization': `Bearer ${this.pinataJWT}`
          },
          timeout: 10000
        }
      );
      
      const pin = response.data.rows.find(row => row.ipfs_pin_hash === ipfsHash);
      
      if (pin) {
        return {
          success: true,
          pinned: true,
          data: {
            ipfsHash: pin.ipfs_pin_hash,
            name: pin.metadata.name,
            size: pin.size,
            timestamp: pin.date_pinned,
            status: 'pinned'
          },
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: true,
          pinned: false,
          message: 'File not found in pin list',
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('❌ Failed to get pin status:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        message: 'Failed to get pin status',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Utility method to upload TFT model with standardized structure
  async uploadTFTModel(modelData, metadata = {}) {
    const standardizedMetadata = {
      modelType: 'temporal_fusion_transformer',
      framework: 'pytorch',
      task: 'churn_prediction',
      domain: 'retail',
      ...metadata
    };

    return await this.uploadToIPFS(modelData, standardizedMetadata);
  }

  // Utility method to upload training data
  async uploadTrainingData(data, metadata = {}) {
    const trainingMetadata = {
      dataType: 'training',
      purpose: 'model_training',
      ...metadata
    };

    return await this.uploadToIPFS(data, trainingMetadata);
  }

  // Get gateway URLs for an IPFS hash
  getGateways(ipfsHash) {
    return {
      pinata: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      ipfsIo: `https://ipfs.io/ipfs/${ipfsHash}`,
      cloudflare: `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      dweb: `https://dweb.link/ipfs/${ipfsHash}`
    };
  }

  // Validate IPFS hash format
  isValidIPFSHash(hash) {
    // Basic validation for IPFS hashes (starts with Qm for v0 or specific patterns for v1)
    return /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash) || 
           /^bafy[1-9A-HJ-NP-Za-km-z]{52}$/.test(hash);
  }
}

// Create and export singleton instance
const ipfsService = new IPFSService();
module.exports = ipfsService;