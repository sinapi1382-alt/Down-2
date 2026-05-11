const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
  const url = process.env.INPUT_URL;
  const action = process.env.INPUT_ACTION;
  
  console.log('Starting browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  console.log('Going to: ' + url);
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  if (action === 'screenshot' || action === 'both') {
    await page.screenshot({ path: 'browser-output/screenshot.png', fullPage: true });
    console.log('Screenshot saved');
  }
  
  let videos = [];
  let images = [];
  
  if (action === 'media' || action === 'both') {
    videos = await page.evaluate(() => {
      const result = [];
      const elements = document.querySelectorAll('video, source, iframe');
      for (const el of elements) {
        const src = el.src || el.getAttribute('src');
        if (src && src.startsWith('http')) result.push(src);
      }
      return result;
    });
    
    images = await page.evaluate(() => {
      const result = [];
      const elements = document.querySelectorAll('img');
      for (const el of elements) {
        const src = el.src;
        if (src && src.startsWith('http') && !src.includes('data:image')) {
          result.push(src);
        }
      }
      return result;
    });
    
    console.log('Found ' + videos.length + ' videos and ' + images.length + ' images');
  }
  
  await browser.close();
  
  let html = '<html dir=rtl><head><meta charset=UTF-8><title>Browser Output</title>';
  html += '<style>';
  html += 'body{font-family:Tahoma;background:#667eea;padding:20px}';
  html += '.card{background:white;border-radius:20px;padding:25px;max-width:800px;margin:0 auto}';
  html += 'h1{color:#333} a{color:#667eea} li{background:#f8f9fa;margin:8px 0;padding:12px;border-radius:8px}';
  html += 'ul{list-style:none;padding:0} img{max-width:100%;border-radius:10px}';
  html += '</style><body><div class=card>';
  html += '<h1>Browser Output</h1>';
  html += '<p><strong>URL:</strong> <a href=' + url + '>' + url + '</a></p>';
  
  if (action === 'screenshot' || action === 'both') {
    html += '<h2>Screenshot</h2><img src=screenshot.png>';
  }
  
  if (action === 'media' || action === 'both') {
    if (videos.length > 0) {
      html += '<h2>Videos (' + videos.length + ')</h2><ul>';
      for (const v of videos) {
        html += '<li><a href=' + v + ' target=_blank>' + v + '</a></li>';
      }
      html += '</ul>';
    }
    
    if (images.length > 0) {
      html += '<h2>Images (' + images.length + ')</h2><ul>';
      for (const img of images) {
        html += '<li><a href=' + img + ' target=_blank>' + img + '</a></li>';
      }
      html += '</ul>';
    }
    
    if (videos.length === 0 && images.length === 0) {
      html += '<p>No media links found</p>';
    }
  }
  
  html += '</div></body></html>';
  
  fs.writeFileSync('browser-output/index.html', html);
  console.log('HTML file created');
}

run();
