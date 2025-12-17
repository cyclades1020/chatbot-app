import React from 'react';

function ChatMessage({ message }) {
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
      </div>
      <div className="message-time">{formatTime(message.timestamp)}</div>
    </div>
  );
}

export default ChatMessage;

