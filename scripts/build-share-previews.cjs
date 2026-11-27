// Run against the local public/ server; uses the same renderer as downloaded PNGs.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const local = process.argv[2] || 'http://127.0.0.1:8941/zavarilos/';
const root = resolve(__dirname, '../public/zavarilos');
const escape = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

(async () => {
  const browser = await chromium.launch({channel:process.env.CHROME_CHANNEL || 'chrome'});
  try {
    const page = await browser.newPage();
    await page.goto(local);
    await page.evaluate(() => document.fonts.ready);
    const previews = await page.evaluate(async () => {
      const { signs } = await import('./assets/signs-v1.js?v=2');
      const { CARD_ASSET_FILES, CARD_URL, newCardLayout, loadCardImages, paintCard, shareTitle, shareCaption, shareUrl } = await import('./assets/share-card-v1.js?v=4');
      const urls = Object.fromEntries(Object.entries(CARD_ASSET_FILES).map(([key,file]) => [key,new URL('./assets/'+file,location.href).href]));
      urls.logo = document.querySelector('.z5-logo').src;
      const images = await loadCardImages(urls);
      if (Object.values(images).some(image => !image)) throw new Error('Missing preview asset');
      await Promise.all([
        document.fonts.load('700 120px "ZV Condensed"','ЗАВАРИЛОСЬ'),
        document.fonts.load('400 40px "Visuelt Pro"','Предсказание'),
      ]);
      const canvas = document.createElement('canvas');
      const layout = newCardLayout();
      // A shared link stays valid across days; its preview must not show a stale date.
      layout.layers.find(layer => layer.id === 'date').visible = false;
      return signs.map(([title,text,stamp],index) => {
        const sign = {title,text,stamp};
        paintCard(canvas,layout,{...sign,title:title.toLocaleUpperCase('ru-RU'),stamp:stamp.toLocaleUpperCase('ru-RU')},images);
        return {id:'v1-'+String(index+1).padStart(2,'0'), title:shareTitle(sign), alt:title+'. '+text,
          url:shareUrl(sign), caption:shareCaption(sign).split('\n')[0], home:CARD_URL, jpeg:canvas.toDataURL('image/jpeg',.92).split(',')[1]};
      });
    });
    for (const item of previews) {
      const directory = resolve(root,'s',item.id);
      await mkdir(directory,{recursive:true});
      await writeFile(resolve(directory,'card.jpg'),Buffer.from(item.jpeg,'base64'));
      const image = new URL('card.jpg',item.url).href;
      const html = `<!doctype html><html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${escape(item.title)}</title>
<meta name="description" content="${escape(item.caption)}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Заварилось · Лицей">
<meta property="og:title" content="${escape(item.title)}"><meta property="og:description" content="${escape(item.caption)}">
<meta property="og:url" content="${item.url}"><meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1080"><meta property="og:image:height" content="1350">
<meta property="og:image:alt" content="${escape(item.alt)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(item.title)}"><meta name="twitter:image" content="${image}">
<link rel="icon" href="../../../../icon.svg"><link rel="canonical" href="${item.url}">
<style>body{margin:24px auto;padding:0 20px;max-width:540px;background:#ed272e;color:#fff0d4;font:18px/1.4 system-ui}img{width:100%;height:auto}a{color:inherit}</style>
</head><body><p>${escape(item.caption)}</p><a href="${item.home}">Узнать своё предсказание</a><p><img src="card.jpg" width="1080" height="1350" alt="${escape(item.alt)}"></p>
<script>location.replace(${JSON.stringify(item.home)});</script></body></html>`;
      await writeFile(resolve(directory,'index.html'),html);
    }
    console.log('Generated '+previews.length+' link previews');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
