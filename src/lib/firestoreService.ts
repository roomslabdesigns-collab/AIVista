import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

export interface StoredAnalysis {
  id?: string;
  brandName: string;
  targetDomain: string;
  status: 'running' | 'completed';
  createdAt: any;
  kpis?: any;
  recommendationApproved?: boolean;
  selectedScope?: number[];
}

export async function saveAnalysisRun(runData: Omit<StoredAnalysis, 'createdAt'>) {
  try {
    const runId = runData.id || `run_${Date.now()}`;
    const docRef = doc(db, 'analysis_runs', runId);
    await setDoc(docRef, {
      ...runData,
      createdAt: serverTimestamp()
    }, { merge: true });
    return runId;
  } catch (error) {
    console.error('[Firebase] Failed to save analysis run:', error);
    throw error;
  }
}

export async function getLatestAnalysisRun(): Promise<StoredAnalysis | null> {
  try {
    const q = query(collection(db, 'analysis_runs'), orderBy('createdAt', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const firstDoc = snapshot.docs[0];
      return { id: firstDoc.id, ...firstDoc.data() } as StoredAnalysis;
    }
    return null;
  } catch (error) {
    console.warn('[Firebase] Could not fetch latest run, using default in-memory state:', error);
    return null;
  }
}

export async function updateExperimentApproval(runId: string, approved: boolean, scope: number[]) {
  try {
    const docRef = doc(db, 'experiments', runId);
    await setDoc(docRef, {
      runId,
      approved,
      scope,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('[Firebase] Failed to update experiment approval:', error);
  }
}
