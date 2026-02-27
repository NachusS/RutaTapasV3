const LS_PROFILE = 'rt_profile';

function safeJSONParse(str){
  try{ return JSON.parse(str); }catch{ return null; }
}

function deriveHandle(name){
  const n = String(name || '').trim();
  if(!n) return '';
  // Caso especial para el usuario demo del diseño
  if(n.toLowerCase() === 'nacho') return 'NachusS';
  // Handle simple: sin espacios
  return n.replace(/\s+/g, '');
}

export function ensureProfile(createIfMissing=true){
  const raw = localStorage.getItem(LS_PROFILE);
  const data = raw ? safeJSONParse(raw) : null;
  if(data && data.name){
    if(!data.handle){
      data.handle = deriveHandle(data.name);
      try{ saveProfile(data); }catch{}
    }
    return data;
  }
  if(!createIfMissing) return null;
  const blank = { name:'', handle:'', avatar:'', photoDataUrl:'' };
  localStorage.setItem(LS_PROFILE, JSON.stringify(blank));
  return blank;
}

function saveProfile(p){
  localStorage.setItem(LS_PROFILE, JSON.stringify(p));
}

function makeEl(tag, cls, text){
  const el = document.createElement(tag);
  if(cls) el.className = cls;
  if(typeof text === 'string') el.textContent = text;
  return el;
}

function readFileAsDataURL(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=> resolve(String(r.result || ''));
    r.onerror = ()=> reject(new Error('No se pudo leer la imagen.'));
    r.readAsDataURL(file);
  });
}

function assetUrl(p){
  try{ return new URL(p, document.baseURI).toString(); }catch{ return p; }
}

