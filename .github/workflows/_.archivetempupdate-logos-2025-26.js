// update-logos-2025-26.js
// Script UNA TANTUM: aggiunge i loghi degli avversari alle partite della
// stagione 2025/26 già importate, abbinando il nome della squadra al file logo.
// Non tocca risultati/date/altro, solo i campi logo_casa/logo_fuori.

const admin = require('firebase-admin');

const SEASON = '2025/26';

// Nome squadra (minuscolo) -> percorso immagine nel progetto
const LOGOS = {
  'mountain knights':      'img/loghi/mountain-knights.jpg',
  'pumas over40':          'img/loghi/pumas-over40.jpg',
  'social club':           'img/loghi/social-club.jpg',
  'la squadra del borgo':  'img/loghi/la-squadra-del-borgo.jpg',
  'scaligeri 2023':        'img/loghi/scaligeri-2023.jpg',
  'la taverna c. a 5':     'img/loghi/la-taverna.jpg',
  'zanna futsal club':     'img/loghi/zanna-futsal-club.jpg',
  // juventud, hb futsal: ancora senza logo -> stemma automatico
};

function logoFor(name){
  const key = (name || '').trim().toLowerCase();
  return LOGOS[key] || null;
}

async function main(){
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Manca il secret FIREBASE_SERVICE_ACCOUNT');
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const snap = await db.collection('matches').where('stagione', '==', SEASON).get();
  if (snap.empty){
    console.log(`Nessuna partita trovata per la stagione ${SEASON}.`);
    return;
  }

  let updated = 0;
  for (const doc of snap.docs){
    const m = doc.data();
    const update = {};
    const casaLogo  = logoFor(m.casa);
    const fuoriLogo = logoFor(m.fuori);
    if (casaLogo  && (m.casa||'').toLowerCase()  !== 'corbiolo') update.logo_casa  = casaLogo;
    if (fuoriLogo && (m.fuori||'').toLowerCase() !== 'corbiolo') update.logo_fuori = fuoriLogo;

    if (Object.keys(update).length){
      await doc.ref.update(update);
      updated++;
      console.log(`Aggiornata: ${m.casa} vs ${m.fuori} ->`, update);
    }
  }
  console.log(`Fatto! ${updated} partite aggiornate con i loghi.`);
}

main().catch(err => { console.error(err); process.exit(1); });
