// update-classifica.js
// Aggiorna la classifica in Firestore con i dati che Matteo manda in chat.
// Ogni volta che arriva una classifica nuova, Claude riscrive qui sotto l'elenco
// CLASSIFICA con i dati aggiornati (stessa stagione, nuovi numeri), poi Matteo
// carica questo file su GitHub e lancia il workflow. Nessun doppione: se la
// squadra+stagione esiste già, aggiorna quella riga invece di crearne una nuova.

const admin = require('firebase-admin');

const STAGIONE = '2025/26'; // <- Claude aggiorna questa riga quando cambia stagione

// Un rigo per squadra. "zona" è facoltativa: 'Vincente' | 'Promozione' | 'Playoff' | 'Coppa di Lega' | 'Nessuna'
const CLASSIFICA = [
  // { squadra:'Scaligeri 2023', punti:48, giocate:18, vinte:15, pareggiate:3, perse:0, gf:96, gs:47, zona:'Vincente' },
  // ...incolla qui le righe aggiornate quando arrivano...
];

async function main(){
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Manca il secret FIREBASE_SERVICE_ACCOUNT');
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  if (!CLASSIFICA.length){
    console.log('Nessuna riga da aggiornare (CLASSIFICA è vuoto). Non faccio nulla.');
    return;
  }

  const existing = await db.collection('standings').where('stagione', '==', STAGIONE).get();

  for (const row of CLASSIFICA){
    const match = existing.docs.find(d => (d.data().squadra||'').trim().toLowerCase() === row.squadra.trim().toLowerCase());
    const data = { ...row, stagione: STAGIONE };
    if (match){
      await match.ref.update(data);
      console.log(`Aggiornata: ${row.squadra}`);
    } else {
      await db.collection('standings').add(data);
      console.log(`Creata: ${row.squadra}`);
    }
  }

  console.log('Fatto!');
}

main().catch(err => { console.error(err); process.exit(1); });
