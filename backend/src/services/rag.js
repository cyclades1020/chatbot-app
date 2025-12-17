import fs from 'fs-extra';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chunkText, retrieveRelevantChunks } from '../utils/textProcessor.js';
import { generateAnswer, generateGeneralChat } from './gemini.js';

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
  // 如果沒有知識庫內容，使用一般對話模式
  if (textChunks.length === 0) {
    try {
      const answer = await generateGeneralChat(query);
      return {
        answer,
        sources: [],
        mode: 'general' // 標記為一般對話模式
      };
    } catch (error) {
      console.error('一般對話處理錯誤:', error);
      return {
        answer: `處理您的問題時發生錯誤: ${error.message}`,
        sources: [],
        mode: 'general'
      };
    }
  }

  // 檢索相關文本區塊
  const relevantChunks = retrieveRelevantChunks(query, textChunks, 3);

  // 如果找不到相關內容，自動切換到一般對話模式
  if (relevantChunks.length === 0) {
    try {
      const answer = await generateGeneralChat(query);
      return {
        answer,
        sources: [],
        mode: 'general' // 標記為一般對話模式（知識庫無相關內容時）
      };
    } catch (error) {
      console.error('一般對話處理錯誤:', error);
      return {
        answer: `處理您的問題時發生錯誤: ${error.message}`,
        sources: [],
        mode: 'general'
      };
    }
  }

  // 組合相關文本作為上下文
  const contextText = relevantChunks
    .map((chunk, idx) => `[區塊 ${chunk.index + 1}]\n${chunk.text}`)
    .join('\n\n---\n\n');

  // 使用 Gemini 生成回答（RAG 模式）
  try {
    const answer = await generateAnswer(query, contextText);
    
    return {
      answer,
      sources: relevantChunks.map(chunk => ({
        index: chunk.index,
        text: chunk.text.substring(0, 200) + '...', // 只顯示前 200 字元
        score: chunk.score
      })),
      mode: 'rag' // 標記為 RAG 模式
    };
  } catch (error) {
    console.error('處理查詢時發生錯誤:', error);
    
    // 如果錯誤訊息包含 Ollama 也失敗，才返回錯誤
    // 否則 generateAnswer 應該已經自動切換到 Ollama 了
    if (error.message && error.message.includes('Ollama 也發生錯誤')) {
      return {
        answer: `處理您的問題時發生錯誤: ${error.message}`,
        sources: [],
        mode: 'rag'
      };
    }
    
    // 如果還有其他錯誤，可能是 Ollama 也失敗了
    return {
      answer: `處理您的問題時發生錯誤: ${error.message}`,
      sources: [],
      mode: 'rag'
    };
  }
}

// 重新載入知識庫的函數（用於檔案更新後）
export { loadKnowledgeBase };

