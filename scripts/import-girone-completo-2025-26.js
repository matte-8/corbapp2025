// import-girone-completo-2025-26.js
// Script UNA TANTUM: sostituisce le partite della stagione 2025/26 con il
// CALENDARIO COMPLETO del girone (tutte le squadre, 18 giornate di andata/ritorno)
// + l'unica partita di Coppa dove ha giocato il Corbiolo.
// Cancella prima le vecchie 18 partite (solo Corbiolo) per evitare doppioni,
// poi inserisce tutto da capo con loghi e numero di giornata.

const admin = require('firebase-admin');

const SEASON = '2025/26';

const LOGOS = {
  'mountain knights':      'img/loghi/mountain-knights.jpg',
  'pumas over40':          'img/loghi/pumas-over40.jpg',
  'social club':           'img/loghi/social-club.jpg',
  'la squadra del borgo':  'img/loghi/la-squadra-del-borgo.jpg',
  'scaligeri 2023':        'img/loghi/scaligeri-2023.jpg',
  'la taverna c. a 5':     'img/loghi/la-taverna.jpg',
  'zanna futsal club':     'img/loghi/zanna-futsal-club.jpg',
  'juventud':              'img/loghi/juventud.jpg',
};
function logoFor(name){ return LOGOS[(name||'').trim().toLowerCase()] || null; }

