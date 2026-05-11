const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const query = process.env.INPUT_QUERY;
  const numResults = parseInt(process.env.INPUT_NUM) || 10;
  
  if (fs.existsSync('google-results')) {
    fs.rmSync('google-results', { recursive: true });
  }
  fs.mkdirSync('google-results');
  
  console.log(`🔍 جستجوی: "${query}"`);
  console.log(`📊 تعداد نتایج: ${numResults}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  const page = await browser.newPage();
  
  // ============================================
  // تنظیمات برای شبیه‌سازی مرورگر واقعی
  // ============================================
  
  // User-Agent گوشی سامسونگ
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.99 Mobile Safari/537.36');
  
  // هدرهای اضافی
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'DNT': '1'
  });
  
  // مخفی کردن ربات بودن
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });
  
  await page.setViewport({ width: 412, height: 915 });
  
  // ساخت URL جستجو
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&udm=7&num=${numResults}`;
  console.log(`🌐 رفتن به: ${searchUrl}`);
  
  try {
    await page.goto(searchUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 45000 
    });
  } catch(e) {
    console.log('⚠️ صفحه کامل لود نشد، ولی ادامه می‌دهیم...');
  }
  
  // اسکرین‌شات
  await page.screenshot({ path: 'google-results/screenshot.png', fullPage: true });
  
  // استخراج لینک‌های ویدیو
  const videoLinks = await page.evaluate(() => {
    const links = [];
    
    // روش اول: لینک‌های مستقیم
    document.querySelectorAll('a[href*=".mp4"], a[href*="get_file"], a[href*="youtu"], a[href*="aparat"]').forEach(a => {
      let href = a.href;
      if (href && !links.includes(href)) {
        links.push(href);
      }
    });
    
    // روش دوم: لینک‌های داخل نتایج جستجو
    document.querySelectorAll('a[jsname="UWckNb"], a[data-ved]').forEach(a => {
      let href = a.href;
      if (href && href.startsWith('http') && !href.includes('google.com') && !links.includes(href)) {
        links.push(href);
      }
    });
    
    return links;
  });
  
  // ذخیره HTML کامل
  const html = await page.content();
  fs.writeFileSync('google-results/page.html', html);
  
  await browser.close();
  
  // ============================================
  // ساخت فایل خروجی
  // ============================================
  
  let output = `🔍 نتایج جستجوی گوگل\n`;
  output += `==========================================\n`;
  output += `عبارت جستجو: ${query}\n`;
  output += `تعداد نتایج: ${videoLinks.length}\n`;
  output += `تاریخ: ${new Date().toLocaleString('fa-IR')}\n`;
  output += `==========================================\n\n`;
  
  if (videoLinks.length > 0) {
    output += `📹 لینک‌های پیدا شده:\n\n`;
    videoLinks.forEach((link, i) => {
      output += `${i+1}. ${link}\n`;
    });
  } else {
    output += `❌ هیچ لینک ویدیویی پیدا نشد.\n`;
    output += `ممکن است گوگل صفحه کپچا داده باشد.\n`;
    output += `لطفاً فایل screenshot.png را بررسی کنید.\n`;
  }
  
  // ذخیره لینک‌ها به صورت متن ساده
  fs.writeFileSync('google-results/links.txt', videoLinks.join('\n'));
  fs.writeFileSync('google-results/output.txt', output);
  
  console.log(output);
  console.log(`\n✅ خروجی در پوشه google-results ذخیره شد`);
  console.log(`   - screenshot.png: اسکرین‌شات`);
  console.log(`   - page.html: کد کامل صفحه`);
  console.log(`   - links.txt: ${videoLinks.length} لینک (یکی در هر خط)`);
  
  // اگه لینکی پیدا نشد، اخطار بده
  if (videoLinks.length === 0) {
    console.log(`\n⚠️ توجه: گوگل احتمالاً کپچا داده!`);
    console.log(`   فایل screenshot.png را بررسی کن.`);
    console.log(`   برای دور زدن، می‌توانی از بینگ استفاده کنی.`);
  }
})();
