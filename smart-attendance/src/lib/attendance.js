import { db } from './firebase';
import {
  addDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  setDoc,
  increment,
  getDoc
} from 'firebase/firestore';
import { getRandomBytesAsync } from 'expo-crypto';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

function bytesToHex(bytes) {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i].toString(16).padStart(2, '0');
    hex += b;
  }
  return hex;
}

async function generateToken(length = 16) {
  // Generate a hex string of `length` characters (length/2 bytes)
  const byteLen = Math.ceil(length / 2);
  try {
    const bytes = await getRandomBytesAsync(byteLen);
    const hex = bytesToHex(bytes);
    return hex.slice(0, length);
  } catch (e) {
    // Fallback for web/insecure origins where crypto may be unavailable
    let hex = '';
    for (let i = 0; i < byteLen; i++) {
      const n = Math.floor(Math.random() * 256);
      hex += n.toString(16).padStart(2, '0');
    }
    return hex.slice(0, length);
  }
}

const extras = Constants?.expoConfig?.extra || {};
const demoMode = !!extras.demoMode;
const serverCfg = extras.server || {};
const serverUrl = serverCfg.baseUrl;

// Firestore-backed implementation
async function createSessionFs({ adminUid, subjectName, totalStudents = 0, ttlSeconds = 5 }) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const token = await generateToken();
  const sessionsRef = collection(db, 'sessions');
  const docRef = await addDoc(sessionsRef, {
    subjectName,
    totalStudents,
    createdBy: adminUid || null,
    createdAt: serverTimestamp(),
    active: true,
    ttlSeconds,
    currentToken: token,
    tokenExpiresAt: Timestamp.fromDate(expiresAt),
    scannedCount: 0
  });
  return { id: docRef.id, token };
}

async function rotateTokenFs(sessionId, ttlSeconds) {
  const token = await generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
  const ref = doc(db, 'sessions', sessionId);
  await updateDoc(ref, {
    currentToken: token,
    tokenExpiresAt: Timestamp.fromDate(expiresAt)
  });
  return token;
}

async function endSessionFs(sessionId) {
  const ref = doc(db, 'sessions', sessionId);
  await updateDoc(ref, { active: false, endedAt: serverTimestamp() });
}

