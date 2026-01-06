const axios = require('axios');

// Test the summarize endpoint
async function testSummarizeEndpoint() {
  try {
    // You'll need to replace these with actual values
    const BASE_URL = 'http://localhost:8080';
    const DOCUMENT_ID = 'your-document-id-here';
    const AUTH_TOKEN = 'your-jwt-token-here';

    console.log('Testing summarize endpoint...');
    
    const response = await axios.post(
      `${BASE_URL}/api/documents/${DOCUMENT_ID}/summarize`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Success!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Uncomment to run the test
// testSummarizeEndpoint();

console.log('Test script ready. Update DOCUMENT_ID and AUTH_TOKEN, then uncomment the function call to test.');