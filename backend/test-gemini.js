import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

console.log('🔍 Gemini API 連線診斷\n');
console.log('='.repeat(50));

// 1. 檢查 API Key 是否存在
console.log('\n1️⃣  檢查 API Key 設定...');
if (!apiKey) {
  console.log('❌ GEMINI_API_KEY 環境變數未設定');
  console.log('   請在 .env 檔案或 Railway 環境變數中設定 GEMINI_API_KEY');
  process.exit(1);
} else {
  console.log('✅ API Key 已設定');
  console.log(`   Key 長度: ${apiKey.length} 字元`);
  console.log(`   Key 前綴: ${apiKey.substring(0, 10)}...`);
}

// 2. 初始化 Gemini API
console.log('\n2️⃣  初始化 Gemini API...');
let genAI;
try {
  genAI = new GoogleGenerativeAI(apiKey);
  console.log('✅ Gemini API 初始化成功');
} catch (error) {
  console.log('❌ Gemini API 初始化失敗:', error.message);
  process.exit(1);
}

// 3. 測試連線
console.log('\n3️⃣  測試 API 連線...');
try {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.0-flash-lite',
    generationConfig: {
      maxOutputTokens: 10,
      temperature: 0.7,
    }
  });

  console.log('   發送測試請求...');
  const result = await model.generateContent('說「測試成功」');
  const response = await result.response;
  const text = response.text();
  
  console.log('✅ API 連線成功！');
  console.log(`   回應: ${text}`);
  console.log('\n🎉 Gemini API 運作正常！');
  
} catch (error) {
  console.log('❌ API 連線失敗');
  console.log('\n錯誤詳情:');
  console.log('   錯誤訊息:', error.message);
  console.log('   錯誤碼:', error.code || error.statusCode || error.status || 'N/A');
  
  // 詳細錯誤分析
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || error.statusCode || error.status;
  
  console.log('\n錯誤分析:');
  
  if (errorCode === 429 || errorMessage.includes('rate limit') || errorMessage.includes('too many requests') || errorMessage.includes('resource exhausted')) {
    console.log('   ⚠️  速率限制（Rate Limit - 429）');
    console.log('   原因: 短時間內請求過多，或達到每分鐘/每秒的請求限制');
    console.log('   狀態: API Key 正確，API 連線正常，但遇到速率限制');
    console.log('   解決方案:');
    console.log('     1. 等待 60 秒後重試');
    console.log('     2. 檢查 Google Cloud Console 的配額設定');
    console.log('     3. 確認付費方案是否有更高的速率限制');
    console.log('     4. 考慮增加請求間隔時間');
    console.log('\n   💡 這不是配額錯誤，而是速率限制。API 本身運作正常！');
  } else if (errorMessage.includes('quota exceeded') || (errorMessage.includes('quota') && !errorMessage.includes('rate'))) {
    console.log('   ⚠️  配額已用完（Quota Exceeded）');
    console.log('   原因: 已達到配額上限');
    console.log('   解決: 檢查 Google Cloud Console 的配額設定');
  } else if (errorMessage.includes('api key') || errorMessage.includes('authentication') || errorCode === 401) {
    console.log('   ❌ API Key 錯誤');
    console.log('   原因: API Key 無效或未正確設定');
    console.log('   解決: 檢查 API Key 是否正確，是否已啟用 Gemini API');
  } else if (errorMessage.includes('permission') || errorCode === 403) {
    console.log('   ❌ 權限錯誤');
    console.log('   原因: API Key 沒有足夠的權限');
    console.log('   解決: 檢查 API Key 的權限設定');
  } else {
    console.log('   ⚠️  未知錯誤');
    console.log('   請檢查錯誤訊息並聯繫技術支援');
  }
  
  // 顯示完整錯誤物件（如果有）
  if (error.response) {
    console.log('\n完整錯誤回應:');
    console.log(JSON.stringify(error.response, null, 2));
  }
  
  process.exit(1);
}

console.log('\n' + '='.repeat(50));

