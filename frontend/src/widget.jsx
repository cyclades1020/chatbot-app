/**
 * 可鑲嵌的聊天機器人 Widget
 * 使用方式：
 * <div id="chatbot-widget"></div>
 * <script src="path/to/chatbot-widget.js"></script>
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatWidget from './ChatWidget';
import './ChatWidget.css';

// 全域函數，用於初始化 widget
window.initChatbotWidget = function(containerId = 'chatbot-widget', config = {}) {
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.error(`找不到 ID 為 "${containerId}" 的容器元素`);
    return;
  }

  // 設定 API URL（如果提供）
  if (config.apiUrl) {
    window.CHATBOT_API_URL = config.apiUrl;
  }

  // 渲染 React 組件
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      <ChatWidget />
    </React.StrictMode>
  );
};

// 如果頁面上已經有 chatbot-widget 元素，自動初始化
if (document.getElementById('chatbot-widget')) {
  window.initChatbotWidget();
}

