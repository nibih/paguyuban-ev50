import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import seedData from './seedData.json' with { type: 'json' };

const firebaseConfig = {
  apiKey: "AIzaSyCoSD8l_fMvvky7q9bMTHyEwWDY9eE2G68",
  authDomain: "paguyuban-ev50.firebaseapp.com",
  projectId: "paguyuban-ev50",
  storageBucket: "paguyuban-ev50.firebasestorage.app",
  messagingSenderId: "207640068252",
  appId: "1:207640068252:web:50b9c9bdd77a3974892d59",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedFirestore() {
  console.log('Seeding initial operational data to Firestore paguyuban-ev50...');
  
  // 1. Vault
  await setDoc(doc(db, 'system', 'vault'), seedData.vault);
  console.log('✓ Vault data seeded.');

  // 2. Sample 10 active members to Firestore
  for (const user of seedData.users.slice(0, 15)) {
    await setDoc(doc(db, 'users', user.nik), user);
  }
  console.log('✓ Core users seeded.');

  // 3. Debts
  for (const debt of seedData.debts) {
    await setDoc(doc(db, 'debts', debt.id), debt);
  }
  console.log(`✓ ${seedData.debts.length} debt cards seeded.`);

  // 4. Expenses
  for (const exp of seedData.expenses) {
    await setDoc(doc(db, 'expenses', exp.id), exp);
  }
  console.log(`✓ ${seedData.expenses.length} expenses seeded.`);

  console.log('All Firestore collections successfully seeded!');
}

seedFirestore().catch(err => {
  console.log('Seed info (make sure Firestore Database is created in test mode on console):', err.message);
});