export function renderWelcome(root){
  root.replaceChildren();

  const screen = makeEl('div','welcome-screen','');
  const container = makeEl('div','container','');
  screen.appendChild(container);

  // Toggle modo noche/día (persistido en localStorage por app.js)
  const themeBtn = document.createElement('button');
  themeBtn.type = 'button';
  themeBtn.className = 'theme-toggle';
  themeBtn.setAttribute('aria-label','Cambiar modo noche/día');
  function syncThemeIcon(){
    themeBtn.textContent = document.body.classList.contains('theme-dark') ? '☀️' : '🌙';
  }
  syncThemeIcon();
  themeBtn.addEventListener('click',(e)=>{
    e.preventDefault();
    if(window.RT_THEME_TOGGLE) window.RT_THEME_TOGGLE();
    syncThemeIcon();
  });
  screen.appendChild(themeBtn);

  const prof = ensureProfile(false);

  if(!prof || !prof.name){
    // ===== Pantalla 1: crear perfil =====
    const head = makeEl('div','welcome-head','');
    const h1 = makeEl('h1','welcome-head__title','');
    h1.appendChild(document.createTextNode('CREA TU'));
    h1.appendChild(document.createElement('br'));
    h1.appendChild(document.createTextNode('AVATAR'));
    head.appendChild(h1);
    head.appendChild(makeEl('div','welcome-head__underline',''));
    container.appendChild(head);

    const form = document.createElement('form');
    form.noValidate = true;

    // Avatar grande (foto o avatar)
    const orbit = makeEl('div','avatar-orbit','');

    const avatarLabel = document.createElement('label');
    avatarLabel.className = 'avatar-frame';
    avatarLabel.setAttribute('for','inpPhoto');
    avatarLabel.setAttribute('aria-label','Subir foto de perfil');

    const preview = document.createElement('img');
    preview.alt = 'Vista previa del avatar';

    const inpPhoto = document.createElement('input');
    inpPhoto.type = 'file';
    inpPhoto.accept = 'image/*';
    inpPhoto.id = 'inpPhoto';
    inpPhoto.className = 'hidden';

    const avatarOverlay = makeEl('div','avatar-overlay','📷');
    avatarOverlay.setAttribute('aria-hidden','true');

    const bubble = makeEl('div','avatar-bubble','🍽️');
    bubble.setAttribute('aria-hidden','true');

    avatarLabel.appendChild(preview);
    avatarLabel.appendChild(avatarOverlay);

    orbit.appendChild(avatarLabel);
    orbit.appendChild(inpPhoto);
    orbit.appendChild(bubble);

    container.appendChild(orbit);

    const avatarFiles = [
      'assets/avatars/avatar-oliva.svg',
      'assets/avatars/avatar-croqueta.svg',
      'assets/avatars/avatar-birra.svg',
      'assets/avatars/avatar-vino.svg',
      'assets/avatars/avatar-flamenco.svg',
      'assets/avatars/avatar-taco.svg',
      'assets/avatars/avatar-01.svg'
    ];

    let selectedAvatar = avatarFiles[0];
    let chosenPhotoDataUrl = '';

    function setPreview(src){
      preview.src = assetUrl(src);
    }
    setPreview(selectedAvatar);

    const strip = makeEl('div','avatar-strip','');

    function selectAvatar(path){
      selectedAvatar = path;
      strip.querySelectorAll('button').forEach(b=>{
        b.classList.toggle('is-selected', b.getAttribute('data-src') === path);
      });
      if(!chosenPhotoDataUrl){
        setPreview(path);
      }
    }

    avatarFiles.forEach((src, idx)=>{
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'avatar-chip' + (idx === 0 ? ' is-selected' : '');
      b.setAttribute('data-src', src);
      b.setAttribute('aria-label', 'Seleccionar avatar ' + (idx+1));
      const img = document.createElement('img');
      img.alt = 'Avatar ' + (idx+1);
      img.src = assetUrl(src);
      b.appendChild(img);
      b.addEventListener('click', (e)=>{ e.preventDefault(); selectAvatar(src); });
      strip.appendChild(b);
    });

    // Chip extra para abrir selector de foto
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'avatar-chip';
    add.setAttribute('aria-label','Subir foto');
    add.textContent = '+';
    add.addEventListener('click',(e)=>{ e.preventDefault(); inpPhoto.click(); });
    strip.appendChild(add);

    container.appendChild(strip);

    inpPhoto.addEventListener('change', async ()=>{
      const f = inpPhoto.files && inpPhoto.files[0] ? inpPhoto.files[0] : null;
      if(!f) return;
      try{
        chosenPhotoDataUrl = await readFileAsDataURL(f);
        setPreview(chosenPhotoDataUrl);
        if(window.RT_TOAST) window.RT_TOAST('Foto lista');
      }catch{
        chosenPhotoDataUrl = '';
        if(window.RT_TOAST) window.RT_TOAST('No se pudo cargar la foto');
      }
    });

    // Nombre
    const field = makeEl('div','field','');
    const lab = makeEl('label','label','TU NOMBRE DE GUERRERO');
    lab.setAttribute('for','inpName');

    const iconWrap = makeEl('div','input-icon','');
    const left = makeEl('div','input-icon__left','⚔️');
    left.setAttribute('aria-hidden','true');
    const right = makeEl('div','input-icon__right','✏️');
    right.setAttribute('aria-hidden','true');

    const inpName = document.createElement('input');
    inpName.className = 'input iconed';
    inpName.id = 'inpName';
    inpName.type = 'text';
    inpName.placeholder = 'Guerrero Tapeador';

    iconWrap.appendChild(left);
    iconWrap.appendChild(inpName);
    iconWrap.appendChild(right);

    field.appendChild(lab);
    field.appendChild(iconWrap);

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn btn-primary btn-big';
    submit.appendChild(makeEl('span','', '¡ESTOY LISTO!'));
    submit.appendChild(makeEl('span','', '✅'));

    form.appendChild(field);
    form.appendChild(submit);

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = inpName.value.trim();
      if(!name){
        if(window.RT_TOAST) window.RT_TOAST('Escribe tu nombre para continuar.');
        inpName.focus();
        return;
      }
      const next = { name, handle: deriveHandle(name), avatar: selectedAvatar, photoDataUrl: chosenPhotoDataUrl };
      saveProfile(next);
      if(window.RT_TOAST) window.RT_TOAST('Perfil creado');
      // Primera vez: tras crear perfil, ir a selección de rutas.
      // En los siguientes accesos (cuando el perfil ya exista), se mostrará la pantalla 1-1.
      window.setTimeout(()=>{
        window.location.hash = '#/seleccionar';
      }, 250);
    });

    container.appendChild(form);
    root.appendChild(screen);
    return;
  }

  // ===== Pantalla 1-1: usuario existente =====
  const head = makeEl('div','welcome-head','');
  const title = makeEl('h1','welcome-head__title','RUTATAPAS V3.0');
  head.appendChild(title);
  const handle = makeEl('div','welcome-handle','@NachusS');
  head.appendChild(handle);
  container.appendChild(head);

  // Nivel / XP desde el progreso guardado
  const stats = (function(){
    try{
      let stops=0, rated=0, routes=0, favs=0;
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i) || '';
        if(k.startsWith('rt_progress_')){
          const obj = safeJSONParse(localStorage.getItem(k) || '') || {};
          const done = Array.isArray(obj.completedStopIds) ? obj.completedStopIds.length : 0;
          const skipped = Array.isArray(obj.skippedStopIds) ? obj.skippedStopIds.length : 0;
          stops += done + skipped;
          routes += (obj.finishedAt ? 1 : 0);
          rated += Object.values(obj.stopRatings || {}).map(n=>Number(n||0)).filter(n=>n>0).length;
        }
        if(k.startsWith('rt_favorites_')){
          const obj = safeJSONParse(localStorage.getItem(k) || '') || {};
          favs += Object.values(obj).filter(Boolean).length;
        }
      }
      const points = (stops*10) + (routes*50) + (favs*5) + (rated*2);
      const level = Math.max(1, Math.floor(points/250) + 1);
      const nextAt = level * 250;
      const pct = nextAt ? Math.min(100, Math.round((points/nextAt)*100)) : 0;
      return { level, points, nextAt, pct };
    }catch{ return { level: 1, points: 0, nextAt: 250, pct: 0 }; }
  })();

  const avatarWrap = makeEl('div','welcome-avatar2','');
  const inner = makeEl('div','welcome-avatar2__inner','');
  const img = document.createElement('img');
  img.alt = 'Foto de perfil';
  img.src = prof.photoDataUrl ? prof.photoDataUrl : assetUrl(prof.avatar || 'assets/avatars/avatar-01.svg');
  inner.appendChild(img);
  avatarWrap.appendChild(inner);
  avatarWrap.appendChild(makeEl('div','welcome-level', String(stats.level)));
  container.appendChild(avatarWrap);

  const xpWrap = makeEl('div','progress-wrap','');
  const bar = makeEl('div','progressbar','');
  const fill = document.createElement('div');
  fill.style.width = stats.pct + '%';
  bar.appendChild(fill);
  xpWrap.appendChild(bar);
  const xpTxt = makeEl('div','small','XP ' + stats.points + '/' + stats.nextAt);
  xpTxt.style.textAlign = 'center';
  xpTxt.style.marginTop = '.6rem';
  xpWrap.appendChild(xpTxt);
  container.appendChild(xpWrap);

  const badges = makeEl('div','welcome-badges','');
  badges.appendChild(makeEl('div','welcome-badge welcome-badge--yellow','🏅'));
  badges.appendChild(makeEl('div','welcome-badge welcome-badge--blue','🛡️'));
  badges.appendChild(makeEl('div','welcome-badge welcome-badge--orange','⭐'));
  container.appendChild(badges);

  const hello = makeEl('h2','h2','¡Hola de nuevo, ' + prof.name + '!');
  hello.style.textAlign = 'center';
  const sub = makeEl('p','p','tus tapas te están esperando.');
  sub.style.textAlign = 'center';

  container.appendChild(hello);
  container.appendChild(sub);

  function getResumeRouteId(){
    try{
      const active = localStorage.getItem('rt_active_route_id');
      if(active){
        const raw = localStorage.getItem('rt_progress_' + active);
        const obj = raw ? safeJSONParse(raw) : null;
        if(obj && obj.startedAt && !obj.finishedAt) return active;
      }

      // Buscar cualquier ruta en curso (startedAt y sin finishedAt)
      let bestId = null;
      let bestT = 0;
      for(let i=0;i<localStorage.length;i++){
        const k = localStorage.key(i) || '';
        if(!k.startsWith('rt_progress_')) continue;
        const rid = k.slice('rt_progress_'.length);
        const obj = safeJSONParse(localStorage.getItem(k) || '') || {};
        const t = Number(obj.startedAt || 0);
        if(t && !obj.finishedAt && t > bestT){
          bestT = t;
          bestId = rid;
        }
      }
      if(bestId) return bestId;

      const last = localStorage.getItem('rt_last_route_id');
      return last || null;
    }catch(_e){
      return localStorage.getItem('rt_last_route_id') || null;
    }
  }

  const resumeId = getResumeRouteId();

  const btn = makeEl('a','btn btn-primary btn-big','');
  btn.href = resumeId ? ('#/ruta?r=' + encodeURIComponent(resumeId)) : '#/seleccionar';
  btn.appendChild(makeEl('span','', 'Continuar mi Ruta'));
  btn.appendChild(makeEl('span','', '🧭'));
  container.appendChild(btn);

  const change = makeEl('div','small','');
  change.style.textAlign = 'center';
  // Separación respecto al botón principal (dos líneas aprox.)
  change.style.marginTop = '2.4rem';
  const link = document.createElement('a');
  link.href = '#/welcome';
  link.textContent = 'Cambiar cuenta';
  link.style.color = 'var(--primary)';
  link.style.textDecoration = 'underline';
  link.style.textUnderlineOffset = '.4rem';
  link.addEventListener('click', (e)=>{
    e.preventDefault();
    localStorage.removeItem('rt_profile');
    if(window.RT_TOAST) window.RT_TOAST('Cuenta eliminada');
    window.location.hash = '#/welcome';
  });
  change.appendChild(document.createTextNode('¿No eres tú? '));
  change.appendChild(link);
  container.appendChild(change);

  root.appendChild(screen);
}


