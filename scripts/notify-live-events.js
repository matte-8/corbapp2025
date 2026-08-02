// notify-live-events.js
// Gira ogni pochi minuti via GitHub Actions, SOLO per le partite marcate
// "in diretta" (live === 'Sì'). Manda due tipi di notifica:
//  1) "La partita è iniziata! Segui la diretta" - una volta sola, appena
//     la partita passa in diretta.
//  2) "⚽ GOL!" - ogni volta che compare un nuovo evento gol nella cronaca,
//     mentre la diretta è attiva. Le modifiche fatte a cronaca DOPO la fine
//     della partita (diretta = No) non mandano mai notifiche.

const admin = require('firebase-admin');

async function main(){
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Manca il secret FIREBASE_SERVICE_ACCOUNT');
  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();
  const messaging = admin.messaging();

  const snap = await db.collection('matches').get();
  if (snap.empty){ console.log('Nessuna partita in archivio.'); return; }

  // Partite dove la diretta è finita: "riarmo" i flag per la prossima volta
  const toReset = snap.docs.filter(d => {
    const m = d.data();
    return m.live !== 'Sì' && (m.liveNotified || m.notifiedEventCount);
  });
  if (toReset.length){
    console.log(`Riarmo ${toReset.length} partite (diretta terminata).`);
    await Promise.all(toReset.map(d => d.ref.update({ liveNotified:false, notifiedEventCount:0 })));
  }

  // Solo le partite ATTUALMENTE in diretta contano per le notifiche
  const live = snap.docs.filter(d => d.data().live === 'Sì');
  if (!live.length){ console.log('Nessuna diretta in corso.'); return; }

  const tokensSnap = await db.collection('pushTokens').get();
  const tokens = tokensSnap.docs.map(d => d.id);
  if (!tokens.length){ console.log('Nessun dispositivo registrato alle notifiche.'); return; }

  async function sendPush(title, body, kind){
    console.log(`Invio "${title} — ${body}" a ${tokens.length} dispositivi`);
    const resp = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { url: './index.html', kind },
      webpush: { fcmOptions: { link: '/index.html' } }
    });
    console.log(`Inviate: ${resp.successCount}, fallite: ${resp.failureCount}`);
    const toDelete = [];
    resp.responses.forEach((r, i) => {
      if (!r.success){
        const code = r.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')){
          toDelete.push(tokens[i]);
        }
      }
    });
    if (toDelete.length) await Promise.all(toDelete.map(t => db.collection('pushTokens').doc(t).delete()));
  }

  for (const doc of live){
    const m = doc.data();
    const casa  = m.casa  || 'Corbiolo';
    const fuori = m.fuori || 'Avversario';

    // 1) Notifica "è iniziata la diretta" - una volta sola
    if (!m.liveNotified){
      await sendPush('🔴 È iniziata la diretta!', `${casa} - ${fuori}, segui la diretta`, 'diretta-start');
      await doc.ref.update({ liveNotified: true });
    }

    // 2) Notifiche per i nuovi eventi comparsi in cronaca (gol/gialli/rossi)
    const eventi = Array.isArray(m.eventi) ? m.eventi : [];
    const already = m.notifiedEventCount || 0;
    const nuovi = eventi.slice(already);

    for (const line of nuovi){
      // Formato riga: "1°T 23' ⚽ Melotti Matteo (#7) — Corbiolo"
      const match = line.match(/(⚽|🟨|🟥)\s+(.+?)\s+—\s+(.+)$/);
      if (!match) continue; // riga non riconosciuta (es. "Fine 1° tempo", "Time-out"): ignoro

      const [, emoji, who, team] = match;
      const isCorb = team.trim().toLowerCase() === 'corbiolo';
      const punteggio = m.risultato ? ` (${m.risultato.replace('-', ' - ')})` : '';

      if (emoji === '⚽'){
        const body = isCorb ? `${who} — Corbiolo${punteggio}` : `${team}${punteggio}`;
        await sendPush('⚽ GOL!', body, 'gol');
      } else if (emoji === '🟨'){
        if (isCorb) await sendPush('🟨 Ammonizione', `${who} — Corbiolo`, 'giallo');
        // giallo avversario: nessuna notifica, come richiesto
      } else if (emoji === '🟥'){
        const body = isCorb ? `${who} — Corbiolo` : `${team}`;
        await sendPush('🟥 Espulsione', body, 'rosso');
      }
    }

    if (eventi.length !== already){
      await doc.ref.update({ notifiedEventCount: eventi.length });
    }
  }

  console.log('Fatto.');
}

main().catch(err => { console.error(err); process.exit(1); });
