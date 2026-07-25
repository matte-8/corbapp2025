// data-store.js — versione Firestore
// Al posto del CSV da Google Sheet, i dati vivono in Firestore.
// Ogni pagina "si iscrive" con onSnapshot: quando qualcosa cambia nel
// database (perché l'admin ha modificato o perché lo scraper del
// campionato ha scritto un nuovo risultato), TUTTI i telefoni aperti
// ricevono l'aggiornamento all'istante, senza dover ricaricare nulla.

import { db } from './firebase-init.js';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const COLLECTIONS = {
  matches:   'matches',    // partite (risultati + calendario insieme, distinti da data)
  news:      'news',
  players:   'players',
  videos:    'videos',
  standings: 'standings', // classifica
  scorersHistory: 'scorers_history', // marcatori delle stagioni passate (archivio)
};

// Stagione corrente in formato "2025/26" (agosto→maggio).
// Usata come valore di default nei form Admin e per i filtri stagione.
export function currentSeason(){
  const now = new Date();
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  return `${y}/${String(y+1).slice(-2)}`;
}

// ---- Sottoscrizioni in tempo reale ----
// cb(arrayDiOggetti) viene richiamata subito e ad ogni cambiamento.
// Ritorna una funzione unsubscribe da chiamare quando si lascia la pagina.
function subscribe(collName, cb, orderField=null){
  const col = collection(db, collName);
  const q = orderField ? query(col, orderBy(orderField)) : col;
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(rows);
  }, (err) => {
    console.error(`[corb] errore lettura "${collName}":`, err.message);
    cb([]); // meglio una lista vuota che una pagina rotta
  });
}

export const subscribeMatches = (cb) => subscribe(COLLECTIONS.matches, cb, 'data');
export const subscribeNews    = (cb) => subscribe(COLLECTIONS.news, cb);
export const subscribePlayers = (cb) => subscribe(COLLECTIONS.players, cb);
export const subscribeVideos  = (cb) => subscribe(COLLECTIONS.videos, cb);
export const subscribeStandings = (cb) => subscribe(COLLECTIONS.standings, cb);
export const subscribeScorersHistory = (cb) => subscribe(COLLECTIONS.scorersHistory, cb);

// ---- CRUD per il pannello Admin ----
// (le regole di sicurezza di Firestore permettono la scrittura solo se loggati)
async function addItem(collName, data){
  return addDoc(collection(db, collName), { ...data, createdAt: serverTimestamp() });
}
async function updateItem(collName, id, data){
  return updateDoc(doc(db, collName, id), data);
}
async function deleteItem(collName, id){
  return deleteDoc(doc(db, collName, id));
}

export const Matches = {
  add:    (data) => addItem(COLLECTIONS.matches, data),
  update: (id, data) => updateItem(COLLECTIONS.matches, id, data),
  remove: (id) => deleteItem(COLLECTIONS.matches, id),
};
export const News = {
  add:    (data) => addItem(COLLECTIONS.news, data),
  update: (id, data) => updateItem(COLLECTIONS.news, id, data),
  remove: (id) => deleteItem(COLLECTIONS.news, id),
};
export const Players = {
  add:    (data) => addItem(COLLECTIONS.players, data),
  update: (id, data) => updateItem(COLLECTIONS.players, id, data),
  remove: (id) => deleteItem(COLLECTIONS.players, id),
};
export const Videos = {
  add:    (data) => addItem(COLLECTIONS.videos, data),
  update: (id, data) => updateItem(COLLECTIONS.videos, id, data),
  remove: (id) => deleteItem(COLLECTIONS.videos, id),
};
export const Standings = {
  add:    (data) => addItem(COLLECTIONS.standings, data),
  update: (id, data) => updateItem(COLLECTIONS.standings, id, data),
  remove: (id) => deleteItem(COLLECTIONS.standings, id),
};
