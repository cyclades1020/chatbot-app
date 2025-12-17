/**
 * 速率限制工具
 * 處理 API 請求的速率限制和重試機制
 */

// 請求佇列：追蹤正在進行的請求
let requestQueue = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 1; // 最大同時請求數（降低以避免速率限制）
const MIN_REQUEST_INTERVAL = 2000; // 最小請求間隔（毫秒）- 增加到 2 秒
let lastRequestTime = 0;

/**
 * 等待指定時間
 * @param {number} ms - 等待時間（毫秒）
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 等待直到可以發送請求
 */
async function waitForSlot() {
  // 等待直到有可用的請求槽位
  while (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await sleep(100); // 每 100ms 檢查一次
  }

  // 確保請求間隔
  const timeSinceLastRequest = Date.now() - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }

  activeRequests++;
  lastRequestTime = Date.now();
}

/**
 * 釋放請求槽位
 */
function releaseSlot() {
  activeRequests = Math.max(0, activeRequests - 1);
}

/**
 * 帶重試機制的 API 請求
 * @param {Function} apiCall - API 調用函數
 * @param {Object} options - 選項
 * @param {number} options.maxRetries - 最大重試次數（預設 3）
 * @param {number} options.initialDelay - 初始延遲時間（毫秒，預設 1000）
 * @param {number} options.maxDelay - 最大延遲時間（毫秒，預設 10000）
 * @param {number} options.backoffMultiplier - 退避倍數（預設 2）
 * @returns {Promise<any>} API 回應結果
 */
export async function retryWithBackoff(apiCall, options = {}) {
  const {
    maxRetries = 5, // 增加重試次數
    initialDelay = 3000, // 增加初始延遲到 3 秒
    maxDelay = 30000, // 增加最大延遲到 30 秒
    backoffMultiplier = 2
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 等待請求槽位
      await waitForSlot();
      
      try {
        const result = await apiCall();
        releaseSlot();
        return result;
      } catch (error) {
        releaseSlot();
        throw error;
      }
    } catch (error) {
      lastError = error;
      
      // 檢查是否為速率限制錯誤
      const errorMessage = error.message?.toLowerCase() || '';
      const errorCode = error.code || error.statusCode || error.status;
      const isRateLimit = errorCode === 429 || 
                         errorMessage.includes('rate limit') || 
                         errorMessage.includes('too many requests') ||
                         errorMessage.includes('resource exhausted');

      // 如果不是速率限制錯誤，或已達到最大重試次數，直接拋出錯誤
      if (!isRateLimit || attempt >= maxRetries) {
        throw error;
      }

      // 計算退避時間（指數退避）
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt),
        maxDelay
      );

      console.log(`⚠️  速率限制錯誤，第 ${attempt + 1} 次重試，等待 ${delay}ms...`);
      await sleep(delay);
    }
  }

  // 如果所有重試都失敗，拋出最後的錯誤
  throw lastError;
}

/**
 * 獲取當前請求統計
 */
export function getRequestStats() {
  return {
    activeRequests,
    queueLength: requestQueue.length,
    maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
    minRequestInterval: MIN_REQUEST_INTERVAL
  };
}

