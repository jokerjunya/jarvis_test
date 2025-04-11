import { useState, useEffect, useRef, FormEvent } from 'react';

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
  const [inputText, setInputText] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      // Netlify Functionsプロキシを使用
      const apiUrl = '/.netlify/functions/proxy-api';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
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

  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    setInputText(e.currentTarget.value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputText.trim() !== '') {
      addMessage('user', inputText);
      sendToAPI(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto p-4 pb-8 overflow-hidden">
      <h1 className="text-2xl font-bold text-center mb-4 text-green-500">EchoSphere</h1>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto mb-4 bg-gray-900 rounded-lg p-4 shadow-inner text-gray-100">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
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
                      ? 'bg-green-600 text-white rounded-br-none' 
                      : 'bg-gray-800 text-gray-100 rounded-bl-none'
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

      <div className="mt-auto w-full">
        <div className="flex flex-col items-center mb-6">
          <p className="text-sm text-gray-400 mb-2">音声で話す</p>
          <button
            onClick={toggleListening}
            className={`w-20 h-20 rounded-full flex items-center justify-center focus:outline-none 
              ${isLoading 
                ? 'bg-gray-700 cursor-not-allowed' 
                : isListening 
                  ? 'bg-red-600 animate-pulse' 
                  : 'bg-green-500 hover:bg-green-400'
              } transition-colors shadow-lg transform hover:scale-105`}
            disabled={!speechRecognitionSupported || isLoading}
          >
            {isLoading ? (
              <svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-2 text-center">または文字で入力</p>
        <form onSubmit={handleSubmit} className="w-full flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={handleInput}
            ref={inputRef}
            className="flex-1 p-3 border border-gray-700 rounded-lg text-gray-100 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="メッセージを入力..."
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`p-3 rounded-lg ${isLoading ? 'bg-gray-700 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'} text-white`}
            disabled={isLoading || inputText.trim() === ''}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>

      {isSpeaking && (
        <div className="fixed bottom-24 right-4 bg-gray-800 rounded-full p-2 shadow-lg">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.465a5 5 0 001.414 1.414m5.657-9.193a1 1 0 112.828 0 1 1 0 01-2.828 0zM12 18.75a6.75 6.75 0 100-13.5 6.75 6.75 0 000 13.5z" />
            </svg>
            <span className="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75"></span>
          </div>
        </div>
      )}

      {!speechRecognitionSupported && (
        <p className="text-center text-red-400 mt-4">お使いのブラウザは音声認識をサポートしていません。</p>
      )}
    </div>
  );
};

export default EchoSphere; 