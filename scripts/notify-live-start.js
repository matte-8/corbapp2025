// notify-live-start.js
// Gira ogni pochi minuti via GitHub Actions: controlla se una partita è stata
// appena messa "in diretta" dall'Admin, e se sì manda una notifica push a chi
// l'ha attivata ("È iniziata la diretta!"). Manda l'avviso una sola volta per
// partita (si segna da solo con il campo liveNotified), e si "riarma" da solo
// quando la diretta finisce, così è pronto per la prossima volta.

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

  // Partite appena diventate "in diretta" e non ancora notificate
  const toNotify = snap.docs.filter(d => {
    const m = d.data();
    return m.live === 'Sì' && !m.liveNotified;
  });

  // Partite dove la diretta è finita: "riarmo" il flag per la prossima volta
  const toReset = snap.docs.filter(d => {
    const m = d.data();
    return m.live !== 'Sì' && m.liveNotified;
  });

  if (toReset.length){
    console.log(`Riarmo ${toReset.length} partite (diretta terminata).`);
    await Promise.all(toReset.map(d => d.ref.update({ liveNotified:false })));
  }

  if (!toNotify.length){
    console.log('Nessuna nuova diretta da notificare.');
    return;
  }

  const tokensSnap = await db.collection('pushTokens').get();
  const tokens = tokensSnap.docs.map(d => d.id);
  if (!tokens.length){
    console.log('Nessun dispositivo registrato alle notifiche.');
    // segno comunque come notificata per non ritentare all'infinito
    await Promise.all(toNotify.map(d => d.ref.update({ liveNotified:true })));
    return;
  }

  for (const doc of toNotify){
    const m = doc.data();
    const casa  = m.casa  || 'Corbiolo';
    const fuori = m.fuori || 'Avversario';
    const title = '🔴 È iniziata la diretta!';
    const body  = `${casa} - ${fuori}, segui il punteggio in tempo reale`;

    console.log(`Invio notifica diretta a ${tokens.length} dispositivi: "${body}"`);

    const resp = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: { url: './index.html' },
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
    if (toDelete.length){
      await Promise.all(toDelete.map(t => db.collection('pushTokens').doc(t).delete()));
    }

    await doc.ref.update({ liveNotified:true });
  }

  console.log('Fatto.');
}

main().catch(err => { console.error(err); process.exit(1); });
