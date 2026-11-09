(function runOracle(signs, glyphs, sendVisit, visitUrl) {
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
  const [symbol, prediction, mission] = signs[index];

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

  void track('open');
  function reveal(focus) {
    get('hero').classList.add('result');
    get('title').textContent = symbol;
    get('description').textContent = prediction;
    get('mission').textContent = mission;
    get('mission').hidden = false;
    get('grounds').innerHTML = glyphs[index];
    get('hint').textContent = 'Новый знак завтра';
    get('share').hidden = false;
    get('flip').hidden = true;
    if (focus) get('title').focus({ preventScroll: true });
  }

  if (personal.revealed === day) reveal(false);
  get('flip').addEventListener('click', () => {
    get('flip').disabled = true;
    get('hero').classList.add('reveal');
    personal.revealed = day;
    remember('oracle-sign', personal);
    void track('flip');
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 285;
    setTimeout(() => reveal(true), delay);
  });

  get('share').addEventListener('click', async () => {
    const title = 'Кофейный оракул';
    const text = 'Мой знак из кофейной гущи — ' + symbol.toLowerCase() + '. ' + prediction;
    const url = document.body.dataset.home || location.origin + '/';
    try {
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return;
        } catch (error) {
          if (error.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(text + '\n' + url);
      get('hint').textContent = 'Знак и ссылка скопированы';
    } catch {
      const shareText = get('share-text');
      shareText.value = text + '\n' + url;
      shareText.hidden = false;
      shareText.focus();
      shareText.select();
      get('hint').textContent = 'Скопируй знак и ссылку';
    }
  });
})([["Комета","Хвост тянется за чашкой. Сегодня одна маленькая идея улетит дальше, чем ты планировал.","Запиши её в трёх словах."],["Улитка","Гуща свернулась в спираль. Кое-что сегодня дозреет, пока ты идёшь в своём темпе.","Оставь пару минут про запас."],["Ключ","В гуще проступила бородка ключа. Ответ найдётся у человека, которому ты ещё не задал вопрос.","Спроси вслух."],["Крыло","На дне отпечаток крыла. У давно отложенного дела сегодня найдётся неожиданно лёгкий первый шаг.","Сделай только этот шаг."],["Мост","Две кляксы соединились тонкой дугой. Сегодня разговор свяжет две вещи, которые казались совсем разными.","Начни с «а что, если»."],["Луна","В чашке тонкий серп. К вечеру пустое место в планах окажется самым приятным.","Оставь его свободным."],["Письмо","Гуща сложилась конвертом. Чья-то случайная фраза попадёт точно в твой сегодняшний вопрос.","Прислушайся к разговору рядом."],["Волна","Полоска гущи качнулась к краю. День поменяет ритм, как только ты свернёшь с привычного пути.","Выбери другую дорогу."],["Глаз","Тёмная точка осталась в центре. Сегодня заметишь деталь, которая всё это время была перед тобой.","Взгляни на знакомое место ещё раз."],["Искра","На краю чашки вспыхнула звёздочка. Сегодня короткая встреча даст начало длинному разговору.","Скажи первым «привет»."],["Лист","Гуща растеклась по жилкам. То, на что давно не хватало сил, пойдёт легче после паузы.","Допей кофе без спешки."],["Стрела","У самой кромки остался острый след. Первый ответ, который придёт в голову, сегодня стоит проверить делом.","Отведи на это пять минут."],["Ракушка","Гуща собралась в веер. Сегодня из старого плейлиста всплывёт песня ровно под настроение.","Включи её по дороге."],["Капля","Одна капля держится особняком. Сегодня маленький добрый жест запомнится сильнее длинной речи.","Поблагодари кого-нибудь за конкретную мелочь."],["Клевер","На дне четыре неровных лепестка. В одной обычной мелочи сегодня неожиданно повезёт.","Заметь её и расскажи кому-нибудь."],["Змей","По чашке пробежала извилистая линия. Сегодня самый интересный кусочек дня окажется на повороте.","Дай плану чуть-чуть измениться."]],["<path d=\"M82 151Q123 152 161 111M89 171Q142 157 169 118M168 88l7 12 14 1-10 10 3 14-13-7-12 7 2-14-9-10 14-2Z\"/>","<path d=\"M179 151c-5 30-70 36-78 0s57-62 71-26c10 26-37 37-42 13-3-12 18-21 27-8m-58 27-18 16h108\"/>","<path d=\"M103 130a23 23 0 1 0 0-46 23 23 0 0 0 0 46Zm19-7 56 53m-17-16 13-14m-25 2 11-11\"/>","<path d=\"M87 172c26-26 13-73 93-83-13 12-8 43-34 56-24 12-38 9-59 27Zm10-9 60-53m-31 28 29-6\"/>","<path d=\"M77 158q57-91 113-2m-113 7h114m-99-27v26m23-43v43m32-44v44m25-28v28\"/>","<path d=\"M149 88c-47-1-74 44-49 75 20 25 62 18 78-12-35 12-62-22-29-63Z\"/>","<path d=\"M82 104h105v65H82Zm0 0 52 41 53-41m-105 65 35-38m70 38-36-37\"/>","<path d=\"M72 150c20 0 24-39 56-43 22-3 37 16 31 29-6 11-22 6-19-5m-58 37c36 9 46-27 74-20 14 3 15 17 39 13\"/>","<path d=\"M77 131q58-65 113 0-53 63-113 0Zm78 0a20 20 0 1 0-40 0 20 20 0 1 0 40 0Z\"/>","<path d=\"M135 76q0 52 52 54-53 1-52 52 0-49-53-52 52-3 53-54Zm-44 8 18 20m50 54 18 16m4-92-20 23m-51 50-19 19\"/>","<path d=\"M89 171c-12-71 48-45 82-81 17 61-28 89-82 81Zm-5 11 64-62m-39 36-2-22m19 8 26-4\"/>","<path d=\"M86 168 178 94m-52 7 52-7-17 48m-69 8 20-3m-10 21 17-25\"/>","<path d=\"M130 179c-36-18-71-63-42-68 2-29 22-25 30-19 11-24 29-19 37 0 17-13 31-4 32 19 24 13-20 53-57 68Zm0 0-12-87m12 87 25-87m-25 87 57-68m-57 68-42-68\"/>","<path d=\"M135 82c18 32 37 43 36 65a36 36 0 1 1-72 0c1-22 21-38 36-65Zm-18 65q0 15 13 19\"/>","<path d=\"M133 132c-56-3-43-59-10-43l10 18 10-18c28-18 51 30-10 43 59-1 49 56 13 42l-13-18-14 18c-36 13-44-42 14-42Zm0 0-12 53\"/>","<path d=\"M83 108q41-47 65-19t-23 54q-30 25 14 36 26 7 42-22m-13-2 13 2 5 13\"/>"],async function sendVisit(event, endpoint) {
  const response = await fetch(endpoint, {
    method: 'POST',
    credentials: 'omit',
    body: JSON.stringify(event),
    keepalive: true
  });
  return response.ok && (await response.json()).saved === true;
},"https://script.google.com/macros/s/AKfycbzVDp7EJMROfOl6pfFCbUus_thUU92egFJWPb4GYce7DsRg3HZqlvHxbBaGnqvHEZuZJQ/exec");