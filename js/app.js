/* ===== Данные ===== */
const parseL=(lv,raw)=>raw.trim().split('\n').map(x=>{const [l,ko,ru]=x.split('|');return {lv,l:+l,ko,ru,key:lv+'-'+l,ord:lv*100+(+l),id:(lv===1?l:lv+'-'+l)+':'+ko}});
const W=LEVELS.flatMap(L=>parseL(L.n,L.w)), S=LEVELS.flatMap(L=>parseL(L.n,L.s));
let custom=[];
try{custom=JSON.parse(localStorage.getItem('kor.custom')||'[]')}catch(e){}
const mkCustom=c=>({lv:0,l:1,ko:c.ko,ru:c.ru,key:'0-1',ord:0,id:'my:'+c.ko});
custom.forEach(c=>W.push(mkCustom(c)));
const ordOf=k=>{const [a,b]=k.split('-');return a*100+(+b)};

/* ===== Хранилище и прогресс ===== */
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));localStorage.setItem('kor.updated',String(Date.now()))}catch(e){}}};
let settings;
function loadSettings(){
  settings=store.get('kor.set',{});
  settings.lessons=(settings.lessons||['1-1','1-2','1-3','1-4','1-5','1-6']).map(x=>typeof x==='number'?'1-'+x:x);
  if(!settings.goal)settings.goal=20;
  if(settings.len===undefined)settings.len=10;
}
loadSettings();
let srs=store.get('kor.srs',{});
let tests=store.get('kor.tests',{});
const DAY=864e5, INT=[0,1,2,4,8,16];
function grade(id,ok){
  const s=srs[id]||{b:0,d:0};
  s.b=ok?Math.min(s.b+1,5):0;
  s.d=Date.now()+INT[s.b]*DAY-(s.b?3600e3:0);
  srs[id]=s;store.set('kor.srs',srs);
}
const dstr=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
const today=()=>dstr(new Date());
let daily=store.get('kor.daily',{day:'',n:0,streak:0});
function bumpDay(){
  const t=today();
  if(daily.day!==t){daily={day:t,n:0,streak:daily.day===dstr(new Date(Date.now()-DAY))?daily.streak+1:1}}
  daily.n++;store.set('kor.daily',daily);
}
const sel=arr=>arr.filter(x=>settings.lessons.includes(x.key));
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
function fill(list,n){const out=[];while(out.length<n&&list.length)out.push(...shuffle(list));return out.slice(0,n)}
function pickWords(n,pool=sel(W)){
  const now=Date.now();
  const due=pool.filter(w=>srs[w.id]&&srs[w.id].d<=now).sort((a,b)=>srs[a.id].d-srs[b.id].d);
  const fresh=shuffle(pool.filter(w=>!srs[w.id]));
  const rest=shuffle(pool.filter(w=>srs[w.id]&&srs[w.id].d>now));
  return fill(shuffle([...due,...fresh,...rest].slice(0,n)),n);
}
function distract(item,field,pool,k=3){
  const seen=new Set([item[field]]),r=[];
  const src=pool.length>=6?pool:pool.concat(S.includes(item)?S:W);
  for(const x of shuffle(src)){if(!seen.has(x[field])){seen.add(x[field]);r.push(x[field]);if(r.length===k)break}}
  return shuffle([item[field],...r]);
}
const norm=s=>s.replace(/[.,?!~…\-()\/]/g,'').replace(/\s+/g,' ').trim();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=(s,r=document)=>r.querySelector(s);
function plural(n,f){const m=n%10,h=n%100;return m===1&&h!==11?f[0]:m>=2&&m<=4&&(h<10||h>=20)?f[1]:f[2]}

/* ===== Хангыль: сборка слогов ===== */
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
const JONG=['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const VC={'ㅗㅏ':'ㅘ','ㅗㅐ':'ㅙ','ㅗㅣ':'ㅚ','ㅜㅓ':'ㅝ','ㅜㅔ':'ㅞ','ㅜㅣ':'ㅟ','ㅡㅣ':'ㅢ'};
const CC={'ㄱㅅ':'ㄳ','ㄴㅈ':'ㄵ','ㄴㅎ':'ㄶ','ㄹㄱ':'ㄺ','ㄹㅁ':'ㄻ','ㄹㅂ':'ㄼ','ㄹㅅ':'ㄽ','ㄹㅌ':'ㄾ','ㄹㅍ':'ㄿ','ㄹㅎ':'ㅀ','ㅂㅅ':'ㅄ'};
const VCR=Object.fromEntries(Object.entries(VC).map(([a,b])=>[b,[...a]]));
const CCR=Object.fromEntries(Object.entries(CC).map(([a,b])=>[b,[...a]]));
const isC=c=>!!c&&CHO.includes(c);
const isV=c=>!!c&&JUNG.includes(c);
function compose(t){
  let out='',i=0;const n=t.length;
  while(i<n){
    const c=t[i];
    if(isC(c)&&isV(t[i+1])){
      i++;let v=t[i++];
      if(i<n&&VC[v+t[i]]){v=VC[v+t[i]];i++}
      let jong='';
      if(i<n&&isC(t[i])&&JONG.includes(t[i])&&!isV(t[i+1])){
        if(i+1<n&&CC[t[i]+t[i+1]]&&!isV(t[i+2])){jong=CC[t[i]+t[i+1]];i+=2}
        else{jong=t[i];i++}
      }
      out+=String.fromCharCode(0xAC00+(CHO.indexOf(c)*21+JUNG.indexOf(v))*28+JONG.indexOf(jong));
    }else if(isV(c)){
      let v=c;i++;
      if(i<n&&VC[v+t[i]]){v=VC[v+t[i]];i++}
      out+=v;
    }else{out+=c;i++}
  }
  return out;
}
function decompose(s){
  const r=[];
  for(const ch of s){
    const code=ch.charCodeAt(0)-0xAC00;
    if(code>=0&&code<11172){
      const cho=CHO[Math.floor(code/588)],v=JUNG[Math.floor(code%588/28)],j=JONG[code%28];
      r.push(cho);
      if(VCR[v])r.push(...VCR[v]);else r.push(v);
      if(j){if(CCR[j])r.push(...CCR[j]);else r.push(j)}
    }else if(VCR[ch])r.push(...VCR[ch]);
    else r.push(ch);
  }
  return r;
}

let koVoice=null,voicesLoaded=false,warned=false;
const canSpeak=()=>'speechSynthesis' in window&&'SpeechSynthesisUtterance' in window;
const webTTS=canSpeak;
function loadVoices(){
  if(!webTTS())return;
  const v=speechSynthesis.getVoices();
  if(v.length)voicesLoaded=true;
  koVoice=v.find(x=>/^ko([-_]|$)/i.test(x.lang))||v.find(x=>/korean|한국/i.test(x.name))||null;
}
if(webTTS()){loadVoices();speechSynthesis.addEventListener?speechSynthesis.addEventListener('voiceschanged',loadVoices):(speechSynthesis.onvoiceschanged=loadVoices);setTimeout(loadVoices,800)}
let speakTimer=null;
function stopSpeech(){clearTimeout(speakTimer);if(webTTS()&&(speechSynthesis.speaking||speechSynthesis.pending))speechSynthesis.cancel()}
function speak(t){
  if(!canSpeak())return;
  loadVoices();
  if(voicesLoaded&&!koVoice&&!warned){warned=true;toast('На устройстве нет корейского голоса. Нажмите 🔊 вверху, там инструкция.')}
  stopSpeech();
  /* Chrome молча теряет фразу, если вызвать speak сразу после cancel */
  speakTimer=setTimeout(()=>{
    const u=new SpeechSynthesisUtterance(t);
    u.lang=koVoice?koVoice.lang:'ko-KR';u.rate=.85;if(koVoice)u.voice=koVoice;
    u.onerror=ev=>{if(ev.error!=='interrupted'&&ev.error!=='canceled')toast('Озвучка не сработала: '+ev.error)};
    speechSynthesis.resume();
    speechSynthesis.speak(u);
  },60);
}

function toast(msg){
  let el=document.getElementById('toast');
  if(!el){el=document.createElement('div');el.id='toast';el.setAttribute('role','status');document.body.appendChild(el)}
  el.textContent=msg;el.className='show';clearTimeout(el._t);el._t=setTimeout(()=>el.className='',4500);
}
function soundCheck(){
  loadVoices();
  const all=webTTS()?speechSynthesis.getVoices():[];
  const ko=all.filter(x=>/^ko([-_]|$)/i.test(x.lang)||/korean|한국/i.test(x.name));
  const status=!canSpeak()?'Этот браузер не поддерживает синтез речи.'
    :!all.length?'Браузер пока не сообщил ни одного голоса. Нажмите «Проверить звук»: иногда список появляется только после первого запуска.'
    :ko.length?`Корейский голос найден: ${esc(ko[0].name)}. Если звука всё равно нет, проверьте громкость и беззвучный режим телефона.`
    :`Голосов в системе: ${all.length}, но корейского среди них нет. Его нужно установить (инструкция ниже), затем перезапустить браузер.`;
  view.innerHTML=`<div class="bar"><button class="back" data-back>← Назад</button></div>
  <h2>Озвучка</h2>
  <div class="card" style="text-align:left"><p style="margin:0 0 12px">${status}</p><button class="btn" id="test">▶ Проверить звук: 안녕하세요</button></div>
  <h3>Как установить корейский голос</h3>
  <div class="note"><b>Android:</b> Настройки → Специальные возможности (или Система → Язык и ввод) → Синтез речи → Синтезатор речи Google → ⚙ → Установка голосовых данных → Корейский. Лучше использовать Chrome.</div>
  <div class="note"><b>iPhone, iPad:</b> Настройки → Универсальный доступ → Устное содержимое → Голоса → Корейский → загрузите голос. Выключите беззвучный режим переключателем сбоку.</div>
  <div class="note"><b>Windows:</b> Параметры → Время и язык → Речь → Добавить голоса → Корейский. Затем перезапустите браузер. В Edge корейские голоса обычно есть сразу.</div>
  <div class="note"><b>macOS:</b> Системные настройки → Универсальный доступ → Устный контент → Системный голос → Управлять голосами → Корейский.</div>
  <div class="note"><b>Linux:</b> встроенных корейских голосов обычно нет. Проще открыть приложение в Chrome на телефоне.</div>`;
  bindBack();
  document.getElementById('test').onclick=()=>{warned=true;speak('안녕하세요');setTimeout(()=>{loadVoices();if(!document.getElementById('test'))return;soundCheckStatus()},1500)};
}
function soundCheckStatus(){const b=document.getElementById('test');if(b&&!koVoice&&voicesLoaded)b.insertAdjacentHTML('afterend','<p class="verdict bad">Корейский голос не найден. Установите его по инструкции ниже.</p>')}


/* Экранная клавиатура (раскладка 두벌식) */
const ROWS=[['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'],['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'],['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ']];
const SHIFT={'ㅂ':'ㅃ','ㅈ':'ㅉ','ㄷ':'ㄸ','ㄱ':'ㄲ','ㅅ':'ㅆ','ㅐ':'ㅒ','ㅔ':'ㅖ'};
const SHIFT_OF=Object.fromEntries(Object.entries(SHIFT).map(([a,b])=>[b,a]));
const KEYSET=new Set([...ROWS.flat(),...Object.values(SHIFT)]);
let kb={shift:false,el:null,cb:null,hint:null};
function mountKB(el,cb){kb={shift:false,el,cb,hint:null};drawKB()}
function drawKB(){
  const {el,shift}=kb;
  const k=c=>{const s=shift&&SHIFT[c]?SHIFT[c]:c;return `<button class="key${kb.hint===s?' hint':''}" data-k="${s}">${s}</button>`};
  el.innerHTML=`<div class="kb" role="group" aria-label="Корейская клавиатура">
   <div class="kr">${ROWS[0].map(k).join('')}</div>
   <div class="kr">${ROWS[1].map(k).join('')}</div>
   <div class="kr"><button class="key fn ${shift?'on':''}" data-k="SHIFT" aria-label="Шифт: двойные согласные, ㅒ, ㅖ">⇧</button>${ROWS[2].map(k).join('')}<button class="key fn" data-k="BS" aria-label="Стереть букву">⌫</button></div>
   <div class="kr"><button class="key space" data-k=" ">пробел</button></div></div>`;
  el.querySelectorAll('.key').forEach(b=>{
    b.addEventListener('pointerdown',e=>{e.preventDefault();press(b.dataset.k)});
    b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();press(b.dataset.k)}});
  });
}
function press(key){
  if(key==='SHIFT'){kb.shift=!kb.shift;drawKB();return}
  const was=kb.shift;
  if(kb.hint&&key!=='BS')kb.hint=null;
  kb.cb(key);
  if(was&&key!=='BS')kb.shift=false;
  drawKB();
}
function highlightKey(j){
  kb.hint=j;
  if(SHIFT_OF[j])kb.shift=true;
  drawKB();
}


