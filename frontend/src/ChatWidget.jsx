import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import './ChatWidget.css';

// 支援環境變數和 widget 模式的 API URL
const getApiUrl = () => {
  let url = '';
  if (typeof window !== 'undefined' && window.CHATBOT_API_URL) {
    url = window.CHATBOT_API_URL;
  } else {
    // 優先使用環境變數，如果沒有則使用 Railway 後端網址
    url = import.meta.env.VITE_API_URL || 'https://chatbot-app-production-2ea5.up.railway.app';
  }
  // 移除尾隨斜線，避免雙斜線問題
  return url.replace(/\/+$/, '');
};

const API_URL = getApiUrl();

function ChatWidget() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '您好！我是客服聊天機器人，有什麼可以協助您的嗎？',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [widgetSize, setWidgetSize] = useState({ width: 400, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const widgetRef = useRef(null);
  const resizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 設定 60 秒超時
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: userMessage.content }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 檢查響應狀態
      if (!response.ok) {
        throw new Error(`伺服器錯誤: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.answer,
          timestamp: new Date(),
          sources: data.sources
        }]);
      } else {
        throw new Error(data.error || '處理訊息失敗');
      }
    } catch (error) {
      console.error('發送訊息錯誤:', error);
      
      // 提供更詳細的錯誤訊息
      let errorMessage = '處理您的訊息時發生錯誤';
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
        errorMessage = '請求超時，請稍後再試。如果持續發生，可能是 AI 模型處理時間較長。';
      } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        errorMessage = '無法連接到伺服器，請確認後端服務是否正在運行。';
      } else if (error.message) {
        errorMessage = `處理您的訊息時發生錯誤：${error.message}`;
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleMouseDown = (e) => {
    if (isMinimized) return;
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: widgetSize.width,
      startHeight: widgetSize.height
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      const deltaX = e.clientX - resizeRef.current.startX;
      const deltaY = e.clientY - resizeRef.current.startY;
      setWidgetSize({
        width: Math.max(300, Math.min(800, resizeRef.current.startWidth + deltaX)),
        height: Math.max(400, Math.min(900, resizeRef.current.startHeight - deltaY))
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing]);

  // 如果完全縮小，只顯示懸浮 icon
  if (isMinimized) {
    return (
      <div 
        className="chat-widget-icon"
        onClick={handleMinimize}
        title="點擊展開聊天視窗"
      >
        <div className="icon-badge">
          {messages.filter(m => m.role === 'user').length > 0 && (
            <span className="unread-badge">{messages.filter(m => m.role === 'user').length}</span>
          )}
        </div>
        <div className="icon-content">💬</div>
      </div>
    );
  }

  return (
    <div 
      className="chat-widget"
      ref={widgetRef}
      style={{
        width: `${widgetSize.width}px`,
        height: `${widgetSize.height}px`
      }}
    >
      <div className="chat-header">
        <h3>💬 客服聊天</h3>
        <button className="minimize-button" onClick={handleMinimize} title="縮小">
          ⬇️
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}
        {isLoading && (
          <div className="message assistant loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="輸入您的問題..."
          rows="2"
          disabled={isLoading}
        />
        <button
          className="send-button"
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
        >
          發送
        </button>
      </div>
      <div 
        className="resize-handle"
        onMouseDown={handleMouseDown}
      ></div>
    </div>
  );
}

export default ChatWidget;

