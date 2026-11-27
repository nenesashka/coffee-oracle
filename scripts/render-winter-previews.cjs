// Run against a local Pages preview after node scripts/build-winter.cjs.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const assets = resolve(__dirname, '../public/zavarilos-xmas/assets');

(async () => {
  const browser = await chromium.launch({channel:'chrome'});
  try {
    const page = await browser.newPage({viewport:{width:390,height:775},deviceScaleFactor:3,reducedMotion:'reduce'});
    await page.goto(process.argv[2] || 'http://127.0.0.1:8941/zavarilos-xmas/');
    await page.locator('html[data-load-state="ready"]').waitFor({state:'attached'});
    await page.locator('.z5-screen').screenshot({path:resolve(assets,'winter-cup.jpg'),quality:86});
    const images = await page.evaluate(async () => {
      const winter = await import('./winter.js?v=2');
      const urls = Object.fromEntries(Object.entries(winter.CARD_ASSET_FILES).map(([name,file]) => [
        name,new URL('../zavarilos/assets/'+file,document.baseURI).href,
      ]));
      urls.logo = document.querySelector('.z5-logo').src;
      const art = await winter.loadCardImages(urls);
      if (Object.values(art).some(image => !image)) throw new Error('Missing winter preview artwork');
      await document.fonts.ready;
      const canvas = document.createElement('canvas');
      const layout = winter.newCardLayout();
      layout.layers.find(layer => layer.id === 'date').visible = false;
      return winter.signs.map(([title,text,stamp]) => {
        winter.paintCard(canvas,layout,{title:title.toLocaleUpperCase('ru-RU'),text,stamp:stamp.toLocaleUpperCase('ru-RU')},art);
        return canvas.toDataURL('image/jpeg',.88).split(',')[1];
      });
    });
    const output = resolve(assets,'cards');
    await mkdir(output,{recursive:true});
    for (const [index, jpeg] of images.entries()) {
      const name = String(index + 1).padStart(2,'0') + '.jpg';
      await writeFile(resolve(output,name),Buffer.from(jpeg,'base64'));
    }
    console.log('Rendered '+images.length+' winter prediction previews');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
