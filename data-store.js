const KEYS = {
  players:  'corb_players',
  news:     'corb_news',
  video:    'corb_video',
  matches:  'corb_matches',
  calendar: 'corb_calendar',
  last:     'corb_last'
};

export const get = (k) => {
  try { return JSON.parse(localStorage.getItem(KEYS[k]) || '[]'); }
  catch { return []; }
};
export const set = (k, v) => localStorage.setItem(KEYS[k], JSON.stringify(v || []));
export const last = () => localStorage.getItem(KEYS.last) || 'never';
export const setLast = (t) => localStorage.setItem(KEYS.last, t);
export const clearAll = () => Object.values(KEYS).forEach(k => localStorage.removeItem(k));