function onSessionSnapshotFs(sessionId, callback) {
  const ref = doc(db, 'sessions', sessionId);
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

async function incrementScannedFs(sessionId, amount = 1) {
  const ref = doc(db, 'sessions', sessionId);
  await updateDoc(ref, { scannedCount: increment(amount) });
}

async function getSessionFs(sessionId) {
  const ref = doc(db, 'sessions', sessionId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function listSessionsFs({ pageSize = 10 } = {}) {
  const col = collection(db, 'sessions');
  const q = query(col, orderBy('createdAt', 'desc'), limit(pageSize));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Attendance records (Firestore)
async function submitAttendanceFs(sessionId, token, userId) {
  const s = await getSessionFs(sessionId);
  if (!s) throw new Error('not-found');
  const expiresAt = s.tokenExpiresAt?.toDate ? s.tokenExpiresAt.toDate().getTime() : 0;
  if (!s.active || token !== s.currentToken || Date.now() >= expiresAt) {
    throw new Error('invalid-or-expired');
  }
  const col = collection(db, 'sessions', sessionId, 'attendance');
  await addDoc(col, { userId: String(userId || ''), createdAt: serverTimestamp(), token });
  await incrementScannedFs(sessionId, 1);
}

async function listAttendanceFs(sessionId) {
  const col = collection(db, 'sessions', sessionId, 'attendance');
  const q = query(col, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
const demoAttendance = new Map(); // sessionId -> [{id,userId,createdAt}]

// Demo-mode in-memory implementation
const demoSessions = new Map();
const demoListeners = new Map(); // sessionId -> Set(callback)
let demoLoaded = false;

const DEMO_SESS_KEY = 'demo:sessions';
const DEMO_ATT_KEY = 'demo:attendance';

function deserializeSession(o) {
  if (!o) return null;
  const createdMs = o.createdAtMs || 0;
  const expiresMs = o.tokenExpiresAtMs || 0;
  const endedMs = o.endedAtMs;
  const tokenIssuedAtMs = o.tokenIssuedAtMs || 0;
  const s = {
    id: o.id,
    subjectName: o.subjectName,
    totalStudents: o.totalStudents || 0,
    createdBy: o.createdBy || null,
    createdAt: { toDate: () => new Date(createdMs) },
    active: !!o.active,
    ttlSeconds: o.ttlSeconds || 5,
    currentToken: o.currentToken || '',
    tokenExpiresAt: { toDate: () => new Date(expiresMs) },
    scannedCount: o.scannedCount || 0,
    tokenIssuedAtMs,
    misbehaved: Array.isArray(o.misbehaved) ? o.misbehaved : []
  };
  if (endedMs) s.endedAt = { toDate: () => new Date(endedMs) };
  return s;
}

function serializeSession(s) {
  if (!s) return null;
  return {
    id: s.id,
    subjectName: s.subjectName,
    totalStudents: s.totalStudents || 0,
    createdBy: s.createdBy || null,
    createdAtMs: s.createdAt?.toDate ? s.createdAt.toDate().getTime() : 0,
    active: !!s.active,
    ttlSeconds: s.ttlSeconds || 5,
    currentToken: s.currentToken || '',
    tokenExpiresAtMs: s.tokenExpiresAt?.toDate ? s.tokenExpiresAt.toDate().getTime() : 0,
    scannedCount: s.scannedCount || 0,
    tokenIssuedAtMs: s.tokenIssuedAtMs || 0,
    misbehaved: Array.isArray(s.misbehaved) ? s.misbehaved : [],
    endedAtMs: s.endedAt?.toDate ? s.endedAt.toDate().getTime() : undefined
  };
}

async function loadDemoFromStorage() {
  if (demoLoaded) return;
  try {
    const s = await AsyncStorage.getItem(DEMO_SESS_KEY);
    const a = await AsyncStorage.getItem(DEMO_ATT_KEY);
    demoSessions.clear();
    demoAttendance.clear();
    if (s) {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) arr.forEach((o) => {
        const d = deserializeSession(o);
        if (d?.id) demoSessions.set(d.id, d);
      });
    }
    if (a) {
      const obj = JSON.parse(a);
      if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([sid, list]) => {
          if (Array.isArray(list)) demoAttendance.set(sid, list);
        });
      }
    }
  } catch (_) {
    // ignore
  } finally {
    demoLoaded = true;
  }
}

async function persistDemoToStorage() {
  try {
    const sessionsArr = Array.from(demoSessions.values()).map(serializeSession).filter(Boolean);
    await AsyncStorage.setItem(DEMO_SESS_KEY, JSON.stringify(sessionsArr));
    const attObj = {};
    demoAttendance.forEach((list, sid) => { attObj[sid] = list; });
    await AsyncStorage.setItem(DEMO_ATT_KEY, JSON.stringify(attObj));
  } catch (_) {
    // ignore
  }
}

function cloneDemo(session) {
  if (!session) return null;
  return JSON.parse(JSON.stringify(session, (key, value) => value));
}

function notifyDemo(sessionId) {
  const set = demoListeners.get(sessionId);
  if (!set) return;
  const s = demoSessions.get(sessionId);
  for (const cb of set) cb(cloneDemo(s));
}

async function createSessionDemo({ adminUid, subjectName, totalStudents = 0, ttlSeconds = 5 }) {
  await loadDemoFromStorage();
  const uuid = await generateToken();
  const id = uuid;
  const now = Date.now();
  const expiresAtMs = now + ttlSeconds * 1000;
  const token = await generateToken();
  const session = {
    id,
    subjectName,
    totalStudents,
    createdBy: adminUid || null,
    createdAt: { toDate: () => new Date(now) },
    active: true,
    ttlSeconds,
    currentToken: token,
    tokenExpiresAt: { toDate: () => new Date(expiresAtMs) },
    scannedCount: 0,
    tokenIssuedAtMs: now,
    misbehaved: []
  };
  demoSessions.set(id, session);
  notifyDemo(id);
  await persistDemoToStorage();
  return { id, token };
}

async function rotateTokenDemo(sessionId, ttlSeconds) {
  await loadDemoFromStorage();
  const s = demoSessions.get(sessionId);
  if (!s) return '';
  const token = await generateToken();
  const expiresAtMs = Date.now() + (ttlSeconds || s.ttlSeconds || 5) * 1000;
  s.currentToken = token;
  s.tokenExpiresAt = { toDate: () => new Date(expiresAtMs) };
  s.tokenIssuedAtMs = Date.now();
  demoSessions.set(sessionId, s);
  notifyDemo(sessionId);
  await persistDemoToStorage();
  return token;
}

async function endSessionDemo(sessionId) {
  await loadDemoFromStorage();
  const s = demoSessions.get(sessionId);
  if (!s) return;
  s.active = false;
  s.endedAt = { toDate: () => new Date() };
  demoSessions.set(sessionId, s);
  notifyDemo(sessionId);
  await persistDemoToStorage();
}

function onSessionSnapshotDemo(sessionId, callback) {
  // no await here; existing state will be emitted, and any later load will notify
  // caller can call getSessionDemo for latest immediately
  if (!demoListeners.has(sessionId)) demoListeners.set(sessionId, new Set());
  const set = demoListeners.get(sessionId);
  set.add(callback);
  // fire immediately with current state
  callback(cloneDemo(demoSessions.get(sessionId)));
  return () => {
    set.delete(callback);
  };
}

async function incrementScannedDemo(sessionId, amount = 1) {
  await loadDemoFromStorage();
  const s = demoSessions.get(sessionId);
  if (!s) return;
  s.scannedCount = (s.scannedCount || 0) + amount;
  demoSessions.set(sessionId, s);
  notifyDemo(sessionId);
  await persistDemoToStorage();
}

async function getSessionDemo(sessionId) {
  await loadDemoFromStorage();
  const s = demoSessions.get(sessionId);
  return cloneDemo(s);
}

async function listSessionsDemo({ pageSize = 10 } = {}) {
  await loadDemoFromStorage();
  const arr = Array.from(demoSessions.values());
  arr.sort((a, b) => {
    const ta = a?.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const tb = b?.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    return tb - ta;
  });
  return arr.slice(0, pageSize).map(cloneDemo);
}

async function submitAttendanceDemo(sessionId, token, userId) {
  await loadDemoFromStorage();
  const s = demoSessions.get(sessionId);
  if (!s) throw new Error('not-found');
  const expiresAt = s.tokenExpiresAt?.toDate ? s.tokenExpiresAt.toDate().getTime() : 0;
  if (!s.active || token !== s.currentToken || Date.now() >= expiresAt) {
    throw new Error('invalid-or-expired');
  }
  // If scanned after 5s from token issue and student not already present => mark misbehaved
  const LATE_THRESHOLD_MS = 5000;
  const now = Date.now();
  const isLate = s.tokenIssuedAtMs && (now - s.tokenIssuedAtMs > LATE_THRESHOLD_MS);
  const existingList = demoAttendance.get(sessionId) || [];
  const alreadyPresent = existingList.some(e => String(e.userId) === String(userId));
  if (isLate && !alreadyPresent) {
    // Add to misbehaved list if not already
    if (!s.misbehaved.includes(String(userId))) {
      s.misbehaved.push(String(userId));
      demoSessions.set(sessionId, s);
      notifyDemo(sessionId);
      await persistDemoToStorage();
    }
    return; // Do not count as present
  }
  await incrementScannedDemo(sessionId, 1);
  const list = demoAttendance.get(sessionId) || [];
  const entry = { id: String(Date.now()), userId: String(userId || `demo-${list.length + 1}`), createdAt: new Date().toISOString(), token };
  list.unshift(entry);
  demoAttendance.set(sessionId, list);
  await persistDemoToStorage();
}

async function listAttendanceDemo(sessionId) {
  await loadDemoFromStorage();
  return (demoAttendance.get(sessionId) || []).slice();
}

// Export selection based on mode
// Server-backed implementation (uses REST). Reads via REST; no Firebase needed on client.
async function createSessionServer({ adminUid, subjectName, totalStudents = 0, ttlSeconds = 5 }) {
  const r = await fetch(`${serverUrl}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUid, subjectName, totalStudents, ttlSeconds })
  });
  if (!r.ok) throw new Error('createSession failed');
  return await r.json();
}

async function rotateTokenServer(sessionId, ttlSeconds) {
  const r = await fetch(`${serverUrl}/api/sessions/${sessionId}/rotate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttlSeconds })
  });
  if (!r.ok) throw new Error('rotateToken failed');
  const j = await r.json();
  return j.token;
}

