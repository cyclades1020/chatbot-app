import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import apiRoutes from './routes/api.js';
import uploadRoutes from './routes/upload.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS 設定
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    // 允許沒有 origin 的請求（如 Postman、伺服器端請求）
    if (!origin) {
      return callback(null, true);
    }
    
    // 如果 ALLOWED_ORIGINS 設定為 '*'，則允許所有來源（僅用於測試）
    if (process.env.ALLOWED_ORIGINS === '*') {
      return callback(null, true);
    }
    
    // 檢查是否在允許清單中
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // 不允許的來源
    callback(new Error('不允許的 CORS 來源'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態檔案服務（用於提供上傳的文本檔案）
app.use('/uploads', express.static(join(__dirname, '../data/uploads')));

// API 路由
app.use('/api', apiRoutes);
app.use('/api/upload', uploadRoutes);

// 根路徑 - 顯示服務資訊
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '客服聊天機器人後端服務運行中',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      chat: '/api/chat',
      status: '/api/status',
      upload: '/api/upload'
    }
  });
});

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服務運行中' });
});

// 錯誤處理中間件（必須在所有路由之後）
app.use((err, req, res, next) => {
  // 處理 CORS 錯誤
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS 錯誤',
      message: err.message
    });
  }
  // 處理其他錯誤
  console.error('伺服器錯誤:', err);
  res.status(500).json({
    error: '伺服器錯誤',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 後端服務運行於 http://localhost:${PORT}`);
  console.log(`📝 環境: ${process.env.NODE_ENV || 'development'}`);
});

