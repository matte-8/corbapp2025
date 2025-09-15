// data-store.js
// Cache chiave unica
const KEYS = {
  players:  'corb_players',
  news:     'corb_news',
  video:    'corb_video',
  matches:  'corb_matches',
  calendar: 'corb_calendar',
  last:     'corb_last',
  cfg:      'corb_cfg',
  lastSync: 'corb_last_sync'
};

// Default config: il tuo Sheet e i GID
const DFLT_CFG = {
  sheetId:     '143tbH2ZfTHk9bsgL1T7s6PQcSkR-HrCepz0GS--Go8I',
  gid_matches: '1730522931',
  gid_calendar:'787175543',
  gid_news:    '1408482393',
  gid_players: '706688113',
  gid_videos:  '1118175028'
};

// ---- API storage semplice ----
export const get = (k) => {
  try { return JSON.parse(localStorage.getItem(KEYS[k]) || '[]'); }
  catch { return []; }
};
export const set = (k, v) => localStorage.setItem(KEYS[k], JSON.stringify(v || []));
export const last = () => localStorage.getItem(KEYS.last) || 'never';
export const setLast = (t) => localStorage.setItem(KEYS.last, t);
export const clearAll = () => Object.values(KEYS).forEach(k => localStorage.removeItem(k));

// ---- Config ----
export function loadCfg(){
  try {
    const saved = localStorage.getItem(KEYS.cfg);
    return saved ? {...DFLT_CFG, ...JSON.parse(saved)} : {...DFLT_CFG};
  } catch {
    return {...DFLT_CFG};
  }
}
export function saveCfg(cfg){
  localStorage.setItem(KEYS.cfg, JSON.stringify(cfg||{}));
}

// ---- Utility CSV ----
function parseCSV(text){
  const rows = [];
  let i=0, field='', row=[], inq=false;
  const pushField = () => { row.push(field); field=''; };
  const pushRow   = () => { rows.push(row); row=[]; };
  while (i < text.length){
    const c = text[i];
    if (inq){
      if (c === '"'){ if (text[i+1] === '"'){ field += '"'; i++; } else { inq = false; } }
      else { field += c; }
    } else {
      if (c === '"'){ inq = true; }
      else if (c === ','){ pushField(); }
      else if (c === '\n'){ pushField(); pushRow(); }
      else if (c === '\r'){ /* skip */ }
      else { field += c; }
    }
    i++;
  }
  if (field.length || row.length){ pushField(); pushRow(); }
  const [hdr, ...data] = rows.filter(r => r.length && r.join('').trim().length);
  if (!hdr) return [];
  const keys = hdr.map(h => h.trim().toLowerCase());
  return data.map(r => {
    const obj = {};
    for (let k=0;k<keys.length;k++){ obj[keys[k]] = (r[k] ?? '').toString().trim(); }
    return obj;
  });
}

function csvURL(sheetId, gid){
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

async function fetchCSV(url, msTimeout=12000){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), msTimeout);
  try{
    const res = await fetch(url, {cache:'no-store', signal:ctrl.signal});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseCSV(await res.text());
  } finally {
    clearTimeout(t);
  }
}

// ---- AUTO LOAD (chiama Google Sheet se non ci sono ancora dati) ----
export async function autoLoad(force=false){
  // Se i dati ci sono già e non forzi, esci rapido
  if (!force) {
    const hasAny =
      get('matches').length ||
      get('calendar').length ||
      get('news').length ||
      get('giocatori').length ||
      get('video').length;
    if (hasAny) return;
  }

  const cfg = loadCfg();
  const write = (key, data) => set(key, data);

  // partite
  try {
    write('matches', await fetchCSV(csvURL(cfg.sheetId, cfg.gid_matches)));
  } catch {}
  // calendario
  try {
    write('calendar', await fetchCSV(csvURL(cfg.sheetId, cfg.gid_calendar)));
  } catch {}
  // news
  try {
    write('news', await fetchCSV(csvURL(cfg.sheetId, cfg.gid_news)));
  } catch {}
  // giocatori
  try {
    write('giocatori', await fetchCSV(csvURL(cfg.sheetId, cfg.gid_players)));
  } catch {}
  // video
  try {
    write('video', await fetchCSV(csvURL(cfg.sheetId, cfg.gid_videos)));
  } catch {}

  const ts = new Date().toISOString();
  setLast(new Date(ts).toLocaleString());
  localStorage.setItem(KEYS.lastSync, ts);

  // prova a notificare le altre tab
  try{
    const bc = new BroadcastChannel('corb-sync');
    bc.postMessage({type:'data-updated', at: ts});
    bc.close();
  }catch{}
}
