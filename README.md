# 客服聊天機器人 APP

一個可鑲嵌到網站的客服聊天機器人，支援 Gemini AI 與 RAG（檢索增強生成）功能，嚴格限制回答只能從提供的文本內容中擷取。

## 功能特色

- 🤖 **Gemini AI 整合**：使用 Google Gemini 2.0 Flash Lite 進行自然語言處理（快速且高效）
- 📚 **智能 RAG 功能**：兩階段檢索系統（AI 語義擴展 + 文本檢索）
- 🔄 **自動知識庫擴展**：精準搜索失敗時，自動學習並擴展關鍵字到知識庫
- 📝 **文本管理**：支援檔案上傳或直接輸入文本作為知識庫
- 🎨 **可鑲嵌設計**：前端可打包成 widget，輕鬆嵌入任何網站
- 🔒 **嚴格限制**：回答僅基於知識庫內容，不會編造資訊
- ⚡ **串流模式**：支援 Server-Sent Events (SSE) 即時回應
- 🛡️ **降級機制**：串流失敗時自動切換到一般模式
- 💬 **自然答覆**：無相關資料時，AI 生成自然、多樣化的友善答覆

## 專案結構

```
CURSER_APP/
├── backend/          # 後端 API 服務
│   ├── src/
│   │   ├── server.js          # Express 伺服器
│   │   ├── routes/            # API 路由
│   │   │   ├── api.js         # 聊天 API（支援串流模式）
│   │   │   └── upload.js      # 文本上傳 API
│   │   ├── services/          # 業務邏輯
│   │   │   ├── gemini.js      # Gemini AI 服務
│   │   │   ├── rag.js         # RAG 服務（檢索與回答生成）
│   │   │   └── ollama.js      # Ollama 備用服務
│   │   └── utils/             # 工具函數
│   │       ├── textProcessor.js # 文本處理（分塊、檢索）
│   │       └── rateLimiter.js   # 速率限制和重試機制
│   └── data/                  # 知識庫資料儲存
│       └── knowledge_base.txt # 知識庫檔案
├── frontend/        # 前端 React 應用
│   ├── src/
│   │   ├── App.jsx            # 主應用組件
│   │   ├── ChatWidget.jsx     # 聊天介面（支援串流）
│   │   ├── ChatMessage.jsx    # 訊息元件
│   │   ├── TextUploader.jsx   # 文本上傳介面
│   │   └── widget.js          # Widget 入口
│   └── index.html             # 測試頁面
└── README.md
```

## 安裝與設定

### 1. 安裝依賴

```bash
# 安裝所有依賴（根目錄、後端、前端）
npm run install:all
```

或分別安裝：

```bash
# 後端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 2. 設定環境變數

複製後端的環境變數範例檔案：

```bash
cp backend/.env.example backend/.env
```

編輯 `backend/.env`，填入您的 Gemini API Key：

**本地開發環境設定：**
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

**環境變數說明：**
- `GEMINI_API_KEY`：您的 Gemini API Key（必填）
- `PORT`：後端服務端口（預設 3001）
- `NODE_ENV`：環境模式（development 或 production）
- `ALLOWED_ORIGINS`：允許連接的前端網址（本地開發使用 localhost，生產環境使用實際網址）

**生產環境設定：**
如需部署到雲端（Railway、Vercel 等），請參考 `客戶說明文件.md` 中的部署章節，設定對應的環境變數。

### 3. 取得 Gemini API Key

1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 建立新的 API Key
3. 將 API Key 填入 `.env` 檔案

## 執行方式

### 開發模式

**終端機 1 - 啟動後端：**
```bash
npm run dev:backend
# 或
cd backend
npm run dev
```

**終端機 2 - 啟動前端：**
```bash
npm run dev:frontend
# 或
cd frontend
npm start
```

- 後端服務：http://localhost:3001
- 前端應用：http://localhost:5173

### 生產模式

**建置前端：**
```bash
npm run build:frontend
# 或
cd frontend
npm run build
```

**啟動後端：**
```bash
cd backend
npm start
```

## 使用方式

### 1. 上傳知識庫文本

有兩種方式可以上傳文本：

**方式一：上傳檔案**
- 點擊「顯示文本上傳介面」
- 選擇 `.txt` 檔案上傳

**方式二：直接輸入**
- 在文本輸入框中貼上或輸入內容
- 點擊「上傳文本」

### 2. 開始聊天

- 在聊天介面輸入問題
- 系統會自動執行以下流程：
  1. **精準搜索**：使用 AI 語義擴展查詢，然後從知識庫檢索相關內容
  2. **智能理解**：如果精準搜索失敗，使用整個知識庫讓 AI 理解並重組答案
  3. **自然答覆**：如果知識庫無相關資料，AI 生成自然、多樣化的友善答覆

### 3. 自動知識庫擴展

當精準搜索失敗但 AI 成功找到答案時，系統會自動：
- 分析問題和答案
- 生成擴展關鍵字（同義詞）
- 將關鍵字整合到知識庫對應段落
- 提升未來檢索準確度

### 4. 鑲嵌到網站

#### **方法一：使用 iframe（最簡單，推薦）**

**適用場景**：WordPress、一般 HTML 網站、任何支援 iframe 的平台

**步驟：**

1. **取得前端網址**
   - 如果使用 Vercel 部署：`https://您的專案名稱.vercel.app`
   - 如果有自訂網域：使用您的自訂網域

