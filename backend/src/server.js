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
    // 允許沒有 origin 的請求（如 Postman）或允許的來源
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('不允許的 CORS 來源'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 靜態檔案服務（用於提供上傳的文本檔案）
app.use('/uploads', express.static(join(__dirname, '../data/uploads')));

// API 路由
app.use('/api', apiRoutes);
app.use('/api/upload', uploadRoutes);

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服務運行中' });
});

app.listen(PORT, () => {
  console.log(`🚀 後端服務運行於 http://localhost:${PORT}`);
  console.log(`📝 環境: ${process.env.NODE_ENV || 'development'}`);
});

