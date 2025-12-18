import fs from 'fs-extra';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chunkText, retrieveRelevantChunks, calculateRelevanceScore } from '../utils/textProcessor.js';
import { generateAnswer, generateGeneralChat, expandQueryWithAI, analyzeAndExpandKnowledgeBase } from './gemini.js';

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
    
    // 如果使用完整知識庫且成功生成回答，自動擴展知識庫
    if (useFullKnowledgeBase && answer) {
      // 非同步執行，不阻塞回應
      expandKnowledgeBaseAsync(query, answer).catch(err => {
        console.warn('知識庫擴展失敗（不影響回答）:', err.message);
      });
    }
    
    return {
      answer,
      sources: [], // 不顯示參考資料來源
      mode: useFullKnowledgeBase ? 'full_rag' : 'rag' // 標記為完整 RAG 或精準 RAG
    };
  } catch (error) {
    console.error('處理查詢時發生錯誤:', error);
    console.error('錯誤詳情:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n')
    });
    
    // 安全過濾阻擋
    if (error.message === 'SAFETY_FILTER_BLOCKED') {
      console.log('⚠️  回應被安全設定阻擋，使用備援方案...');
      const fallbackAnswer = generateFallbackAnswer(query, contextText);
      return {
        answer: fallbackAnswer,
        sources: [],
        mode: 'safety_fallback'
      };
    }
    
    // 空回應
    if (error.message === 'EMPTY_RESPONSE') {
      console.log('⚠️  API 回應為空，使用備援方案...');
      const fallbackAnswer = generateFallbackAnswer(query, contextText);
      return {
        answer: fallbackAnswer,
        sources: [],
        mode: 'empty_response_fallback'
      };
    }
    
    // 速率限制錯誤 - 使用備援方案而不是直接返回錯誤
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      console.log('⚠️  速率限制錯誤，使用關鍵字匹配備援方案...');
      const fallbackAnswer = generateFallbackAnswer(query, contextText);
      return {
        answer: fallbackAnswer + '\n\n（註：目前 AI 服務使用量較高，以上為基於知識庫的快速回答）',
        sources: [],
        mode: 'rate_limit_fallback'
      };
    }
    
    // API Key 錯誤 - 告知管理員
    if (error.message === 'API_KEY_INVALID') {
      console.error('❌ Gemini API Key 設定錯誤，請檢查環境變數');
      return {
        answer: '系統設定錯誤，請聯繫技術支援。如有緊急問題，請聯繫客服：0800-123-456。',
        sources: [],
        mode: 'config_error'
      };
    }
    
    // 如果 AI 服務都無法使用，使用簡單的關鍵字匹配備援方案
    if (error.message === 'AI_SERVICE_UNAVAILABLE' || 
        (error.message && error.message.includes('Ollama 也發生錯誤'))) {
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

/**
 * 備援方案：當 AI 服務無法使用時，使用簡單的關鍵字匹配生成回答
 * @param {string} query - 使用者問題
 * @param {string} contextText - 知識庫內容
 * @returns {string} 簡單的回答
 */
function generateFallbackAnswer(query, contextText) {
  // 定義常見問題的關鍵字映射
  const keywordMap = {
    '退貨': '根據我們的退貨政策，商品收到後 7 天內可申請退貨。商品需保持原狀、未使用過，運費由買家負擔。退款將在收到商品後 3-5 個工作天內處理。',
    '運送': '運送時間如下：台灣本島 3-5 個工作天，離島地區 5-7 個工作天，海外地區 7-14 個工作天，超商取貨 2-3 個工作天。',
    '付款': '我們接受以下付款方式：信用卡（Visa、MasterCard、JCB）、ATM 轉帳、超商代碼繳費、貨到付款（需加收手續費 NT$ 30）。',
    '聯絡': '聯絡資訊：客服電話 0800-123-456，服務時間週一至週五 9:00-18:00，電子郵件 service@example.com，線上客服 24 小時服務。',
    '服務時間': '服務時間為週一至週五 9:00-18:00，線上客服提供 24 小時服務。',
    '營業時間': '服務時間為週一至週五 9:00-18:00，線上客服提供 24 小時服務。',
    '會員': '會員權益：新會員註冊即享 100 元購物金，生日當月享 9 折優惠，累積消費滿 5000 元升級為 VIP 會員，VIP 會員享有免運費優惠。',
    '電話': '客服電話：0800-123-456，服務時間週一至週五 9:00-18:00。',
    'email': '電子郵件：service@example.com',
    '郵件': '電子郵件：service@example.com'
  };

  // 檢查關鍵字匹配
  const queryLower = query.toLowerCase();
  for (const [keyword, answer] of Object.entries(keywordMap)) {
    if (queryLower.includes(keyword)) {
      return answer;
    }
  }

  // 如果沒有匹配，嘗試從知識庫中提取相關內容
  if (contextText) {
    // 簡單的關鍵字匹配，找出最相關的段落
    const lines = contextText.split('\n').filter(line => line.trim().length > 0);
    let bestMatch = '';
    let bestScore = 0;

    for (const line of lines) {
      const score = calculateRelevanceScore(query, line);
      if (score > bestScore && score > 0) {
        bestScore = score;
        bestMatch = line;
      }
    }

    if (bestMatch) {
      // 清理並格式化回答
      return bestMatch.trim().replace(/^[-•]\s*/, '').substring(0, 200);
    }
  }

  // 最後的備援：返回預設訊息
  return '不好意思，您的問題我們需要一些時間確認後再回覆您，請您稍等。如有緊急問題，請聯繫客服：0800-123-456。';
}

/**
 * 非同步擴展知識庫（不阻塞回應）
 * @param {string} query - 使用者問題
 * @param {string} answer - AI 生成的回答
 */
async function expandKnowledgeBaseAsync(query, answer) {
  try {
    console.log('🔄 開始分析並擴展知識庫...');
    
    // 使用 AI 分析問題和回答，找出相關段落和擴展關鍵字
    const analysis = await analyzeAndExpandKnowledgeBase(query, originalText, answer);
    
    if (!analysis || !analysis.matchedSection || !analysis.expandedKeywords) {
      console.log('⚠️  無法分析出相關段落或關鍵字，跳過擴展');
      return;
    }

    // 在知識庫中找到匹配的段落
    const lines = originalText.split('\n');
    let matchedIndex = -1;
    let bestMatch = '';
    let bestScore = 0;

    // 尋找最匹配的段落
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(analysis.matchedSection.trim().substring(0, 20))) {
        // 找到匹配的行，檢查完整段落
        let section = '';
        let startIdx = Math.max(0, i - 2);
        let endIdx = Math.min(lines.length, i + 10);
        
        for (let j = startIdx; j < endIdx; j++) {
          section += lines[j] + '\n';
        }
        
        const score = calculateRelevanceScore(analysis.matchedSection, section);
        if (score > bestScore) {
          bestScore = score;
          matchedIndex = i;
          bestMatch = section;
        }
      }
    }

    if (matchedIndex === -1) {
      console.log('⚠️  無法在知識庫中找到匹配的段落，跳過擴展');
      return;
    }

    // 將擴展關鍵字整合到匹配的段落
    const expandedKeywords = analysis.expandedKeywords.split(/\s+/).filter(k => k.length > 0);
    if (expandedKeywords.length === 0) {
      console.log('⚠️  沒有有效的擴展關鍵字，跳過擴展');
      return;
    }

    // 找到段落標題行（通常是數字開頭或包含冒號的行）
    let sectionStart = matchedIndex;
    for (let i = matchedIndex; i >= 0; i--) {
      if (lines[i].match(/^\d+\.|^[A-Za-z].*[:：]/) || lines[i].trim().length === 0) {
        sectionStart = i;
        if (lines[i].trim().length > 0) break;
      }
    }

    // 在段落標題後添加擴展關鍵字（作為註解或補充）
    const titleLine = lines[sectionStart];
    if (!titleLine.includes('（') && !titleLine.includes('(')) {
      // 如果標題行沒有註解，添加擴展關鍵字
      lines[sectionStart] = `${titleLine} （相關關鍵字：${expandedKeywords.join('、')}）`;
    } else {
      // 如果已有註解，在下一行添加
      const insertIndex = sectionStart + 1;
      if (insertIndex < lines.length && lines[insertIndex].trim().length > 0) {
        // 在下一行前插入
        lines.splice(insertIndex, 0, `   - 相關關鍵字：${expandedKeywords.join('、')}`);
      } else {
        // 如果下一行是空的，直接插入
        lines[insertIndex] = `   - 相關關鍵字：${expandedKeywords.join('、')}`;
      }
    }

    // 更新知識庫
    const updatedText = lines.join('\n');
    await updateKnowledgeBase(updatedText);
    
    console.log(`✅ 知識庫已擴展，新增關鍵字：${expandedKeywords.join('、')}`);
  } catch (error) {
    console.error('擴展知識庫時發生錯誤:', error);
    // 不拋出錯誤，避免影響正常回答
  }
}

