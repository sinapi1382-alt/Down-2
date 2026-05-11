const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  // ساخت پوشه خروجی
  if (!fs.existsSync('browser-output')) {
    fs.mkdirSync('browser-output', { recursive: true });
  }
  
  const url = process.env.INPUT_URL;
  const action = process.env.INPUT_ACTION;
  const date = new Date().toLocaleString('fa-IR');
  
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
  
  // اسکرین شات
  if (action === 'screenshot' || action === 'both') {
    console.log(`3. گرفتن اسکرین شات...`);
    await page.screenshot({ 
      path: 'browser-output/screenshot.png', 
      fullPage: true 
    });
    console.log(`✅ اسکرین شات ذخیره شد`);
  }
  
  // استخراج مدیا
  if (action === 'media' || action === 'both') {
    console.log(`4. استخراج لینک‌های مدیا...`);
    
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
  
  // ساخت فایل HTML
  console.log(`5. ساخت فایل HTML...`);
  
  let html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>خروجی مرورگر خودکار</title>
    <style>
        body {
            font-family: 'Tahoma', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        .card {
            background: white;
            border-radius: 20px;
            padding: 25px;
            margin-bottom: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 10px;
        }
        .info {
            background: #f0f0f0;
            padding: 12px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-size: 14px;
            word-break: break-all;
        }
        .section {
            margin-bottom: 25px;
        }
        .section h3 {
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .link-list {
            list-style: none;
            padding: 0;
        }
        .link-list li {
            background: #f8f9fa;
            margin: 8px 0;
            padding: 12px;
            border-radius: 8px;
            word-break: break-all;
        }
        .link-list a {
            color: #667eea;
            text-decoration: none;
        }
        .link-list a:hover {
            text-decoration: underline;
        }
        .thumbnail {
            max-width: 100px;
            border-radius: 8px;
            margin: 5px;
        }
        .screenshot-img {
            max-width: 100%;
            border-radius: 10px;
            border: 1px solid #ddd;
        }
        .badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: 12px;
            margin-right: 8px;
        }
        hr {
            margin: 20px 0;
            border: none;
            border-top: 1px solid #ddd;
        }
        .footer {
            text-align: center;
            color: rgba(255,255,255,0.8);
            font-size: 12px;
        }
        .error {
            color: #dc3545;
            background: #f8d7da;
            padding: 10px;
            border-radius: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>🌐 خروجی مرورگر خودکار</h1>
            <div class="info">
                <strong>📅 تاریخ:</strong> ${date}<br>
                <strong>🔗 لینک اصلی:</strong> <a href="${url}" target="_blank">${url}</a><br>
                <strong>📋 عملیات:</strong> ${action}
            </div>`;
  
  if (action === 'screenshot' || action === 'both') {
    html += `
            <div class="section">
                <h3>📸 اسکرین شات</h3>
                <img src="screenshot.png" alt="Screenshot" class="screenshot-img">
            </div>`;
  }
  
  if (action === 'media' || action === 'both') {
    if (videos.length > 0) {
      html += `
            <div class="section">
                <h3>🎬 لینک‌های ویدیو <span class="badge">${videos.length}</span></h3>
                <ul class="link-list">`;
      for (const v of videos) {
        html += `<li><a href="${v}" target="_blank">📹 ${v}</a></li>`;
      }
      html += `
                </ul>
            </div>`;
    }
    
    if (images.length > 0) {
      html += `
            <div class="section">
                <h3>🖼️ لینک‌های عکس <span class="badge">${images.length}</span></h3>
                <div>`;
      for (const img of images.slice(0, 10)) {
        html += `<a href="${img}" target="_blank"><img src="${img}" class="thumbnail" onerror="this.style.display='none'"></a> `;
      }
      html += `
                </div>
                <ul class="link-list">`;
      for (const img of images) {
        html += `<li><a href="${img}" target="_blank">🖼️ ${img}</a></li>`;
      }
      html += `
                </ul>
            </div>`;
    }
    
    if (videos.length === 0 && images.length === 0) {
      html += `
            <div class="section">
                <h3>⚠️ نتیجه</h3>
                <div class="error">
                    هیچ لینک ویدیو یا عکسی در این صفحه پیدا نشد.<br>
                    احتمالاً محتوا به صورت داینامیک بارگذاری می‌شود یا نیاز به اسکرول دارد.
                </div>
            </div>`;
    }
  }
  
  html += `
            <hr>
            <div class="section">
                <h3>💡 راهنما</h3>
                <ul>
                    <li>برای دانلود ویدیو: لینک را در ADM یا IDM وارد کن</li>
                    <li>برای دانلود عکس: روی لینک کلیک کن و Save رو بزن</li>
                    <li>این لینک‌ها مستقیماً از صفحه استخراج شده‌اند</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            ساخته شده با ❤️ توسط مرورگر خودکار | ${date}
        </div>
    </div>
</body>
</html>`;
  
  fs.writeFileSync('browser-output/index.html', html);
  
  // همچنین یک فایل متنی ساده برای لینک‌ها
  let textContent = `لیست لینک‌های استخراج شده\n`;
  textContent += `========================\n`;
  textContent += `تاریخ: ${date}\n`;
  textContent += `لینک اصلی: ${url}\n\n`;
  
  if (videos.length > 0) {
    textContent += `ویدیوها (${videos.length}):\n`;
    for (const v of videos) textContent += `${v}\n`;
    textContent += `\n`;
  }
  
  if (images.length > 0) {
    textContent += `عکس‌ها (${images.length}):\n`;
    for (const img of images) textContent += `${img}\n`;
    textContent += `\n`;
  }
  
  fs.writeFileSync('browser-output/links.txt', textContent);
  
  console.log(`✅ فایل HTML و فایل متنی لینک‌ها ساخته شد`);
  console.log(`📁 پوشه browser-output آماده است`);
  
  // نمایش لیست فایل‌ها
  const files = fs.readdirSync('browser-output');
  console.log(`فایل‌های موجود:`);
  for (const file of files) {
    console.log(`  - ${file}`);
  }
})();