// [data, ora, casa, fuori, risultato, giornata]
const CAMPIONATO = [
  ['2025-10-09','21:00','La Taverna C. A 5','Scaligeri 2023','2-3',1],
  ['2025-10-10','20:00','Mountain Knights','Corbiolo','6-5',1],
  ['2025-10-08','20:45','Juventud','La Squadra Del Borgo','1-3',1],
  ['2025-10-09','20:30','Zanna Futsal Club','Social Club','2-1',1],
  ['2025-10-09','21:30','Pumas Over40','Hb Futsal','16-4',1],

  ['2025-10-16','21:00','Hb Futsal','La Taverna C. A 5','3-3',2],
  ['2025-10-14','20:00','Social Club','Pumas Over40','2-2',2],
  ['2025-10-14','21:30','La Squadra Del Borgo','Zanna Futsal Club','8-2',2],
  ['2025-10-17','21:30','Corbiolo','Juventud','0-5',2],
  ['2025-10-17','20:00','Mountain Knights','Scaligeri 2023','4-5',2],

  ['2025-10-24','20:00','Mountain Knights','La Taverna C. A 5','2-1',3],
  ['2025-10-22','20:45','Juventud','Scaligeri 2023','2-7',3],
  ['2025-10-23','20:30','Zanna Futsal Club','Corbiolo','3-1',3],
  ['2025-10-23','21:15','Pumas Over40','La Squadra Del Borgo','3-10',3],
  ['2025-10-21','20:00','Social Club','Hb Futsal','3-6',3],

  ['2025-10-28','21:30','La Squadra Del Borgo','Social Club','7-2',4],
  ['2025-10-31','21:30','Corbiolo','Pumas Over40','2-1',4],
  ['2025-10-31','20:00','Scaligeri 2023','Zanna Futsal Club','6-0',4],
  ['2025-10-30','21:00','La Taverna C. A 5','Juventud','3-1',4],
  ['2025-10-30','21:00','Hb Futsal','Mountain Knights','6-5',4],

  ['2025-11-05','20:45','Juventud','Mountain Knights','4-3',5],
  ['2025-11-06','20:30','Zanna Futsal Club','La Taverna C. A 5','3-1',5],
  ['2025-11-06','21:15','Pumas Over40','Scaligeri 2023','4-5',5],
  ['2025-11-04','20:00','Social Club','Corbiolo','1-5',5],
  ['2025-11-04','21:30','La Squadra Del Borgo','Hb Futsal','4-2',5],

  ['2025-11-14','21:30','Corbiolo','La Squadra Del Borgo','3-5',6],
  ['2025-11-14','21:00','Scaligeri 2023','Social Club','5-2',6],
  ['2025-11-13','21:00','La Taverna C. A 5','Pumas Over40','8-4',6],
  ['2025-11-14','20:00','Mountain Knights','Zanna Futsal Club','1-4',6],
  ['2025-11-13','21:00','Hb Futsal','Juventud','2-2',6],

  ['2025-11-20','20:30','Zanna Futsal Club','Juventud','2-2',7],
  ['2025-11-20','21:15','Pumas Over40','Mountain Knights','4-2',7],
  ['2025-11-18','20:00','Social Club','La Taverna C. A 5','6-3',7],
  ['2025-11-18','21:30','La Squadra Del Borgo','Scaligeri 2023','2-3',7],
  ['2025-11-18','21:00','Corbiolo','Hb Futsal','6-4',7],

  ['2025-11-28','21:00','Scaligeri 2023','Corbiolo','6-4',8],
  ['2025-11-27','21:00','La Taverna C. A 5','La Squadra Del Borgo','2-4',8],
  ['2025-11-28','20:00','Mountain Knights','Social Club','3-5',8],
  ['2025-11-26','20:45','Juventud','Pumas Over40','4-2',8],
  ['2025-11-27','21:00','Hb Futsal','Zanna Futsal Club','2-3',8],

  ['2025-12-04','21:15','Pumas Over40','Zanna Futsal Club','5-3',9],
  ['2025-12-02','20:00','Social Club','Juventud','5-1',9],
  ['2025-12-02','21:30','La Squadra Del Borgo','Mountain Knights','11-5',9],
  ['2025-12-05','21:30','Corbiolo','La Taverna C. A 5','4-4',9],
  ['2025-12-05','21:00','Scaligeri 2023','Hb Futsal','4-2',9],

  ['2026-01-30','21:00','Scaligeri 2023','La Taverna C. A 5','12-3',10],
  ['2026-01-30','21:30','Corbiolo','Mountain Knights','5-3',10],
  ['2026-02-24','21:30','La Squadra Del Borgo','Juventud','1-1',10],
  ['2026-01-27','20:00','Social Club','Zanna Futsal Club','1-1',10],
  ['2026-02-24','21:00','Hb Futsal','Pumas Over40','3-4',10],

  ['2026-02-06','20:00','Scaligeri 2023','Mountain Knights','4-4',11],
  ['2026-02-05','21:00','La Taverna C. A 5','Hb Futsal','5-2',11],
  ['2026-02-05','21:15','Pumas Over40','Social Club','2-2',11],
  ['2026-02-05','20:30','Zanna Futsal Club','La Squadra Del Borgo','5-6',11],
  ['2026-02-04','20:45','Juventud','Corbiolo','3-3',11],

  ['2026-02-12','21:00','La Taverna C. A 5','Mountain Knights','5-2',12],
  ['2026-02-13','21:00','Scaligeri 2023','Juventud','5-0',12],
  ['2026-02-13','21:30','Corbiolo','Zanna Futsal Club','7-3',12],
  ['2026-02-10','21:30','La Squadra Del Borgo','Pumas Over40','11-4',12],
  ['2026-02-12','21:00','Hb Futsal','Social Club','1-13',12],

  ['2026-02-17','20:00','Social Club','La Squadra Del Borgo','3-6',13],
  ['2026-02-19','21:15','Pumas Over40','Corbiolo','2-7',13],
  ['2026-02-19','20:30','Zanna Futsal Club','Scaligeri 2023','4-5',13],
  ['2026-02-18','20:45','Juventud','La Taverna C. A 5','5-5',13],
  ['2026-02-20','20:00','Mountain Knights','Hb Futsal','6-0',13],

  ['2026-02-27','20:00','Mountain Knights','Juventud','3-2',14],
  ['2026-02-26','21:00','La Taverna C. A 5','Zanna Futsal Club','7-3',14],
  ['2026-02-27','21:00','Scaligeri 2023','Pumas Over40','8-3',14],
  ['2026-02-27','21:30','Corbiolo','Social Club','8-3',14],
  ['2026-02-26','21:00','Hb Futsal','La Squadra Del Borgo','3-9',14],

  ['2026-03-03','21:30','La Squadra Del Borgo','Corbiolo','8-9',15],
  ['2026-03-03','20:00','Social Club','Scaligeri 2023','0-5',15],
  ['2026-03-05','21:15','Pumas Over40','La Taverna C. A 5','4-5',15],
  ['2026-03-05','20:30','Zanna Futsal Club','Mountain Knights','2-3',15],
  ['2026-03-04','20:45','Juventud','Hb Futsal','7-1',15],

  ['2026-03-11','20:45','Juventud','Zanna Futsal Club','3-0',16],
  ['2026-03-13','20:00','Mountain Knights','Pumas Over40','5-0',16],
  ['2026-03-12','21:00','La Taverna C. A 5','Social Club','6-3',16],
  ['2026-03-13','20:00','Scaligeri 2023','La Squadra Del Borgo','4-2',16],
  ['2026-03-12','21:00','Hb Futsal','Corbiolo','2-7',16],

  ['2026-03-06','21:30','Corbiolo','Scaligeri 2023','5-5',17],
  ['2026-03-17','21:30','La Squadra Del Borgo','La Taverna C. A 5','7-5',17],
  ['2026-03-17','20:00','Social Club','Mountain Knights','3-3',17],
  ['2026-03-19','21:15','Pumas Over40','Juventud','3-2',17],
  ['2026-03-19','20:30','Zanna Futsal Club','Hb Futsal','7-0',17],

  ['2026-03-26','20:30','Zanna Futsal Club','Pumas Over40','4-2',18],
  ['2026-03-25','20:45','Juventud','Social Club','5-0',18],
  ['2026-03-27','20:00','Mountain Knights','La Squadra Del Borgo','7-7',18],
  ['2026-03-26','21:00','La Taverna C. A 5','Corbiolo','8-6',18],
  ['2026-03-26','21:00','Hb Futsal','Scaligeri 2023','4-4',18],
];

