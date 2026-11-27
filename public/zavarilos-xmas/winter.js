const fortunes = [
  ['К свету в окне', 'В один из самых тёмных вечеров ты заметишь в окне гирлянду. Через несколько шагов поймёшь, что улыбаешься.', 'Оставить включённой'],
  ['К лишнему мандарину', 'Возьмёшь с собой два мандарина, хотя собирался взять один. Второй окажется очень кстати в разговоре, которого ты не планировал.', 'Один на двоих'],
  ['К тихому снегу', 'В новом году найдётся утро, когда можно будет идти медленно. Особенно если ночью выпадет снег и никто ещё не пройдёт по твоей улице.', 'По свежим следам'],
  ['К позднему чаю', 'Кто-то скажет «ещё по чашке?» уже в пальто. В итоге вы останетесь на кухне ещё на час.', 'Долить кипятка'],
  ['К ёлочной игрушке', 'Достанешь из коробки игрушку, которую считал потерянной. Заодно вспомнишь, кто когда-то повесил её на самое видное место.', 'Беречь до января'],
  ['К первому следу', 'Решишь пройти лишнюю остановку пешком. По дороге найдёшь место, где зимой лучше всего смотреть, как темнеет.', 'Дальше пешком'],
  ['К письму из кармана', 'В кармане зимнего пальто найдётся бумажка с чьим-то почерком. Захочется написать этому человеку прямо на улице.', 'Сохранить записку'],
  ['К тёплой варежке', 'Однажды выйдешь из дома не по погоде. К счастью, рядом окажется человек, который всегда берёт что-нибудь про запас.', 'На всякий случай'],
  ['К последней свечке', 'Свеча догорит раньше, чем закончится разговор. Никто не захочет вставать, чтобы включить свет.', 'Пусть ещё горит'],
  ['К знакомой песне', 'В магазине заиграет песня, которую ты любил несколько зим назад. Дослушаешь её до конца, уже выбрав всё, за чем пришёл.', 'Не переключать'],
  ['К открытке без повода', 'Получишь короткую записку, написанную от руки. Окажется, что четырёх слов вполне достаточно, чтобы день стал лучше.', 'От руки'],
  ['К выходному утром', 'Первое дело, которое ты запланируешь на один из январских выходных, отменится. Будет время сварить кофе и допить его горячим.', 'Время есть'],
];

const main = document.querySelector('main');
const flip = document.querySelector('.flip');
const collage = document.querySelector('.collage');
const result = document.querySelector('.result');
const heading = result.querySelector('h2');
const feedback = document.querySelector('.feedback');
const fallback = document.querySelector('.share-fallback');
const save = document.querySelector('.save');
const share = document.querySelector('.share');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const editionUrl = new URL('./', location.href).href;
const storageKey = 'zavarilos-xmas-fortune-v1';
let selection;
let png;
let busy = false;

const flurries = document.querySelector('.flurries');
for (let i = 0; i < 13; i++) {
  const flake = document.createElement('span');
  flake.className = 'flake';
  flake.style.cssText = `--x:${(i * 37 + 8) % 100}%;--size:${2 + i % 3}px;--duration:${7 + i % 6}s;--delay:${-i * 1.7}s;--drift:${i % 2 === 0 ? 22 : -33}px`;
  flurries.append(flake);
}

function chooseFortune() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null && fortunes[Number(saved)]) return Number(saved);
  } catch {}
  const index = crypto.getRandomValues(new Uint32Array(1))[0] % fortunes.length;
  try { localStorage.setItem(storageKey, String(index)); } catch {}
  return index;
}

function tell(message) {
  feedback.hidden = !message;
  feedback.textContent = message;
}

function reveal() {
  selection = fortunes[chooseFortune()];
  const [title, fortune, stamp] = selection;
  heading.textContent = title;
  result.querySelector('.fortune').textContent = fortune;
  result.querySelector('.stamp').textContent = stamp;
  main.classList.replace('turning', 'has-result');
  result.hidden = false;
  heading.focus({preventScroll: true});
  if (!motion.matches) result.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  else result.scrollIntoView({block: 'nearest'});
  save.disabled = true;
  preparePng().then(file => { png = file; }).catch(() => {
    tell('Картинку пока не удалось подготовить. Нажми на значок, чтобы попробовать снова.');
  }).finally(() => { save.disabled = false; });
}

