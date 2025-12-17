import React, { useState } from 'react';

// 支援環境變數和 widget 模式的 API URL
const getApiUrl = () => {
  let url = '';
  if (typeof window !== 'undefined' && window.CHATBOT_API_URL) {
    url = window.CHATBOT_API_URL;
  } else {
    // 優先使用環境變數，如果沒有則使用 Railway 後端網址
    url = import.meta.env.VITE_API_URL || 'https://chatbot-app-production-9cd7.up.railway.app';
  }
  // 移除尾隨斜線，避免雙斜線問題
  return url.replace(/\/+$/, '');
};

const API_URL = getApiUrl();

function TextUploader({ onSuccess }) {
  const [textContent, setTextContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/upload/file`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `上傳成功！文本長度: ${data.textLength} 字元，已分割為 ${data.chunksCount} 個區塊。`
        });
        setTextContent('');
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.error || '上傳失敗');
      }
    } catch (error) {
      console.error('上傳檔案錯誤:', error);
      setMessage({
        type: 'error',
        text: `上傳失敗: ${error.message}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextUpload = async () => {
    if (!textContent.trim()) {
      setMessage({
        type: 'error',
        text: '請輸入文本內容'
      });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/api/upload/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: textContent
      });

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `上傳成功！文本長度: ${data.textLength} 字元，已分割為 ${data.chunksCount} 個區塊。`
        });
        setTextContent('');
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.error || '上傳失敗');
      }
    } catch (error) {
      console.error('上傳文本錯誤:', error);
      setMessage({
        type: 'error',
        text: `上傳失敗: ${error.message}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="text-uploader">
      <h3>上傳知識庫文本</h3>
      
      <div className="upload-section">
        <h4>方式一：上傳檔案</h4>
        <input
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </div>

      <div className="upload-section">
        <h4>方式二：直接輸入文本</h4>
        <textarea
          className="text-input"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="在此輸入或貼上您的文本內容..."
          rows="10"
          disabled={isUploading}
        />
        <button
          className="upload-button"
          onClick={handleTextUpload}
          disabled={isUploading || !textContent.trim()}
        >
          {isUploading ? '上傳中...' : '上傳文本'}
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default TextUploader;

