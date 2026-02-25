function makeEl(tag, cls, text){
  const el = document.createElement(tag);
  if(cls) el.className = cls;
  if(typeof text === 'string') el.textContent = text;
  return el;
}

function safeJSONParse(str){
  try { return JSON.parse(str); } catch { return null; }
}

function getProfile(){
  const raw = localStorage.getItem('rt_profile');
  const p = raw ? safeJSONParse(raw) : null;
  if(p && p.name) return p;
  return null;
}

function getProgress(routeId){
  const raw = localStorage.getItem('rt_progress_' + routeId);
  const obj = raw ? safeJSONParse(raw) : null;
  if(obj && typeof obj === 'object') return obj;
  return { startedAt:null, finishedAt:null, completedStopIds:[], stopRatings:{}, routeRating:0 };
}

function getFavorites(routeId){
  const raw = localStorage.getItem('rt_favorites_' + routeId);
  const obj = raw ? safeJSONParse(raw) : null;
  if(obj && typeof obj === 'object') return obj;
  return {};
}

function countFavs(favsObj){
  return Object.values(favsObj || {}).filter(Boolean).length;
}

function avgRatingFromProgress(prog){
  const vals = Object.values(prog.stopRatings || {}).map(n => Number(n || 0)).filter(n => n > 0);
  if(vals.length === 0) return 0;
  const sum = vals.reduce((a,b)=>a+b,0);
  return Math.round((sum/vals.length) * 10) / 10;
}

function getExplorerTier(metrics){
  const r = metrics.routesCompleted;
  const s = metrics.stopsCompleted;
  if(r >= 10) return { tier: 'Leyenda', emoji: '👑', phrase: 'Has hecho historia en las barras. ¡A por la siguiente ciudad!' };
  if(r >= 5) return { tier: 'Maestro explorador', emoji: '🏆', phrase: 'Dominas el mapa. Hoy toca descubrir un clásico oculto.' };
  if(r >= 3) return { tier: 'Explorador experto', emoji: '🧭', phrase: 'Vas en serio. Marca favoritos y sube tu media de estrellas.' };
  if(r >= 1 || s >= 10) return { tier: 'Explorador', emoji: '🗺️', phrase: 'Buen ritmo: una parada más y la ruta cambia de nivel.' };
  return { tier: 'Aprendiz', emoji: '✨', phrase: 'Empieza tu aventura: elige una ruta y deja que el tapeo te guíe.' };
}

function clamp(n, a, b){
  const x = Number(n || 0);
  return Math.max(a, Math.min(b, x));
}

function buildMiniProgress(current, target){
  const pct = target ? Math.round((clamp(current, 0, target) / target) * 100) : 0;
  return { current, target, pct };
}

function metricCard(label, value, icon){
  const box = makeEl('div','metric','');
  const ico = makeEl('div','metric-ico', icon);
  const v = makeEl('div','metric-val', String(value));
  const l = makeEl('div','metric-lab', label);
  box.appendChild(ico); box.appendChild(v); box.appendChild(l);
  return box;
}

function buildLevel(points){
  // Nivel simple por puntos
  // 10 pts por parada, 50 por ruta, 5 por favorito, 2 por valoración
  const level = Math.max(1, Math.floor(points / 250) + 1);
  const nextAt = level * 250;
  const pct = Math.min(100, Math.round((points / nextAt) * 100));
  return { level, nextAt, pct };
}

function badgeCard(opts){
  const { title, icon, unlocked, subline } = opts;
  const card = makeEl('div','ach-card ' + (unlocked ? 'is-on' : 'is-off'), '');
  const ico = makeEl('div','ach-ico','');
  ico.appendChild(makeEl('span','ach-ico__emoji', icon));
  const t = makeEl('div','ach-title', title);
  const s = makeEl('div','ach-sub', subline || (unlocked ? 'Desbloqueado' : 'Bloqueado'));
  card.appendChild(ico);
  card.appendChild(t);
  card.appendChild(s);
  return card;
}