async function endSessionServer(sessionId) {
  const r = await fetch(`${serverUrl}/api/sessions/${sessionId}/end`, { method: 'POST' });
  if (!r.ok) throw new Error('endSession failed');
}

function onSessionSnapshotServer(sessionId, callback) {
  let stopped = false;
  async function poll() {
    if (stopped) return;
    try {
      const r = await fetch(`${serverUrl}/api/sessions/${sessionId}`);
      if (r.ok) {
        const j = await r.json();
        // shape compatibility: provide toDate() for tokenExpiresAt
        if (j?.tokenExpiresAt?._seconds) {
          const ms = j.tokenExpiresAt._seconds * 1000 + Math.floor((j.tokenExpiresAt._nanoseconds || 0) / 1e6);
          j.tokenExpiresAt = { toDate: () => new Date(ms) };
        }
        callback(j);
      }
    } catch (_) {}
    setTimeout(poll, 1000);
  }
  poll();
  return () => {
    stopped = true;
  };
}

async function incrementScannedServer(sessionId, token) {
  const r = await fetch(`${serverUrl}/api/sessions/${sessionId}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  if (!r.ok) throw new Error('incrementScanned failed');
}

async function getSessionServer(sessionId) {
  const r = await fetch(`${serverUrl}/api/sessions/${sessionId}`);
  if (!r.ok) return null;
  const j = await r.json();
  if (j?.tokenExpiresAt?._seconds) {
    const ms = j.tokenExpiresAt._seconds * 1000 + Math.floor((j.tokenExpiresAt._nanoseconds || 0) / 1e6);
    j.tokenExpiresAt = { toDate: () => new Date(ms) };
  }
  return j;
}

async function listSessionsServer() {
  // Not implemented on server; return empty list for now
  return [];
}

async function submitAttendanceServer(sessionId, token, userId) {
  // Server currently increments only; ignores userId. Still call it to keep counts correct.
  await incrementScannedServer(sessionId, token);
}

async function listAttendanceServer(sessionId) {
  // Not implemented on server; return empty list
  return [];
}

const useServer = !!serverUrl && !demoMode;

export const createSession = useServer ? createSessionServer : demoMode ? createSessionDemo : createSessionFs;
export const rotateToken = useServer ? rotateTokenServer : demoMode ? rotateTokenDemo : rotateTokenFs;
export const endSession = useServer ? endSessionServer : demoMode ? endSessionDemo : endSessionFs;
export const onSessionSnapshot = useServer ? onSessionSnapshotServer : demoMode ? onSessionSnapshotDemo : onSessionSnapshotFs;
export const incrementScanned = useServer ? incrementScannedServer : demoMode ? incrementScannedDemo : incrementScannedFs;
export const getSession = useServer ? getSessionServer : demoMode ? getSessionDemo : getSessionFs;
export const submitAttendance = useServer ? submitAttendanceServer : demoMode ? submitAttendanceDemo : submitAttendanceFs;
export const listAttendance = useServer ? listAttendanceServer : demoMode ? listAttendanceDemo : listAttendanceFs;
export const listSessions = useServer ? listSessionsServer : demoMode ? listSessionsDemo : listSessionsFs;
