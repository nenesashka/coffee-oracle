export const CARD_URL = 'https://nenesashka.github.io/coffee-oracle/zavarilos/';
export const CARD_FORMATS = {
  portrait: [1080, 1350],
  square: [1080, 1080],
  story: [1080, 1920],
};

export const CARD_ASSET_FILES = {
  photo: 'photo.avif', tape: 'tape.avif', spoon: 'spoon.avif', eye: 'eye-v2.avif',
  croissant: 'croissant-v2.avif', danish: 'danish.avif', arrow: 'arrow.avif', seal: 'seal.avif',
  beans: 'beans.avif', checks: 'checks.avif', coffeeStamp: 'coffeeStamp.avif',
  cup: 'cup-frames.avif', blot: 'plate-blot.svg', soft: 'plate-soft.svg',
};

export const CARD_ELEMENTS = {
  blot: {label:'Клякса',kind:'paper',x:45,y:46,size:83,angle:-12,color:'#f7c5aa'},
  soft: {label:'Лепестки',kind:'paper',x:65,y:40,size:57,angle:-26,color:'#fff0d4'},
  photo: {label:'Фотография',kind:'photo',x:24,y:39,size:25,angle:-10},
  tape: {label:'Зелёный скотч',kind:'image',x:34.2,y:28.8,size:15,angle:39},
  spoon: {label:'Ложка',kind:'image',x:80,y:36,size:27,angle:-11},
  seal: {label:'Бумажное солнце',kind:'image',x:58,y:31.8,size:18,angle:10},
  arrow: {label:'Стрелка',kind:'image',x:20,y:49,size:19,angle:-13},
  cup: {label:'Кружка',kind:'cup',x:52,y:43.5,size:52,angle:-2},
  eye: {label:'Глаз',kind:'image',x:82,y:45,size:19,angle:8},
  danish: {label:'Слойка',kind:'image',x:28,y:54,size:22,angle:-11},
  croissant: {label:'Круассан',kind:'image',x:75,y:54,size:26,angle:11},
  beans: {label:'Кофейные зёрна',kind:'image',x:12,y:64,size:10,angle:-12,visible:false},
  checks: {label:'Штрихи',kind:'image',x:88,y:24,size:13,angle:11,visible:false},
  coffeeStamp: {label:'Круглый штамп',kind:'image',x:89,y:91,size:12,angle:-9,visible:false},
  logo: {label:'Логотип Лицея',kind:'logo',x:17,y:6.9,size:19,angle:0,color:'#191919'},
  headerNote: {label:'Пометка вверху',kind:'text',x:81,y:7,size:26,angle:0,color:'#191919',fontRatio:.089,align:'right',text:'предсказания к кофе'},
  heading: {label:'Заголовок «Заварилось»',kind:'headline',x:50,y:15,size:81,angle:0,color:'#fff0d4',fontRatio:.147,text:'ЗАВАРИЛОСЬ'},
  tagline: {label:'Верхняя плашка',kind:'tagline',x:50,y:22.4,size:46,angle:-3,color:'#fff0d4',text:'кажется, это к лучшему'},
  receipt: {label:'Бумага предсказания',kind:'receipt',x:50,y:74.6,size:86,angle:-2.5,color:'#fff0d4'},
  meta: {label:'Подпись на чеке',kind:'meta',x:46,y:63.2,size:69,angle:-2.5,color:'#191919',text:'ЛИЦЕЙ / ТВОЙ ЗНАК'},
  date: {label:'Дата',kind:'text',x:83,y:62,size:13,angle:-2.5,color:'#191919',fontRatio:.19,align:'right',field:'date'},
  title: {label:'Название знака',kind:'headline',x:50,y:68.35,size:74,angle:-2.5,color:'#191919',fontRatio:.083,align:'left',field:'title'},
  text: {label:'Текст предсказания',kind:'text',x:50,y:76.7,size:74,angle:-2.5,color:'#191919',fontRatio:.043,align:'left',field:'text'},
  stamp: {label:'Овальная печать',kind:'stamp',x:74,y:85,size:32,angle:-8,color:'#ed272e',field:'stamp'},
  link: {label:'Адрес сайта',kind:'text',x:50,y:94,size:58,angle:0,color:'#fff0d4',fontRatio:.036,text:'nenesashka.github.io/coffee-oracle/zavarilos/'},
};

function makeLayer(id, settings) {
  const {x,y,size,angle,color,visible = true} = settings;
  return {id,x,y,size,angle,visible,...(color ? {color} : {})};
}