/* Скажи вслух (распознавание речи) */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition||null;
let rec=null;
function stopRec(){try{rec&&rec.abort()}catch(e){}rec=null}
function sim(a,b){
  a=norm(a).replace(/ /g,'');b=norm(b).replace(/ /g,'');
  if(!a.length&&!b.length)return 1;
  const dp=Array.from({length:a.length+1},(_,i)=>[i]);
  for(let j=1;j<=b.length;j++)dp[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  return 1-dp[a.length][b.length]/Math.max(a.length,b.length);
}

/* ===== Голосовой ввод ===== */
function micErr(err){return err==='network'?'Распознавание речи работает только с интернетом':err==='not-allowed'||err==='service-not-allowed'?'Нет доступа к микрофону. Разрешите его в настройках браузера (значок слева от адреса)':err==='no-speech'?'Ничего не услышал, попробуйте ещё раз':err==='audio-capture'?'Микрофон не найден':'Ошибка распознавания: '+err}
function listenKo(btn,v,onText){
  stopRec();stopSpeech();
  try{rec=new SR()}catch(e){v.className='verdict bad';v.textContent='Голосовой ввод недоступен в этом браузере. Нужен Chrome или Edge';return}
  rec.lang='ko-KR';rec.interimResults=false;rec.maxAlternatives=5;
  const label=btn.innerHTML;btn.innerHTML='● Слушаю…';btn.classList.add('on');v.className='verdict';v.textContent='';
  rec.onresult=e=>onText([...e.results[0]].map(r=>r.transcript.trim()));
  rec.onerror=e=>{v.className='verdict bad';v.textContent=micErr(e.error)};
  rec.onend=()=>{btn.innerHTML=label;btn.classList.remove('on')};
  try{rec.start()}catch(e){v.className='verdict bad';v.textContent='Не удалось включить микрофон'}
}
const closest=(alts,target)=>alts.reduce((m,x)=>sim(x,target)>sim(m,target)?x:m,alts[0]);

/* ===== Каркас ===== */
const view=document.getElementById('view');
const TABS=['today','words','read','write','tests'];
let tab=location.hash.slice(1);
if(!TABS.includes(tab))tab='today';
function setTab(t){
  tab=t;
  document.querySelectorAll('.tabbar button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t));
  if(location.hash!=='#'+t)history.replaceState(null,'','#'+t);
  home();
}
document.querySelectorAll('.tabbar button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
window.addEventListener('hashchange',()=>{const t=location.hash.slice(1);if(t!==tab&&TABS.includes(t))setTab(t)});
function lessonsLabel(){
  if(!settings.lessons.length)return 'Уроки';
  const out=[];
  for(const L of LEVELS){
    const l=settings.lessons.filter(k=>k.startsWith(L.n+'-')).map(k=>+k.split('-')[1]).sort((a,b)=>a-b);
    if(!l.length)continue;
    if(l.length===L.titles.length){out.push('Ур. '+L.n);continue}
    const parts=[];let s=l[0],p=l[0];
    for(const x of l.slice(1).concat([null])){if(x===p+1){p=x;continue}parts.push(s===p?s:s+'–'+p);s=p=x}
    out.push(L.n+': '+parts.join(', '));
  }
  if(settings.lessons.includes('0-1'))out.push('мои');
  const t=out.join('; ');
  return t.length>20?'Уроков: '+settings.lessons.length:t;
}
function refreshLessonsBtn(){document.getElementById('lessonsBtn').textContent=lessonsLabel()}
function statline(){
  const pool=sel(W),now=Date.now();
  const learned=pool.filter(w=>srs[w.id]&&srs[w.id].b>=3).length;
  const fresh=pool.filter(w=>!srs[w.id]).length;
  const pct=pool.length?Math.round(learned/pool.length*100):0;
  return `<div class="stats"><div><b>${pool.length}</b><span>слов</span></div><div><b>${learned}</b><span>выучено</span></div><div><b>${fresh}</b><span>новых</span></div><div><b>${pct}%</b><span>прогресс</span></div></div>`;
}
const TONES=['indigo','mint','coral','sun','sky','rose','violet'];
function modes(list){
  return `<div class="modes">${list.map((m,i)=>`<button class="mode" data-i="${i}"><span class="ic t-${m.c||TONES[i%TONES.length]}">${m.g}</span><span class="mt"><b>${m.t}</b><span>${m.d}</span></span><span class="chev" aria-hidden="true">›</span></button>`).join('')}</div>`;
}
function bindModes(list){view.querySelectorAll('.mode').forEach(b=>b.onclick=()=>list[+b.dataset.i].go())}
function bindBack(root=view){root.querySelectorAll('[data-back]').forEach(b=>b.onclick=home)}
function sayBtn(t){return canSpeak()?`<button class="say" data-say="${esc(t)}" aria-label="Послушать">▶ Послушать</button>`:''}
function bindSay(root=view){root.querySelectorAll('[data-say]').forEach(b=>b.onclick=()=>speak(b.dataset.say))}
function needLessons(){
  if(!sel(W).length){view.innerHTML=`<div class="empty"><div class="emoji">📚</div><p>Не выбран ни один урок.</p><button class="btn" id="pick">Выбрать уроки</button></div>`;$('#pick').onclick=openSheet;return true}
  return false;
}
function dueWords(){const now=Date.now();return sel(W).filter(w=>srs[w.id]&&srs[w.id].d<=now).sort((a,b)=>srs[a.id].d-srs[b.id].d)}
function dayBanner(){
  const n=daily.day===today()?daily.n:0,goal=settings.goal,pct=Math.min(100,n/goal*100),done=n>=goal;
  const streak=daily.day===today()||daily.day===dstr(new Date(Date.now()-DAY))?daily.streak:0;
  const due=dueWords().length;
  return `<section class="hero">
    <div class="hero-top"><div><div class="hero-k">${done?'Цель выполнена 🎉':'Цель на сегодня'}</div>
    <button id="goalBtn" class="hero-n" aria-label="Изменить дневную цель">${n}<small> / ${goal}</small></button></div>
    <div class="streak" title="Дней подряд">🔥 ${streak} ${plural(streak,['день','дня','дней'])}</div></div>
    <div class="hbar"><i style="width:${pct}%"></i></div>
        <div class="lenrow"><span>Заданий за раз</span><div class="seg" role="group" aria-label="Длина сессии">${[10,20,0].map(v=>`<button data-len="${v}" aria-pressed="${settings.len===v}">${v||'∞'}</button>`).join('')}</div></div>
    ${due?`<button class="duebtn" id="dueBtn">Пора повторить ${due} ${plural(due,['слово','слова','слов'])}<span>›</span></button>`:''}
  </section>`;
}
function home(){
  stopSpeech();
  stopRec();
  document.body.classList.remove('insession');
  window.scrollTo(0,0);
  if(tab==='tests')testsHome();
  else if(needLessons())return;
  else if(tab==='today')todayHome();
  else if(tab==='words')wordsHome();
  else if(tab==='read')readHome();
  else if(tab==='write')writeHome();
  if(tab!=='tests'){
    view.insertAdjacentHTML('afterbegin',dayBanner());
    $('#goalBtn').onclick=()=>{const o=[10,20,30,50,100];settings.goal=o[(o.indexOf(settings.goal)+1)%o.length];store.set('kor.set',settings);home()};
    view.querySelectorAll('[data-len]').forEach(b=>b.onclick=()=>{settings.len=+b.dataset.len;store.set('kor.set',settings);view.querySelectorAll('[data-len]').forEach(x=>x.setAttribute('aria-pressed',x===b))});
    const r=$('#dueBtn');if(r)r.onclick=()=>run({make:n=>fill(dueWords(),Math.min(n,dueWords().length||1)).map(cardTask),title:'Повторение'});
  }
}

/* ===== Генераторы заданий ===== */
function wordTask(w,dir,pool){
  const base={kind:'Слова',id:w.id,miss:w};
  if(dir==='ru')return {...base,type:'mc',prompt:`<div class="q-ru">${esc(w.ru)}</div><div class="hint-line">Как это по-корейски?</div>`,options:distract(w,'ko',pool),answer:w.ko,hk:true,audio:w.ko};
  if(dir==='audio')return {...base,type:'mc',prompt:`<div class="q-icon">🔊</div><div class="hint-line">Послушайте и выберите перевод</div>`,options:distract(w,'ru',pool),answer:w.ru,audio:w.ko,autoplay:true,after:w.ko};
  return {...base,type:'mc',prompt:`<div class="q-ko big">${esc(w.ko)}</div><div class="hint-line">Что это значит?</div>`,options:distract(w,'ru',pool),answer:w.ru,audio:w.ko};
}
const cardTask=w=>({type:'card',kind:'Слова',w,miss:w});
function sentTask(s,dir,pool){
  const base={kind:'Фразы',miss:s};
  if(dir==='ru')return {...base,type:'mc',prompt:`<div class="q-ru">${esc(s.ru)}</div><div class="hint-line">Какая корейская фраза это значит?</div>`,options:distract(s,'ko',pool),answer:s.ko,hk:true,audio:s.ko};
  if(dir==='audio')return {...base,type:'mc',prompt:`<div class="q-icon">🔊</div><div class="hint-line">Послушайте и выберите перевод</div>`,options:distract(s,'ru',pool),answer:s.ru,audio:s.ko,autoplay:true,after:s.ko};
  return {...base,type:'mc',prompt:`<div class="q-ko mid">${esc(s.ko)}</div><div class="hint-line">Что это значит?</div>`,options:distract(s,'ru',pool),answer:s.ru,audio:s.ko};
}
function clozeTask(s,src){
  const ws=s.ko.split(' ');
  const k=Math.random()<.65?ws.length-1:Math.floor(Math.random()*ws.length);
  const ans=ws[k],clean=x=>x.replace(/[?.!,]/g,'');
  const pick=k===ws.length-1?[...new Set(src.map(x=>x.ko.split(' ').pop()))]:[...new Set(src.flatMap(x=>x.ko.split(' ')))];
  const opts=[ans];
  for(const x of shuffle(pick)){if(!opts.includes(x)&&clean(x)!==clean(ans)){opts.push(x);if(opts.length===4)break}}
  const shown=ws.map((w,j)=>j===k?'<span class="gap"></span>':esc(w)).join(' ');
  return {type:'mc',kind:'Пропуски',prompt:`<div class="q-ko mid">${shown}</div><div class="hint-line">${esc(s.ru)}</div>`,options:shuffle(opts),answer:ans,hk:true,sayAfter:s.ko,miss:s};
}
const buildTask=s=>({type:'build',kind:'Порядок слов',s,miss:s});
const writeTask=(it,mode)=>({type:'write',kind:'Письмо',mode,ko:it.ko,ru:it.ru,id:W.includes(it)?it.id:null,miss:it});
const speakTask=s=>({type:'speak',kind:'Произношение',s,miss:s});
const voiceTask=it=>({type:'voice',kind:'Перевод голосом',ko:it.ko,ru:it.ru,id:W.includes(it)?it.id:null,miss:it});
function conjTask(){
  const v=VERBS[Math.random()*VERBS.length|0];
  const ok=v.forms.map((f,i)=>i).filter(i=>v.forms[i]!=='-');
  const i=ok[Math.random()*ok.length|0];
  return {type:'write',kind:'Спряжение',mode:'conj',ko:v.forms[i],ru:`${v.dict} → ${FORMS[i]}`,miss:{ko:v.forms[i],ru:`${v.dict}: ${FORMS[i]}`},
    prompt:`<div class="q-ko mid">${v.dict}</div><div class="hint-line">${esc(v.ru)}</div><div class="pill">${FORMS[i]}</div>`};
}
function sentPool(){const p=sel(S);if(p.length>=6)return p;const mx=maxOrd();return p.concat(shuffle(S.filter(s=>!p.includes(s)&&s.ord<=mx+2)).slice(0,6-p.length))}
function maxOrd(){return Math.max(101,...settings.lessons.filter(k=>k!=='0-1').map(ordOf))}
function multiPool(){let p=sentPool().filter(s=>s.ko.split(' ').length>=2);if(p.length<3)p=S.filter(s=>s.ko.split(' ').length>=2&&s.ord<=Math.max(maxOrd(),106));return p}

/* ===== Движок сессий ===== */
let curCfg=null;
function run(cfg){
  curCfg=cfg;
  const inf=!cfg.count&&settings.len===0;
  const L=cfg.count||settings.len||20;
  let tasks=cfg.make(L);
  if(!tasks.length){toast('Для этого упражнения пока мало материала. Отметьте больше уроков.');return}
  let i=0;const res={ok:0,bad:0,skip:0,misses:[],byType:{}};
  document.body.classList.add('insession');
  const answered=()=>res.ok+res.bad+res.skip;
  const next=()=>{i++;if(inf&&i>=tasks.length-2)tasks=tasks.concat(cfg.make(20));show()};
  const end=()=>{stopRec();stopSpeech();answered()?summaryView(res,cfg):home()};
  const show=()=>{
    if(!inf&&i>=tasks.length)return end();
    const t=tasks[i];
    window.scrollTo(0,0);
    view.innerHTML=`<div class="sbar"><button class="iconbtn" id="quit" aria-label="Закончить">✕</button>
      ${inf?`<div class="inf">∞ задание ${i+1}<span>${res.ok} верно</span></div><button class="linkbtn" id="finish">Итоги</button>`
           :`<div class="prog"><i style="width:${i/tasks.length*100}%"></i></div><span class="count">${i+1}/${tasks.length}</span>`}</div>
      ${cfg.title?`<div class="stitle">${esc(cfg.title)}</div>`:''}
      <div id="task"></div>
      <div class="foot"><button class="btn ghost" id="skip">Пропустить</button><button class="btn" id="next" hidden>Дальше →</button></div>`;
    $('#quit').onclick=end;
    if(inf)$('#finish').onclick=end;
    let finished=false;
    const finish=(status,auto)=>{
      if(finished)return;finished=true;bumpDay();
      if(cfg.key&&status!=='skip')recordSkill(cfg.key,status==='ok');
      if(cfg.key&&status==='skip')recordSkill(cfg.key,false);
      res[status]++;
      const bt=res.byType[t.kind]=res.byType[t.kind]||{ok:0,n:0};bt.n++;if(status==='ok')bt.ok++;
      if(status!=='ok'&&t.miss)res.misses.push(t.miss);
      $('#skip').hidden=true;
      if(auto!==undefined){setTimeout(next,auto);return}
      const n=$('#next');n.hidden=false;n.onclick=next;n.focus({preventScroll:true});
    };
    const ctl=RENDER[t.type](t,$('#task'),finish,cfg)||{};
    $('#skip').onclick=()=>{if(finished)return;ctl.reveal&&ctl.reveal();finish('skip')};
  };
  show();
}
function summaryView(res,cfg){
  document.body.classList.remove('insession');
  const total=res.ok+res.bad+res.skip,pct=Math.round(res.ok/total*100);
  if(cfg.onDone)cfg.onDone(pct,res);
  if(cfg.planIdx!==undefined)markStep(cfg.planIdx);
  const uniq=[];const seen=new Set();for(const m of res.misses){if(!seen.has(m.ko)){seen.add(m.ko);uniq.push(m)}}
  view.innerHTML=`<div class="result">
    <div class="ring" style="--p:${pct}"><span>${pct}%</span></div>
    <h2>${cfg.test?(pct>=80?'Тест сдан!':'Тест не сдан'):pct>=90?'Отлично!':pct>=60?'Хороший результат':'Стоит повторить'}</h2>
    <p class="sub">${cfg.title?esc(cfg.title)+': ':''}${res.ok} из ${total} верно${res.skip?`, пропущено ${res.skip}`:''}${cfg.test?'. Для зачёта нужно 80%':''}</p>
    ${Object.keys(res.byType).length>1?`<div class="bytype">${Object.entries(res.byType).map(([k,v])=>`<div><span>${k}</span><b>${v.ok}/${v.n}</b><i style="--w:${v.ok/v.n*100}%"></i></div>`).join('')}</div>`:''}
    ${uniq.length?`<div class="misses"><h3>Повторите</h3>${uniq.map(m=>`<button class="mrow" data-say="${esc(m.ko)}"><span class="hk">${esc(m.ko)}</span><span>${esc(m.ru)}</span></button>`).join('')}</div>`:''}
    <div class="foot"><button class="btn ghost" data-back>Готово</button><button class="btn" id="again">Ещё раз</button></div></div>`;
  bindBack();bindSay();$('#again').onclick=()=>run(cfg);
}

/* ===== Отрисовка заданий ===== */
const RENDER={
  mc(t,el,finish){
    el.innerHTML=`<div class="card">${t.prompt}${t.audio?sayBtn(t.audio):''}</div>
      <div class="opts">${t.options.map(o=>`<button class="opt ${t.hk?'hk':''}">${esc(o)}</button>`).join('')}</div><div class="verdict" aria-live="polite"></div>`;
    bindSay(el);
    if(t.autoplay)setTimeout(()=>speak(t.audio),150);
    const v=$('.verdict',el);
    const mark=()=>el.querySelectorAll('.opt').forEach((x,j)=>{x.disabled=true;if(t.options[j]===t.answer)x.classList.add('ok')});
    el.querySelectorAll('.opt').forEach((b,k)=>b.onclick=()=>{
      const ok=t.options[k]===t.answer;mark();if(!ok)b.classList.add('bad');
      v.className='verdict '+(ok?'ok':'bad');v.innerHTML=(ok?'Верно!':'Неверно')+(t.after?` <span class="hk">${esc(t.after)}</span>`:'');
      if(t.id)grade(t.id,ok);
      if(t.audio&&!t.autoplay)speak(t.audio);
      if(t.sayAfter)speak(t.sayAfter);
      finish(ok?'ok':'bad');
    });
    return {reveal(){mark();v.className='verdict';v.innerHTML='Пропущено'+(t.after?`: <span class="hk">${esc(t.after)}</span>`:'');if(t.sayAfter)speak(t.sayAfter)}};
  },
  card(t,el,finish){
    const w=t.w;
    el.innerHTML=`<div class="card flash"><div class="q-ko big">${esc(w.ko)}</div>${sayBtn(w.ko)}
      <div class="back" id="back">${esc(w.ru)}</div><div class="hint-line">${w.lv?`Уровень ${w.lv}, урок ${w.l}`:'Мои слова'}</div></div>
      <div class="row" id="r1"><button class="btn" id="show">Показать перевод</button></div>
      <div class="row" id="r2" hidden><button class="btn soft-bad" id="no">Не помню</button><button class="btn soft-ok" id="yes">Помню</button></div>`;
    bindSay(el);
    const reveal=()=>{$('#back',el).classList.add('on');$('#r1',el).hidden=true};
    $('#show',el).onclick=()=>{reveal();$('#r2',el).hidden=false;$('#yes',el).focus();speak(w.ko)};
    $('#yes',el).onclick=()=>{grade(w.id,true);finish('ok',0)};
    $('#no',el).onclick=()=>{grade(w.id,false);finish('bad',0)};
    return {reveal};
  },
  build(t,el,finish){
    const s=t.s,words=s.ko.split(' ');
    let order=shuffle(words.map((w,k)=>({w,k})));
    for(let g=0;g<10&&order.every((o,k)=>o.w===words[k]);g++)order=shuffle(order);
    const placed=[];let done=false;
    const draw=()=>{
      el.innerHTML=`<div class="card"><div class="q-ru">${esc(s.ru)}</div><div class="hint-line">Нажимайте слова по порядку</div></div>
        <div class="slots">${placed.map((o,k)=>`<button class="tile" data-p="${k}">${esc(o.w)}</button>`).join('')||'<span class="slot-ph">Сюда</span>'}</div>
        <div class="tiles">${order.map((o,k)=>`<button class="tile ${placed.includes(o)?'used':''}" data-t="${k}">${esc(o.w)}</button>`).join('')}</div>
        <div class="verdict" aria-live="polite"></div>
        ${done?'':`<div class="row"><button class="btn" id="chk" ${placed.length===words.length?'':'disabled'}>Проверить</button></div>`}`;
      if(done)return;
      el.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{const o=order[+b.dataset.t];if(!placed.includes(o)){placed.push(o);draw()}});
      el.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{placed.splice(+b.dataset.p,1);draw()});
      $('#chk',el).onclick=()=>{
        const ok=placed.map(o=>o.w).join(' ')===s.ko;done=true;draw();
        const v=$('.verdict',el);v.className='verdict '+(ok?'ok':'bad');
        v.innerHTML=ok?'Верно!':`Правильно: <span class="hk">${esc(s.ko)}</span>`;
        speak(s.ko);finish(ok?'ok':'bad');
      };
    };
    draw();
    return {reveal(){done=true;draw();const v=$('.verdict',el);v.className='verdict';v.innerHTML=`Ответ: <span class="hk">${esc(s.ko)}</span>`}};
  },
  write(t,el,finish,cfg){
    const target=norm(t.ko),tgt=decompose(target);
    let tokens=[],hinted=false,failed=false,state='typing';
    const prompt=t.prompt?t.prompt:t.mode==='copy'?`<div class="q-ko mid">${esc(t.ko)}</div><div class="hint-line">${esc(t.ru)}</div>`
      :t.mode==='dict'?`<div class="q-icon">🔊</div><div class="hint-line">Запишите то, что услышали</div>${sayBtn(t.ko)}`
      :`<div class="q-ru">${esc(t.ru)}</div><div class="hint-line">Напишите по-корейски</div>`;
    el.innerHTML=`<div class="card">${prompt}</div>
      <div class="answer" id="ans" aria-live="polite"></div>
      <div class="verdict" aria-live="polite"></div>
      <div class="row tools">${cfg.test?'':'<button class="btn ghost" id="hint">Подсказка</button>'}${SR&&t.mode!=='copy'?'<button class="btn ghost mic-s" id="wmic" aria-label="Ответить голосом">🎤</button>':''}<button class="btn" id="chk">Проверить</button></div>
      <div id="kbw"></div>`;
    bindSay(el);
    if(t.mode==='dict')setTimeout(()=>speak(t.ko),150);
    const ans=$('#ans',el),v=$('.verdict',el),chk=$('#chk',el),hb=$('#hint',el);
    const draw=()=>{ans.innerHTML=esc(compose(tokens)).replace(/ /g,'&nbsp;')+(state!=='done'?'<span class="caret"></span>':'')};
    draw();
    mountKB($('#kbw',el),key=>{
      if(state==='done')return;
      if(state==='wrong'){state='typing';ans.className='answer'}
      if(key==='BS')tokens.pop();
      else if(key===' '){if(tokens.length&&tokens[tokens.length-1]!==' ')tokens.push(' ')}
      else tokens.push(key);
      draw();
    });
    const lock=()=>{state='done';draw();chk.disabled=true;if(hb)hb.disabled=true;$('#kbw',el).classList.add('dim')};
    if(hb)hb.onclick=()=>{
      if(state==='done')return;hinted=true;
      let k=0;while(k<tokens.length&&k<tgt.length&&tokens[k]===tgt[k])k++;
      if(k<tokens.length){const n=tokens.length-k;v.className='verdict bad';v.textContent=`Сотрите ${n} ${plural(n,['букву','буквы','букв'])} (⌫): дальше ошибка`;return}
      if(k>=tgt.length){v.className='verdict ok';v.textContent='Всё набрано, нажмите «Проверить»';return}
      const nx=tgt[k];v.className='verdict';
      v.textContent=nx===' '?'Дальше пробел':`Следующая буква: ${nx}${SHIFT_OF[nx]?' (через ⇧)':''}`;
      if(nx!==' ')highlightKey(nx);
    };
    let voiceBest=null;
    const wm=$('#wmic',el);
    if(wm)wm.onclick=()=>listenKo(wm,v,alts=>{
      const best=closest(alts,t.ko);
      voiceBest=best;tokens=decompose(norm(best));state='typing';ans.className='answer';draw();
      chk.onclick();
    });
    chk.onclick=()=>{
      const got=norm(compose(tokens));
      if(!got){v.className='verdict bad';v.textContent='Сначала наберите ответ';return}
      const exact=got===target,loose=got.replace(/ /g,'')===target.replace(/ /g,'')||(voiceBest!==null&&sim(voiceBest,t.ko)>=.85);
      voiceBest=null;
      if(exact||loose){
        ans.className='answer ok';lock();
        v.className='verdict ok';
        v.innerHTML=(failed?'Теперь верно':'Верно!')+(hinted?' (с подсказкой)':'')+(!exact?` Правильно пишется: <span class="hk">${esc(t.ko)}</span>`:'');
        const clean=!failed&&!hinted;
        if(t.id)grade(t.id,clean);
        speak(t.ko);finish(clean?'ok':'bad');
      }else{
        failed=true;state='wrong';ans.className='answer bad';draw();
        v.className='verdict bad';
        v.innerHTML=cfg.test?'Неверно. Исправьте или пропустите.':`Правильно: <span class="hk">${esc(t.ko)}</span><br>Исправьте свой вариант (⌫ стирает по букве)`;
      }
    };
    return {reveal(){lock();v.className='verdict';v.innerHTML=`Ответ: <span class="hk">${esc(t.ko)}</span>`}};
  },
  voice(t,el,finish){
    let fails=0;
    el.innerHTML=`<div class="card"><div class="q-ru">${esc(t.ru)}</div><div class="hint-line">Скажите это по-корейски</div></div>
      <button class="micbig" id="vmic" aria-label="Нажмите и скажите по-корейски"><span>🎤</span>Нажмите и говорите</button>
      <div class="verdict" aria-live="polite"></div><div id="vans"></div>`;
    const v=$('.verdict',el),btn=$('#vmic',el),box=$('#vans',el);
    const showAns=()=>{box.innerHTML=`<div class="card soft"><div class="hint-line" style="margin:0">Правильный ответ</div><div class="q-ko mid">${esc(t.ko)}</div>${sayBtn(t.ko)}</div>`;bindSay(box)};
    btn.onclick=()=>listenKo(btn,v,alts=>{
      const best=closest(alts,t.ko),sc=sim(best,t.ko);
      if(sc>=.8){
        btn.disabled=true;v.className='verdict ok';
        v.innerHTML=`${sc>=.95?'Отлично!':'Верно!'} Вы сказали: <span class="hk">${esc(best)}</span>`;
        showAns();speak(t.ko);
        if(t.id)grade(t.id,fails===0);
        finish(fails===0?'ok':'bad');
      }else{
        fails++;v.className='verdict bad';
        v.innerHTML=`Распознано: <span class="hk">${esc(best||'—')}</span><br>${fails>=2?'Послушайте правильный ответ и повторите его':'Не похоже. Попробуйте ещё раз'}`;
        if(fails>=2)showAns();
      }
    });
    return {reveal(){btn.disabled=true;stopRec();showAns()}};
  },
  speak(t,el,finish){
    const s=t.s;let tries=0;
    el.innerHTML=`<div class="card"><div class="q-ko mid">${esc(s.ko)}</div><div class="hint-line">${esc(s.ru)}</div>${sayBtn(s.ko)}</div>
      <div class="row"><button class="btn mic" id="mic">🎤 Нажмите и скажите</button></div><div class="verdict" aria-live="polite"></div>`;
    bindSay(el);
    const v=$('.verdict',el),mic=$('#mic',el);
    mic.onclick=()=>{
      stopRec();stopSpeech();
      try{rec=new SR()}catch(e){v.className='verdict bad';v.textContent='Распознавание речи недоступно в этом браузере';return}
      rec.lang='ko-KR';rec.interimResults=false;rec.maxAlternatives=5;
      mic.textContent='Слушаю…';mic.classList.add('on');v.className='verdict';v.textContent='';
      rec.onresult=e=>{
        const alts=[...e.results[0]].map(r=>r.transcript);
        const best=alts.reduce((m,x)=>sim(x,s.ko)>sim(m,s.ko)?x:m,alts[0]);
        const sc=sim(best,s.ko);tries++;
        if(sc>=.8){v.className='verdict ok';v.innerHTML=`${sc>=.95?'Отлично!':'Хорошо!'} Распознано: <span class="hk">${esc(best)}</span>`;mic.disabled=true;finish(tries===1?'ok':'bad')}
        else{v.className='verdict bad';v.innerHTML=`Распознано: <span class="hk">${esc(best)}</span><br>Послушайте образец и попробуйте ещё раз`}
      };
      rec.onerror=e=>{v.className='verdict bad';v.textContent=e.error==='network'?'Распознавание речи работает только с интернетом':e.error==='not-allowed'||e.error==='service-not-allowed'?'Нет доступа к микрофону. Разрешите его в настройках браузера':e.error==='no-speech'?'Ничего не услышал, попробуйте ещё раз':'Ошибка распознавания: '+e.error};
      rec.onend=()=>{mic.textContent='🎤 Нажмите и скажите';mic.classList.remove('on')};
      try{rec.start()}catch(e){v.textContent='Не удалось включить микрофон'}
    };
  }
};

/* ===== Разделы ===== */
/* ===== Режимы упражнений (общий реестр) ===== */
const AREAS={vocab:'Слова',listen:'Аудирование',read:'Чтение',grammar:'Грамматика',write:'Письмо',speak:'Речь'};
const hardList=()=>sel(W).filter(w=>srs[w.id]&&srs[w.id].b===0);
const freshList=()=>sel(W).filter(w=>!srs[w.id]);
const MODES=[
  {k:'cards',tab:'words',area:'vocab',g:'카드',t:'Карточки',d:'Вспомните перевод и оцените себя. Знакомые слова возвращаются реже.',make:n=>pickWords(n).map(cardTask)},
  {k:'hard',tab:'words',area:'vocab',g:'!',c:'coral',t:'Трудные слова',d:'Слова, в которых вы ошиблись в последний раз.',when:()=>hardList().length>0,make:n=>fill(hardList(),n).map(cardTask)},
  {k:'w-ko',tab:'words',area:'vocab',g:'한',t:'Корейский → русский',d:'Выберите правильный перевод.',make:n=>pickWords(n).map(w=>wordTask(w,'ko',sel(W)))},
  {k:'w-ru',tab:'words',area:'vocab',g:'ру',t:'Русский → корейский',d:'Найдите корейское слово среди похожих.',make:n=>pickWords(n).map(w=>wordTask(w,'ru',sel(W)))},
  {k:'w-audio',tab:'words',area:'listen',g:'♪',t:'На слух',d:'Слово звучит вслух, выберите перевод.',when:canSpeak,make:n=>pickWords(n).map(w=>wordTask(w,'audio',sel(W)))},
  {k:'w-voice',tab:'words',area:'speak',g:'🎤',c:'rose',t:'Переведи голосом',d:'Русское слово → скажите его по-корейски в микрофон.',when:()=>!!SR,make:n=>pickWords(n,sel(W).filter(w=>!/^-/.test(w.ko))).map(voiceTask)},
  {k:'my',tab:'words',g:'＋',c:'sun',t:'Мои слова',d:()=>`Свой словарь: ${custom.length} ${plural(custom.length,['слово','слова','слов'])}. Добавляйте слова из сериалов, песен, жизни.`,go:()=>myWords()},
  {k:'s-ko',tab:'read',area:'read',g:'읽기',t:'Прочитай фразу',d:'Корейская фраза → перевод.',make:n=>fill(sentPool(),n).map(s=>sentTask(s,'ko',sentPool()))},
  {k:'s-ru',tab:'read',area:'read',g:'찾기',t:'Найди фразу',d:'Русская фраза → корейская среди похожих.',make:n=>fill(sentPool(),n).map(s=>sentTask(s,'ru',sentPool()))},
  {k:'cloze',tab:'read',area:'grammar',g:'빈칸',t:'Вставь пропуск',d:'Выберите слово или окончание, которое подходит.',make:n=>fill(multiPool(),n).map(s=>clozeTask(s,multiPool()))},
  {k:'build',tab:'read',area:'grammar',g:'조립',t:'Собери фразу',d:'Расставьте слова в правильном порядке.',make:n=>fill(multiPool(),n).map(buildTask)},
  {k:'dialogs',tab:'read',g:'대화',t:'Диалоги',d:'Сценки из жизни: выбирайте свою реплику.',go:()=>dialogList()},
  {k:'s-audio',tab:'read',area:'listen',g:'♪',t:'Фраза на слух',d:'Послушайте и выберите перевод.',when:canSpeak,make:n=>fill(sentPool(),n).map(s=>sentTask(s,'audio',sentPool()))},
  {k:'s-voice',tab:'read',area:'speak',g:'🎤',c:'rose',t:'Переведи фразу голосом',d:'Русская фраза → скажите её по-корейски.',when:()=>!!SR,make:n=>fill(sentPool(),n).map(voiceTask)},
  {k:'speak',tab:'read',area:'speak',g:'🗣',t:'Скажи вслух',d:'Прочитайте фразу в микрофон, приложение проверит произношение.',when:()=>!!SR,make:n=>fill(sentPool(),n).map(speakTask)},
  {k:'copy',tab:'write',area:'write',g:'따라',t:'Перепиши',d:'Видите слово, набираете его. Лучший способ освоить клавиатуру.',make:n=>pickWords(n).map(w=>writeTask(w,'copy'))},
  {k:'w-tr',tab:'write',area:'write',g:'단어',t:'Переведи слово',d:'Русское слово → наберите по-корейски.',make:n=>pickWords(n).map(w=>writeTask(w,'tr'))},
  {k:'conj',tab:'write',area:'grammar',g:'활용',t:'Спряжение',d:'먹다 → 먹었어요. Пять форм, включая неправильные глаголы.',make:n=>Array.from({length:n},conjTask)},
  {k:'s-tr',tab:'write',area:'write',g:'문장',t:'Переведи фразу',d:'Русская фраза → наберите её по-корейски.',make:n=>fill(sentPool(),n).map(s=>writeTask(s,'tr'))},
  {k:'dict',tab:'write',area:'listen',g:'받아',t:'Диктант',d:'Слушаете и записываете.',when:canSpeak,make:n=>shuffle([...pickWords(Math.ceil(n*.6)),...fill(sentPool(),Math.floor(n*.4))]).map(x=>writeTask(x,'dict'))}
];
const modeBy=k=>MODES.find(m=>m.k===k);
const avail=m=>!m.when||m.when();
function launch(m,extra={}){if(m.go)return m.go();run({make:m.make,title:m.t,key:m.k,...extra})}
function modeList(tab){
  return MODES.filter(m=>m.tab===tab&&avail(m)).map(m=>({...m,t:m.k==='hard'?`${m.t} (${hardList().length})`:m.t,d:typeof m.d==='function'?m.d():m.d,go:()=>launch(m)}));
}
function wordsHome(){const list=modeList('words');view.innerHTML=`<h2 class="h">Слова</h2>`+statline()+modes(list);bindModes(list)}
function readHome(){const list=modeList('read');view.innerHTML=`<h2 class="h">Чтение</h2><p class="sub">${sel(S).length} ${plural(sel(S).length,['фраза','фразы','фраз'])} из отмеченных уроков</p>`+modes(list);bindModes(list)}
function writeHome(){const list=modeList('write');view.innerHTML=`<h2 class="h">Письмо</h2><p class="sub">Нажимайте буквы по порядку, слоги соберутся сами: ㅎ + ㅏ + ㄴ → 한. Двойные согласные и ㅒ ㅖ через ⇧.</p>`+modes(list);bindModes(list)}

/* ===== Статистика навыков ===== */
let skills=store.get('kor.skills',{});
function recordSkill(k,ok){
  const s=skills[k]=skills[k]||{n:0,ok:0,h:[],last:0};
  s.n++;if(ok)s.ok++;s.h.push(ok?1:0);if(s.h.length>30)s.h.shift();s.last=Date.now();
  store.set('kor.skills',skills);
}
function skillAcc(k){const s=skills[k];if(!s||!s.h.length)return {n:0,acc:null,last:s?s.last:0};return {n:s.h.length,acc:s.h.reduce((a,b)=>a+b,0)/s.h.length,last:s.last}}
function areaStat(a){
  const ms=MODES.filter(m=>m.area===a);let h=[],last=0;
  for(const m of ms){const s=skills[m.k];if(s){h=h.concat(s.h);last=Math.max(last,s.last)}}
  return {n:h.length,acc:h.length?h.reduce((x,y)=>x+y,0)/h.length:null,last};
}

/* ===== План на сегодня ===== */
let plan=store.get('kor.plan',null);
const daysAgo=t=>t?Math.floor((Date.now()-t)/DAY):null;
function buildPlan(){
  const steps=[],used=new Set();
  const due=dueWords().length,fresh=freshList().length,hard=hardList().length;
  if(due)steps.push({type:'due',label:`Повторить слова: ${Math.min(due,20)}`,why:'Подошёл срок повторения. Если повторять вовремя, слова уходят в долгую память.'});
  if(fresh)steps.push({type:'new',label:`Новые слова: ${Math.min(fresh,10)}`,why:`В отмеченных уроках ещё ${fresh} ${plural(fresh,['новое слово','новых слова','новых слов'])}.`});
  else if(hard>=5&&!due)steps.push({type:'mode',mode:'hard',label:`Трудные слова: ${hard}`,why:'В этих словах вы ошиблись в последний раз.'});
  const cand=MODES.filter(m=>m.make&&m.area&&avail(m)&&m.k!=='hard'&&m.k!=='cards');
  const weak=cand.map(m=>({m,s:skillAcc(m.k)})).filter(x=>x.s.n>=6&&x.s.acc<.8).sort((a,b)=>a.s.acc-b.s.acc)[0];
  if(weak){steps.push({type:'mode',mode:weak.m.k,label:weak.m.t,why:`Слабое место: точность ${Math.round(weak.s.acc*100)}% в последних ответах.`});used.add(weak.m.area)}
  const areas=Object.keys(AREAS).filter(a=>!used.has(a)&&cand.some(m=>m.area===a)).map(a=>({a,st:areaStat(a)}))
    .sort((x,y)=>(x.st.last||0)-(y.st.last||0));
  for(const {a,st} of areas){
    if(steps.length>=5)break;
    if(st.last&&daysAgo(st.last)<1&&steps.length>=3)continue;
    const ms=cand.filter(m=>m.area===a).map(m=>({m,s:skillAcc(m.k)})).sort((x,y)=>(x.s.last||0)-(y.s.last||0));
    const pick=ms[0];if(!pick)continue;
    const d=daysAgo(st.last);
    steps.push({type:'mode',mode:pick.m.k,label:pick.m.t,why:!st.last?`Навык «${AREAS[a]}» вы ещё не тренировали.`:d>=1?`Навык «${AREAS[a]}» не тренировали ${d} ${plural(d,['день','дня','дней'])}.`:`Для разнообразия: навык «${AREAS[a]}».`});
    if(steps.length>=4)break;
  }
  const lt=levelForTest();
  if(lt)steps.push({type:'test',lv:lt,label:`Тест уровня ${lt}`,why:`Вы выучили большую часть слов уровня ${lt}. Проверьте себя: для зачёта нужно 80%.`});
  plan={day:today(),sel:settings.lessons.slice().sort().join(','),steps:steps.slice(0,5).map(s=>({...s,done:false}))};
  store.set('kor.plan',plan);
}
function levelForTest(){
  for(const L of LEVELS){
    const ws=W.filter(w=>w.lv===L.n);if(!ws.length)continue;
    const lr=ws.filter(w=>srs[w.id]&&srs[w.id].b>=2).length/ws.length;
    const best=(tests['L'+L.n]||{}).best||0;
    if(lr>=.7&&best<80)return L.n;
  }
  return 0;
}
function nextLesson(){
  const pool=sel(W).filter(w=>w.lv>0);if(pool.length<8)return null;
  const lr=pool.filter(w=>srs[w.id]&&srs[w.id].b>=2).length/pool.length;
  if(lr<.7)return null;
  for(const L of LEVELS)for(let i=1;i<=L.titles.length;i++){const k=L.n+'-'+i;if(!settings.lessons.includes(k))return {k,lv:L.n,l:i,t:L.titles[i-1],lr}}
  return null;
}
function startStep(i){
  const s=plan.steps[i];
  const extra={planIdx:i,count:s.type==='due'?Math.min(20,Math.max(1,dueWords().length)):10};
  if(s.type==='due')return run({key:'cards',title:'Повторение',make:n=>fill(dueWords(),Math.min(n,Math.max(dueWords().length,1))).map(cardTask),...extra});
  if(s.type==='new'){const fr=shuffle(freshList()).slice(0,10);return run({key:'cards',title:'Новые слова',make:n=>fill(fr.length?fr:pickWords(10),n).map(cardTask),...extra,count:Math.max(1,Math.min(10,fr.length||10))})}
  if(s.type==='test')return startTest(s.lv,i);
  const m=modeBy(s.mode);if(m&&avail(m))launch(m,extra);else{s.done=true;store.set('kor.plan',plan);home()}
}
function markStep(i){if(plan&&plan.steps[i]){plan.steps[i].done=true;store.set('kor.plan',plan)}}
function todayHome(){
  if(!plan||plan.day!==today()||plan.sel!==settings.lessons.slice().sort().join(','))buildPlan();
  const done=plan.steps.filter(s=>s.done).length,total=plan.steps.length;
  const nl=nextLesson();
  const st=Object.keys(AREAS).map(a=>({a,...areaStat(a)}));
  const known=st.filter(x=>x.n>=6);
  const best=known.slice().sort((x,y)=>y.acc-x.acc)[0],worst=known.slice().sort((x,y)=>x.acc-y.acc)[0];
  const bk=+(localStorage.getItem('kor.backupAt')||0),hasProg=Object.keys(srs).length>=20;
  view.innerHTML=`<h2 class="h">План на сегодня</h2>
  <p class="sub">${total?(done===total?'Всё сделано! Можно отдохнуть или позаниматься чем угодно ниже.':`Сделано ${done} из ${total}. План подстраивается под ваши ошибки и пропуски.`):'Отметьте уроки, и я составлю план.'}</p>
  <div class="plan">${plan.steps.map((s,i)=>`<button class="pstep ${s.done?'done':''}" data-step="${i}"><span class="pnum">${s.done?'✓':i+1}</span><span class="mt"><b>${esc(s.label)}</b><span>${esc(s.why)}</span></span><span class="chev">›</span></button>`).join('')}</div>
  <div class="row" style="margin-top:10px"><button class="linkbtn" id="replan">↻ Составить план заново</button></div>
  ${nl?`<div class="tip"><b>Пора двигаться дальше.</b> Вы знаете ${Math.round(nl.lr*100)}% слов из отмеченных уроков. Следующий урок: уровень ${nl.lv}, урок ${nl.l}: «${esc(nl.t)}».<button class="btn" id="addLesson">Добавить этот урок</button></div>`:''}
  <h3>Ваши навыки</h3>
  <div class="skills">${st.map(x=>`<div class="sk"><span>${AREAS[x.a]}</span><div class="skbar"><i style="width:${x.acc===null?0:Math.round(x.acc*100)}%"></i></div><b>${x.acc===null?'—':Math.round(x.acc*100)+'%'}</b><small>${x.last?(daysAgo(x.last)===0?'сегодня':daysAgo(x.last)+' дн. назад'):'не было'}</small></div>`).join('')}</div>
  ${known.length>=2&&best.a!==worst.a?`<p class="sub" style="margin-top:10px">Сильная сторона: <b>${AREAS[best.a]}</b>. Больше всего стоит подтянуть: <b>${AREAS[worst.a]}</b>.</p>`:'<p class="sub" style="margin-top:10px">Точность считается по последним 30 ответам в каждом упражнении.</p>'}
  ${hasProg&&(!bk||daysAgo(bk)>=14)?`<div class="tip soft"><b>Сохраните прогресс.</b> Он хранится только в этом браузере. ${bk?`Последняя копия: ${daysAgo(bk)} дн. назад.`:'Копию вы ещё не делали.'}<button class="btn ghost" id="bkNow">Скачать резервную копию</button></div>`:''}`;
  view.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>startStep(+b.dataset.step));
  $('#replan').onclick=()=>{buildPlan();home()};
  const al=$('#addLesson');if(al)al.onclick=()=>{settings.lessons.push(nl.k);store.set('kor.set',settings);refreshLessonsBtn();buildPlan();toast('Урок добавлен');home()};
  const bn=$('#bkNow');if(bn)bn.onclick=()=>{exportBackup();setTimeout(home,800)};
}

