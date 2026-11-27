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
        Object.defineProperty(navigator,'share',{value:async data => { if (window.shareResult === 'abort') throw new DOMException('Cancelled','AbortError'); window.shared.push({url:data.url,text:data.text,files:data.files?.map(file=>({type:file.type,size:file.size}))}); }});
        Object.defineProperty(navigator,'canShare',{value:data => !data.files || window.fileSharingSupported !== false});
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror',error => errors.push(error.message));
      await page.goto(target);
      await page.locator('html[data-load-state="ready"]').waitFor({state:'attached'});
      const originalColor = await page.locator('.z5-main').evaluate(button=>getComputedStyle(button).backgroundColor);
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
      assert.ok(downloadBounds.x + downloadBounds.width <= mainBounds.x);
      assert.ok(Math.abs(downloadBounds.y-mainBounds.y)<1);
      assert.ok(Math.abs(downloadBounds.width-downloadBounds.height)<1);
      assert.ok(Math.abs(downloadBounds.height-mainBounds.height)<1);
      assert.equal(await page.locator('.z5-main').evaluate(button=>getComputedStyle(button).backgroundColor),originalColor);
      assert.equal(await downloadLink.innerText(),'');
      assert.equal(await downloadLink.locator('svg').count(),1);
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

      // iPhone opens the image-only system sheet, without triggering a download.
      const phone = await context.newPage();
      await phone.addInitScript(() => Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'}));
      let phoneDownloads = 0;
      phone.on('download',() => phoneDownloads++);
      await phone.goto(target);
      await phone.locator('html[data-load-state="ready"]').waitFor({state:'attached'});
      await phone.getByRole('button',{name:'Перевернуть кружку',exact:true}).click();
      const saveLink = phone.getByRole('link',{name:'Сохранить предсказание',exact:true});
      await saveLink.waitFor({state:'visible'});
      await saveLink.click();
      const imagePayload = await phone.evaluate(() => window.shared[0]);
      assert.equal(imagePayload.files.length,1);
      assert.equal(imagePayload.files[0].type,'image/png');
      assert.ok(imagePayload.files[0].size>10000);
      assert.equal(imagePayload.url,undefined);
      assert.equal(imagePayload.text,undefined);
      await phone.evaluate(() => {window.shareResult='abort';});
      await saveLink.click();
      assert.equal(await phone.locator('.z5-share').evaluate(dialog=>dialog.open),false);
      await phone.evaluate(() => {window.shareResult='success';});
      await saveLink.click();
      assert.equal(await phone.evaluate(() => window.shared.length),2);
      assert.equal(phoneDownloads,0);
      await phone.getByRole('button',{name:'Поделиться',exact:true}).click();
      assert.match((await phone.evaluate(() => window.shared[2])).url,/\/s\/v1-/);
      // Browsers without file sharing keep the ordinary PNG download.
      await phone.reload();
      await phone.evaluate(() => {window.fileSharingSupported=false;});
      await phone.locator('html[data-load-state="ready"]').waitFor({state:'attached'});
      await phone.getByRole('button',{name:'Перевернуть кружку',exact:true}).click();
      const [fallbackDownload] = await Promise.all([phone.waitForEvent('download'),phone.getByRole('link',{name:'Скачать предсказание',exact:true}).click()]);
      assert.equal(fallbackDownload.suggestedFilename(),'zavarilos.png');
      await phone.close();

      // Preview crawlers must get the matching title and image without running JS.
      const noJS = await browser.newContext({javaScriptEnabled:false});
      const preview = await noJS.newPage();
      const previewUrl = new URL('s/v1-12/',target).href;
      await preview.goto(previewUrl);
      assert.equal(await preview.locator('meta[property="og:title"]').getAttribute('content'),'У меня заварилось. А у тебя?');
      assert.match(await preview.locator('meta[property="og:image"]').getAttribute('content'),/s\/v1-12\/card.jpg$/);
      assert.equal(await preview.locator('base').getAttribute('href'),'../../');
      assert.ok((await context.request.get(new URL('s/v1-12/card.jpg',target).href)).ok());
      await noJS.close();

      // Shared URLs load the real oracle directly, even while assets are slow.
      const shared = await context.newPage();
      const sharedErrors = [];
      shared.on('pageerror',error=>sharedErrors.push(error.message));
      let documents = 0;
      shared.on('request',request=>{if(request.isNavigationRequest() && request.frame()===shared.mainFrame()) documents++;});
      let release;
      const gate = new Promise(resolve=>{release=resolve;});
      await shared.route('**/assets/cup-frames.avif',async route=>{await gate;await route.continue();});
      await shared.goto(previewUrl,{waitUntil:'domcontentloaded'});
      assert.equal(shared.url(),previewUrl);
      assert.equal(await shared.locator('html').getAttribute('data-load-state'),'loading');
      assert.equal(await shared.locator('#zavarilos-stop-motion-v6').evaluate(root=>getComputedStyle(root).opacity),'0');
      assert.equal((await shared.locator('body').innerText()).includes('У меня заварилось предсказание'),false);
      await shared.locator('.z5-loading').waitFor({state:'visible'});
      release();
      await shared.locator('html[data-load-state="ready"]').waitFor({state:'attached'});
      await shared.getByRole('button',{name:'Перевернуть кружку',exact:true}).click();
      assert.equal(await shared.locator('.z5-sign-title').innerText(),title);
      await shared.getByRole('link',{name:'Скачать предсказание',exact:true}).waitFor();
      assert.deepEqual(sharedErrors,[]);
      assert.equal(documents,1);
      assert.equal(shared.url(),previewUrl);
      await shared.close();
      console.log(engine.name()+': square save control, matching button colors, iPhone save, PNG download, direct shared page passed ('+title+')');
    } finally { await browser.close(); }
  }
})().catch(error => {console.error(error);process.exitCode=1;});
