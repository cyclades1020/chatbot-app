import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { generateAnswerWithOllama, generateGeneralChatWithOllama } from './ollama.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️  警告: 未設定 GEMINI_API_KEY，請在 .env 檔案中設定');
}

let genAI = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * 使用 Gemini 生成回答
 * @param {string} userQuery - 使用者問題
 * @param {string} contextText - 從文本中檢索到的相關內容
 * @returns {Promise<string>} AI 生成的回答
 */
export async function generateAnswer(userQuery, contextText) {
  if (!genAI) {
    throw new Error('Gemini API 未設定，請檢查 GEMINI_API_KEY 環境變數');
  }

  try {
    // 使用更快的模型配置
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        maxOutputTokens: 500, // 限制輸出長度以加快速度
        temperature: 0.7, // 降低溫度以加快速度
      }
    });

    const prompt = `你是一個客服聊天機器人。請根據以下提供的文本內容回答使用者的問題。

**重要規則：**
1. **嚴格限制**：只能根據提供的文本內容回答問題，絕對不能編造或推測文本中沒有的資訊
2. **回答要求**：回答要簡潔、友善且專業（盡量簡短，不超過 3 句話）
3. **語言要求**：請自動識別使用者問題使用的語言，並使用相同的語言回覆
4. **無相關資訊處理**：如果文本內容中沒有相關資訊，請明確告知使用者「不好意思，您的問題我們需要一些時間確認後再回覆您，請您稍等。」

**提供的文本內容：**
${contextText}

**使用者問題：**
${userQuery}

**請回答（使用與使用者問題相同的語言，簡潔回答）：**`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    return answer;
  } catch (error) {
    console.error('Gemini API 錯誤:', error);
    
    // 如果是配額錯誤，自動切換到 Ollama
    if (error.message && (error.message.includes('quota') || error.message.includes('429'))) {
      console.log('🔄 Gemini 配額已用完，自動切換到 Ollama...');
      try {
        return await generateAnswerWithOllama(userQuery, contextText);
      } catch (ollamaError) {
        throw new Error(`Gemini 配額用完，且 Ollama 也發生錯誤: ${ollamaError.message}`);
      }
    }
    
    throw new Error(`生成回答時發生錯誤: ${error.message}`);
  }
}

/**
 * 使用 Gemini 進行一般對話（無知識庫限制）
 * @param {string} userQuery - 使用者問題
 * @returns {Promise<string>} AI 生成的回答
 */
export async function generateGeneralChat(userQuery) {
  if (!genAI) {
    throw new Error('Gemini API 未設定，請檢查 GEMINI_API_KEY 環境變數');
  }

  try {
    // 使用更快的模型配置
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        maxOutputTokens: 300, // 限制輸出長度以加快速度
        temperature: 0.7,
      }
    });

    const prompt = `你是一個友善、專業的客服聊天機器人。請以自然、親切的方式回答使用者的問題。

**回答原則：**
1. 回答要友善、專業且簡潔（盡量簡短）
2. 如果問題涉及特定服務或產品，可以給出一般性的建議
3. 如果不確定答案，可以禮貌地說明並提供可能的協助方向
4. 保持對話自然流暢
5. **語言要求**：請自動識別使用者問題使用的語言，並使用相同的語言回覆

**使用者問題：**
${userQuery}

**請回答（使用與使用者問題相同的語言，簡潔回答）：**`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    return answer;
  } catch (error) {
    console.error('Gemini API 錯誤:', error);
    
    // 如果是配額錯誤，自動切換到 Ollama
    if (error.message && (error.message.includes('quota') || error.message.includes('429'))) {
      console.log('🔄 Gemini 配額已用完，自動切換到 Ollama...');
      try {
        return await generateGeneralChatWithOllama(userQuery);
      } catch (ollamaError) {
        throw new Error(`Gemini 配額用完，且 Ollama 也發生錯誤: ${ollamaError.message}`);
      }
    }
    
    throw new Error(`生成回答時發生錯誤: ${error.message}`);
  }
}

/**
 * 使用 AI 擴展查詢，理解語義相似性
 * 例如：「營業時間」和「服務時間」應該被視為相同
 * @param {string} query - 原始查詢
 * @returns {Promise<string>} 擴展後的查詢（包含同義詞和相關詞）
 */
export async function expandQueryWithAI(query) {
  if (!genAI) {
    return query; // 如果沒有 API，返回原始查詢
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        maxOutputTokens: 100, // 只需要簡短的擴展
        temperature: 0.3, // 低溫度以獲得一致結果
      }
    });

    const prompt = `請分析以下使用者問題，並提供 3-5 個同義詞或相關詞，用於在知識庫中搜尋相關內容。

**範例：**
- 問題：「營業時間是什麼？」
- 同義詞：營業時間、服務時間、開店時間、營業時段、服務時段

- 問題：「退貨政策」
- 同義詞：退貨政策、退貨規定、退貨辦法、退貨流程、退換貨

**使用者問題：**
${query}

**請只返回同義詞和相關詞，用空格分隔，不要其他說明：**`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const expanded = response.text().trim();
    
    // 合併原始查詢和擴展詞
    return `${query} ${expanded}`;
  } catch (error) {
    console.warn('AI 查詢擴展失敗:', error.message);
    return query; // 如果失敗，返回原始查詢
  }
}

/**
 * 測試 Gemini API 連線
 * @returns {Promise<boolean>}
 */
export async function testGeminiConnection() {
  if (!genAI) {
    return false;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent('測試');
    return true;
  } catch (error) {
    // 如果是配額錯誤，表示 API 設定正確，只是配額用完
    if (error.message && (error.message.includes('quota') || error.message.includes('429'))) {
      console.warn('⚠️  Gemini API 配額已用完，但 API 設定正確');
      return true; // 返回 true，因為 API 本身是正常的
    }
    console.error('Gemini 連線測試失敗:', error.message);
    return false;
  }
}

