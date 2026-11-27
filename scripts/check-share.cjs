const assert = require('node:assert/strict');
const { chromium, webkit } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const target = process.argv[2] || 'http://127.0.0.1:8941/zavarilos/';

(async () => {
  for (const [engine, options] of [[chromium,{channel:'chrome'}],[webkit,{}]]) {
    const browser = await engine.launch(options);
    try {
      const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
      await context.addInitScript(() => {
        window.shared = [];
        Object.defineProperty(navigator,'share',{value:async data => { window.shared.push({url:data.url,text:data.text,files:data.files?.map(file=>({type:file.type,size:file.size}))}); }});
        Object.defineProperty(navigator,'canShare',{value:() => true});
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror',error => errors.push(error.message));
      await page.goto(target);
      await page.locator('html[data-load-state="ready"]').waitFor({state:'attached'});
      await page.getByRole('button',{name:'Перевернуть кружку',exact:true}).click();
      const title = await page.locator('.z5-sign-title').innerText();
      await page.getByRole('button',{name:'Поделиться',exact:true}).click();
      let payload = await page.evaluate(() => window.shared[0]);
      assert.match(payload.url,/\/s\/v1-\d{2}\/\?v=2$/);
      assert.equal(payload.text,undefined);
      assert.equal(payload.files,undefined);
      const downloadLink = page.getByRole('link',{name:'Скачать предсказание',exact:true});
      await downloadLink.waitFor({state:'visible'});
      const mainBounds = await page.getByRole('button',{name:'Поделиться',exact:true}).boundingBox();
      const downloadBounds = await downloadLink.boundingBox();
      assert.ok(downloadBounds.y >= mainBounds.y + mainBounds.height);
      const [download] = await Promise.all([page.waitForEvent('download'),downloadLink.click()]);
      assert.equal(download.suggestedFilename(),'zavarilos.png');
      const { readFile } = require('node:fs/promises');
      const bytes = await readFile(await download.path());
      assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
      assert.ok(bytes.length > 10000);
      assert.equal(await page.locator('.z5-share').evaluate(dialog=>dialog.open),false);
      assert.equal(await page.getByText('Картинка и подпись',{exact:true}).count(),0);
      const bounds = await page.locator('.z5-actions').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x+bounds.width <= 391);
      assert.ok(bounds.y+bounds.height <= 844);
      await page.screenshot({path:'/tmp/zavarilos-share-'+engine.name()+'.png'});
      assert.deepEqual(errors,[]);

      // Preview crawlers must get the matching title and image without running JS.
      const noJS = await browser.newContext({javaScriptEnabled:false});
      const preview = await noJS.newPage();
      const previewUrl = new URL('s/v1-12/',target).href;
      await preview.goto(previewUrl);
      assert.equal(await preview.locator('meta[property="og:title"]').getAttribute('content'),'У меня заварилось. А у тебя?');
      assert.match(await preview.locator('meta[property="og:image"]').getAttribute('content'),/s\/v1-12\/card.jpg$/);
      assert.equal(await preview.locator('img').evaluate(image=>image.naturalWidth),1080);
      await noJS.close();

      // A person opening the shared link reaches their own ordinary oracle.
      await page.route('https://nenesashka.github.io/coffee-oracle/zavarilos/',route=>route.fulfill({status:200,contentType:'text/html',body:'<title>own oracle destination</title>'}));
      await page.goto(previewUrl);
      await page.waitForURL('https://nenesashka.github.io/coffee-oracle/zavarilos/');
      assert.equal(await page.title(),'own oracle destination');
      console.log(engine.name()+': link sharing, direct PNG download below main button, no-JS preview, redirect passed ('+title+')');
    } finally { await browser.close(); }
  }
})().catch(error => {console.error(error);process.exitCode=1;});
