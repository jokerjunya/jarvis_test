import { useState, useEffect, useRef } from 'react';

interface Message {
  type: 'user' | 'system';
  text: string;
}

const EchoSphere = () => {
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useCorsProxy, setUseCorsProxy] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ブラウザの互換性チェック
  const speechRecognitionSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  const speechSynthesisSupported = 'speechSynthesis' in window;

  useEffect(() => {
    // メッセージが追加されたら自動スクロール
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // 音声認識のセットアップ
    if (speechRecognitionSupported) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      
      recognition.lang = 'ja-JP';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        addMessage('user', transcript);
        sendToAPI(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('音声認識エラー:', event.error);
        setError(`音声認識エラー: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListening) {
          setIsListening(false);
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!speechRecognitionSupported) {
      setError('お使いのブラウザは音声認識をサポートしていません。');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setError(null);
      } catch (err) {
        console.error('音声認識の開始エラー:', err);
        setError('音声認識の開始に失敗しました。再試行してください。');
        setIsListening(false);
      }
    }
  };

  const addMessage = (type: 'user' | 'system', text: string) => {
    setMessages(prev => [...prev, { type, text }]);
  };

  const sendToAPI = async (text: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // オリジナルのAPIエンドポイント
      let apiUrl = 'https://junya-indeed.app.n8n.cloud/webhook/jarvis';
      
      // CORSプロキシを使用する場合
      if (useCorsProxy) {
        // CORS Anywhereなどの公開プロキシを使用
        apiUrl = `https://cors-anywhere.herokuapp.com/${apiUrl}`;
        console.log('CORSプロキシを使用してリクエスト:', apiUrl);
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(useCorsProxy && { 'X-Requested-With': 'XMLHttpRequest' }),
        },
        mode: 'cors', // CORSモードを維持
        credentials: 'omit', // CORSリクエストではクッキーを送信しない
        cache: 'no-cache', // キャッシュを使用しない
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '応答内容を取得できません');
        throw new Error(`サーバーエラー (${response.status}): ${errorText}`);
      }

      // レスポンスがJSONかどうかを確認
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        const responseText = data.text || data.message || '応答がありません';
        
        addMessage('system', responseText);
        
        if (speechSynthesisSupported) {
          speak(responseText);
        }
      } else {
        // JSONでない場合はテキストとして処理
        const textResponse = await response.text();
        addMessage('system', textResponse || '応答がありません');
        
        if (speechSynthesisSupported) {
          speak(textResponse);
        }
      }
    } catch (err) {
      console.error('API通信エラー:', err);
      
      let errorMessage = '';
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        errorMessage = 'APIサーバーに接続できません。ネットワーク接続またはCORS設定を確認してください。';
        
        // 通常のリクエストでエラーが発生し、まだCORSプロキシを試していない場合
        if (!useCorsProxy) {
          setUseCorsProxy(true);
          setError('CORSエラーが発生しました。プロキシを使用して再試行します...');
          // 少し待ってから再試行
          setTimeout(() => {
            sendToAPI(text);
          }, 1000);
          return;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = String(err);
      }
      
      setError(`API通信エラー: ${errorMessage}`);
      
      // エラーの場合でもユーザーにフィードバックを与える
      addMessage('system', 'すみません、サーバーと通信できませんでした。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCorsProxy = () => {
    setUseCorsProxy(!useCorsProxy);
    setError(null);
  };

  const speak = (text: string) => {
    if (!speechSynthesisSupported) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error('音声合成エラー:', event.error);
      setIsSpeaking(false);
    };

    window.speechSynthesis.cancel(); // 以前の音声をキャンセル
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-4">EchoSphere</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          {error.includes('CORS') && (
            <button 
              onClick={toggleCorsProxy}
              className="ml-2 text-sm underline"
            >
              {useCorsProxy ? 'プロキシを無効にする' : 'プロキシを有効にする'}
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-4 bg-gray-50 rounded-lg p-4 shadow-inner">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>ボタンをクリックして会話を開始してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[75%] rounded-lg px-4 py-2 ${
                    message.type === 'user' 
                      ? 'bg-blue-500 text-white rounded-br-none' 
                      : 'bg-gray-200 text-gray-800 rounded-bl-none'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center">
        {useCorsProxy && (
          <div className="text-xs text-yellow-600 mb-2">
            CORSプロキシ使用中
          </div>
        )}
        <button
          onClick={toggleListening}
          className={`w-16 h-16 rounded-full flex items-center justify-center focus:outline-none 
            ${isLoading 
              ? 'bg-gray-500 cursor-not-allowed' 
              : isListening 
                ? 'bg-red-500 animate-pulse' 
                : 'bg-blue-500 hover:bg-blue-600'
            } transition-colors`}
          disabled={!speechRecognitionSupported || isLoading}
        >
          {isLoading ? (
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : isListening ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>

      {isSpeaking && (
        <div className="fixed bottom-20 right-4 bg-white rounded-full p-2 shadow-lg">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.465a5 5 0 001.414 1.414m5.657-9.193a1 1 0 112.828 0 1 1 0 01-2.828 0zM12 18.75a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
            </svg>
            <span className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-75"></span>
          </div>
        </div>
      )}

      {!speechRecognitionSupported && (
        <p className="text-center text-red-500 mt-4">お使いのブラウザは音声認識をサポートしていません。</p>
      )}
    </div>
  );
};

export default EchoSphere; 