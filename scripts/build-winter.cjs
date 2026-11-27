const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { resolve } = require('node:path');

const winter = resolve(__dirname, '../public/zavarilos-xmas');
const original = resolve(winter, '../zavarilos/index.html');
const home = 'https://nenesashka.github.io/coffee-oracle/zavarilos-xmas/';
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

function replaceOnce(source, before, after) {
  if (!source.includes(before)) throw new Error('Winter template marker missing: ' + before);
  return source.replace(before, after);
}

async function buildWinter() {
  const { signs } = await import('../public/zavarilos-xmas/winter.js');
  let html = await readFile(original, 'utf8');
  html = html.replaceAll('assets/', '../zavarilos/assets/');
  html = replaceOnce(html, "import { signs } from './../zavarilos/assets/signs-v1.js?v=2';", '');
  html = replaceOnce(html, "'./../zavarilos/assets/share-card-v1.js?v=4'", "'./winter.js?v=2'");
  html = replaceOnce(html, 'import { CARD_ASSET_FILES', 'import { signs, CARD_ASSET_FILES');
  html = replaceOnce(html, "'zavarilos-sign-seed'", "'zavarilos-xmas-sign-seed-v2'");
  html = html.replaceAll('zavarilos.png', 'zavarilos-xmas.png');
  html = html.replaceAll('Какой сегодня будет день?', 'Что заварится в новом году?');
  html = html.replaceAll('Пусть так и будет', 'С новым годом!');
  html = html.replaceAll('кажется, это к лучшему', 'ну вот и чудеса');
  html = html.replaceAll('предсказания<br>к кофе', 'новогодние<br>предсказания к кофе');
  html = html.replaceAll('ЛИЦЕЙ / ТВОЙ ЗНАК', 'ЛИЦЕЙ / НОВОГОДНИЙ ВЫПУСК');
  html = html.replaceAll("signDate.textContent = date;", "signDate.textContent = '';");
  html = html.replaceAll('Выпекаем булочки…', 'Раскладываем имбирное печенье…');
  html = html.replaceAll('Раскладываем вырезки…', 'Подвешиваем ёлочные игрушки…');
  html = html.replaceAll('Бумажная вырезка слойки с ягодами', 'Бумажная вырезка мандарина');
  html = html.replaceAll('<title>Заварилось · Лицей</title>', '<title>Заварилось · Новогодний выпуск Лицея</title>');
  html = html.replaceAll('content="#ed272e"', 'content="#892329"');
  html = html.replaceAll('Заварилось — бумажное кофейное предсказание от Лицея.', 'Заварилось — новогодние предсказания к кофе от Лицея.');
  for (const [asset, replacement] of [
    ['eye-v2.avif', 'bauble.png'], ['seal.avif', 'snowflake.png'],
    ['croissant-v2.avif', 'gingerbread.png'], ['danish.avif', 'mandarin.png'],
  ]) {
    html = replaceOnce(html, 'src="../zavarilos/assets/' + asset + '"', 'src="assets/' + replacement + '"');
  }
  const snow = Array.from({length: 18}, (_, i) =>
    '<span style="--x:' + (i * 37 % 100) + '%;--size:' + (3 + i % 5) + 'px;--speed:' + (10 + i % 7) +
    's;--delay:' + (-1 - i * 2.15) + 's;--drift:' + ((i % 2 ? -1 : 1) * 32) + 'px"></span>').join('');
  const sparks = [[30,34,18],[54,25,29],[67,47,20],[44,54,34],[59,64,15],[23,58,18]].map(([x,y,size], i) =>
    '<span style="--x:' + x + '%;--y:' + y + '%;--size:' + size + 'px;--delay:' + (i * 36 + 150) + 'ms"></span>').join('');
  html = replaceOnce(html, '<div class="z5-art">', '<div class="z5-art">\n' +
    '<div class="xmas-flurries" aria-hidden="true">' + snow + '</div>\n' +
    '<div class="xmas-sparks" aria-hidden="true">' + sparks + '</div>');
  html = replaceOnce(html, '</head>', '<link rel="stylesheet" href="winter.css?v=2">\n</head>');

  function page(address, title, image, alt, base = '') {
    const meta = {
      'og:type': 'website', 'og:site_name': 'Заварилось · Лицей', 'og:title': title,
      'og:url': address, 'og:image': image, 'og:image:alt': alt,
    };
    const tags = Object.entries(meta).map(([key,value]) =>
      '<meta property="' + key + '" content="' + escape(value) + '">').join('\n');
    return replaceOnce(html, '<meta charset="utf-8">', '<meta charset="utf-8">\n' + base + tags);
  }

  await writeFile(resolve(winter,'index.html'),page(home,'Что заварится в новом году?',home+'assets/winter-cup.jpg','Новогодний бумажный коллаж с чашкой кофе'));
  for (const [[title, fortune], index] of signs.map((sign,index) => [sign,index])) {
    const slug = String(index + 1).padStart(2,'0');
    const folder = resolve(winter,'s',slug);
    const address = home + 's/' + slug + '/';
    await mkdir(folder,{recursive:true});
    await writeFile(resolve(folder,'index.html'),page(address,'Заварилось на Новый год. А у тебя?',home+'assets/cards/'+slug+'.jpg',title+'. '+fortune,'<base href="../../">\n'));
  }
}

buildWinter().catch(error => { console.error(error); process.exitCode = 1; });
