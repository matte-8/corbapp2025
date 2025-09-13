// ===== chiavi di storage =====
const KEYS = {
  players:  'corb_players',
  news:     'corb_news',
  video:    'corb_video',
  matches:  'corb_matches',
  calendar: 'corb_calendar',
  last:     'corb_last',
  lastTs:   'corb_last_ts'
};

export const get     = (k) => { try { return JSON.parse(localStorage.getItem(KEYS[k]) || '[]'); } catch { return []; } };
export const set     = (k,v) => localStorage.setItem(KEYS[k], JSON.stringify(v || []));
export const last    = ()    => localStorage.getItem(KEYS.last) || 'never';
export const setLast = (t)   => localStorage.setItem(KEYS.last, t);
export const clearAll= ()    => Object.values(KEYS).forEach(k => localStorage.removeItem(k));

// ====== AUTO-HYDRATE da Google Sheets ======
// IMPORTANTISSIMO: il foglio deve essere “Pubblicato sul web”.
const SHEET_ID = '143tbH2ZfTHk9bsgL1T7s6PQcSkR-HrCepz0GS--Go8I'; // <-- il tuo

// Legge una tab per nome usando l’endpoint gviz (restituisce JSONP).
async function fetchSheetByName(sheetName){
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const text = await fetch(url, {cache:'no-store'}).then(r=>r.text());
  // Estrae il JSON dalla risposta JSONP
  const m = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);?$/);
  if (!m) throw new Error('Formato Google gviz inatteso');
  const json = JSON.parse(m[1]);
  const headers = (json.table.cols||[]).map(c => (c.label||'').toLowerCase());
  const rows = (json.table.rows||[]).map(r => (r.c||[]).map(c => c ? c.v : ''));
  return rows.map(row => Object.fromEntries(row.map((v,i)=>[headers[i]||`col${i}`, v])));
}

// Converte valori “furbi” dove servono (opzionale, ma comodo)
function normalizeData({news, players, video, matches, calendar}){
  // Esempi minimi di normalizzazione (puoi espandere)
  (matches||[]).forEach(m=>{
    if (m.data && /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(m.data)) {
      const [dd,mm,yy] = m.data.split('/');
      m.data = `${yy.length===2?('20'+yy):yy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
    }
  });
  return {news, players, video, matches, calendar};
}

/**
 * Scarica i dati se:
 * - non ci sono dati in cache, oppure
 * - l’ultima sync è più vecchia di maxAgeMin (default 60 minuti)
 */
export async function ensureFresh(maxAgeMin=60){
  const lastTs = Number(localStorage.getItem(KEYS.lastTs) || 0);
  const isFresh = (Date.now() - lastTs) < maxAgeMin*60*1000;

  const hasAny =
    get('news').length || get('players').length || get('video').length ||
    get('matches').length || get('calendar').length;

  if (isFresh && hasAny) return; // niente da fare

  try{
    const [news, players, video, matches, calendar] = await Promise.all([
      fetchSheetByName('news'),
      fetchSheetByName('giocatori'),
      fetchSheetByName('video'),
      fetchSheetByName('partite'),
      fetchSheetByName('calendario'),
    ]);

    const data = normalizeData({news, players, video, matches, calendar});

    set('news',     data.news);
    set('players',  data.players);
    set('video',    data.video);
    set('matches',  data.matches);
    set('calendar', data.calendar);

    const stamp = new Date().toISOString().replace('T',' ').slice(0,19);
    setLast(stamp);
    localStorage.setItem(KEYS.lastTs, String(Date.now()));
    console.log('[hydrate] dati aggiornati dai Google Sheet');
  }catch(err){
    console.error('[hydrate] errore nel fetch dai Google Sheet:', err);
    // Non interrompere l’app; userà ciò che c’è in cache (se c’è)
  }
}
