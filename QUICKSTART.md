# 快速開始指南

## 第一步：安裝依賴

```bash
npm run install:all
```

## 第二步：設定 Gemini API Key

1. 前往 [Google AI Studio](https://makersuite.google.com/app/apikey) 取得 API Key
2. 複製環境變數範例檔案：
   ```bash
   cp backend/.env.example backend/.env
   ```
3. 編輯 `backend/.env`，填入您的 API Key：
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

## 第三步：啟動服務

**終端機 1 - 啟動後端：**
```bash
npm run dev:backend
```

**終端機 2 - 啟動前端：**
```bash
npm run dev:frontend
```

## 第四步：使用應用程式

1. 開啟瀏覽器前往：http://localhost:5173
2. 點擊「顯示文本上傳介面」
3. 上傳或輸入您的知識庫文本
4. 開始與聊天機器人對話！

## 測試範例

上傳以下範例文本進行測試：

```
歡迎使用我們的客服系統。

常見問題：

1. 退貨政策
   - 商品收到後 7 天內可申請退貨
   - 商品需保持原狀，未使用過
   - 運費由買家負擔

2. 運送時間
   - 台灣本島：3-5 個工作天
   - 離島地區：5-7 個工作天
   - 海外地區：7-14 個工作天

3. 付款方式
   - 信用卡
   - ATM 轉帳
   - 超商代碼繳費

如有其他問題，歡迎隨時詢問！
```

然後嘗試問：「退貨要幾天內申請？」或「運送時間是多久？」

## 疑難排解

### 後端無法啟動
- 確認已安裝 Node.js (建議 v18+)
- 確認已設定 `GEMINI_API_KEY`
- 檢查 3001 埠是否被占用

### 前端無法連接到後端
- 確認後端服務正在運行
- 檢查 `backend/.env` 中的 `ALLOWED_ORIGINS` 設定
- 確認 CORS 設定正確

### Gemini API 錯誤
- 確認 API Key 正確
- 檢查 API 配額是否用完
- 查看後端終端機的錯誤訊息