export function newCardLayout(format = 'portrait') {
  return {
    version:1, format, background:'#ed272e',
    layers:Object.entries(CARD_ELEMENTS).map(([id, settings]) => {
      const layer = makeLayer(id,settings);
      if (format === 'square') {
        layer.size *= id === 'receipt' ? .86 : .87;
        if (id === 'receipt') layer.height = 95;
        if (id === 'stamp') {
          layer.size *= .95;
          layer.y += .75;
        }
      }
      if (format === 'story' && id === 'receipt') layer.height = 135;
      return layer;
    }),
  };
}

export async function loadCardImages(urls) {
  return Object.fromEntries(await Promise.all(Object.entries(urls).map(async ([id,url]) => {
    const image = new Image();
    image.src = url;
    try { await image.decode(); return [id,image]; }
    catch { return [id,null]; }
  })));
}

function makeCanvas(width,height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

const tintedImages = new WeakMap();
function tint(image,color,paper) {
  let variants = tintedImages.get(image);
  if (!variants) {
    variants = new Map();
    tintedImages.set(image,variants);
  }
  const key = [color,paper].join(':');
  if (variants.has(key)) return variants.get(key);
  const longest = Math.max(image.naturalWidth,image.naturalHeight);
  const ratio = paper ? 860 / longest : 1;
  const canvas = makeCanvas(Math.round(image.naturalWidth * ratio),Math.round(image.naturalHeight * ratio));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  if (paper) {
    ctx.globalCompositeOperation = 'source-atop';
    const wash = ctx.createLinearGradient(0,0,canvas.width*.58,canvas.height);
    wash.addColorStop(0,'#fff6de16');
    wash.addColorStop(.67,'#64402a13');
    wash.addColorStop(1,'#fff3d525');
    ctx.fillStyle = wash;
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = ctx.createPattern(paperGrain(),'repeat');
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }
  variants.set(key,canvas);
  if (variants.size > 10) variants.delete(variants.keys().next().value);
  return canvas;
}

let grain;
function paperGrain() {
  if (grain) return grain;
  grain = makeCanvas(144,144);
  const ctx = grain.getContext('2d');
  const dots = ctx.createImageData(144,144);
  let seed = 104247;
  for (let i = 0; i < dots.data.length; i += 4) {
    seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
    const light = seed & 128 ? 250 : 69;
    dots.data.set([light,light,light,(seed >>> 24) % 37],i);
  }
  ctx.putImageData(dots,0,0);
  return grain;
}

function linesFor(ctx,text,width) {
  return text.split('\n').flatMap(paragraph => {
    const lines = [];
    let current = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = current ? current + ' ' + word : word;
      if (current && ctx.measureText(candidate).width > width) {
        lines.push(current);
        current = word;
      } else current = candidate;
    }
    return [...lines,current];
  });
}

function measureTextBlock(ctx,text,settings,width,height,faces) {
  const condensed = settings.kind === 'headline' || settings.kind === 'stamp';
  const lineHeight = condensed ? 1.05 : 1.22;
  let fontSize = settings.fontRatio * width;
  let lines;
  for (let iteration = 0; iteration < 12; iteration++) {
    ctx.font = (condensed ? '700 ' : '400 ') + fontSize + 'px ' + (condensed ? faces.display : faces.body);
    lines = settings.kind === 'headline' ? [text.replace(/\s+/g,' ')] : linesFor(ctx,text,width);
    const measure = Math.max(...lines.map(line => ctx.measureText(line).width));
    if (measure <= width && lines.length * fontSize * lineHeight <= height) break;
    fontSize *= .88;
  }
  return {font:ctx.font,lines,line:fontSize*lineHeight,height:fontSize*lineHeight*lines.length};
}

function receiptPath(ctx,width,height) {
  ctx.beginPath();
  ctx.moveTo(-width/2,-height/2+3);
  ctx.lineTo(width/2,-height/2);
  for (let tooth = 0; tooth <= 24; tooth++) {
    const x = width/2 - tooth * width / 24;
    const y = height/2 - (tooth % 2 ? 13 : 0);
    ctx.lineTo(x,y);
  }
  ctx.closePath();
}

