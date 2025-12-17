import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';

// 預設使用的 Ollama 模型（按優先順序）
const DEFAULT_MODELS = ['llama3', 'llama3.2', 'llama3.1', 'qwen2.5'];
let DEFAULT_MODEL = 'llama3'; // 預設模型

/**
 * 檢查 Ollama 是否可用
 * @returns {Promise<boolean>}
 */
export async function checkOllamaAvailable() {
  try {
    await execAsync('ollama --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 檢查模型是否已下載
 * @param {string} modelName - 模型名稱
 * @returns {Promise<boolean>}
 */
export async function checkModelAvailable(modelName = DEFAULT_MODEL) {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.models?.some(m => m.name.includes(modelName)) || false;
  } catch (error) {
    // 如果 HTTP API 失敗，回退到命令行
    try {
      const { stdout } = await execAsync('ollama list');
      return stdout.includes(modelName);
    } catch (e) {
      return false;
    }
  }
}

/**
 * 使用 Ollama 生成回答
 * @param {string} userQuery - 使用者問題
 * @param {string} contextText - 從文本中檢索到的相關內容（可選）
 * @returns {Promise<string>} AI 生成的回答
 */
/**
 * 獲取可用的模型
 */
async function getAvailableModel() {
  for (const model of DEFAULT_MODELS) {
    if (await checkModelAvailable(model)) {
      return model;
    }
  }
  // 如果都沒有，返回第一個作為預設（會自動下載）
  return DEFAULT_MODELS[0];
}

export async function generateAnswerWithOllama(userQuery, contextText = null) {
  const model = await getAvailableModel();
  
  // 檢查 Ollama 是否可用
  const ollamaAvailable = await checkOllamaAvailable();
  if (!ollamaAvailable) {
    throw new Error('Ollama 未安裝或無法使用');
  }

  // 檢查模型是否已下載
  const modelAvailable = await checkModelAvailable(model);
  if (!modelAvailable) {
    console.warn(`⚠️  模型 ${model} 未下載，嘗試下載...`);
    try {
      await execAsync(`ollama pull ${model}`);
      console.log(`✅ 模型 ${model} 下載完成`);
    } catch (error) {
      throw new Error(`無法下載模型 ${model}，請手動執行: ollama pull ${model}`);
    }
  }

  // 構建提示詞
  let prompt = '';
  
  if (contextText) {
    // RAG 模式：基於知識庫內容回答
    prompt = `你是一個客服聊天機器人。請根據以下提供的文本內容回答使用者的問題。

**重要規則：**
1. 只能根據提供的文本內容回答問題
2. 如果文本內容中沒有相關資訊，請明確告知使用者「根據提供的資料，我無法找到相關資訊」
3. 不要編造或推測文本中沒有的資訊
4. 回答要簡潔、友善且專業
5. **語言要求**：請自動識別使用者問題使用的語言，並使用相同的語言回覆（例如：使用者用中文問，就用中文答；用英文問，就用英文答；用日文問，就用日文答）

**提供的文本內容：**
${contextText}

**使用者問題：**
${userQuery}

**請回答（使用與使用者問題相同的語言）：**`;
  } else {
    // 一般對話模式
    prompt = `你是一個友善、專業的客服聊天機器人。請以自然、親切的方式回答使用者的問題。

**回答原則：**
1. 回答要友善、專業且簡潔
2. 如果問題涉及特定服務或產品，可以給出一般性的建議
3. 如果不確定答案，可以禮貌地說明並提供可能的協助方向
4. 保持對話自然流暢
5. **語言要求**：請自動識別使用者問題使用的語言，並使用相同的語言回覆（例如：使用者用中文問，就用中文答；用英文問，就用英文答；用日文問，就用日文答）

**使用者問題：**
${userQuery}

**請回答（使用與使用者問題相同的語言）：**`;
  }

  try {
    // 使用 Ollama HTTP API 生成回答
    const response = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API 錯誤: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('Ollama 生成回答錯誤:', error);
    throw new Error(`Ollama 生成回答時發生錯誤: ${error.message}`);
  }
}

/**
 * 使用 Ollama 進行一般對話
 * @param {string} userQuery - 使用者問題
 * @returns {Promise<string>} AI 生成的回答
 */
export async function generateGeneralChatWithOllama(userQuery) {
  return generateAnswerWithOllama(userQuery, null);
}

