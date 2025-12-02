import cse from '../data/students.json';
import dsai from '../data/students_dsai.json';
import ece from '../data/students_ece.json';

export function loadStudents(branch) {
  const key = String(branch || '').toUpperCase();
  if (key === 'DSAI') return Array.isArray(dsai) ? dsai : [];
  if (key === 'ECE') return Array.isArray(ece) ? ece : [];
  return Array.isArray(cse) ? cse : []; // default CSE
}

export function getTotalStudents(branch) {
  return loadStudents(branch).length;
}

export function compareRoll(a, b) {
  const da = String(a || '').replace(/\D/g, '');
  const db = String(b || '').replace(/\D/g, '');
  if (da && db) {
    const na = Number(da);
    const nb = Number(db);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  }
  return String(a || '').localeCompare(String(b || ''));
}

export function loadAllStudents() {
  const all = [];
  if (Array.isArray(cse)) all.push(...cse);
  if (Array.isArray(dsai)) all.push(...dsai);
  if (Array.isArray(ece)) all.push(...ece);
  const seen = new Set();
  const unique = [];
  for (const s of all) {
    const id = String(s?.rollNo || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(s);
  }
  return unique;
}
