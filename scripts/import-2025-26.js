// import-2025-26.js
// Script UNA TANTUM: importa in Firestore i dati della stagione 2025/26
// (calendario, classifica, marcatori) letti dai PDF ufficiali CSI.
// Si lancia una volta sola dal computer, non gira in automatico.

const admin = require('firebase-admin');
const fs = require('fs');

const SEASON = '2025/26';

// ---- Calendario U.S. Corbiolo (dal PDF "Calendario") ----
// casa = squadra in casa, fuori = squadra in trasferta, risultato = "gol_casa-gol_fuori"
const MATCHES = [
  { data:'2025-10-10', ora:'20:00', casa:'Mountain Knights', fuori:'Corbiolo', risultato:'6-5' },
  { data:'2025-10-17', ora:'21:30', casa:'Corbiolo', fuori:'Juventud', risultato:'0-5' },
  { data:'2025-10-23', ora:'20:30', casa:'Zanna Futsal Club', fuori:'Corbiolo', risultato:'3-1' },
  { data:'2025-10-31', ora:'21:30', casa:'Corbiolo', fuori:'Pumas Over40', risultato:'2-1' },
  { data:'2025-11-04', ora:'20:00', casa:'Social Club', fuori:'Corbiolo', risultato:'1-5' },
  { data:'2025-11-14', ora:'21:30', casa:'Corbiolo', fuori:'La Squadra Del Borgo', risultato:'3-5' },
  { data:'2025-11-18', ora:'21:00', casa:'Corbiolo', fuori:'Hb Futsal', risultato:'6-4' },
  { data:'2025-11-28', ora:'21:00', casa:'Scaligeri 2023', fuori:'Corbiolo', risultato:'6-4' },
  { data:'2025-12-05', ora:'21:30', casa:'Corbiolo', fuori:'La Taverna C. A 5', risultato:'4-4' },
  { data:'2026-01-30', ora:'21:30', casa:'Corbiolo', fuori:'Mountain Knights', risultato:'5-3' },
  { data:'2026-02-04', ora:'20:45', casa:'Juventud', fuori:'Corbiolo', risultato:'3-3' },
  { data:'2026-02-13', ora:'21:30', casa:'Corbiolo', fuori:'Zanna Futsal Club', risultato:'7-3' },
  { data:'2026-02-19', ora:'21:15', casa:'Pumas Over40', fuori:'Corbiolo', risultato:'2-7' },
  { data:'2026-02-27', ora:'21:30', casa:'Corbiolo', fuori:'Social Club', risultato:'8-3' },
  { data:'2026-03-03', ora:'21:30', casa:'La Squadra Del Borgo', fuori:'Corbiolo', risultato:'8-9' },
  { data:'2026-03-06', ora:'21:30', casa:'Corbiolo', fuori:'Scaligeri 2023', risultato:'5-5' },
  { data:'2026-03-12', ora:'21:00', casa:'Hb Futsal', fuori:'Corbiolo', risultato:'2-7' },
  { data:'2026-03-26', ora:'21:00', casa:'La Taverna C. A 5', fuori:'Corbiolo', risultato:'8-6' },
].map(m => ({ ...m, stagione: SEASON }));

// ---- Classifica finale (dal PDF "Classifica") ----
const STANDINGS = [
  { squadra:'Scaligeri 2023',        punti:48, giocate:18, vinte:15, pareggiate:3, perse:0,  gf:96,  gs:47  },
  { squadra:'La Squadra Del Borgo',  punti:41, giocate:18, vinte:13, pareggiate:2, perse:3,  gf:111, gs:64  },
  { squadra:'Corbiolo',              punti:30, giocate:18, vinte:9,  pareggiate:3, perse:6,  gf:87,  gs:72  },
  { squadra:'La Taverna C. A 5',     punti:27, giocate:18, vinte:8,  pareggiate:3, perse:7,  gf:76,  gs:74  },
  { squadra:'Juventud',              punti:23, giocate:18, vinte:6,  pareggiate:5, perse:7,  gf:50,  gs:48  },
  { squadra:'Zanna Futsal Club',     punti:23, giocate:18, vinte:7,  pareggiate:2, perse:9,  gf:51,  gs:61  },
  { squadra:'Mountain Knights',      punti:21, giocate:18, vinte:6,  pareggiate:3, perse:9,  gf:67,  gs:73  },
  { squadra:'Pumas Over40',          punti:17, giocate:18, vinte:5,  pareggiate:2, perse:11, gf:65,  gs:87  },
  { squadra:'Social Club',           punti:16, giocate:18, vinte:4,  pareggiate:4, perse:10, gf:55,  gs:71  },
  { squadra:'Hb Futsal',             punti:9,  giocate:18, vinte:2,  pareggiate:3, perse:13, gf:47,  gs:108 },
].map(r => ({ ...r, stagione: SEASON }));

// ---- Marcatori Corbiolo stagione 2025/26 (dal PDF "Classifica Marcatori") ----
// NOTA: questi NON vengono scritti nel campo "gol" dei giocatori attuali (quello è per
// la stagione IN CORSO); vengono salvati a parte, taggati con la stagione, così restano
// storici senza confondersi con i gol che segnerete quest'anno.
const SCORERS_2025_26 = [
  { nome:'Scandola Nicola',   gol:19 },
  { nome:'Melotti Matteo',    gol:16 },
  { nome:'Bombieri Andrea',   gol:14 },
  { nome:'Scandola Riccardo', gol:9  },
  { nome:'Campedelli Michele',gol:6  },
  { nome:'Marcolini Federico',gol:6  },
  { nome:'Corbioli Luca',     gol:3  },
  { nome:'Vinco Marco',       gol:3  },
  { nome:'Dose Enrico',       gol:2  },
].map(s => ({ ...s, stagione: SEASON }));

async function main(){
  const raw = fs.readFileSync('./serviceAccountKey.json', 'utf8');
  const serviceAccount = JSON.parse(raw);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  console.log(`Importo ${MATCHES.length} partite...`);
  for (const m of MATCHES) await db.collection('matches').add(m);

  console.log(`Importo ${STANDINGS.length} righe di classifica...`);
  for (const r of STANDINGS) await db.collection('standings').add(r);

  console.log(`Importo ${SCORERS_2025_26.length} marcatori storici...`);
  for (const s of SCORERS_2025_26) await db.collection('scorers_history').add(s);

  console.log('Fatto! Stagione 2025/26 importata.');
}

main().catch(err => { console.error(err); process.exit(1); });
