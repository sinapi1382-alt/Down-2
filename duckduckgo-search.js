const axios = require('axios');
const fs = require('fs');

(async () => {
  const query = process.env.INPUT_QUERY;
  const numResults = parseInt(process.env.INPUT_NUM) || 15;
  
  // پاک کردن پوشه قبلی
  if (fs.existsSync('duckduckgo-results')) {
    fs.rmSync('duckduckgo-results', { recursive: true });
  }
  fs.mkdirSync('duckduckgo-results');
  
  console.log(`🦆 جستجو در DuckDuckGo: "${query}"`);
  console.log(`📊 تعداد نتایج درخواستی: ${numResults}`);
  
  try {
    // API غیررسمی DuckDuckGo (بدون نیاز به کلید)
    const searchUrl = 'https://api.duckduckgo.com/';
    const response = await axios.get(searchUrl, {
      params: {
        q: query,
        format: 'json',
        no_html: 1,
        skip_disambig: 1
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    });
    
    const data = response.data;
    const results = [];
    
    // استخراج لینک‌ها از بخش RelatedTopics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      for (const topic of data.RelatedTopics) {
        if (topic.FirstURL && topic.Text) {
          results.push({
            url: topic.FirstURL,
            title: topic.Text,
            snippet: topic.Result
          });
        }
        
        // بررسی لینک‌های داخل Icon (برای عکس و ویدیو)
        if (topic.Icon && topic.Icon.URL) {
          const iconUrl = topic.Icon.URL;
          if (iconUrl.includes('.mp4') || iconUrl.includes('.jpg') || iconUrl.includes('.png')) {
            results.push({
              url: iconUrl,
              title: 'Media file',
              snippet: ''
            });
          }
        }
      }
    }
    
    // محدود کردن تعداد نتایج
    const finalResults = results.slice(0, numResults);
    
    // استخراج فقط لینک‌ها (برای دانلود)
    const links = finalResults.map(r => r.url);
    
    // ============================================
    // ذخیره خروجی‌ها
    // ============================================
    
    // 1. فایل لینک‌ها (برای ADM)
    fs.writeFileSync('duckduckgo-results/links.txt', links.join('\n'));
    
    // 2. فایل خروجی کامل با جزییات
    let output = `🦆 نتایج جستجو در DuckDuckGo\n`;
    output += `==========================================\n`;
    output += `عبارت جستجو: ${query}\n`;
    output += `تعداد نتایج: ${finalResults.length}\n`;
    output += `تاریخ: ${new Date().toLocaleString('fa-IR')}\n`;
    output += `==========================================\n\n`;
    
    if (finalResults.length > 0) {
      output += `📋 لینک‌های پیدا شده:\n\n`;
      finalResults.forEach((item, i) => {
        output += `${i+1}. ${item.url}\n`;
        if (item.title && item.title !== item.url) {
          output += `   📄 ${item.title.substring(0, 100)}\n`;
        }
        output += `\n`;
      });
    } else {
      output += `❌ هیچ نتیجه‌ای پیدا نشد.\n`;
      output += `عبارت جستجو را تغییر دهید.\n`;
    }
    
    fs.writeFileSync('duckduckgo-results/output.txt', output);
    
    // 3. ذخیره JSON خام (برای برنامه‌نویسان)
    fs.writeFileSync('duckduckgo-results/raw.json', JSON.stringify(data, null, 2));
    
    console.log(`\n✅ جستجو با موفقیت انجام شد!`);
    console.log(`📁 پوشه: duckduckgo-results/`);
    console.log(`📄 فایل‌ها:`);
    console.log(`   - links.txt : ${links.length} لینک (یکی در هر خط)`);
    console.log(`   - output.txt : خروجی خوانا`);
    console.log(`   - raw.json : داده‌های خام`);
    
  } catch (error) {
    console.error(`❌ خطا در جستجو:`, error.message);
    fs.writeFileSync('duckduckgo-results/error.txt', `Error: ${error.message}\n\n${error.stack || ''}`);
    process.exit(1);
  }
})();