2. **在 HTML 中加入程式碼**
   
   **位置**：建議放在 `</body>` 標籤前（頁面底部）
   
   ```html
   <!-- 聊天機器人 iframe -->
   <div id="chatbot-container" style="position: fixed; bottom: 20px; right: 20px; width: 400px; height: 600px; z-index: 9999;">
     <iframe 
       src="https://您的Vercel網址或自訂網域" 
       width="100%" 
       height="100%"
       frameborder="0"
       style="border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);">
     </iframe>
   </div>
   ```

3. **參數說明**：
   - `src`：**前端網址**（Vercel 部署的網址，不是 Railway）
   - `width`：聊天視窗寬度（建議 400px）
   - `height`：聊天視窗高度（建議 600px）
   - `bottom: 20px`：距離底部 20 像素（可調整）
   - `right: 20px`：距離右側 20 像素（可調整）
   - `z-index: 9999`：確保聊天視窗在最上層

4. **WordPress 範例**：
   - 進入「外觀」→「主題編輯器」
   - 找到 `footer.php` 檔案
   - 在 `</body>` 標籤前加入上述程式碼

---

#### **方法二：使用建置後的 Widget（進階）**

**適用場景**：需要更多控制權、自訂樣式、動態載入

**步驟：**

1. **建置前端**：
```bash
cd frontend
npm run build
```

2. **上傳檔案**
   - 將 `frontend/dist/` 資料夾中的檔案上傳到您的網站伺服器
   - 可以使用 FTP 或網站檔案管理器

3. **在 HTML 中加入程式碼**
   
   **位置**：建議放在 `</body>` 標籤前（頁面底部）
   
   ```html
   <!-- 聊天機器人容器 -->
   <div id="chatbot-widget"></div>
   
   <!-- 載入 Widget 腳本 -->
   <script src="https://您的網站網址/chatbot/chatbot-widget.js"></script>
   
   <!-- 初始化聊天機器人 -->
   <script>
     window.initChatbotWidget('chatbot-widget', {
       apiUrl: 'https://您的Railway後端網址'  // 重要：這是後端網址（Railway），不是前端網址
     });
   </script>
   
   <!-- 樣式設定（可選） -->
   <style>
     #chatbot-widget {
       position: fixed;
       bottom: 20px;
       right: 20px;
       width: 400px;
       height: 600px;
       z-index: 9999;
     }
   </style>
   ```

4. **參數詳細說明**：
   
   - **`apiUrl`（必填）**：
     - **類型**：字串（String）
     - **說明**：後端 API 的網址（Railway 部署的網址）
     - **格式**：`https://您的Railway網址`（例如：`https://your-app.up.railway.app`）
     - **重要**：這是**後端網址**（Railway），不是前端網址（Vercel）
     - **如何取得**：
       1. 登入 Railway 專案
       2. 進入「Settings」→「Domains」
       3. 複製產生的網址或自訂網域
     - **注意**：必須使用 HTTPS，不能使用 HTTP
   
   - **`chatbot-widget`（容器 ID）**：
     - **類型**：字串（String）
     - **說明**：聊天機器人容器的 HTML ID
     - **預設**：`'chatbot-widget'`
     - **可自訂**：可以改為任何您想要的 ID，但要確保與 `initChatbotWidget` 的第一個參數一致

5. **完整範例**：
```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <title>我的網站</title>
</head>
<body>
  <!-- 您的網站內容 -->
  
  <!-- 聊天機器人（放在 body 底部） -->
  <div id="chatbot-widget"></div>
  <script src="https://您的網站網址/chatbot/chatbot-widget.js"></script>
  <script>
    window.initChatbotWidget('chatbot-widget', {
      apiUrl: 'https://your-app.up.railway.app'  // Railway 後端網址
    });
  </script>
  <style>
    #chatbot-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 400px;
      height: 600px;
      z-index: 9999;
    }
  </style>
</body>
</html>
```

