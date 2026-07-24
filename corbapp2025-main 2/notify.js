// notify.js — richiesta permesso, registrazione al push, invio "notifica di prova"
import { db, VAPID_KEY, getMessagingIfSupported } from './firebase-init.js';
import {
  doc, setDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getToken, onMessage
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js";

const TOKENS_COLLECTION = 'pushTokens';

export function permissionState(){
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

// Chiede il permesso, ottiene il token FCM per QUESTO dispositivo/browser
// e lo salva in Firestore così l'admin (o l'automatismo del giorno-partita)
// può usarlo per mandare la notifica a tutti.
export async function enableNotifications(){
  if (!('Notification' in window)) throw new Error('Notifiche non supportate su questo dispositivo/browser.');

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permesso negato.');

  const messaging = await getMessagingIfSupported();
  if (!messaging) throw new Error('Push non supportato su questo browser (es. iPhone: l\'app va aperta dalla schermata Home, non da Safari).');

  const swReg = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
  if (!token) throw new Error('Impossibile ottenere il token di notifica.');

  await setDoc(doc(db, TOKENS_COLLECTION, token), {
    token,
    ua: navigator.userAgent,
    updatedAt: serverTimestamp()
  });

  // Notifiche ricevute mentre l'app è aperta e in primo piano
  // (in background/chiusa ci pensa sw.js → onBackgroundMessage)
  onMessage(messaging, (payload) => {
    const title = payload?.notification?.title || 'CORB';
    const body  = payload?.notification?.body  || '';
    new Notification(title, { body, icon: './img/logo_c5.png' });
  });

  return token;
}

export async function disableNotifications(){
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;
  const swReg = await navigator.serviceWorker.ready;
  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (token) await deleteDoc(doc(db, TOKENS_COLLECTION, token));
  } catch {}
}