export function renderProfile(root){
  root.replaceChildren();
  const container = makeEl('div','container','');
  const prof = ensureProfile(true);

  const card = makeEl('section','card pad','');
  card.appendChild(makeEl('h1','h1','Editar perfil'));

  const row = makeEl('div','row','');
  const img = document.createElement('img');
  img.className = 'stop-photo';
  img.style.height = '18rem';
  img.alt = 'Foto de perfil';
  img.src = prof.photoDataUrl ? prof.photoDataUrl : assetUrl(prof.avatar || 'assets/avatars/avatar-01.svg');
  row.appendChild(img);
  card.appendChild(row);

  const form = document.createElement('form');
  form.noValidate = true;

  const field = makeEl('div','field','');
  const lab = makeEl('label','label','Nombre');
  lab.setAttribute('for','inpName2');
  const inp = document.createElement('input');
  inp.id = 'inpName2';
  inp.className = 'input';
  inp.type = 'text';
  inp.value = prof.name || '';
  field.appendChild(lab);
  field.appendChild(inp);

  const inpPhoto = document.createElement('input');
  inpPhoto.type = 'file';
  inpPhoto.accept = 'image/*';
  inpPhoto.className = 'hidden';
  inpPhoto.id = 'inpPhoto2';

  const btnPhoto = makeEl('label','btn','Cambiar foto');
  btnPhoto.setAttribute('for','inpPhoto2');

  inpPhoto.addEventListener('change', async ()=>{
    const f = inpPhoto.files && inpPhoto.files[0] ? inpPhoto.files[0] : null;
    if(!f) return;
    try{
      prof.photoDataUrl = await readFileAsDataURL(f);
      saveProfile(prof);
      img.src = prof.photoDataUrl;
      if(window.RT_TOAST) window.RT_TOAST('Foto actualizada.');
    }catch{
      if(window.RT_TOAST) window.RT_TOAST('No se pudo cargar la foto.');
    }
  });

  const btnSave = makeEl('button','btn btn-primary','Guardar');
  btnSave.type = 'submit';

  const btnBack = makeEl('a','btn btn-ghost','Volver');
  btnBack.href = '#/mi-perfil';

  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    const name = inp.value.trim();
    if(!name){
      if(window.RT_TOAST) window.RT_TOAST('Por favor, escribe tu nombre.');
      inp.focus();
      return;
    }
    prof.name = name;
    saveProfile(prof);
    if(window.RT_TOAST) window.RT_TOAST('Perfil guardado.');
    window.location.hash = '#/mi-perfil';
  });

  const actions = makeEl('div','row spread','');
  actions.appendChild(btnBack);
  actions.appendChild(btnPhoto);
  actions.appendChild(btnSave);

  form.appendChild(field);
  form.appendChild(inpPhoto);
  form.appendChild(actions);

  card.appendChild(form);
  container.appendChild(card);
  root.appendChild(container);
}