/* ===== Тесты ===== */
function testTasks(wp,sp){
  const mp=sp.filter(s=>s.ko.split(' ').length>=2);
  const t=[];
  fill(wp,8).forEach(w=>t.push(wordTask(w,'ko',wp)));
  fill(wp,5).forEach(w=>t.push(wordTask(w,'ru',wp)));
  fill(sp,6).forEach(s=>t.push(sentTask(s,'ko',sp)));
  fill(mp,5).forEach(s=>t.push(clozeTask(s,mp)));
  fill(mp,3).forEach(s=>t.push(buildTask(s)));
  fill(wp.filter(w=>!/^-/.test(w.ko)),3).forEach(w=>t.push(writeTask(w,'tr')));
  return t;
}
function startTest(lv,planIdx){
  const wp=lv?W.filter(w=>w.lv===lv):sel(W),sp=lv?S.filter(s=>s.lv===lv):sentPool();
  run({count:30,test:true,key:'test',planIdx,title:lv?`Итоговый тест: уровень ${lv}`:'Тест по отмеченным урокам',make:()=>testTasks(wp,sp),
    onDone:pct=>{if(!lv)return;const k='L'+lv;const prev=tests[k];if(!prev||pct>prev.best)tests[k]={best:pct,date:today()};store.set('kor.tests',tests)}});
}
function testsHome(){
  const passed=LEVELS.filter(L=>(tests['L'+L.n]||{}).best>=80).length;
  view.innerHTML=`<h2 class="h">Тесты</h2><p class="sub">Большой тест на 30 заданий: слова, фразы, пропуски, порядок слов и письмо. Подсказок нет, для зачёта нужно 80%. Сдано уровней: ${passed} из ${LEVELS.length}.</p>
  ${sel(W).length?`<button class="mode feature" id="tsel"><span class="ic t-indigo">✓</span><span class="mt"><b>Тест по отмеченным урокам</b><span>${esc(lessonsLabel())}</span></span><span class="chev">›</span></button>`:''}
  <div class="tgrid">${LEVELS.map(L=>{const r=tests['L'+L.n];const b=r?r.best:null;
    return `<button class="tcard ${b>=80?'pass':''}" data-lv="${L.n}"><span class="ring sm" style="--p:${b||0}"><span>${b===null?'—':b+'%'}</span></span><b>Уровень ${L.n}</b><small>${b===null?'ещё не пройден':b>=80?'сдан ✓':'лучший результат'}</small></button>`}).join('')}</div>`;
  const ts=$('#tsel');if(ts)ts.onclick=()=>startTest(0);
  view.querySelectorAll('.tcard').forEach(b=>b.onclick=()=>startTest(+b.dataset.lv));
}

