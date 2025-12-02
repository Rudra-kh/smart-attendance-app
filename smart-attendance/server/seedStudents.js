const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load students data
const studentsPath = path.resolve(__dirname, '../src/data/students.json');
const students = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));

// Initialize admin
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
    console.error('Service account JSON not found. Set GOOGLE_APPLICATION_CREDENTIALS env var.');
    process.exit(1);
  }
  const serviceAccount = require(credsPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

initAdmin();
const auth = admin.auth();
const db = admin.firestore();

async function seedStudents() {
  console.log(`Seeding ${students.length} students...`);
  let created = 0;
  let exists = 0;
  
  for (const student of students) {
    const { email, rollNo, name } = student;
    const password = String(rollNo); // rollNo as password
    
    try {
      // Create Firebase Auth user
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
        disabled: false
      });
      
      // Store profile in Firestore
      await db.collection('students').doc(userRecord.uid).set({
        email,
        rollNo,
        name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        passwordChanged: false
      });
      
      created++;
      console.log(`✓ Created: ${rollNo} - ${name}`);
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        exists++;
        console.log(`→ Already exists: ${rollNo} - ${name}`);
      } else {
        console.error(`✗ Failed ${rollNo}:`, e.message);
      }
    }
  }
  
  console.log(`\nDone! Created: ${created}, Already exists: ${exists}`);
  process.exit(0);
}

seedStudents();
