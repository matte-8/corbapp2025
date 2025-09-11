// data-store.js
const SPREADSHEET_ID = "143tbH2ZfTHk9bsgL1T7s6PQcSkR-HrCepz0GS--Go8I"; // <-- metti il tuo
const SHEETS = {
  news:       { name: "news" },
  giocatori:  { name: "giocatori" },
  partite:    { name: "partite" },
  calendario: { name: "calendario" },
  video:      { name: "video" },
};

const LS_KEY = "corb_cache_v3";
function loadCache(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||"{}"); }catch{return {}} }
function saveCache(obj){ localStorage.setItem(LS_KEY, JSON.stringify(obj)); }
let cache = loadCache();

export function get(key){ return (cache[key]||[]); }
export function lastUpdated(){ return cache._updated || null; }

export async function refreshAll(){
  const out = {};
  for (const k of Object.keys(SHEETS)){
    out[k] = await loadSheetCSV(SHEETS[k].name);
  }
  out._updated = new Date().toISOString();
  cache = out; saveCache(cache);
  return true;
}

async function loadSheetCSV(sheetName){
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  return parseCSV(text);
}

// CSV -> array di oggetti (header dalla prima riga)
function parseCSV(s){
  const rows = [];
  const lines = s.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return rows;
  const hdr = splitCSVLine(lines[0]);
  for (let i=1;i<lines.length;i++){
    const cols = splitCSVLine(lines[i]);
    const obj = {};
    hdr.forEach((h,idx)=> obj[(h||"").trim().toLowerCase()] = (cols[idx]||"").trim());
    rows.push(obj);
  }
  return rows;
}
function splitCSVLine(line){
  const out=[]; let cur=""; let q=false;
  for (let i=0;i<line.length;i++){
    const c=line[i];
    if (c=='"'){ q=!q; continue; }
    if (c==',' && !q){ out.push(cur); cur=""; continue; }
    cur+=c;
  }
  out.push(cur);
  return out;
}
