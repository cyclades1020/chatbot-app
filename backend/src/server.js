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
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
const isWildcard = allowedOriginsEnv === '*' || allowedOriginsEnv?.trim() === '*';

// 預設允許的 Vercel 網址（包含所有可能的 Vercel 網址）
const defaultVercelOrigins = [
  'https://chatbot-app-eight-sepia.vercel.app',
  'https://chatbot-app-git-main-cyclades1020s-projects.vercel.app',
  // 可以加入更多 Vercel 預覽網址
];

// 本地開發網址
const localOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

// 記錄 CORS 設定（用於調試）
console.log('CORS 設定:', {
  ALLOWED_ORIGINS: allowedOriginsEnv,
  isWildcard: isWildcard
});

// 如果設定為 '*'，使用簡單的 CORS 配置（允許所有來源）
// 注意：如果使用 credentials，不能使用 *，必須明確指定來源
if (isWildcard) {
  console.log('✅ 使用 wildcard CORS 配置（允許所有來源）');
  // 不使用 credentials，因為 wildcard 與 credentials 不相容
  app.use(cors({
    origin: true, // 允許所有來源
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
} else {
  // 否則使用指定的來源清單
  const allowedOrigins = allowedOriginsEnv?.split(',').map(origin => origin.trim()).filter(origin => origin) || [...defaultVercelOrigins, ...localOrigins];
  console.log('✅ 使用指定來源 CORS 配置:', allowedOrigins);
  
  app.use(cors({
    origin: (origin, callback) => {
      // 允許沒有 origin 的請求（如 Postman、伺服器端請求）
      if (!origin) {
        return callback(null, true);
      }
      
      // 檢查是否在允許清單中（不區分大小寫）
      const normalizedOrigin = origin.trim();
      const isAllowed = allowedOrigins.some(allowed => {
        const normalizedAllowed = allowed.toLowerCase();
        const normalizedRequest = normalizedOrigin.toLowerCase();
        // 支援 Vercel 的預覽網址（包含專案名稱即可）
        if (normalizedAllowed.includes('vercel.app') && normalizedRequest.includes('vercel.app')) {
          return true; // 允許所有 Vercel 網址
        }
        return normalizedAllowed === normalizedRequest;
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
      
      // 不允許的來源
      console.log(`❌ CORS 拒絕來源: ${origin}`);
      console.log(`   允許的來源:`, allowedOrigins);
      callback(new Error('不允許的 CORS 來源'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
}

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

