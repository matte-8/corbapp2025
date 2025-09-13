// data-store.js — gestione locale dei dati CORB

const KEYS = {
  giocatori: 'giocatori',
  news:      'news',
  video:     'video',
  matches:   'matches',
  calendar:  'calendar',
  last:      'lastSync'
};

// === API base ===
export const get = (k) => {
  try { return JSON.parse(localStorage.getItem(KEYS[k]) || '[]'); }
  catch { return []; }
};

export const set = (k, v) => {
  localStorage.setItem(KEYS[k], JSON.stringify(v || []));
};

export const last = () => localStorage.getItem(KEYS.last) || 'never';

export const setLast = (t) => localStorage.setItem(KEYS.last, t);

export const clearAll = () => {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
};

// === Utility per debug ===
export const debugStore = () => {
  const out = {};
  for (const [name, key] of Object.entries(KEYS)) {
    try {
      out[name] = JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      out[name] = null;
    }
  }
  console.log("📦 Contenuto data-store:", out);
  return out;
};
