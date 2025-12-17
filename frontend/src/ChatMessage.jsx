import React, { useState } from 'react';

function ChatMessage({ message }) {
  const [showSources, setShowSources] = useState(false);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`message ${message.role} ${message.isError ? 'error' : ''}`}>
      <div className="message-content">
        <div className="message-text">{message.content}</div>
        {message.sources && message.sources.length > 0 && (
          <div className="message-sources">
            <button
              className="sources-toggle"
              onClick={() => setShowSources(!showSources)}
            >
              {showSources ? '隱藏' : '顯示'}參考來源 ({message.sources.length})
            </button>
            {showSources && (
              <div className="sources-list">
                {message.sources.map((source, idx) => (
                  <div key={idx} className="source-item">
                    <div className="source-header">區塊 {source.index + 1}</div>
                    <div className="source-text">{source.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="message-time">{formatTime(message.timestamp)}</div>
    </div>
  );
}

export default ChatMessage;

