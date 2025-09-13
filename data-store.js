const KEYS = {
  giocatori: 'giocatori',
  news:      'news',
  video:     'video',
  matches:   'matches',
  calendar:  'calendar',
  last:      'lastSync'
};

export const get = (k) => {
  try { return JSON.parse(localStorage.getItem(KEYS[k]) || '[]'); }
  catch { return []; }
};

export const set = (k, v) => localStorage.setItem(KEYS[k], JSON.stringify(v || []));
export const last = () => localStorage.getItem(KEYS.last) || 'never';
export const setLast = (t) => localStorage.setItem(KEYS.last, t);
export const clearAll = () => Object.values(KEYS).forEach(k => localStorage.removeItem(k));
