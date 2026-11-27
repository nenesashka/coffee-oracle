// Shared links serve the oracle itself, keeping their prediction-specific metadata.
// Run on every deployment so they always use the latest application and controls.
const { readFile, readdir, writeFile } = require('node:fs/promises');
const { resolve } = require('node:path');

async function buildSharePages() {
  const root = resolve(__dirname,'../public/zavarilos');
  const template = await readFile(resolve(root,'index.html'),'utf8');
  const entries = await readdir(resolve(root,'s'),{withFileTypes:true});
  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^v1-\d{2}$/.test(entry.name)) continue;
    const path = resolve(root,'s',entry.name,'index.html');
    const preview = await readFile(path,'utf8');
    const title = preview.match(/<title>[\s\S]*?<\/title>/)?.[0];
    const description = preview.match(/<meta name="description"[^>]*>/)?.[0];
    const metadata = preview.match(/<meta (?:property="og:|name="twitter:)[^>]*>|<link rel="canonical"[^>]*>/g);
    if (!title || !description || !metadata?.length) throw new Error('Missing preview metadata: '+entry.name);
    const page = template
      .replace('<meta charset="utf-8">','<meta charset="utf-8">\n<base href="../../">\n'+metadata.join('\n'))
      .replace(/<title>[\s\S]*?<\/title>/,title)
      .replace(/<meta name="description"[^>]*>/,description);
    await writeFile(path,page);
    count++;
  }
  return count;
}

module.exports = { buildSharePages };
if (require.main === module) buildSharePages()
  .then(count => console.log('Updated '+count+' shared oracle pages'))
  .catch(error => {console.error(error);process.exitCode=1;});
