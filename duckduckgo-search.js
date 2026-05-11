const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  // ============================================
  // پاکسازی کامل پوشه قبلی (حل مشکل اسکرین‌شات قدیمی)
  // ============================================
  if (fs.existsSync('duckduckgo-results')) {
    fs.rmSync('duckduckgo-results', { recursive: true, force: true });
    console.log('🗑️ پوشه قبلی duckduckgo-results به طور کامل پاک شد');
  }
  
  const query = process.env.INPUT_QUERY;
  const numResults = parseInt(process.env.INPUT_NUM) || 15;
  const searchType = process.env.INPUT_TYPE || 'videos';
  
  // ساخت پوشه جدید
  fs.mkdirSync('duckduckgo-results', { recursive: true });
  
  console.log(`🦆 جستجو در DuckDuckGo: "${query}" (${searchType})`);
  
  // تعیین URL بر اساس نوع جستجو
  let searchUrl;
  switch(searchType) {
    case 'images':
      searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`;
      break;
    case 'videos':
      searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=videos&ia=videos`;
      break;
    default:
      searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`;
  }
  
  console.log(`🌐 رفتن به: ${searchUrl}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.setViewport({ width: 1280, height: 720 });
  
  await page.goto(searchUrl, { 
    waitUntil: 'networkidle2', 
    timeout: 45000 
  });
  
  // اسکرین‌شات جدید (حالا از صفحه درست)
  await page.screenshot({ path: 'duckduckgo-results/screenshot.png', fullPage: true });
  console.log('📸 اسکرین‌شات جدید ذخیره شد');
  
  // ذخیره HTML صفحه جستجو
  const html = await page.content();
  fs.writeFileSync('duckduckgo-results/search-page.html', html);
  
  // استخراج لینک‌ها بر اساس نوع جستجو
  let links = [];
  
  if (searchType === 'images') {
    links = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('img[data-src], img[src]').forEach(img => {
        const src = img.src || img.getAttribute('data-src');
        if (src && src.startsWith('http') && 
            !src.includes('duckduckgo.com') &&
            (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg'))) {
          results.push(src);
        }
      });
      return [...new Set(results)];
    });
  } 
  else if (searchType === 'videos') {
    links = await page.evaluate(() => {
      const results = [];
      // لینک‌های صفحات ویدیو
      document.querySelectorAll('a[data-testid="result-title-a"], a.result__a').forEach(a => {
        let href = a.href;
        if (href && href.startsWith('http') && 
            !href.includes('duckduckgo.com') && 
            (href.includes('youtube.com') || href.includes('aparat.com') || href.includes('vimeo.com'))) {
          results.push(href);
        }
      });
      return [...new Set(results)];
    });
  }
  else {
    links = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('a[data-testid="result-title-a"], a.result__a').forEach(a => {
        let href = a.href;
        if (href && href.startsWith('http') && 
            !href.includes('duckduckgo.com') && 
            !results.includes(href)) {
          results.push(href);
        }
      });
      return [...new Set(results)];
    });
  }
  
  await browser.close();
  
  const finalLinks = links.slice(0, numResults);
  
  // ذخیره لینک‌ها
  fs.writeFileSync('duckduckgo-results/links.txt', finalLinks.join('\n'));
  
  // فایل HTML نمایشی
  let typeName = { all: 'همه موارد', images: 'عکس‌ها', videos: 'ویدیوها' };
  let htmlLinks = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <title>نتایج جستجو - ${query}</title>
    <style>
        body{font-family:Tahoma;background:#667eea;padding:20px}
        .container{max-width:900px;margin:0 auto}
        .card{background:white;border-radius:20px;padding:25px}
        h1{color:#333}
        .badge{background:#28a745;color:white;padding:2px 8px;border-radius:20px;font-size:12px}
        .link-list{list-style:none;padding:0}
        .link-list li{background:#f8f9fa;margin:8px 0;padding:12px;border-radius:8px;word-break:break-all}
        .link-list a{color:#667eea;text-decoration:none}
        img{max-width:100%;border-radius:10px;margin:10px 0}
        .info{background:#e9ecef;padding:10px;border-radius:10px;margin:15px 0}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>🦆 نتایج جستجو</h1>
            <div class="info">
                <strong>عبارت جستجو:</strong> ${query}<br>
                <strong>نوع:</strong> ${typeName[searchType]} <span class="badge">${finalLinks.length} نتیجه</span><br>
                <strong>تاریخ:</strong> ${new Date().toLocaleString('fa-IR')}
            </div>
            <img src="screenshot.png" style="max-width:100%;border:1px solid #ddd;border-radius:10px">
            <hr>
            <h2>📋 لینک‌های پیدا شده</h2>
            <ul class="link-list">`;
  
  for (const link of finalLinks) {
    htmlLinks += `<li><a href="${link}" target="_blank">🔗 ${link}</a></li>`;
  }
  
  htmlLinks += `</ul></div></div></body></html>`;
  
  fs.writeFileSync('duckduckgo-results/index.html', htmlLinks);
  
  console.log(`\n✅ جستجو با موفقیت انجام شد!`);
  console.log(`📁 پوشه: duckduckgo-results/`);
  console.log(`📄 فایل‌ها:`);
  console.log(`   - screenshot.png : اسکرین‌شات (از جستجوی جدید)`);
  console.log(`   - search-page.html : کد کامل صفحه جستجو`);
  console.log(`   - index.html : صفحه نمایش لینک‌ها`);
  console.log(`   - links.txt : ${finalLinks.length} لینک`);
})();