/* Диалоги */
function dialogList(){
  const maxLv=Math.max(1,...settings.lessons.map(k=>+k.split('-')[0]));
  const list=DIALOGS.map((d,i)=>({g:'💬',t:d.t,d:`Уровень ${d.lv}${d.lv>maxLv?' (пока сложновато)':''}`,c:d.lv>maxLv?'violet':'mint',go:()=>dialog(i)}));
  view.innerHTML=`<div class="bar"><button class="back" data-back>← Назад</button></div><h2>Диалоги</h2><p class="sub">Читайте реплики собеседника и выбирайте свой ответ. Нажмите на реплику, чтобы услышать её.</p>`+modes(list);
  bindBack();bindModes(list);
}
function dialog(di){
  document.body.classList.add('insession');
  const d=DIALOGS[di];let i=0,score=0,total=0;const misses=[];
  const chat=[];
  const split=s=>{const [ko,ru]=s.split('|');return {ko,ru}};
  const render=(choices)=>{
    view.innerHTML=`<div class="bar"><button class="back" data-back>← Назад</button><div class="prog"><i style="width:${i/d.lines.length*100}%"></i></div></div>
    <h2>${esc(d.t)}</h2><div class="chat">${chat.map(c=>`<button class="bubble ${c.me?'me':''}" data-say="${esc(c.ko)}"><span class="hk">${esc(c.ko)}</span><small>${esc(c.ru)}</small></button>`).join('')}</div>
    ${choices?`<p class="hint-line" style="margin-top:14px">Ваша реплика:</p><div class="opts">${choices.map(o=>`<button class="opt hkopt">${esc(o)}</button>`).join('')}</div><div class="verdict" aria-live="polite"></div>`:''}`;
    bindBack();bindSay();
  };
  const step=()=>{
    if(i>=d.lines.length){
      render();
      view.insertAdjacentHTML('beforeend',`<div class="verdict ok" style="text-align:center">Диалог завершён: ${score} из ${total} с первой попытки</div><div class="row"><button class="btn ghost" id="toList">Все диалоги</button><button class="btn" id="again">Ещё раз</button></div>`);
      document.getElementById('toList').onclick=dialogList;document.getElementById('again').onclick=()=>dialog(di);
      window.scrollTo(0,document.body.scrollHeight);return;
    }
    const ln=d.lines[i];
    if(ln.a){const c=split(ln.a);chat.push(c);i++;render();speak(c.ko);setTimeout(step,700);return}
    const right=split(ln.b),opts=shuffle([right.ko,...ln.x]);let tries=0;total++;
    render(opts);window.scrollTo(0,document.body.scrollHeight);
    view.querySelectorAll('.opt').forEach((b,k)=>b.onclick=()=>{
      bumpDay();
      const v=view.querySelector('.verdict');
      if(opts[k]===right.ko){
        if(!tries)score++;
        chat.push({...right,me:true});i++;speak(right.ko);step();
      }else{
        tries++;b.classList.add('bad');b.disabled=true;v.className='verdict bad';v.textContent='Не подходит по смыслу. Попробуйте другой вариант.';
      }
    });
  };
  step();
}


