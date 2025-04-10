const axios = require('axios');

exports.handler = async function(event, context) {
  // POSTリクエストのみを許可
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      }
    };
  }

  try {
    // リクエストボディをパース
    const requestBody = JSON.parse(event.body);
    
    // APIエンドポイント
    const apiUrl = 'https://junya-indeed.app.n8n.cloud/webhook/jarvis';
    
    // APIにリクエストを転送
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 応答を返す
    return {
      statusCode: response.status,
      body: JSON.stringify(response.data),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      }
    };
  } catch (error) {
    console.log('Error:', error);
    
    // エラー応答
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        error: error.message,
        details: error.response?.data || 'Internal Server Error'
      }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      }
    };
  }
}; 