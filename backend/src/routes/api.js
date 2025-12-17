import express from 'express';
import { processQuery, getKnowledgeBaseStatus } from '../services/rag.js';
import { testGeminiConnection } from '../services/gemini.js';

const router = express.Router();

/**
 * POST /api/chat
 * 處理聊天訊息（支援串流模式）
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, stream } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: '請提供有效的訊息內容' });
    }

    // 如果請求串流模式
    if (stream === true) {
      return handleStreamingChat(req, res, message.trim());
    }

    // 一般模式
    const result = await processQuery(message.trim());

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('處理聊天訊息錯誤:', error);
    res.status(500).json({
      success: false,
      answer: `處理您的訊息時發生錯誤: ${error.message}`,
      sources: []
    });
  }
});

/**
 * 處理串流聊天
 */
async function handleStreamingChat(req, res, query) {
  // 設定 SSE (Server-Sent Events) 標頭
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 緩衝

  try {
    const { processQueryStream } = await import('../services/rag.js');
    await processQueryStream(query, (chunk) => {
      // 發送每個文字片段
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    });

    // 發送完成訊息
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error) {
    console.error('串流處理錯誤:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
}

/**
 * GET /api/status
 * 獲取服務狀態
 */
router.get('/status', async (req, res) => {
  try {
    const kbStatus = getKnowledgeBaseStatus();
    const geminiConnected = await testGeminiConnection();

    res.json({
      success: true,
      knowledgeBase: kbStatus,
      gemini: {
        connected: geminiConnected,
        configured: !!process.env.GEMINI_API_KEY
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

