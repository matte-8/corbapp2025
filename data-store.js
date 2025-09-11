// data-store.js
const SHEET_ID = '143tbH2ZfTHk9bsgL1T7s6PQcSkR-HrCepz0GS--Go8I';

const SHEETS = {
  news:        { gid: '1408482393', cols: ['titolo','contenuto','img','nuova'] },
  giocatori:   { gid: '706688113',  cols: ['nome','numero','ruolo','foto'] },
  matches:     { gid: '173052931',  cols: ['data','ora','casa','logocasa','fuori','logoavv','risultato','mvp'] },
  calendario:  { gid: '787175543',  cols: ['data','avversario','casa_fuori'] },
  video:       { gid: '1118175028', cols: ['nome','logo','link'] }, // <-- nuovo tab "video"
};

const CSV = (gid) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}&_=${Date.now()}`;

// parse CSV minimale
function parseCSV(text){
  const rows = text.split(/\r?\n/).filter(r=>r.trim()!=='');
  const head = rows.shift().split(',').map(h=>h.trim());
  return rows.map(r=>{
    const cells = [];
    let cur = '', inQ = false;
    for (let i=0;i<r.length;i++){
      const ch = r[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ){ cells.push(cur); cur=''; continue; }
      cur += ch;
    }
    cells.push(cur);
    const obj = {};
    head.forEach((h, i) => obj[h] = (cells[i]||'').trim());
    return obj;
  });
}

// scarica tutti i tab e restituisce un oggetto {news, giocatori, ...}
export async function fetchAllFromSheets(){
  const out = {};
  for (const [key, conf] of Object.entries(SHEETS)){
    const res = await fetch(CSV(conf.gid), { cache: 'no-store' });
    const txt = await res.text();
    const raw = parseCSV(txt);
    // normalizza alle colonne attese
    out[key] = raw.map(r=>{
      const o = {};
      conf.cols.forEach(c => o[c] = r[c] ?? '');
      return o;
    });
  }
  return out;
}

// salva su localStorage e (se disponibile) anche su file data.json via Admin
export function setAll(data){
  localStorage.setItem('corb:data', JSON.stringify(data));
  localStorage.setItem('corb:last', new Date().toISOString());
}

export function getAll(){
  try { return JSON.parse(localStorage.getItem('corb:data')||'{}'); }
  catch(_){ return {}; }
}

export function get(key){ return getAll()[key] || []; }
export function lastUpdated(){
  return localStorage.getItem('corb:last') || 'never';
}
