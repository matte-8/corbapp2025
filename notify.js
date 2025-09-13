
// notify.js
import { get } from './data-store.js';

const SETTINGS_KEY = 'corb_settings';
const NOTIFIED_KEY = 'corb_notified_dates'; // Array di 'YYYY-MM-DD' notificati

export function getSettings(){
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); }
  catch { return {}; }
}
export function setSettings(s){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s||{}));
}
function getNotifiedDates(){
  try { return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]'); }
  catch { return []; }
}
function setNotifiedDates(arr){
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr||[]));
}
function ymd(d){
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
function sameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function toDate(m){
  const dt = new Date((m.data||'')+'T'+(m.ora||'00:00'));
  return isNaN(+dt) ? new Date(m.data||'') : dt;
}

async function showSWNotification(title, body, data){
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: 'notify', title, body, data });
}

// Pianifica notifica locale per oggi alle 12:00 se oggi c'è partita
export async function initMatchNotifications(){
  // permessi & setting
  if (!('Notification' in window)) return;
  const s = getSettings();
  if (!s.notifyMatches) return;

  if (Notification.permission === 'default'){
    // non forzo qui la richiesta; l’utente può consentire da settings
    // return qui se vuoi bloccare finché non accetta
  }
  if (Notification.permission !== 'granted') return;

  // cerca partite di oggi
  const matches = (get('matches')||[]).map(m=>({...m, date: toDate(m)}))
                    .filter(m=>!isNaN(+m.date));
  const today = new Date();
  const todayMatches = matches.filter(m=> sameDay(m.date, today));
  if (!todayMatches.length) return;

  // se già notificato oggi, esci
  const notified = getNotifiedDates();
  const key = ymd(today);
  if (notified.includes(key)) return;

  // calcola millis fino a oggi alle 12:00
  const atNoon = new Date();
  atNoon.setHours(12,0,0,0);
  const wait = atNoon.getTime() - Date.now();

  const doNotify = async ()=>{
    const list = todayMatches.map(m=>{
      const casa = (m.casa||'Corbiolo').trim();
      const fuori= (m.fuori||'Avversario').trim();
      return `${casa} vs ${fuori} • ${m.ora||''}`;
    }).join('\n');

    await showSWNotification(
      'CORB • Promemoria partita',
      list || 'Partita oggi!',
      { url: './prossima.html' }
    );
    const arr = getNotifiedDates();
    if (!arr.includes(key)){ arr.push(key); setNotifiedDates(arr); }
  };

  if (wait <= 0){
    // è già dopo le 12 → notifica subito una sola volta
    doNotify();
  } else {
    // pianifica finché la pagina è attiva/aperta
    setTimeout(doNotify, Math.min(wait, 6*60*60*1000)); // cap a 6h
  }
}

export function clearTodayFlag(){
  const arr = getNotifiedDates();
  const key = ymd(new Date());
  const nx = arr.filter(x=>x!==key);
  setNotifiedDates(nx);
}
