import { onAuthStateChanged } from 'firebase/auth';
import {
  collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, Timestamp,
  type DocumentReference, type DocumentSnapshot, type Query, type QuerySnapshot,
} from 'firebase/firestore';
import { auth, firestore } from './firebase';

export const DEFAULT_DAILY_GOAL = 3;
export interface Profile { dailyGoal: number }
export interface Task { id: string; title: string; createdAt: Timestamp; completedAt: Timestamp | null }
export interface TaskDraft { readonly id: string; readonly title: string }

function titleValue(title: string) {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 200) throw new Error('Use a task title with 1–200 characters.');
  return trimmed;
}

function documentId(id: string) {
  if (!id || id.includes('/') || id === '.' || id === '..' || id.length > 128) throw new Error('Invalid document identity.');
  return id;
}

function profileValue(data: Record<string, unknown>): Profile {
  if (typeof data.dailyGoal !== 'number' || !Number.isInteger(data.dailyGoal) || data.dailyGoal < 1 || data.dailyGoal > 20) {
    throw new Error('Invalid private profile.');
  }
  return { dailyGoal: data.dailyGoal };
}

function taskValue(snapshot: DocumentSnapshot): Task {
  const data = snapshot.data();
  if (!data || typeof data.title !== 'string' || titleValue(data.title) !== data.title ||
    !(data.createdAt instanceof Timestamp) || !(data.completedAt === null || data.completedAt instanceof Timestamp)) {
    throw new Error('Invalid saved task.');
  }
  return { id: snapshot.id, title: data.title, createdAt: data.createdAt, completedAt: data.completedAt };
}

/** A repository belongs to exactly one current identity; discard it on session changes.
 * Mutations resolve only after server acknowledgement. Transactions fail offline.
 * Keep a TaskDraft for retries: a repeated create preserves the existing record.
 */
export function privateRepository(uid: string) {
  documentId(uid);
  function requireOwner() {
    if (auth.currentUser?.uid !== uid) throw new Error('Your session changed. Please sign in again.');
  }
  requireOwner();
  const tasks = collection(firestore, 'users', uid, 'tasks');
  const profile = doc(firestore, 'users', uid, 'profile', 'settings');
  const task = (id: string) => doc(firestore, 'users', uid, 'tasks', documentId(id));

  function observe<T>(source: Query | DocumentReference, decode: (snapshot: QuerySnapshot | DocumentSnapshot) => T,
    next: (value: T) => void, error: (error: unknown) => void) {
    requireOwner();
    let active = true;
    let stopSnapshot = () => {};
    let stopAuth = () => {};
    const stop = () => { active = false; stopSnapshot(); stopAuth(); };
    stopAuth = onAuthStateChanged(auth, (user) => { if (user?.uid !== uid) stop(); });
    const receive = (snapshot: QuerySnapshot | DocumentSnapshot) => {
      if (!active || auth.currentUser?.uid !== uid || snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache) return;
      try { next(decode(snapshot)); } catch (reason) { error(reason); }
    };
    const fail = (reason: unknown) => { if (active && auth.currentUser?.uid === uid) error(reason); };
    stopSnapshot = source.type === 'document'
      ? onSnapshot(source, { includeMetadataChanges: true }, receive, fail)
      : onSnapshot(source, { includeMetadataChanges: true }, receive, fail);
    if (!active) { stopSnapshot(); stopAuth(); }
    return stop;
  }

  return {
    prepareTask(title: string): TaskDraft {
      requireOwner();
      return Object.freeze({ id: doc(tasks).id, title: titleValue(title) });
    },
    async createTask(draft: TaskDraft) {
      requireOwner();
      const reference = task(draft.id);
      const title = titleValue(draft.title);
      await runTransaction(firestore, async (transaction) => {
        requireOwner();
        const current = await transaction.get(reference);
        requireOwner();
        if (!current.exists()) transaction.set(reference, { title, createdAt: serverTimestamp(), completedAt: null });
      });
      requireOwner();
    },
    async renameTask(id: string, title: string) {
      requireOwner();
      const reference = task(id);
      const trimmed = titleValue(title);
      await runTransaction(firestore, async (transaction) => {
        requireOwner();
        const current = await transaction.get(reference);
        requireOwner();
        if (!current.exists()) throw new Error('This task no longer exists.');
        transaction.update(reference, { title: trimmed });
      });
      requireOwner();
    },
    async setCompleted(id: string, completed: boolean) {
      requireOwner();
      const reference = task(id);
      await runTransaction(firestore, async (transaction) => {
        requireOwner();
        const current = await transaction.get(reference);
        requireOwner();
        if (!current.exists()) throw new Error('This task no longer exists.');
        if ((current.data().completedAt !== null) !== completed) {
          transaction.update(reference, { completedAt: completed ? serverTimestamp() : null });
        }
      });
      requireOwner();
    },
    async deleteTask(id: string) {
      requireOwner();
      await deleteDoc(task(id));
      requireOwner();
    },
    subscribeTasks(next: (tasks: Task[]) => void, error: (error: unknown) => void) {
      // Foundation only: ticket #3 adds separate active/history paging queries.
      return observe(query(tasks, orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
        if (!('docs' in snapshot)) throw new Error('Invalid task snapshot.');
        return snapshot.docs.map(taskValue);
      }, next, error);
    },
    async ensureProfile() {
      requireOwner();
      await runTransaction(firestore, async (transaction) => {
        requireOwner();
        const current = await transaction.get(profile);
        requireOwner();
        if (!current.exists()) transaction.set(profile, { dailyGoal: DEFAULT_DAILY_GOAL });
        else profileValue(current.data());
      });
      requireOwner();
    },
    async setDailyGoal(dailyGoal: number) {
      const value = profileValue({ dailyGoal });
      requireOwner();
      await runTransaction(firestore, async (transaction) => {
        requireOwner();
        await transaction.get(profile);
        requireOwner();
        transaction.set(profile, value);
      });
      requireOwner();
    },
    subscribeProfile(next: (profile: Profile) => void, error: (error: unknown) => void) {
      return observe(profile, (snapshot) => {
        if (!('exists' in snapshot) || !snapshot.exists()) throw new Error('Your private profile is unavailable. Please retry.');
        return profileValue(snapshot.data());
      }, next, error);
    },
  };
}
