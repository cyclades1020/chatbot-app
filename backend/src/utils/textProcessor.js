/**
 * 文本處理工具
 * 將文本分塊，用於 RAG 檢索
 */

/**
 * 將文本分割成較小的區塊
 * @param {string} text - 原始文本
 * @param {number} chunkSize - 每個區塊的最大字元數
 * @param {number} overlap - 區塊之間的重疊字元數
 * @returns {Array<{text: string, index: number}>}
 */
export function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let index = 0;
  
  // 先嘗試按段落分割
  const paragraphs = text.split(/\n\s*\n/);
  
  for (const paragraph of paragraphs) {
    if (paragraph.length <= chunkSize) {
      chunks.push({ text: paragraph.trim(), index: index++ });
    } else {
      // 如果段落太長，按句子分割
      const sentences = paragraph.split(/(?<=[。！？\n])/);
      let currentChunk = '';
      
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= chunkSize) {
          currentChunk += sentence;
        } else {
          if (currentChunk) {
            chunks.push({ text: currentChunk.trim(), index: index++ });
          }
          currentChunk = sentence;
        }
      }
      
      if (currentChunk) {
        chunks.push({ text: currentChunk.trim(), index: index++ });
      }
    }
  }
  
  // 如果沒有段落，直接按字元數分割
  if (chunks.length === 0 && text.length > chunkSize) {
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push({ text: chunk.trim(), index: index++ });
    }
  }
  
  return chunks.filter(chunk => chunk.text.length > 0);
}

/**
 * 改進的關鍵字匹配分數計算
 * @param {string} query - 查詢文字
 * @param {string} text - 文本內容
 * @returns {number} 匹配分數
 */
export function calculateRelevanceScore(query, text) {
  // 移除常見的疑問詞和助詞，只保留關鍵字
  const stopWords = ['什麼', '是什麼', '如何', '怎樣', '嗎', '呢', '的', '了', '是', '有', '在', '要', '可以', '能', '會', '什麼是', '什麼時候', '哪裡', '哪個'];
  const queryLower = query.toLowerCase();
  let cleanQuery = queryLower;
  
  // 移除標點符號和疑問詞
  for (const stopWord of stopWords) {
    cleanQuery = cleanQuery.replace(new RegExp(stopWord, 'gi'), ' ');
  }
  
  // 提取關鍵字（長度大於 1 的字詞）
  const queryWords = cleanQuery
    .replace(/[，。！？、；：\s]+/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1);
  
  // 如果沒有關鍵字，使用原始查詢
  if (queryWords.length === 0) {
    queryWords.push(...queryLower.replace(/[，。！？、；：\s]+/g, ' ').split(/\s+/).filter(word => word.length > 0));
  }
  
  const textLower = text.toLowerCase();
  
  let score = 0;
  for (const word of queryWords) {
    if (word.length > 0) {
      // 計算匹配次數
      const matches = (textLower.match(new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      score += matches * 2; // 增加權重
      
      // 如果關鍵字出現在標題或開頭，額外加分
      if (textLower.indexOf(word) < 100) {
        score += 3;
      }
    }
  }
  
  return score;
}

/**
 * 從文本區塊中檢索最相關的內容
 * @param {string} query - 使用者查詢
 * @param {Array<{text: string, index: number}>} chunks - 文本區塊陣列
 * @param {number} topK - 返回前 K 個最相關的區塊
 * @returns {Array<{text: string, index: number, score: number}>}
 */
export function retrieveRelevantChunks(query, chunks, topK = 3) {
  const scoredChunks = chunks.map(chunk => ({
    ...chunk,
    score: calculateRelevanceScore(query, chunk.text)
  }));
  
  // 按分數排序，返回前 topK 個
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(chunk => chunk.score > 0);
}

