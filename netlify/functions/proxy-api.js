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
    const apiUrl = 'http://localhost:5678/webhook-test/jarvis';
    
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
    console.log('Error details:', error.response?.data);
    
    // レスポンスがあれば詳細を返す
    if (error.response) {
      return {
        statusCode: error.response.status,
        body: JSON.stringify({
          error: error.message,
          details: error.response.data,
          status: error.response.status,
          statusText: error.response.statusText
        }),
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Content-Type': 'application/json'
        }
      };
    }
    
    // その他のエラー応答
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        details: 'Internal Server Error'
      }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      }
    };
  }
}; 