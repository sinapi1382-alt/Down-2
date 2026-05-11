const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = process.env.INPUT_URL;
  const action = process.env.INPUT_ACTION;
  const date = new Date().toLocaleString('fa-IR');
  
  console.log('شروع مرورگر...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  console.log('در حال رفتن به: ' + url);
  await page.goto(url, { 
    waitUntil: 'networkidle2',
    timeout: 30000 
  });
  
  let videos = [];
  let images = [];
  
  if (action === 'screenshot' || action === 'both') {
    await page.screenshot({ 
      path: 'browser-output/screenshot.png', 
      fullPage: true 
    });
    console.log('اسکرین شات گرفته شد');
  }
  
  if (action === 'media' || action === 'both') {
    const media = await page.evaluate(() => {
      const vids = [];
      const imgs = [];
      
      document.querySelectorAll('video, source, iframe').forEach(el => {
        const src = el.src || el.getAttribute('src');
        if (src && src.startsWith('http')) vids.push(src);
      });
      
      document.querySelectorAll('img').forEach(el => {
        const src = el.src;
        if (src && src.startsWith('http') && !src.includes('data:image')) {
          imgs.push(src);
        }
      });
      
      return { videos: vids, images: imgs };
    });
    
    videos = media.videos;
    images = media.images;
    
    console.log(videos.length + ' ویدیو و ' + images.length + ' عکس پیدا شد');
  }
  
  await browser.close();
  
  let html = '<html dir=rtl><head><meta charset=UTF-8><title>خروجی مرورگر</title>';
  html += '<style>body{font-family:Tahoma;background:#667eea;padding:20px}.card{background:white;border-radius:20px;padding:25px;margin-bottom:20px}';
  html += 'h1{color:#333} a{color:#667eea} .link-list li{background:#f8f9fa;margin:8px 0;padding:12px;border-radius:8px}';
  html += 'ul{list-style:none;padding:0} .screenshot-img{max-width:100%;border-radius:10px}</style>';
  html += '<body><div class=card>';
  html += '<h1>خروجی مرورگر</h1>';
  html += '<p><strong>تاریخ:</strong> ' + date + '</p>';
  html += '<p><strong>لینک:</strong> <a href=' + url + ' target=_blank>' + url + '</a></p>';
  
  if (action === 'screenshot' || action === 'both') {
    html += '<h2>اسکرین شات</h2>';
    html += '<img src=screenshot.png class=screenshot-img>';
  }
  
  if (action === 'media' || action === 'both') {
    if (videos.length > 0) {
      html += '<h2>ویدیوها (' + videos.length + ')</h2><ul>';
      videos.forEach(v => {
        html += '<li><a href=' + v + ' target=_blank>' + v + '</a></li>';
      });
      html += '</ul>';
    }
    
    if (images.length > 0) {
      html += '<h2>عکس‌ها (' + images.length + ')</h2><ul>';
      images.forEach(img => {
        html += '<li><a href=' + img + ' target=_blank>' + img + '</a></li>';
      });
      html += '</ul>';
    }
    
    if (videos.length === 0 && images.length === 0) {
      html += '<p>هیچ لینک مدیایی پیدا نشد</p>';
    }
  }
  
  html += '</div></body></html>';
  
  fs.writeFileSync('browser-output/index.html', html);
  console.log('فایل HTML ساخته شد');
})();
