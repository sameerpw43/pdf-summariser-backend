const axios = require('axios');
require('dotenv').config();

const HF_API_URL = 'https://api-inference.huggingface.co/models';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

async function testSummarization() {
  console.log('Testing Hugging Face summarization...');
  console.log('API Key available:', HF_API_KEY ? 'Yes' : 'No');
  
  const testText = `
    Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals. Leading AI textbooks define the field as the study of "intelligent agents": any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals. Colloquially, the term "artificial intelligence" is often used to describe machines that mimic "cognitive" functions that humans associate with the human mind, such as "learning" and "problem solving".
  `;

  try {
    const response = await axios.post(
      `${HF_API_URL}/facebook/bart-large-cnn`,
      { inputs: testText },
      {
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    
    console.log('✅ Hugging Face Response:', response.data);
    
    if (response.data[0]?.summary_text) {
      console.log('✅ Summary generated:', response.data[0].summary_text);
    } else {
      console.log('❌ No summary in response');
    }
    
  } catch (error) {
    console.error('❌ Hugging Face Error:', error.response?.data || error.message);
    
    // Test fallback summary
    console.log('\n🔄 Testing fallback summary...');
    const sentences = testText.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const fallbackSummary = sentences.slice(0, 2).join('. ') + '.';
    console.log('✅ Fallback summary:', fallbackSummary);
  }
}

testSummarization();