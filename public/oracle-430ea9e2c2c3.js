(function runOracle(signs, glyphs, sendVisit, visitUrl, renderShareCard) {
  const get = (id) => document.getElementById(id);
  const spot = document.body.dataset.spot;
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date());
  const dateIndex = Math.floor(Date.parse(day) / 86400000);
  const dayKey = 'oracle-day';
  const today = { day, tickets: {} };
  const remember = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };
  const recall = (key) => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  };

  let personal = recall('oracle-sign');
  if (!Number.isInteger(personal?.offset)) {
    personal = { offset: crypto.getRandomValues(new Uint32Array(1))[0] % signs.length };
    remember('oracle-sign', personal);
  }
  const index = (dateIndex + personal.offset) % signs.length;
  const [symbol, meaning] = signs[index];
  const home = document.body.dataset.home || location.origin + '/';
  const caption = 'У меня выпал знак «' + symbol + '». Переверни чашку и посмотри, что выпадет тебе.\n' + home;
  const hero = get('hero');
  const flip = get('flip');
  const share = get('share');
  const shareOptions = get('share-options');
  const shareStatus = get('share-status');
  const motionControl = get('motion-control');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let shareFile;

  function setMotionOff(off) {
    document.body.classList.toggle('motion-off', off);
    motionControl.textContent = off ? 'Включить анимацию' : 'Остановить анимацию';
  }

  setMotionOff(recall('oracle-motion-off') === true);
  motionControl.hidden = false;
  motionControl.addEventListener('click', () => {
    const off = !document.body.classList.contains('motion-off');
    setMotionOff(off);
    remember('oracle-motion-off', off);
  });

  const saved = recall(dayKey);
  if (saved?.day === day && saved.tickets) today.tickets = saved.tickets;
  let ticket;
  if (spot) {
    ticket = today.tickets[spot] || crypto.randomUUID();
    today.tickets[spot] = ticket;
    remember(dayKey, today);
  }

  async function track(stage) {
    if (!spot) return;
    const event = { spot, ticket, stage };
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (await sendVisit(event, visitUrl)) return;
      } catch {}
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 700));
    }
  }

  async function prepareShare() {
    share.disabled = true;
    try {
      const image = await renderShareCard(symbol, meaning, home);
      const filename = 'Кофейный оракул — ' + symbol + '.png';
      const imageUrl = URL.createObjectURL(image);
      const download = get('download-card');
      const preview = get('share-preview');
      download.href = imageUrl;
      download.download = filename;
      download.hidden = false;
      preview.src = imageUrl;
      preview.alt = symbol + '. ' + meaning;
      preview.hidden = false;
      shareFile = new File([image], filename, { type: 'image/png' });
    } catch {
      shareStatus.textContent = 'Картинку не удалось подготовить. Подпись можно скопировать.';
    } finally {
      share.disabled = false;
    }
  }

  function showGlyph() {
    get('grounds').innerHTML = glyphs[index];
  }

  function reveal(animate) {
    showGlyph();
    hero.classList.remove('turning');
    hero.classList.add('result');
    if (animate) hero.classList.add('arrived');
    get('title').textContent = symbol;
    get('description').textContent = meaning;
    get('hint').textContent = 'Завтра будет другой знак';
    share.hidden = false;
    shareOptions.hidden = false;
    flip.hidden = true;
    if (animate) get('title').focus({ preventScroll: true });
    void prepareShare();
  }

  void track('open');
  if (personal.revealed === day) reveal(false);
  flip.addEventListener('click', () => {
    flip.disabled = true;
    personal.revealed = day;
    remember('oracle-sign', personal);
    void track('flip');
    if (reducedMotion.matches || document.body.classList.contains('motion-off')) {
      reveal(true);
      return;
    }
    hero.classList.add('turning');
    setTimeout(showGlyph, 490);
    setTimeout(() => reveal(true), 940);
  });

  share.addEventListener('click', async () => {
    try {
      const files = shareFile ? [shareFile] : [];
      if (files.length && navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ files, text: caption });
        return;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
    shareOptions.open = true;
    const download = get('download-card');
    (download.hidden ? get('copy-caption') : download).focus();
  });

  get('copy-caption').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(caption);
      shareStatus.textContent = 'Подпись со ссылкой скопирована';
    } catch {
      const shareText = get('share-text');
      shareText.value = caption;
      shareText.hidden = false;
      shareText.focus();
      shareText.select();
      shareStatus.textContent = 'Подпись выделена. Её можно скопировать.';
    }
  });
})([["Комета","Если сегодня придёт идея, от которой захочется сразу кому-нибудь написать, напиши. Хорошо, когда есть с кем такое обсудить."],["Улитка","Если всё идёт медленнее, чем хотелось, можно выдохнуть. Даже кофе вкуснее, когда есть время его допить."],["Ключ","Есть вопрос, который давно неловко задать? Возможно, ответ окажется проще, чем ты себе представляешь."],["Крыло","У дела, которое ты откладываешь, может быть совсем простой первый шаг. Иногда достаточно открыть файл."],["Мост","Сегодня может завязаться разговор с человеком, с которым ты обычно только здороваешься. Посмотрим, куда он заведёт."],["Луна","Если на вечер вдруг ничего не запланировано, считай, повезло. Можно наконец посмотреть то кино, которое давно откладываешь."],["Письмо","Может, сегодня кто-то напишет первым. А если у тебя уже есть кто-то на уме, можно и не ждать."],["Волна","Похоже, сегодня планы немного поменяются. Вдруг как раз появится время на то, что хотелось сделать для себя."],["Глаз","Оглянись по дороге домой. Даже на знакомой улице бывает что-то, мимо чего ходишь месяцами и замечаешь только сейчас."],["Искра","Из обычного «привет» сегодня может выйти разговор, после которого захочется встретиться ещё раз."],["Лист","Если дело застопорилось, отложи его, пока пьёшь кофе. Иногда возвращаешься через десять минут и сразу видишь, что делать."],["Стрела","Если давно выбираешь между двумя почти одинаковыми вариантами, сегодня можно взять тот, который первым понравился."],["Ракушка","Может вспомниться песня, которую ты давно не слушал. Если она застрянет в голове, включи её целиком."],["Капля","Кому-то сегодня пригодится маленькая помощь. Может, всего лишь придержать дверь или одолжить зарядку."],["Клевер","Сегодня есть шанс на маленькую удачу. Например, прийти ровно к тому моменту, когда освободится любимый столик."],["Змей","Попробуй свернуть там, где обычно проходишь мимо. Вдруг найдёшь место, куда потом захочется вернуться."]],["<path d=\"M82 151Q123 152 161 111M89 171Q142 157 169 118M168 88l7 12 14 1-10 10 3 14-13-7-12 7 2-14-9-10 14-2Z\"/>","<path d=\"M179 151c-5 30-70 36-78 0s57-62 71-26c10 26-37 37-42 13-3-12 18-21 27-8m-58 27-18 16h108\"/>","<path d=\"M103 130a23 23 0 1 0 0-46 23 23 0 0 0 0 46Zm19-7 56 53m-17-16 13-14m-25 2 11-11\"/>","<path d=\"M87 172c26-26 13-73 93-83-13 12-8 43-34 56-24 12-38 9-59 27Zm10-9 60-53m-31 28 29-6\"/>","<path d=\"M77 158q57-91 113-2m-113 7h114m-99-27v26m23-43v43m32-44v44m25-28v28\"/>","<path d=\"M149 88c-47-1-74 44-49 75 20 25 62 18 78-12-35 12-62-22-29-63Z\"/>","<path d=\"M82 104h105v65H82Zm0 0 52 41 53-41m-105 65 35-38m70 38-36-37\"/>","<path d=\"M72 150c20 0 24-39 56-43 22-3 37 16 31 29-6 11-22 6-19-5m-58 37c36 9 46-27 74-20 14 3 15 17 39 13\"/>","<path d=\"M77 131q58-65 113 0-53 63-113 0Zm78 0a20 20 0 1 0-40 0 20 20 0 1 0 40 0Z\"/>","<path d=\"M135 76q0 52 52 54-53 1-52 52 0-49-53-52 52-3 53-54Zm-44 8 18 20m50 54 18 16m4-92-20 23m-51 50-19 19\"/>","<path d=\"M89 171c-12-71 48-45 82-81 17 61-28 89-82 81Zm-5 11 64-62m-39 36-2-22m19 8 26-4\"/>","<path d=\"M86 168 178 94m-52 7 52-7-17 48m-69 8 20-3m-10 21 17-25\"/>","<path d=\"M130 179c-36-18-71-63-42-68 2-29 22-25 30-19 11-24 29-19 37 0 17-13 31-4 32 19 24 13-20 53-57 68Zm0 0-12-87m12 87 25-87m-25 87 57-68m-57 68-42-68\"/>","<path d=\"M135 82c18 32 37 43 36 65a36 36 0 1 1-72 0c1-22 21-38 36-65Zm-18 65q0 15 13 19\"/>","<path d=\"M133 132c-56-3-43-59-10-43l10 18 10-18c28-18 51 30-10 43 59-1 49 56 13 42l-13-18-14 18c-36 13-44-42 14-42Zm0 0-12 53\"/>","<path d=\"M83 108q41-47 65-19t-23 54q-30 25 14 36 26 7 42-22m-13-2 13 2 5 13\"/>"],async function sendVisit(event, endpoint) {
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'omit',
    body: JSON.stringify(event),
    keepalive: true
  });
  return response.ok && (await response.json()).saved === true;
},"https://script.google.com/macros/s/AKfycbzVDp7EJMROfOl6pfFCbUus_thUU92egFJWPb4GYce7DsRg3HZqlvHxbBaGnqvHEZuZJQ/exec",async function renderShareCard(symbol, meaning, home) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  function picture(selector) {
    const svg = document.querySelector(selector).cloneNode(true);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const [, , width, height] = svg.getAttribute('viewBox').split(/\s+/);
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    for (const decoration of svg.querySelectorAll('.steam, .spark')) decoration.remove();

    const image = new Image();
    return new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.outerHTML);
    });
  }

  const family = '"Visuelt Pro", Arial, sans-serif';
  const fontsReady = document.fonts && Promise.allSettled([
    document.fonts.load('300 112px "Visuelt Pro"', symbol),
    document.fonts.load('400 43px "Visuelt Pro"', meaning)
  ]);
  const [wordmark, art] = await Promise.all([picture('.brand svg'), picture('.art'), fontsReady]);

  ctx.fillStyle = '#fff0d4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(wordmark, 72, 56, 230, 85);
  ctx.fillStyle = '#252525';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '400 33px ' + family;
  ctx.fillText('Мой знак из кофейной гущи', 72, 203);
  ctx.font = '300 112px ' + family;
  ctx.fillText(symbol, 65, 315);
  ctx.drawImage(art, 102, 321, 876, 663);

  ctx.font = '400 43px ' + family;
  let line = '';
  let y = 1003;
  for (const word of meaning.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > 936) {
      ctx.fillText(line, 72, y);
      y += 57;
      line = word;
    } else {
      line = next;
    }
  }
  ctx.fillText(line, 72, y);

  ctx.font = '400 34px ' + family;
  ctx.fillText('Переверни свою чашку', 72, 1235);
  ctx.font = '400 28px ' + family;
  ctx.fillText(home.replace(/^https?:\/\//, '').replace(/\/$/, ''), 72, 1281, 936);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG export failed'));
    }, 'image/png');
  });
});