---

#### **重要說明**

**網址對應關係**：
- **前端網址（Vercel）**：用於 iframe 的 `src` 屬性
- **後端網址（Railway）**：用於 Widget 的 `apiUrl` 參數

**為什麼需要兩個網址？**
- **前端（Vercel）**：負責顯示聊天介面（UI）
- **後端（Railway）**：負責處理 AI 邏輯和 API 請求

**CORS 設定**：
- 確保 Railway 後端的 `ALLOWED_ORIGINS` 環境變數包含您的網站網址
- 例如：`ALLOWED_ORIGINS=https://您的網站.com,https://您的Vercel網址`

## API 端點

### `POST /api/chat`
發送聊天訊息（支援串流模式）

**請求：**
```json
{
  "message": "您的問題",
  "stream": false  // 可選：true 啟用串流模式
}
```

**一般模式回應：**
```json
{
  "success": true,
  "answer": "AI 生成的回答",
  "sources": [],
  "mode": "rag"  // rag, full_rag, no_knowledge_base
}
```

**串流模式回應：**
```
data: {"type":"chunk","content":"AI"}
data: {"type":"chunk","content":" 生成的"}
data: {"type":"chunk","content":" 回答"}
data: {"type":"done"}
```

### `POST /api/upload/text`
上傳文本內容

**請求：**
```
Content-Type: text/plain

您的文本內容...
```

**回應：**
```json
{
  "success": true,
  "message": "文本內容上傳成功",
  "chunksCount": 10,
  "textLength": 5000
}
```

### `POST /api/upload/file`
上傳文本檔案

**請求：**
```
Content-Type: multipart/form-data
file: [檔案]
```

### `GET /api/status`
獲取服務狀態

**回應：**
```json
{
  "success": true,
  "knowledgeBase": {
    "hasContent": true,
    "textLength": 5000,
    "chunksCount": 10
  },
  "gemini": {
    "connected": true,
    "configured": true
  }
}
```

## 技術架構

- **後端**：Node.js + Express
- **前端**：React + Vite
- **AI 模型**：Google Gemini 2.0 Flash Lite（快速且高效）
- **文本處理**：自訂 RAG 實作（AI 語義擴展 + 文本分塊 + 關鍵字匹配）
- **串流技術**：Server-Sent Events (SSE)

## RAG 運作原理

### 工作流程

1. **第一階段：AI 語義擴展**
   - 使用 Gemini AI 理解問題的語義
   - 擴展同義詞和相關關鍵字（例如：「營業時間」→「營業時間 服務時間 開店時間」）

2. **第二階段：文本檢索**
   - 使用擴展後的查詢從知識庫檢索相關文本區塊
   - 返回最相關的 5 個文本區塊

3. **第三階段：回答生成**
   - **精準模式**：使用檢索到的相關區塊生成回答（節省 token）
   - **完整模式**：如果精準搜索失敗，使用整個知識庫讓 AI 理解並重組答案
   - **預設模式**：如果知識庫無相關資料，AI 生成自然、多樣化的友善答覆

4. **第四階段：自動擴展（背景執行）**
   - 當使用完整模式且成功生成回答時
   - AI 分析問題和答案，找出相關段落
   - 生成擴展關鍵字並整合到知識庫
   - 提升未來檢索準確度

### 文本分塊

- 將上傳的文本分割成較小的區塊（預設 1000 字元）
- 區塊之間有適當的重疊（200 字元），確保上下文連貫
- 根據段落和句子進行智能分割

### 回答限制

- 提示詞明確要求只基於提供的文本回答，不編造資訊
- 可以重組知識庫中的不同段落資訊，形成完整回答
- 無相關資料時，生成自然、多樣化的友善答覆（包含客服聯繫方式）

## 串流模式

### 功能說明

- 支援 Server-Sent Events (SSE) 即時回應
- AI 回答會逐字顯示，提升使用者體驗
- 自動降級：串流失敗時自動切換到一般模式

### 使用方式

前端自動啟用串流模式，無需額外設定。如果串流失敗，會自動降級到一般模式。

## 注意事項

- ⚠️ 確保後端服務正常運行，前端才能正常運作
- ⚠️ 請妥善保管 Gemini API Key，不要提交到版本控制
- ⚠️ 文本上傳有 10MB 的大小限制
- ⚠️ 知識庫內容建議使用 UTF-8 編碼，避免中文亂碼
- ⚠️ 自動擴展功能在背景執行，不會影響回應速度

## 授權

MIT License
