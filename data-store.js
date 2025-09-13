// ===== Helpers localStorage =====
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

// ===== Config =====
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
  try { return {...DFLT, ...JSON.parse(localStorage.getItem(CFG_KEY)||'{}')}; }
  catch { return {...DFLT}; }
}

function csvURL(sheetId, gid){
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

// ===== parseCSV robusto =====
function parseCSV(text){
  const rows = [];
  let i=0, field='', row=[], inq=false;
  const pushField = () => { row.push(field); field=''; };
  const pushRow   = () => { rows.push(row); row=[]; };

  while (i < text.length){
    const c = text[i];
    if (inq){
      if (c === '"'){
        if (text[i+1] === '"'){ field += '"'; i++; }
        else { inq = false; }
      } else {
        field += c;
      }
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

  return data.map(r=>{
    const obj = {};
    for (let k=0; k<keys.length; k++){
      obj[keys[k]] = (r[k] ?? '').toString().trim();
    }
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
  if (!force && safeGet(LAST_KEY, null)) return; // già in cache

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
