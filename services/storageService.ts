import { openDB } from 'idb';
import { DiagnosisResult } from '../types';

const DB_NAME = 'fixitnow-db';
const STORE_NAME = 'history';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
};

export const saveDiagnosis = async (result: DiagnosisResult) => {
  try {
    const db = await initDB();
    await db.put(STORE_NAME, result);
  } catch (error) {
    console.error("Failed to save to IndexedDB", error);
  }
};

export const getAllHistory = async (): Promise<DiagnosisResult[]> => {
  try {
    const db = await initDB();
    const all = await db.getAll(STORE_NAME);
    // Sort by timestamp descending (newest first)
    return all.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to load history from IndexedDB", error);
    return [];
  }
};

export const clearHistoryDB = async () => {
  try {
    const db = await initDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error("Failed to clear history", error);
  }
};