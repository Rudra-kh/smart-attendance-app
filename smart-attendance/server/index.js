const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

function initAdmin() {
  let credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credsPath) {
    const defaultGuess = path.resolve(__dirname, '../../keys/application-develpoment-firebase-adminsdk-fbsvc-da1340b305.json');
    if (fs.existsSync(defaultGuess)) {
      credsPath = defaultGuess;
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credsPath;
    }
  }
  if (!credsPath || !fs.existsSync(credsPath)) {
    console.error('Service account JSON not found. Set GOOGLE_APPLICATION_CREDENTIALS env var to your keys file.');
    process.exit(1);
  }
  const serviceAccount = require(credsPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

initAdmin();

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const app = express();
app.use(cors());
app.use(express.json());

function ttlExpiresAt(ttlSeconds) {
  const now = new Date();
  return admin.firestore.Timestamp.fromDate(new Date(now.getTime() + ttlSeconds * 1000));
}

// Create session
app.post('/api/sessions', async (req, res) => {
  try {
    const { subjectName = 'Session', totalStudents = 0, ttlSeconds = 5, adminUid = null } = req.body || {};
    const token = Math.random().toString(36).slice(2, 18);
    const doc = await db.collection('sessions').add({
      subjectName,
      totalStudents,
      createdBy: adminUid,
      createdAt: FieldValue.serverTimestamp(),
      active: true,
      ttlSeconds,
      currentToken: token,
      tokenExpiresAt: ttlExpiresAt(ttlSeconds),
      scannedCount: 0
    });
    res.json({ id: doc.id, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed-to-create' });
  }
});

// Rotate token
app.post('/api/sessions/:id/rotate', async (req, res) => {
  try {
    const { ttlSeconds = 5 } = req.body || {};
    const token = Math.random().toString(36).slice(2, 18);
    await db.doc(`sessions/${req.params.id}`).update({
      currentToken: token,
      tokenExpiresAt: ttlExpiresAt(ttlSeconds)
    });
    res.json({ token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed-to-rotate' });
  }
});

// End session
app.post('/api/sessions/:id/end', async (req, res) => {
  try {
    await db.doc(`sessions/${req.params.id}`).update({ active: false, endedAt: FieldValue.serverTimestamp() });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed-to-end' });
  }
});

// Get session
app.get('/api/sessions/:id', async (req, res) => {
  try {
    const snap = await db.doc(`sessions/${req.params.id}`).get();
    if (!snap.exists) return res.status(404).json({ error: 'not-found' });
    res.json({ id: snap.id, ...snap.data() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed-to-get' });
  }
});

// Student attendance submit (validates token + TTL + active)
app.post('/api/sessions/:id/attendance', async (req, res) => {
  try {
    const { token } = req.body || {};
    const ref = db.doc(`sessions/${req.params.id}`);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: 'not-found' });
    const s = snap.data();
    const expiresAt = s.tokenExpiresAt?.toDate ? s.tokenExpiresAt.toDate().getTime() : 0;
    if (!s.active || token !== s.currentToken || Date.now() >= expiresAt) {
      return res.status(400).json({ error: 'invalid-or-expired' });
    }
    await ref.update({ scannedCount: FieldValue.increment(1) });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed-to-submit' });
  }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`Smart Attendance server listening on http://localhost:${PORT}`);
});
