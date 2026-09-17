import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let dbInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (!dbInstance) {
    let config: any;
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      const raw = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(raw);
    } catch (err) {
      console.warn('[Server DB] Could not read firebase-applet-config.json from cwd, attempting import fallback:', err);
    }

    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    dbInstance = getFirestore(app, config?.firestoreDatabaseId || '(default)');
  }
  return dbInstance;
}

export {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy
};