// [data, ora, casa, fuori, risultato, fase]
const COPPA = [
  ['2025-12-18','21:00','Valdalpone Futsal','Corbiolo','7-3','Sedicesimi'],
];

async function main(){
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Manca il secret FIREBASE_SERVICE_ACCOUNT');
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  // Cancello le vecchie partite 2025/26 (quelle solo-Corbiolo importate la prima
  // volta) per evitare di ritrovarmi le vostre 18 partite duplicate.
  const old = await db.collection('matches').where('stagione', '==', SEASON).get();
  if (!old.empty){
    console.log(`Elimino ${old.size} partite vecchie della stagione ${SEASON}...`);
    await Promise.all(old.docs.map(d => d.ref.delete()));
  }

  console.log(`Importo ${CAMPIONATO.length} partite di Campionato (girone completo)...`);
  for (const [data, ora, casa, fuori, risultato, giornata] of CAMPIONATO){
    await db.collection('matches').add({
      stagione: SEASON, tipo: 'Campionato', data, ora, casa, fuori, risultato, giornata: String(giornata),
      logo_casa: logoFor(casa) || null,
      logo_fuori: logoFor(fuori) || null,
    });
  }

  console.log(`Importo ${COPPA.length} partita/e di Coppa (solo Corbiolo)...`);
  for (const [data, ora, casa, fuori, risultato, fase] of COPPA){
    await db.collection('matches').add({
      stagione: SEASON, tipo: 'Coppa', data, ora, casa, fuori, risultato, fase,
      logo_casa: logoFor(casa) || null,
      logo_fuori: logoFor(fuori) || null,
    });
  }

  console.log('Fatto! Girone completo 2025/26 importato (Campionato + Coppa).');
}

main().catch(err => { console.error(err); process.exit(1); });
