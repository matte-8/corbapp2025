// data-store.js  — versione anti-cache + mapping GID
// Usa Google Sheets CSV pubblico. Salva i dati in localStorage.
// Chiama refreshAll() dall'admin per aggiornare manualmente.

const LS_KEY = 'corb_datastore_v2';     // bump per invalidare vecchie cache
const TS_KEY = 'corb_datastore_ts_v2';

let SHEET_ID = '143tbH2ZfTHk9bsgL1T7s6PQcSkR-HrCepz0GS--Go8I'; // <-- il tuo

// Mappa dei tab -> gid (prendi i gid dall’URL quando sei su quel tab)
const TABS = {
  news:        1408482393, // A: titolo | B: contenuto | C: img | D: nuova | (opzionale: categoria, thumb)
  giocatori:    706688113, // A: nome | B: numero | C: ruolo | D: foto
  partite:     1730522931, // A: data | B: ora | C: casa | D: logo_casa | E: fuori | F: logo_avv | G: risultato | H: mvp
  calendario:   787175543, // A: data | B: avversario | C: casa_fuori
  video:       1118175028  // A: nome | B: logo | C: link
};

// ------- utilità -------

function csvToObjects(text) {
  // parser semplice (gestisce virgole base e newline). Se hai campi con virgole tra doppi apici, evitare di usarle.
  const rows = text.trim().split(/\r?\n/);
  const headers = rows.shift().split(',').map(h => h.trim());
  return rows.map(r => {
    const cols = r.split(',').map(c => c.trim());
    const o = {};
    headers.forEach((h, i) => { o[h] = cols[i] ?? ''; });
    return o;
  });
}

async function fetchCsv(gid) {
  // CSV pubblico + cache-buster per evitare cache aggressive
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}&cachebust=${Date.now()}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return csvToObjects(text);
}

function saveAll(obj) {
  localStorage.setItem(LS_KEY, JSON.stringify(obj));
  localStorage.setItem(TS_KEY, new Date().toISOString());
}

function loadAllFromLS() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ------- API pubblico per le pagine -------

export function get(section) {
  const all = loadAllFromLS();
  return all[section] || [];
}

export function getTimestamp() {
  return localStorage.getItem(TS_KEY) || '';
}

export function setSheetId(newId) {
  if (newId && newId !== SHEET_ID) {
    SHEET_ID = newId;
  }
}

// Aggiorna TUTTO leggendo i tab; da usare nel pulsante "Aggiorna"
export async function refreshAll(onProgress) {
  const result = {};
  const entries = Object.entries(TABS);
  let done = 0;

  for (const [name, gid] of entries) {
    try {
      const rows = await fetchCsv(gid);
      // Piccole normalizzazioni utili per le pagine
      result[name] = rows.map(r => {
        const o = { ...r };
        // normalizza date in ISO se possibile (per partite/calendario)
        if (o.data) {
          const m = o.data.match(/^(\d{4}-\d{2}-\d{2})/); // già ISO
          if (!m) {
            // supporta anche 10/05/2024 ecc.
            const mm = o.data.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
            if (mm) {
              const dd = String(mm[1]).padStart(2,'0');
              const mo = String(mm[2]).padStart(2,'0');
              const yy = (mm[3].length===2 ? '20'+mm[3] : mm[3]);
              o.data = `${yy}-${mo}-${dd}`;
            }
          }
        }
        return o;
      });
    } catch (e) {
      console.error('Errore tab', name, e);
      result[name] = []; // non bloccare
    }
    done++;
    if (typeof onProgress === 'function') onProgress(done / entries.length);
  }

  saveAll(result);
  return result;
}
