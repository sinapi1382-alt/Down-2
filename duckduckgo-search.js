const puppeteer = require('puppeteer');
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
  console.log(`📊 حداکثر نتایج: ${numResults}`);
  
  // راه‌اندازی مرورگر
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // تنظیمات برای شبیه‌سازی مرورگر واقعی
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 720 });
  
  // ساخت URL جستجوی DuckDuckGo (با فیلتر ویدیو)
  const searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web&iax=videos&ia=videos`;
  console.log(`🌐 رفتن به: ${searchUrl}`);
  
  await page.goto(searchUrl, { 
    waitUntil: 'networkidle2', 
    timeout: 45000 
  });
  
  // اسکرین‌شات
  await page.screenshot({ path: 'duckduckgo-results/screenshot.png', fullPage: true });
  console.log('📸 اسکرین‌شات ذخیره شد');
  
  // ذخیره HTML کامل
  const html = await page.content();
  fs.writeFileSync('duckduckgo-results/page.html', html);
  console.log('📄 HTML صفحه ذخیره شد');
  
  // استخراج لینک‌ها
  const links = await page.evaluate(() => {
    const results = [];
    
    // روش اول: لینک‌های مستقیم
    document.querySelectorAll('a[href*=".mp4"], a[href*=".mkv"], a[href*=".avi"]').forEach(a => {
      const href = a.href;
      if (href && !results.includes(href)) results.push(href);
    });
    
    // روش دوم: لینک‌های نتایج جستجو
    document.querySelectorAll('a[data-testid="result-title-a"], a.result__a, a.js-result-extras-url').forEach(a => {
      let href = a.href || a.getAttribute('href');
      if (href && href.startsWith('http') && 
          !href.includes('duckduckgo.com') && 
          !href.includes('youtube.com') &&
          !results.includes(href)) {
        results.push(href);
      }
    });
    
    // روش سوم: دکمه‌های ویدیو
    document.querySelectorAll('a[href*="/watch?"], a[href*="vimeo.com"], a[href*="aparat.com"]').forEach(a => {
      let href = a.href;
      if (href && !results.includes(href)) results.push(href);
    });
    
    return [...new Set(results)];
  });
  
  await browser.close();
  
  // محدود کردن تعداد نتایج
  const finalLinks = links.slice(0, numResults);
  
  // ============================================
  // ذخیره خروجی‌ها
  // ============================================
  
  // 1. فایل لینک‌ها (برای ADM)
  fs.writeFileSync('duckduckgo-results/links.txt', finalLinks.join('\n'));
  
  // 2. فایل خروجی کامل
  let output = `🦆 نتایج جستجو در DuckDuckGo\n`;
  output += `==========================================\n`;
  output += `عبارت جستجو: ${query}\n`;
  output += `تعداد نتایج: ${finalLinks.length}\n`;
  output += `تاریخ: ${new Date().toLocaleString('fa-IR')}\n`;
  output += `==========================================\n\n`;
  
  if (finalLinks.length > 0) {
    output += `📋 لینک‌های پیدا شده:\n\n`;
    finalLinks.forEach((link, i) => {
      output += `${i+1}. ${link}\n`;
    });
  } else {
    output += `❌ هیچ لینکی پیدا نشد.\n`;
    output += `ممکن است صفحه جستجو ساختار متفاوتی داشته باشد.\n`;
  }
  
  fs.writeFileSync('duckduckgo-results/output.txt', output);
  
  // 3. فایل HTML ساده برای نمایش لینک‌ها
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
        .link-list{list-style:none;padding:0}
        .link-list li{background:#f8f9fa;margin:8px 0;padding:12px;border-radius:8px;word-break:break-all}
        .link-list a{color:#667eea;text-decoration:none}
        img{max-width:100%;border-radius:10px;margin:10px 0}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>🦆 نتایج جستجو در DuckDuckGo</h1>
            <p><strong>عبارت جستجو:</strong> ${query}</p>
            <p><strong>تعداد نتایج:</strong> ${finalLinks.length}</p>
            <p><strong>تاریخ:</strong> ${new Date().toLocaleString('fa-IR')}</p>
            <img src="screenshot.png" style="max-width:100%;border:1px solid #ddd;border-radius:10px">
            <hr>
            <h2>📋 لینک‌های پیدا شده</h2>
            <ul class="link-list">`;
  
  finalLinks.forEach(link => {
    htmlLinks += `<li><a href="${link}" target="_blank">🔗 ${link}</a></li>`;
  });
  
  htmlLinks += `
            </ul>
        </div>
    </div>
</body>
</html>`;
  
  fs.writeFileSync('duckduckgo-results/index.html', htmlLinks);
  
  console.log(`\n✅ جستجو با موفقیت انجام شد!`);
  console.log(`📁 پوشه: duckduckgo-results/`);
  console.log(`📄 فایل‌ها:`);
  console.log(`   - screenshot.png : اسکرین‌شات از صفحه نتایج`);
  console.log(`   - page.html : کد کامل صفحه جستجو`);
  console.log(`   - index.html : صفحه نمایش لینک‌ها (این رو باز کن)`);
  console.log(`   - links.txt : ${finalLinks.length} لینک (یکی در هر خط)`);
  console.log(`   - output.txt : خروجی خوانا`);
  
  if (finalLinks.length === 0) {
    console.log(`\n⚠️ توجه: هیچ لینکی پیدا نشد.`);
    console.log(`   فایل screenshot.png را بررسی کن.`);
  }
})();
