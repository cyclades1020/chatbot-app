import express from 'express';
import { processQuery, getKnowledgeBaseStatus } from '../services/rag.js';
import { testGeminiConnection } from '../services/gemini.js';

const router = express.Router();

/**
 * POST /api/chat
 * 處理聊天訊息
 */
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: '請提供有效的訊息內容' });
    }

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

