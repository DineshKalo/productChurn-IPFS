const axios = require('axios');

async function uploadSampleModel() {
  console.log('📤 Uploading Sample TFT Model to IPFS...\n');
  console.log('=' .repeat(50));

  const sampleTFTModel = {
    model_weights: {
      encoder_weights: {
        layers: 4,
        hidden_size: 160,
        attention_heads: 4,
        parameters: 2450000
      },
      decoder_weights: {
        layers: 2,
        hidden_size: 160,
        parameters: 1200000
      },
      attention_weights: {
        multihead_attention: true,
        attention_dim: 64
      },
      output_layer: {
        output_size: 7,
        activation: 'sigmoid'
      }
    },
    model_architecture: {
      type: 'TemporalFusionTransformer',
      hidden_size: 160,
      attention_head_size: 4,
      dropout: 0.1,
      hidden_continuous_size: 160,
      output_size: 7,
      input_features: [
        'product_id',
        'store_id', 
        'units_sold', 
        'price', 
        'inventory_level', 
        'demand_forecast',
        'day_of_week',
        'month',
        'is_weekend'
      ],
      output_features: ['churn_probability_7d', 'churn_probability_14d', 'churn_probability_30d'],
      time_features: ['date', 'day_of_week', 'month', 'quarter']
    },
    training_config: {
      learning_rate: 0.03,
      batch_size: 64,
      epochs: 50,
      gradient_clip_val: 0.1,
      optimizer: 'adamw',
      loss_function: 'mse',
      validation_split: 0.2,
      early_stopping_patience: 10
    },
    performance_metrics: {
      accuracy: 0.8945,
      loss: 0.2341,
      val_accuracy: 0.8762,
      mse: 0.0456,
      mae: 0.1234,
      r2_score: 0.856,
      precision: 0.867,
      recall: 0.845,
      f1_score: 0.856,
      training_time: '2.5 hours',
      dataset_size: 150000
    },
    model_metadata: {
      name: 'Retail Churn TFT v1.0',
      version: '1.0.0',
      description: 'Temporal Fusion Transformer for retail product churn prediction',
      trained_on: new Date().toISOString().split('T')[0],
      features: [
        'product_id',
        'store_id', 
        'units_sold', 
        'price', 
        'inventory_level', 
        'demand_forecast'
      ],
      target: 'churn_probability',
      horizon: [7, 14, 30],
      author: 'Retail AI Team',
      license: 'MIT',
      framework: 'pytorch_lightning',
      library: 'pytorch_forecasting'
    }
  };

  try {
    console.log('🚀 Sending TFT model to IPFS service...');
    
    const response = await axios.post('http://localhost:5001/api/ml/store-model', {
      model_weights: sampleTFTModel.model_weights,
      model_architecture: sampleTFTModel.model_architecture,
      training_config: sampleTFTModel.training_config,
      performance_metrics: sampleTFTModel.performance_metrics,
      model_metadata: sampleTFTModel.model_metadata
    }, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log('\n✅ Sample TFT Model uploaded successfully!');
      console.log('=' .repeat(50));
      console.log('📋 Model Details:');
      console.log('   🆔 IPFS Hash:', response.data.data.ipfsHash);
      console.log('   🔗 IPFS URL:', response.data.data.ipfsUrl);
      console.log('   🏷️  Model ID:', response.data.data.modelId);
      console.log('   ⏰ Timestamp:', response.data.data.timestamp);
      
      console.log('\n💡 You can retrieve this model using:');
      console.log(`   GET http://localhost:5001/api/ml/get-model/${response.data.data.ipfsHash}`);
      console.log('\n🌐 Or directly via IPFS:');
      console.log(`   https://gateway.pinata.cloud/ipfs/${response.data.data.ipfsHash}`);
      console.log(`   https://ipfs.io/ipfs/${response.data.data.ipfsHash}`);
      
      console.log('\n🎯 Next steps:');
      console.log('   1. Keep this IPFS hash for future reference');
      console.log('   2. Use the API to store your real TFT models');
      console.log('   3. Integrate with your Hugging Face space');

      return response.data.data.ipfsHash;

    } else {
      console.log('❌ Upload failed:', response.data.error);
      return null;
    }

  } catch (error) {
    console.error('\n❌ Failed to upload sample model:');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Make sure the server is running: npm start');
      console.log('   💡 Server should be running on http://localhost:5001');
    } else if (error.response) {
      console.log('   📡 Server response:', error.response.data);
    } else {
      console.log('   🔧 Error:', error.message);
    }
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Run: npm start (in a separate terminal)');
    console.log('   2. Wait for server to start completely');
    console.log('   3. Run this script again: npm run upload:sample');
    
    return null;
  }
}

// Run if server is running
if (require.main === module) {
  uploadSampleModel();
}

module.exports = uploadSampleModel;