import React, { useState, useEffect } from 'react';
import ChatWidget from './ChatWidget';
import TextUploader from './TextUploader';
import './styles.css';

// 支援環境變數和 widget 模式的 API URL
const getApiUrl = () => {
  let url = '';
  if (typeof window !== 'undefined' && window.CHATBOT_API_URL) {
    url = window.CHATBOT_API_URL;
  } else {
    // 優先使用環境變數，如果沒有則使用 Railway 後端網址
    // 注意：Vite 環境變數必須以 VITE_ 開頭
    const envUrl = import.meta.env.VITE_API_URL;
    url = envUrl || 'https://chatbot-app-production-2ea5.up.railway.app';
    
    // 調試：記錄實際使用的 URL（僅開發環境）
    if (import.meta.env.DEV) {
      console.log('API URL 來源:', {
        env: envUrl,
        fallback: 'https://chatbot-app-production-2ea5.up.railway.app',
        final: url
      });
    }
  }
  // 移除尾隨斜線，避免雙斜線問題
  return url.replace(/\/+$/, '');
};

function App() {
  const [showUploader, setShowUploader] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/status`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('檢查狀態失敗:', error);
    }
  };

  const handleUploadSuccess = () => {
    checkStatus();
    setShowUploader(false);
  };

  return (
    <div className="app">
      <div className="admin-panel">
        <h2>管理面板</h2>
        <button onClick={() => setShowUploader(!showUploader)}>
          {showUploader ? '隱藏' : '顯示'}文本上傳介面
        </button>
        
        {status && (
          <div className="status-info">
            <h3>系統狀態</h3>
            <p>知識庫: {status.knowledgeBase.hasContent ? '✅ 已載入' : '❌ 未載入'}</p>
            <p>文本長度: {status.knowledgeBase.textLength} 字元</p>
            <p>文本區塊數: {status.knowledgeBase.chunksCount}</p>
            <p>Gemini API: {status.gemini.connected ? '✅ 已連線' : '❌ 未連線'}</p>
          </div>
        )}

        {showUploader && (
          <TextUploader onSuccess={handleUploadSuccess} />
        )}
      </div>

      <div className="chat-container">
        <ChatWidget />
      </div>
    </div>
  );
}

export default App;

