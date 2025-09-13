// ===== Helpers per localStorage =====
const safeGetJSON = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch { return fallback; }
};
const safeSetJSON = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};
const safeGet = (k, fallback) => {
  try { return localStorage.getItem(k) ?? fallback; }
  catch { return fallback; }
};
const safeSet = (k, v) => {
  try { localStorage.setItem(k, v); } catch {}
};

// ===== Config base =====
// Questi valori vengono aggiornati da admin.html se cambi Sheet
const CFG_KEY = 'corb_cfg';
const LAST_KEY = 'lastSync';

const DFLT = {
  sheetId: '143tbH2ZfTHk9bsgL1T7s6PQcSkR-HrCepz0GS--Go8I',
  gid_matches:  '1730522931',
  gid_calendar: '787175543',
  gid_news:     '1408482393',
  gid_players:  '706688113',
  gid_videos:   '1118175028'
};

function loadCfg(){
  try {
    return {...DFLT, ...JSON.parse(localStorage.getItem(CFG_KEY)||'{}')};
  } catch {
    return {...DFLT};
  }
}

function csvURL(sheetId, gid){
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

// ===== CSV parser semplice =====
function parseCSV(txt){
  const rows = txt.split(/\r?\n/).map(r => r.split(','));
  if (!rows.length) return [];
  const [hdr, ...data] = rows;
  const keys = hdr.map(h=>h.trim().toLowerCase());
  return data.filter(r => r.join('').trim().length).map(r=>{
    const obj={};
    keys.forEach((k,i)=> obj[k] = (r[i]||'').trim());
    return obj;
  });
}

// ===== API pubbliche =====
export function get(key){ return safeGetJSON(key, []); }
export function last(){
  const ts = safeGet(LAST_KEY, null);
  return ts ? new Date(ts).toLocaleString() : 'never';
}

// ===== autoLoad =====
export async function autoLoad(force=false){
  // se già in cache e non forzato → esci
  if (!force && safeGet(LAST_KEY, null)) return;

  const cfg = loadCfg();
  const fetchCSV = async (gid) => {
    if (!gid) return [];
    const url = csvURL(cfg.sheetId, gid);
    const res = await fetch(url, {cache:'no-store'});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseCSV(await res.text());
  };

  try {
    const matches   = await fetchCSV(cfg.gid_matches);
    const calendar  = await fetchCSV(cfg.gid_calendar);
    const news      = await fetchCSV(cfg.gid_news);
    const giocatori = await fetchCSV(cfg.gid_players);
    const video     = await fetchCSV(cfg.gid_videos);

    if (matches)   safeSetJSON('matches', matches);
    if (calendar)  safeSetJSON('calendar', calendar);
    if (news)      safeSetJSON('news', news);
    if (giocatori) safeSetJSON('giocatori', giocatori);
    if (video)     safeSetJSON('video', video);

    const ts = new Date().toISOString();
    safeSet(LAST_KEY, ts);

    console.log('✅ autoLoad completato', {matches, news, giocatori, video});
  } catch(err){
    console.error('❌ Errore autoLoad', err);
  }
}
