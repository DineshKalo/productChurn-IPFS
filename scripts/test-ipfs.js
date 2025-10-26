const ipfsService = require('../services/ipfs');

async function testIPFS() {
  console.log('🧪 Testing IPFS Connection and Functionality...\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Connection to Pinata
    console.log('1. 🔗 Testing Pinata connection...');
    const connection = await ipfsService.testConnection();
    
    if (connection.success) {
      console.log('   ✅', connection.message);
    } else {
      console.log('   ❌', connection.message);
      console.log('   💡 Check your Pinata API keys in .env file');
      return;
    }

    // Test 2: Upload sample data
    console.log('\n2. 📤 Uploading test model data...');
    const testModel = {
      model_type: 'tft_churn_predictor',
      version: '1.0.0',
      hyperparameters: {
        hidden_size: 160,
        attention_head_size: 4,
        dropout: 0.1,
        learning_rate: 0.03
      },
      performance: {
        accuracy: 0.894,
        loss: 0.234,
        val_accuracy: 0.876,
        mse: 0.0456
      },
      features: ['units_sold', 'price', 'inventory_level', 'demand_forecast'],
      timestamp: new Date().toISOString(),
      test: true
    };

    const uploadResult = await ipfsService.uploadToIPFS(
      JSON.stringify(testModel, null, 2),
      {
        modelName: 'test-tft-model',
        version: '1.0.0',
        accuracy: 89.4,
        test: true
      }
    );

    console.log('   ✅ Test model uploaded successfully!');
    console.log('   📍 IPFS Hash:', uploadResult.ipfsHash);
    console.log('   🔗 IPFS URL:', uploadResult.ipfsUrl);
    console.log('   💾 Size:', uploadResult.pinSize, 'bytes');

    // Test 3: Retrieve the uploaded data
    console.log('\n3. 📥 Retrieving test model data...');
    const retrievedData = await ipfsService.getFromIPFS(uploadResult.ipfsHash);
    const parsedData = JSON.parse(retrievedData);
    
    // FIX: Access the nested data structure correctly
    const modelData = parsedData.data; // The actual model data is nested here
    const metadata = parsedData.metadata; // Metadata is separate
    
    console.log('   ✅ Test model retrieved successfully!');
    console.log('   🧠 Model Type:', modelData.model_type);
    console.log('   📊 Accuracy:', modelData.performance?.accuracy);
    console.log('   ⏰ Timestamp:', modelData.timestamp);
    console.log('   🏷️  Metadata Name:', metadata?.modelName);

    // Test 4: List pinned files
    console.log('\n4. 📋 Listing pinned files...');
    try {
      const pinnedFiles = await ipfsService.listPinnedFiles(5);
      if (pinnedFiles.success) {
        console.log('   ✅ Pinned files count:', pinnedFiles.count);
        if (pinnedFiles.rows.length > 0) {
          console.log('   📄 Recent files:');
          pinnedFiles.rows.slice(0, 3).forEach(file => {
            console.log(`      • ${file.name} (${file.ipfsHash})`);
          });
        }
      } else {
        console.log('   ℹ️  Pin listing not available:', pinnedFiles.message);
      }
    } catch (error) {
      console.log('   ℹ️  Pin listing not available:', error.message);
    }

    // Test 5: Check pin status
    console.log('\n5. 🔍 Checking pin status...');
    const pinStatus = await ipfsService.getPinStatus(uploadResult.ipfsHash);
    if (pinStatus.success && pinStatus.pinned) {
      console.log('   ✅ File is properly pinned');
    } else {
      console.log('   ⚠️  File pin status unclear');
    }

    // Test 6: Get gateway URLs
    console.log('\n6. 🌐 Available gateways:');
    const gateways = ipfsService.getGateways(uploadResult.ipfsHash);
    Object.entries(gateways).forEach(([name, url]) => {
      console.log(`   🔗 ${name}: ${url}`);
    });

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 IPFS System is working perfectly!');
    console.log('💡 You can now run: npm start');
    console.log('📝 Your test model IPFS hash:', uploadResult.ipfsHash);

    // Return the hash for potential reuse
    return uploadResult.ipfsHash;

  } catch (error) {
    console.log('\n❌ IPFS Test Failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Check PINATA_API_KEY, PINATA_API_SECRET, PINATA_JWT in .env');
    console.log('   • Verify Pinata account is activated at https://pinata.cloud');
    console.log('   • Check internet connection');
    console.log('   • Ensure you have sufficient Pinata storage space');
    
    // More detailed error logging
    if (error.response) {
      console.log('   📡 API Response:', error.response.data);
    }
  }
}

// Run if called directly
if (require.main === module) {
  testIPFS();
}

module.exports = testIPFS;