/* Мои слова */
function saveCustom(){try{localStorage.setItem('kor.custom',JSON.stringify(custom))}catch(e){}markDirty()}
function myWords(){
  let tokens=[];
  view.innerHTML=`<div class="bar"><button class="back" data-back>← Назад</button></div><h2>Мои слова</h2>
  <p class="sub">Наберите слово на корейской клавиатуре и впишите перевод. Свои слова попадают во все упражнения, когда в «Уроках» отмечен пункт «Мои слова».</p>
  <label class="lbl">По-корейски</label><div class="answer" id="kofield"></div><div id="kbw"></div>
  <label class="lbl" for="rufield">Перевод</label><input id="rufield" class="txt" autocomplete="off" placeholder="например: сериал">
  <div class="row"><button class="btn" id="addw">Добавить слово</button></div><div class="verdict" aria-live="polite"></div>
  <h3>Добавлено: ${custom.length}</h3><div class="miss">${custom.map((c,k)=>`<div class="myrow"><span><span class="hk">${esc(c.ko)}</span>${esc(c.ru)}</span><button class="del" data-del="${k}" aria-label="Удалить ${esc(c.ko)}">✕</button></div>`).join('')||'<p class="hint-line">Пока пусто.</p>'}</div>`;
  bindBack();
  const kf=view.querySelector('#kofield');
  const draw=()=>{kf.innerHTML=esc(compose(tokens)).replace(/ /g,'&nbsp;')+'<span class="caret"></span>'};draw();
  mountKB(view.querySelector('#kbw'),key=>{if(key==='BS')tokens.pop();else if(key===' '){if(tokens.length&&tokens[tokens.length-1]!==' ')tokens.push(' ')}else tokens.push(key);draw()});
  view.querySelector('#addw').onclick=()=>{
    const ko=compose(tokens).trim(),ru=view.querySelector('#rufield').value.trim(),v=view.querySelector('.verdict');
    if(!ko||!ru){v.className='verdict bad';v.textContent='Заполните оба поля.';return}
    if(custom.some(c=>c.ko===ko)){v.className='verdict bad';v.textContent='Такое слово уже есть.';return}
    custom.push({ko,ru});saveCustom();W.push(mkCustom({ko,ru}));
    if(!settings.lessons.includes('0-1')){settings.lessons.push('0-1');store.set('kor.set',settings);refreshLessonsBtn()}
    myWords();toast('Добавлено: '+ko);
  };
  view.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    const c=custom[+b.dataset.del];custom.splice(+b.dataset.del,1);saveCustom();
    const j=W.findIndex(w=>w.id==='my:'+c.ko);if(j>=0)W.splice(j,1);
    if(!custom.length){settings.lessons=settings.lessons.filter(k=>k!=='0-1');store.set('kor.set',settings);refreshLessonsBtn()}
    myWords();
  });
}