flip.addEventListener('click', () => {
  flip.disabled = true;
  main.classList.add('turning');
  if (motion.matches) reveal();
  else setTimeout(reveal, 760);
});

function wrap(ctx, text, width) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const last = lines.length - 1;
    const next = lines[last] ? lines[last] + ' ' + word : word;
    if (lines[last] && ctx.measureText(next).width > width) lines.push(word);
    else lines[last] = next;
  }
  return lines;
}

async function preparePng() {
  const [title, fortune, stamp] = selection;
  await Promise.allSettled([
    collage.decode(),
    document.fonts.load('700 95px Condensed', 'ЗАВАРИЛОСЬ ' + title + stamp),
    document.fonts.load('37px Visuelt', fortune),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#123b30';
  ctx.fillRect(0, 0, 1080, 1350);
  if (collage.naturalWidth) {
    const croppedHeight = Math.min(collage.naturalHeight, collage.naturalWidth * .74);
    ctx.drawImage(collage, 0, (collage.naturalHeight - croppedHeight) / 2, collage.naturalWidth, croppedHeight, 0, 145, 1080, 800);
  }
  ctx.fillStyle = '#fff0d4';
  ctx.font = '700 119px Condensed, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ЗАВАРИЛОСЬ', 540, 126, 980);
  ctx.save();
  ctx.translate(540, 1045);
  ctx.rotate(-.025);
  ctx.fillRect(-465, -230, 930, 462);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#191919';
  ctx.font = '29px Visuelt, sans-serif';
  ctx.fillText('ЛИЦЕЙ / ТВОЙ ЗНАК НА НОВЫЙ ГОД', -412, -160);
  ctx.setLineDash([9, 9]);
  ctx.beginPath();
  ctx.moveTo(-412, -136);
  ctx.lineTo(412, -136);
  ctx.strokeStyle = '#191919';
  ctx.stroke();
  ctx.font = '700 78px Condensed, sans-serif';
  ctx.fillText(title.toLocaleUpperCase('ru-RU'), -412, -48, 824);
  ctx.font = '37px Visuelt, sans-serif';
  wrap(ctx, fortune, 824).forEach((line, i) => ctx.fillText(line, -412, 24 + 48 * i));
  ctx.textAlign = 'right';
  ctx.font = '700 32px Condensed, sans-serif';
  ctx.fillStyle = '#b82330';
  ctx.fillText(stamp.toLocaleUpperCase('ru-RU'), 412, 189, 824);
  ctx.restore();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('PNG encoding failed');
  return new File([blob], 'zavarilos-xmas.png', {type: 'image/png'});
}

function download(file) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 30000);
}

save.addEventListener('click', async () => {
  if (busy) return;
  busy = true;
  tell('');
  try {
    if (!png) {
      png = await preparePng();
      download(png);
      return;
    }
    const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const image = {files: [png]};
    if (appleMobile && navigator.share && navigator.canShare?.(image)) {
      await navigator.share(image);
    } else download(png);
  } catch (error) {
    if (error.name !== 'AbortError') {
      if (png) download(png);
      else tell('Не получилось сохранить картинку. Попробуй ещё раз.');
    }
  } finally {
    busy = false;
  }
});

share.addEventListener('click', async () => {
  if (busy) return;
  busy = true;
  tell('');
  fallback.hidden = true;
  try {
    if (navigator.share) {
      try {
        await navigator.share({url: editionUrl});
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    await navigator.clipboard.writeText(editionUrl);
    tell('Ссылка скопирована.');
  } catch {
    fallback.href = editionUrl;
    fallback.textContent = editionUrl;
    fallback.hidden = false;
    tell('Скопируй ссылку на новогоднее «Заварилось».');
  } finally {
    busy = false;
  }
});