export function renderUserProfile(root, routesIndex){
  root.replaceChildren();

  const container = makeEl('div','container','');
  const headerRow = makeEl('div','row spread profile-actions','');
  const back = makeEl('a','btn btn-ghost','← Volver');
  back.href = '#/ruta';
  const edit = makeEl('a','btn','Editar perfil');
  edit.href = '#/perfil';
  headerRow.appendChild(back);
  headerRow.appendChild(edit);
  container.appendChild(headerRow);

  const prof = getProfile();
  const handle = prof && prof.handle ? String(prof.handle) : '';

  const routes = (routesIndex && routesIndex.routes) ? routesIndex.routes : [];
  let routesCompleted = 0;
  let stopsCompleted = 0;
  let favsTotal = 0;
  let ratedStops = 0;
  let bestAvg = 0;

  routes.forEach(r => {
    const prog = getProgress(r.id);
    stopsCompleted += (prog.completedStopIds || []).length;
    const favs = getFavorites(r.id);
    favsTotal += countFavs(favs);
    const avgStops = avgRatingFromProgress(prog);
    const avgRoute = Number(prog.routeRating || 0);
    const avg = avgRoute > 0 ? avgRoute : avgStops;
    bestAvg = Math.max(bestAvg, avg);
    ratedStops += Object.values(prog.stopRatings || {}).map(n => Number(n||0)).filter(n => n > 0).length;

    if(prog.finishedAt) routesCompleted += 1;
  });

  const points = (stopsCompleted * 10) + (routesCompleted * 50) + (favsTotal * 5) + (ratedStops * 2);
  const lvl = buildLevel(points);

  const tier = getExplorerTier({ routesCompleted, stopsCompleted });

  // ===== Tarjeta hero =====
  const hero = makeEl('section','card pad profile-hero','');
  const heroTitleRow = makeEl('div','profile-hero__top','');
  const heroTitleBox = makeEl('div','profile-hero__titles','');
  heroTitleBox.appendChild(makeEl('div','profile-hero__kicker','TABLERO DEL HÉROE'));
  if(handle){
    const pill = makeEl('div','profile-hero__handle','@' + handle);
    heroTitleBox.appendChild(pill);
  }
  heroTitleRow.appendChild(heroTitleBox);
  const tip = makeEl('div','profile-hero__tip','');
  tip.appendChild(makeEl('span','profile-hero__tip-ico','⚙️'));
  tip.appendChild(makeEl('span','profile-hero__tip-txt','Ajustes'));
  heroTitleRow.appendChild(tip);
  hero.appendChild(heroTitleRow);

  const bubble = makeEl('div','profile-hero__bubble','');
  const avOuter = makeEl('div','profile-hero__avatar','');
  const avatar = document.createElement('img');
  avatar.alt = 'Foto de perfil';
  if(prof && prof.photoDataUrl) avatar.src = prof.photoDataUrl;
  else if(prof && prof.avatar) avatar.src = prof.avatar;
  else avatar.src = 'assets/images/avatares/avatar_01.jpg';
  avOuter.appendChild(avatar);
  const levelBadge = makeEl('div','profile-hero__lvl', String(lvl.level));
  levelBadge.setAttribute('aria-label','Nivel ' + lvl.level);
  bubble.appendChild(avOuter);
  bubble.appendChild(levelBadge);

  const heroName = makeEl('div','profile-hero__name', prof ? prof.name : 'Invitado');
  const heroRole = makeEl('div','profile-hero__role', tier.tier);
  const heroSlogan = makeEl('p','p','' + tier.emoji + ' ' + tier.phrase);
  heroSlogan.classList.add('profile-hero__slogan');

  const xpWrap = makeEl('div','profile-hero__xp','');
  const barWrap = makeEl('div','profile-xpbar','');
  const fill = makeEl('div','profile-xpbar__fill','');
  fill.style.width = lvl.pct + '%';
  const xpText = makeEl('div','profile-xpbar__txt','XP ' + points + '/' + lvl.nextAt);
  barWrap.appendChild(fill);
  barWrap.appendChild(xpText);
  xpWrap.appendChild(barWrap);
  xpWrap.appendChild(makeEl('div','small profile-hero__xpHint','¡' + Math.max(0, (lvl.nextAt - points)) + ' XP para el siguiente nivel!'));

  hero.appendChild(bubble);
  hero.appendChild(heroName);
  hero.appendChild(heroRole);
  hero.appendChild(xpWrap);
  hero.appendChild(heroSlogan);
  container.appendChild(hero);

  // ===== Sección métricas (4) =====
  const metricsCard = makeEl('section','card pad profile-section','');
  const mHead = makeEl('div','row spread','');
  mHead.appendChild(makeEl('h2','h2','Resumen'));
  mHead.appendChild(makeEl('div','small','Tu progreso se guarda aquí'));
  metricsCard.appendChild(mHead);

  const metrics = makeEl('div','metrics-grid','');
  metrics.appendChild(metricCard('Rutas Completadas', routesCompleted, '🗺️'));
  metrics.appendChild(metricCard('Paradas completadas', stopsCompleted, '📍'));
  metrics.appendChild(metricCard('Bares Favoritos', favsTotal, '♥'));
  metrics.appendChild(metricCard('Media de mejor ruta', bestAvg ? (bestAvg + '★') : '—', '⭐'));
  metricsCard.appendChild(metrics);
  container.appendChild(metricsCard);

  // ===== Mis logros =====
  const logros = makeEl('section','card pad profile-section','');
  const lHead = makeEl('div','row spread','');
  lHead.appendChild(makeEl('h2','h2','Mis Logros'));
  const viewAll = makeEl('a','btn btn-ghost','Ver todos');
  viewAll.href = '#/logros';
  lHead.appendChild(viewAll);
  logros.appendChild(lHead);

  // Rutas completas (mini progreso al siguiente hito)
  let nextMilestone = 1;
  if(routesCompleted >= 1) nextMilestone = 3;
  if(routesCompleted >= 3) nextMilestone = 5;
  if(routesCompleted >= 5) nextMilestone = 10;
  if(routesCompleted >= 10) nextMilestone = 10;

  const prog = buildMiniProgress(routesCompleted, nextMilestone);
  const routesBlock = makeEl('div','logros-line','');
  const left = makeEl('div','logros-line__left','');
  left.appendChild(makeEl('div','logros-line__title','Rutas completas'));
  left.appendChild(makeEl('div','small','' + routesCompleted + ' completadas'));
  const right = makeEl('div','logros-line__right','');
  right.appendChild(makeEl('div','badge','Hito: ' + prog.target));
  routesBlock.appendChild(left);
  routesBlock.appendChild(right);

  const mini = makeEl('div','mini-progress','');
  const miniFill = makeEl('div','mini-progress__fill','');
  miniFill.style.width = prog.pct + '%';
  mini.appendChild(miniFill);

  logros.appendChild(routesBlock);
  logros.appendChild(mini);

  // Frase motivadora del tipo alcanzado
  const phrase = makeEl('div','logros-phrase','');
  const phraseIco = makeEl('div','logros-phrase__ico', tier.emoji);
  const phraseTxt = makeEl('div','logros-phrase__txt','');
  phraseTxt.appendChild(makeEl('div','logros-phrase__tier', tier.tier));
  phraseTxt.appendChild(makeEl('div','small', tier.phrase));
  phrase.appendChild(phraseIco);
  phrase.appendChild(phraseTxt);
  logros.appendChild(phrase);

  // Logros principales solicitados
  const achGrid = makeEl('div','ach-grid','');
  const favUnlock = favsTotal >= 3;
  const critUnlock = ratedStops >= 10;
  const legUnlock = routesCompleted >= 10;

  achGrid.appendChild(badgeCard({
    title:'Favoritos',
    icon:'♥',
    unlocked: favUnlock,
    subline: favUnlock ? 'Desbloqueado' : (favsTotal + '/3')
  }));

  achGrid.appendChild(badgeCard({
    title:'Crítico',
    icon:'★',
    unlocked: critUnlock,
    subline: critUnlock ? 'Desbloqueado' : (ratedStops + '/10 valoraciones')
  }));

  achGrid.appendChild(badgeCard({
    title:'Leyenda',
    icon:'👑',
    unlocked: legUnlock,
    subline: legUnlock ? 'Desbloqueado' : (routesCompleted + '/10 rutas')
  }));

  logros.appendChild(achGrid);
  container.appendChild(logros);

  root.appendChild(container);
}