/* Выбор уроков */
const sheet=document.getElementById('sheet');
function drawLessons(){
  const openNow=[...document.querySelectorAll('#lgrid details[open]')].map(d=>d.dataset.lv);
  document.getElementById('lgrid').innerHTML=(custom.length?`<button class="chip" aria-pressed="${settings.lessons.includes('0-1')}" data-k="0-1" style="margin:6px 0"><b>＋</b><span>Мои слова (${custom.length})</span></button>`:'')+LEVELS.map(L=>{
    const keys=L.titles.map((_,k)=>L.n+'-'+(k+1));
    const on=keys.filter(k=>settings.lessons.includes(k)).length,all=on===keys.length;
    const open=openNow.length?openNow.includes(String(L.n)):on>0;
    return `<details data-lv="${L.n}" ${open?'open':''}><summary><span>Уровень ${L.n}</span><small>${on?`выбрано ${on} из ${keys.length}`:''}</small></summary>
    <div class="lvhead"><button class="lvall" data-lv="${L.n}">${all?'Снять весь уровень':'Выбрать весь уровень'}</button></div>`+
    L.titles.map((t,k)=>`<button class="chip" aria-pressed="${settings.lessons.includes(keys[k])}" data-k="${keys[k]}"><b>${k+1}</b><span>${esc(t)}</span></button>`).join('')+'</details>';
  }).join('');
  document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{
    const k=b.dataset.k;
    settings.lessons=settings.lessons.includes(k)?settings.lessons.filter(x=>x!==k):[...settings.lessons,k];
    b.setAttribute('aria-pressed',settings.lessons.includes(k));
  });
  document.querySelectorAll('.lvall').forEach(b=>b.onclick=()=>{
    const L=LEVELS.find(x=>x.n===+b.dataset.lv),keys=L.titles.map((_,k)=>L.n+'-'+(k+1));
    const all=keys.every(k=>settings.lessons.includes(k));
    settings.lessons=all?settings.lessons.filter(k=>!keys.includes(k)):[...new Set([...settings.lessons,...keys])];
    drawLessons();
  });
}
function openSheet(){drawLessons();sheet.classList.add('open');document.getElementById('lDone').focus()}
function closeSheet(){sheet.classList.remove('open');store.set('kor.set',settings);refreshLessonsBtn();home()}
document.getElementById('lessonsBtn').onclick=openSheet;
document.getElementById('soundBtn').onclick=soundCheck;
document.getElementById('lDone').onclick=closeSheet;
document.getElementById('lAll').onclick=()=>{settings.lessons=LEVELS.flatMap(L=>L.titles.map((_,k)=>L.n+'-'+(k+1)));drawLessons()};
document.getElementById('lNone').onclick=()=>{settings.lessons=[];drawLessons()};
document.getElementById('resetProg').onclick=()=>{if(confirm('Сбросить прогресс по всем словам?')){srs={};store.set('kor.srs',srs);closeSheet()}};
sheet.addEventListener('click',e=>{if(e.target===sheet)closeSheet()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet.classList.contains('open'))closeSheet()});