/**
 * 串流模式處理查詢
 * @param {string} query - 使用者問題
 * @param {Function} onChunk - 回調函數，接收每個文字片段
 * @returns {Promise<void>}
 */
export async function processQueryStream(query, onChunk) {
  // 如果沒有知識庫內容，直接返回
  if (textChunks.length === 0) {
    const message = '不好意思，您的問題我們需要一些時間確認後再回覆您，請您稍等。';
    onChunk(message);
    return;
  }

  // 使用 AI 語義理解進行檢索（兩階段檢索）
  let expandedQuery = query;
  try {
    expandedQuery = await expandQueryWithAI(query);
  } catch (error) {
    console.warn('AI 語義擴展失敗，使用原始查詢:', error.message);
  }

  // 使用擴展後的查詢進行檢索
  const relevantChunks = retrieveRelevantChunks(expandedQuery, textChunks, 5);

  // 決定使用哪種策略
  let contextText;
  let useFullKnowledgeBase = false;
  
  if (relevantChunks.length === 0) {
    console.log('⚠️  精準檢索未找到結果，使用整個知識庫進行 AI 搜尋');
    contextText = originalText;
    useFullKnowledgeBase = true;
  } else {
    contextText = relevantChunks
      .map((chunk, idx) => `[區塊 ${chunk.index + 1}]\n${chunk.text}`)
      .join('\n\n---\n\n');
  }

  // 使用串流模式生成回答
  try {
    await generateAnswer(query, contextText, useFullKnowledgeBase, onChunk);
  } catch (error) {
    console.error('串流處理錯誤:', error);
    
    // 如果錯誤，使用備援方案
    if (error.message === 'RATE_LIMIT_EXCEEDED' || 
        error.message === 'SAFETY_FILTER_BLOCKED' ||
        error.message === 'EMPTY_RESPONSE') {
      const fallbackAnswer = generateFallbackAnswer(query, contextText);
      onChunk(fallbackAnswer);
    } else {
      onChunk('不好意思，處理您的問題時發生錯誤，請稍後再試。');
    }
  }
}

// 重新載入知識庫的函數（用於檔案更新後）
export { loadKnowledgeBase };