export function paintCard(canvas,layout,sign,images,faces = {display:'"ZV Condensed", sans-serif',body:'"Visuelt Pro", sans-serif'}) {
  const [width,height] = CARD_FORMATS[layout.format];
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = layout.background;
  ctx.fillRect(0,0,width,height);
  const bounds = [];

  for (const layer of layout.layers) {
    if (!layer.visible) continue;
    const settings = CARD_ELEMENTS[layer.id];
    const {kind} = settings;
    const x = width*layer.x/100;
    const y = height*layer.y/100;
    const w = width*layer.size/100;
    const angle = layer.angle*Math.PI/180;
    const stretch = (layer.height ?? 100)/100;
    const color = layer.color ?? settings.color;
    const value = layer.text ?? settings.text ?? sign[settings.field] ?? '';
    const image = images[layer.id];
    let h = w;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(angle);
    ctx.fillStyle = color ?? '#191919';

    if (kind === 'receipt') {
      h = w*.44*stretch;
      receiptPath(ctx,w,h);
      ctx.fill();
    } else if (kind === 'tagline' || kind === 'stamp') {
      const stamp = kind === 'stamp';
      h = w*(stamp ? .23 : .165)*stretch;
      const textSettings = {...settings,fontRatio:stamp ? .124 : .084};
      const textBlock = measureTextBlock(ctx,value,textSettings,w*.83,h*.8,faces);
      ctx.strokeStyle = stamp ? color : '#191919';
      ctx.lineWidth = stamp ? 4 : 2.6;
      if (stamp) {
        ctx.beginPath();
        ctx.ellipse(0,0,w/2,h/2,0,0,Math.PI*2);
        ctx.stroke();
      } else {
        ctx.fillRect(-w/2,-h/2,w,h);
        ctx.strokeRect(-w/2,-h/2,w,h);
      }
      ctx.fillStyle = stamp ? color : '#191919';
      drawLines(ctx,textBlock,w,'center');
    } else if (['text','headline','meta'].includes(kind)) {
      const style = {...settings,fontRatio:settings.fontRatio ?? .027};
      const limit = w*(layer.id === 'text' ? .205 : layer.id === 'title' ? .185 : .28)*stretch;
      const textBlock = measureTextBlock(ctx,value,style,w,limit,faces);
      h = textBlock.height;
      drawLines(ctx,textBlock,w,settings.align ?? (kind === 'meta' ? 'left' : 'center'));
      if (kind === 'meta') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash([7,7]);
        ctx.beginPath();
        ctx.moveTo(-w/2,h/2+14);
        ctx.lineTo(w/2+54,h/2+14);
        ctx.stroke();
      }
    } else if (image) {
      const ratio = image.naturalHeight / image.naturalWidth;
      h = w*(kind === 'photo' ? 1.24 : kind === 'cup' ? 1 : ratio)*stretch;
      if (kind === 'photo') {
        drawPhoto(ctx,image,w,h);
      } else if (kind === 'cup') {
        ctx.shadowColor = '#25191238';
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 6;
        ctx.drawImage(image,0,0,image.naturalWidth/4,image.naturalHeight/3,-w/2,-h/2,w,h);
      } else {
        const source = kind === 'paper' || kind === 'logo' ? tint(image,color,kind === 'paper') : image;
        if (kind === 'image') {
          ctx.shadowColor = '#25191242';
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 5;
        }
        if (layer.id === 'eye') ctx.scale(-1,1);
        ctx.drawImage(source,-w/2,-h/2,w,h);
      }
    }
    ctx.restore();
    bounds.push({id:layer.id,x,y,w,h,angle});
  }
  return bounds;
}

function drawLines(ctx,block,width,align) {
  ctx.font = block.font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  const x = align === 'left' ? -width/2 : align === 'right' ? width/2 : 0;
  block.lines.forEach((line,i) => ctx.fillText(line,x,(i+.5)*block.line-block.height/2,width));
}

function drawPhoto(ctx,image,w,h) {
  ctx.fillStyle = '#fff0d4';
  ctx.beginPath();
  ctx.moveTo(-w*.496,-h*.49);
  ctx.lineTo(-w*.13,-h*.5);
  ctx.lineTo(w*.498,-h*.495);
  ctx.lineTo(w*.491,h*.5);
  ctx.lineTo(0,h*.49);
  ctx.lineTo(-w*.5,h*.497);
  ctx.closePath();
  ctx.fill();
  const border = w*.042;
  const targetWidth = w-border*2;
  const targetHeight = h-border*2;
  const ratio = Math.max(targetWidth/image.naturalWidth,targetHeight/image.naturalHeight);
  const width = targetWidth/ratio, height = targetHeight/ratio;
  ctx.drawImage(image,(image.naturalWidth-width)*.51,(image.naturalHeight-height)*.2,width,height,-targetWidth/2,-targetHeight/2,targetWidth,targetHeight);
}

export function cardPng(canvas) {
  return new Promise((resolve,reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')),'image/png');
  });
}

export function shareCaption(sign) {
  return 'Мне заварилось: «' + sign.title + '»\n' + sign.text + '\n\nКакой знак выпадет тебе?\n' + CARD_URL;
}