/* ===== Резервная копия (файл) ===== */
const SYNC_KEYS=['custom','srs','set','tests','daily','skills'];
function markDirty(){try{localStorage.setItem('kor.updated',String(Date.now()))}catch(e){}}
function localState(){const o={};for(const k of SYNC_KEYS){try{const v=localStorage.getItem('kor.'+k);if(v!=null)o[k]=JSON.parse(v)}catch(e){}}o.updatedAt=+(localStorage.getItem('kor.updated')||0);return o}
function mergeState(loc,rem){
  const newer=(rem.updatedAt||0)>(loc.updatedAt||0)?rem:loc,older=newer===rem?loc:rem;
  const out={...older,...newer};
  const cm=new Map();for(const c of [...(older.custom||[]),...(newer.custom||[])])cm.set(c.ko,c);
  out.custom=[...cm.values()];
  out.srs={...(older.srs||{})};for(const [id,s] of Object.entries(newer.srs||{})){const o=out.srs[id];if(!o||s.d>=o.d)out.srs[id]=s}
  const tt={...(older.tests||{})};for(const [k,v] of Object.entries(newer.tests||{})){if(!tt[k]||v.best>tt[k].best)tt[k]=v}out.tests=tt;
  out.updatedAt=Math.max(loc.updatedAt||0,rem.updatedAt||0);
  return out;
}
function applyState(st){
  for(const k of SYNC_KEYS){if(st[k]!==undefined)try{localStorage.setItem('kor.'+k,JSON.stringify(st[k]))}catch(e){}}
  loadSettings();skills=store.get('kor.skills',{});plan=null;srs=store.get('kor.srs',{});tests=store.get('kor.tests',{});daily=store.get('kor.daily',{day:'',n:0,streak:0});
  custom=store.get('kor.custom',[]);
  for(let i=W.length-1;i>=0;i--)if(W[i].lv===0)W.splice(i,1);
  custom.forEach(c=>W.push(mkCustom(c)));
  refreshLessonsBtn();
}
async function exportBackup(){
  try{localStorage.setItem('kor.backupAt',String(Date.now()))}catch(e){}
  const data=JSON.stringify(localState(),null,1),filename='korean-progress-'+today()+'.json';
  if(window.claude&&typeof window.claude.use==='function'){
    try{const dl=await window.claude.use('downloads');if(dl){await dl.save({filename,data});return}}catch(e){return}
  }
  const blob=new Blob([data],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
function importBackup(file){
  const r=new FileReader();
  r.onload=()=>{try{const st=JSON.parse(r.result);if(typeof st!=='object'||!st)throw 0;applyState(mergeState(localState(),{...st,updatedAt:Date.now()}));markDirty();toast('Прогресс восстановлен из файла');home()}catch(e){toast('Это не файл резервной копии')}};
  r.readAsText(file);
}
document.getElementById('exportBtn').onclick=exportBackup;
document.getElementById('importFile').onchange=e=>{const f=e.target.files[0];if(f)importBackup(f);e.target.value=''};

refreshLessonsBtn();
setTab(tab);
if(navigator.storage&&navigator.storage.persist)navigator.storage.persisted().then(p=>{if(!p)document.addEventListener('pointerdown',()=>navigator.storage.persist().catch(()=>{}),{once:true})}).catch(()=>{});
