const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  // پاک کردن پوشه قبلی
  if (fs.existsSync('browser-output')) {
    fs.rmSync('browser-output', { recursive: true, force: true });
    console.log('🗑️ پوشه قبلی پاک شد');
  }
  fs.mkdirSync('browser-output', { recursive: true });
  
  const url = process.env.INPUT_URL;
  const action = process.env.INPUT_ACTION;
  const date = new Date().toLocaleString('fa-IR');
  
  // ============================================
  // ساخت timestamp یکتا برای جلوگیری از کش
  // ============================================
  const timestamp = `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  console.log(`1. راه‌اندازی مرورگر...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  console.log(`2. در حال رفتن به: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch(e) {
    console.log(`خطا در بارگذاری: ${e.message}`);
  }
  
  let videos = [];
  let images = [];
  
  // اسکرین شات با نام یکتا
  if (action === 'screenshot' || action === 'both') {
    console.log(`3. گرفتن اسکرین شات...`);
    const screenshotName = `screenshot_${timestamp}.png`;
    await page.screenshot({ 
      path: `browser-output/${screenshotName}`, 
      fullPage: true 
    });
    // همچنین یک نسخه با نام ثابت برای دسترسی آسان
    await page.screenshot({ 
      path: 'browser-output/screenshot.png', 
      fullPage: true 
    });
    console.log(`✅ اسکرین شات ذخیره شد: ${screenshotName}`);
  }
  
  // ذخیره کامل HTML سایت
  console.log(`4. ذخیره کامل HTML سایت...`);
  const htmlContent = await page.content();
  fs.writeFileSync('browser-output/site.html', htmlContent);
  console.log(`✅ HTML کامل سایت ذخیره شد (${(htmlContent.length/1024).toFixed(1)} KB)`);
  
  // استخراج لینک‌های مدیا
  if (action === 'media' || action === 'both') {
    console.log(`5. استخراج لینک‌های مدیا...`);
    
    videos = await page.evaluate(() => {
      const result = [];
      const elements = document.querySelectorAll('video, source, iframe');
      for (const el of elements) {
        const src = el.src || el.getAttribute('src');
        if (src && src.startsWith('http')) result.push(src);
      }
      return [...new Set(result)];
    });
    
    images = await page.evaluate(() => {
      const result = [];
      const elements = document.querySelectorAll('img');
      for (const el of elements) {
        const src = el.src;
        if (src && src.startsWith('http') && 
            !src.includes('data:image') && 
            src.length < 500) {
          result.push(src);
        }
      }
      return [...new Set(result)];
    });
    
    console.log(`✅ ${videos.length} ویدیو و ${images.length} عکس پیدا شد`);
  }
  
  await browser.close();
  
  // ساخت فایل HTML نمایشی (با استفاده از عکس دارای timestamp)
  console.log(`6. ساخت فایل نمایانگر...`);
  
  let html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, initial-scale=1.0">
    <title>خروجی مرورگر - ${url.substring(0, 50)}</title>
    <style>
        body{font-family:Tahoma;background:#667eea;padding:20px;margin:0}
        .container{max-width:1000px;margin:0 auto}
        .card{background:white;border-radius:20px;padding:25px;margin-bottom:20px;box-shadow:0 10px 40px rgba(0,0,0,0.2)}
        h1{color:#333;text-align:center}
        h2{color:#667eea;border-bottom:2px solid #667eea;padding-bottom:8px}
        .info{background:#f0f0f0;padding:12px;border-radius:10px;margin-bottom:20px;word-break:break-all}
        .link-list{list-style:none;padding:0}
        .link-list li{background:#f8f9fa;margin:8px 0;padding:12px;border-radius:8px;word-break:break-all}
        .link-list a{color:#667eea;text-decoration:none}
        .screenshot-img{max-width:100%;border-radius:10px;border:1px solid #ddd}
        .badge{background:#28a745;color:white;padding:2px 8px;border-radius:20px;font-size:12px;margin-right:8px}
        .btn{display:inline-block;background:#667eea;color:white;padding:10px 20px;border-radius:10px;text-decoration:none;margin:10px 5px}
        .btn:hover{background:#764ba2}
        .footer{text-align:center;color:rgba(255,255,255,0.8);font-size:12px;margin-top:20px}
        .iframe-container{background:#f0f0f0;padding:10px;border-radius:10px;margin-top:10px}
        iframe{width:100%;height:500px;border:none;border-radius:8px}
        .timestamp-info{color:#666;font-size:12px;text-align:center;margin:5px 0}
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>🌐 خروجی مرورگر خودکار</h1>
            <div class="info">
                <strong>📅 تاریخ:</strong> ${date}<br>
                <strong>🔗 لینک اصلی:</strong> <a href="${url}" target="_blank">${url.substring(0, 80)}</a><br>
                <strong>📋 عملیات:</strong> ${action}
            </div>
            
            <div style="text-align:center">
                <a href="site.html" class="btn" target="_blank">🌍 مشاهده HTML کامل سایت</a>
                <a href="screenshot.png" class="btn" target="_blank">📸 مشاهده اسکرین شات</a>
                <a href="links.txt" class="btn" target="_blank">📋 دانلود لینک‌ها</a>
            </div>
            
            <div class="iframe-container">
                <h3>📄 پیش‌نمایش HTML سایت:</h3>
                <iframe src="site.html"></iframe>
            </div>`;
  
  if (action === 'screenshot' || action === 'both') {
    // استفاده از عکس با timestamp برای جلوگیری از کش
    html += `<div><h3>📸 اسکرین شات (آخرین جستجو)</h3>
             <img src="screenshot_${timestamp}.png" class="screenshot-img" style="max-width:100%">
             <div class="timestamp-info">⏱️ زمان این اسکرین شات: ${date}</div>
             </div>`;
  }
  
  if (action === 'media' || action === 'both') {
    if (videos.length > 0) {
      html += `<div><h3>🎬 ویدیوها <span class="badge">${videos.length}</span></h3><ul class="link-list">`;
      for (const v of videos) html += `<li><a href="${v}" target="_blank">📹 ${v}</a></li>`;
      html += `</ul></div>`;
    }
    
    if (images.length > 0) {
      html += `<div><h3>🖼️ عکس‌ها <span class="badge">${images.length}</span></h3><ul class="link-list">`;
      for (const img of images.slice(0, 20)) html += `<li><a href="${img}" target="_blank">🖼️ ${img}</a></li>`;
      html += `</ul></div>`;
    }
  }
  
  html += `<div class="footer">ساخته شده با ❤️ | این فایل شامل اسکرین شات، HTML کامل سایت و لینک‌های استخراج شده است</div></div></div></body></html>`;
  
  fs.writeFileSync('browser-output/index.html', html);
  
  // فایل متنی لینک‌ها
  let textContent = `لیست لینک‌های استخراج شده\n`;
  textContent += `========================\n`;
  textContent += `تاریخ: ${date}\n`;
  textContent += `لینک اصلی: ${url}\n\n`;
  textContent += `فایل HTML کامل سایت: site.html\n`;
  textContent += `اسکرین شات: screenshot.png\n\n`;
  
  if (videos.length > 0) {
    textContent += `ویدیوها (${videos.length}):\n`;
    for (const v of videos) textContent += `${v}\n`;
    textContent += `\n`;
  }
  if (images.length > 0) {
    textContent += `عکس‌ها (${images.length}):\n`;
    for (const img of images) textContent += `${img}\n`;
  }
  
  fs.writeFileSync('browser-output/links.txt', textContent);
  
  console.log(`✅ خروجی نهایی ذخیره شد:`);
  console.log(`   - site.html : کد HTML کامل سایت (${(htmlContent.length/1024).toFixed(1)} KB)`);
  console.log(`   - screenshot_${timestamp}.png : اسکرین شات جدید`);
  console.log(`   - screenshot.png : اسکرین شات (نسخه ثابت)`);
  console.log(`   - index.html : صفحه نمایانگر`);
  console.log(`   - links.txt : لیست لینک‌ها`);
})();
