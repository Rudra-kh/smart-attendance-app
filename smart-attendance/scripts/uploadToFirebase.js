// Script to upload students and timetable data to Firebase Firestore
// Run with: node scripts/uploadToFirebase.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch } = require('firebase/firestore');

// Firebase config (same as in app.json)
const firebaseConfig = {
  apiKey: "AIzaSyDEL5dAYnqvBj1TVaJbV-hRT-42Gtkhf5M",
  authDomain: "application-develpoment.firebaseapp.com",
  projectId: "application-develpoment",
  storageBucket: "application-develpoment.firebasestorage.app",
  messagingSenderId: "926607960563",
  appId: "1:926607960563:web:b63faa4e35519080d10a86"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Load local data
const studentsCSE = require('../src/data/students.json');
const studentsECE = require('../src/data/students_ece.json');
const studentsDSAI = require('../src/data/students_dsai.json');
const timetableCSE = require('../src/data/timetable.json');
const timetableECE = require('../src/data/timetable_ece.json');
const timetableDSAI = require('../src/data/timetable_dsai.json');
const languageGroups = require('../src/data/languageGroups.json');

// Combine all students
const allStudents = [
  ...studentsCSE.map(s => ({ ...s, branch: s.branch || 'CSE' })),
  ...studentsECE.map(s => ({ ...s, branch: s.branch || 'ECE' })),
  ...studentsDSAI.map(s => ({ ...s, branch: s.branch || 'DSAI' })),
];

async function uploadStudents() {
  console.log('Uploading students from all branches...');
  console.log(`  - CSE: ${studentsCSE.length} students`);
  console.log(`  - ECE: ${studentsECE.length} students`);
  console.log(`  - DSAI: ${studentsDSAI.length} students`);
  
  const batch = writeBatch(db);
  
  allStudents.forEach((student) => {
    // Use rollNo as document ID for easy lookup
    const docRef = doc(db, 'students', student.rollNo);
    batch.set(docRef, {
      email: student.email,
      rollNo: student.rollNo,
      name: student.name,
      branch: student.branch
    });
  });
  
  await batch.commit();
  console.log(`✅ Uploaded ${allStudents.length} students total`);
}

async function uploadTimetable() {
  console.log('Uploading timetables...');
  
  // Upload CSE timetable
  const cseRef = doc(db, 'timetable', 'CSE');
  await setDoc(cseRef, timetableCSE);
  
  // Upload ECE timetable
  const eceRef = doc(db, 'timetable', 'ECE');
  await setDoc(eceRef, timetableECE);
  
  // Upload DSAI timetable
  const dsaiRef = doc(db, 'timetable', 'DSAI');
  await setDoc(dsaiRef, timetableDSAI);
  
  console.log('✅ Uploaded 3 timetables (CSE, ECE, DSAI)');
}

async function uploadLanguageGroups() {
  console.log('Uploading language groups...');
  
  const langRef = doc(db, 'config', 'languageGroups');
  await setDoc(langRef, languageGroups);
  
  console.log('✅ Uploaded language groups');
}

async function uploadAdminCredentials() {
  console.log('Uploading admin credentials...');
  
  const admins = [
    { email: 'admin@iiitnr.edu.in', password: 'admin123', name: 'Admin', role: 'admin' },
    { email: 'professor@iiitnr.edu.in', password: 'prof123', name: 'Professor', role: 'professor' },
    { email: 'teacher@iiitnr.edu.in', password: 'teacher123', name: 'Teacher', role: 'teacher' },
  ];
  
  const batch = writeBatch(db);
  
  admins.forEach((admin) => {
    const docRef = doc(db, 'admins', admin.email.replace('@', '_at_').replace('.', '_dot_'));
    batch.set(docRef, admin);
  });
  
  await batch.commit();
  console.log(`✅ Uploaded ${admins.length} admin credentials`);
}

async function main() {
  try {
    console.log('🚀 Starting Firebase upload...\n');
    
    await uploadStudents();
    await uploadTimetable();
    await uploadLanguageGroups();
    await uploadAdminCredentials();
    
    console.log('\n✅ All data uploaded successfully!');
    console.log('\nFirebase collections created:');
    console.log('  - students (301 documents)');
    console.log('  - timetable (3 documents)');
    console.log('  - config/languageGroups (1 document)');
    console.log('  - admins (3 documents)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Upload failed:', error);
    process.exit(1);
  }
}

main();
