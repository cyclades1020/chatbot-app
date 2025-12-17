import fs from 'fs-extra';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chunkText, retrieveRelevantChunks, calculateRelevanceScore } from '../utils/textProcessor.js';
import { generateAnswer, generateGeneralChat, expandQueryWithAI } from './gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../../data');
const TEXT_FILE = join(DATA_DIR, 'knowledge_base.txt');

// 確保資料目錄存在
await fs.ensureDir(DATA_DIR);

// 記憶體快取：儲存分塊後的文本
let textChunks = [];
let originalText = '';

/**
 * 載入知識庫文本
 */
async function loadKnowledgeBase() {
  try {
    if (await fs.pathExists(TEXT_FILE)) {
      originalText = await fs.readFile(TEXT_FILE, 'utf-8');
      textChunks = chunkText(originalText);
      console.log(`✅ 知識庫已載入，共 ${textChunks.length} 個文本區塊`);
    } else {
      originalText = '';
      textChunks = [];
      console.log('ℹ️  知識庫檔案不存在，等待上傳');
    }
  } catch (error) {
    console.error('載入知識庫時發生錯誤:', error);
    originalText = '';
    textChunks = [];
  }
}

// 初始化時載入知識庫
await loadKnowledgeBase();

/**
 * 更新知識庫文本
 * @param {string} text - 新的文本內容
 */
export async function updateKnowledgeBase(text) {
  try {
    await fs.writeFile(TEXT_FILE, text, 'utf-8');
    originalText = text;
    textChunks = chunkText(text);
    console.log(`✅ 知識庫已更新，共 ${textChunks.length} 個文本區塊`);
    return { success: true, chunksCount: textChunks.length };
  } catch (error) {
    console.error('更新知識庫時發生錯誤:', error);
    throw new Error(`更新知識庫失敗: ${error.message}`);
  }
}

/**
 * 獲取知識庫狀態
 */
export function getKnowledgeBaseStatus() {
  return {
    hasContent: originalText.length > 0,
    textLength: originalText.length,
    chunksCount: textChunks.length
  };
}

/**
 * RAG 問答處理
 * @param {string} query - 使用者問題
 * @returns {Promise<{answer: string, sources: Array}>}
 */
export async function processQuery(query) {
  // 如果沒有知識庫內容，根據規則回應
  if (textChunks.length === 0) {
    // 規則：如果知識庫為空，回應特定訊息
    return {
      answer: '不好意思，您的問題我們需要一些時間確認後再回覆您，請您稍等。',
      sources: [],
      mode: 'no_knowledge_base' // 標記為知識庫為空
    };
  }

  // 使用 AI 語義理解進行檢索（兩階段檢索）
  // 第一階段：使用 AI 理解問題的語義，擴展關鍵字
  let expandedQuery = query;
  try {
    expandedQuery = await expandQueryWithAI(query);
  } catch (error) {
    console.warn('AI 語義擴展失敗，使用原始查詢:', error.message);
    // 如果 AI 擴展失敗，繼續使用原始查詢
  }

  // 第二階段：使用擴展後的查詢進行檢索
  const relevantChunks = retrieveRelevantChunks(expandedQuery, textChunks, 5); // 增加檢索數量以提高準確度

  // 決定使用哪種策略
  let contextText;
  let useFullKnowledgeBase = false;
  
  if (relevantChunks.length === 0) {
    // 策略 1：如果精準檢索找不到，使用整個知識庫讓 AI 自行搜尋
    // 這會消耗更多 token，但能提高找到答案的機率
    // 知識庫目前約 1200 字元，加上 prompt 約 200 字元，總共約 1400 tokens（中文約 1 token = 1 字元）
    console.log('⚠️  精準檢索未找到結果，使用整個知識庫進行 AI 搜尋');
    contextText = originalText;
    useFullKnowledgeBase = true;
  } else {
    // 策略 2：使用精準檢索的結果（節省 token）
    contextText = relevantChunks
      .map((chunk, idx) => `[區塊 ${chunk.index + 1}]\n${chunk.text}`)
      .join('\n\n---\n\n');
  }

  // 使用 Gemini 生成回答（RAG 模式）
  try {
    const answer = await generateAnswer(query, contextText, useFullKnowledgeBase);
    
    return {
      answer,
      sources: [], // 不顯示參考資料來源
      mode: useFullKnowledgeBase ? 'full_rag' : 'rag' // 標記為完整 RAG 或精準 RAG
    };
  } catch (error) {
    console.error('處理查詢時發生錯誤:', error);
    
    // 如果 AI 服務都無法使用，使用簡單的關鍵字匹配備援方案
    if (error.message === 'AI_SERVICE_UNAVAILABLE') {
      console.log('⚠️  AI 服務無法使用，使用關鍵字匹配備援方案...');
      const fallbackAnswer = generateFallbackAnswer(query, contextText);
      return {
        answer: fallbackAnswer,
        sources: [],
        mode: 'fallback'
      };
    }
    
    // 其他錯誤返回友善的錯誤訊息
    return {
      answer: '不好意思，目前 AI 服務暫時無法使用，請稍後再試。如有緊急問題，請直接聯繫客服：0800-123-456。',
      sources: [],
      mode: 'error'
    };
  }
}

// 重新載入知識庫的函數（用於檔案更新後）
export { loadKnowledgeBase };

