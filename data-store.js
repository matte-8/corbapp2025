// ===== Chiavi di storage =====
const KEYS = {
  players:  'corb_players',
  news:     'corb_news',
  video:    'corb_video',
  matches:  'corb_matches',
  calendar: 'corb_calendar',
  last:     'corb_last'
};

export const get     = (k) => { try { return JSON.parse(localStorage.getItem(KEYS[k]) || '[]'); } catch { return []; } };
export const set     = (k,v) => localStorage.setItem(KEYS[k], JSON.stringify(v || []));
export const last    = ()    => localStorage.getItem(KEYS.last) || 'never';
export const setLast = (t)   => localStorage.setItem(KEYS.last, t);
export const clearAll= ()    => Object.values(KEYS).forEach(k => localStorage.removeItem(k));

// ===== ID del Google Sheet (pubblicato sul web!) =====
const SHEET_ID = '143tbH2ZfTHk9bsgL1T7s6PQcSkR-HrCepz0GS--Go8I';

// ===== Helper per leggere una tab =====
async function fetchSheet(sheetName){
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const text = await fetch(url, {cache:'no-store'}).then(r=>r.text());
  const m = text.match(/setResponse\(([\s\S]*?)\)/);
  if (!m) throw new Error('Formato inatteso');
  const json = JSON.parse(m[1]);
  const headers = json.table.cols.map(c=> (c.label||'').toLowerCase());
  return json.table.rows.map(r =>
    Object.fromEntries(r.c.map((c,i)=>[headers[i]||`col${i}`, c?c.v:'']))
  );
}

// ===== AutoLoad per nuovi utenti =====
export async function autoLoad(){
  // Se già ci sono dati in cache → non fa nulla
  if (get('news').length || get('matches').length) return;

  try {
    const [news, players, video, matches, calendar] = await Promise.all([
      fetchSheet('news'),
      fetchSheet('giocatori'),
      fetchSheet('video'),
      fetchSheet('partite'),
      fetchSheet('calendario'),
    ]);

    set('news', news);
    set('players', players);
    set('video', video);
    set('matches', matches);
    set('calendar', calendar);

    setLast(new Date().toLocaleString());
    console.log('[autoLoad] dati caricati dai Google Sheet');
  } catch(e){
    console.error('[autoLoad] errore:', e);
  }
}
