import express from 'express';
import multer from 'multer';
import fs from 'fs-extra';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { updateKnowledgeBase } from '../services/rag.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// 設定 multer 用於處理文本檔案上傳
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = join(__dirname, '../../data/uploads');
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'text-' + uniqueSuffix + '.txt');
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 限制
  fileFilter: (req, file, cb) => {
    // 允許文字檔案
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳 .txt 文字檔案'));
    }
  }
});

/**
 * POST /api/upload/file
 * 上傳文本檔案
 */
router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供檔案' });
    }

    const filePath = req.file.path;
    const textContent = await fs.readFile(filePath, 'utf-8');

    // 更新知識庫
    const result = await updateKnowledgeBase(textContent);

    // 刪除上傳的臨時檔案
    await fs.remove(filePath);

    res.json({
      success: true,
      message: '文本檔案上傳成功',
      chunksCount: result.chunksCount,
      textLength: textContent.length
    });
  } catch (error) {
    console.error('上傳檔案錯誤:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/upload/text
 * 直接上傳文本內容
 */
router.post('/text', express.text({ type: '*/*', limit: '10mb' }), async (req, res) => {
  try {
    const textContent = req.body;

    if (!textContent || textContent.trim().length === 0) {
      return res.status(400).json({ error: '文本內容不能為空' });
    }

    // 更新知識庫
    const result = await updateKnowledgeBase(textContent);

    res.json({
      success: true,
      message: '文本內容上傳成功',
      chunksCount: result.chunksCount,
      textLength: textContent.length
    });
  } catch (error) {
    console.error('上傳文本錯誤:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

