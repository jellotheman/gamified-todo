import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  doc,
  documentId as firestoreDocumentId,
  getCountFromServer,
  getDocFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import { auth, firestore } from './firebase';

export const DEFAULT_DAILY_GOAL = 3;
export interface Profile {
  dailyGoal: number;
}
export type AreaId = 'learning' | 'health' | 'home';
export const AREA_IDS: readonly AreaId[] = ['learning', 'health', 'home'];
export const DEFAULT_AREA_LABELS: AreaLabels = {
  learning: 'Learning',
  health: 'Health',
  home: 'Home',
};
export type AreaLabels = Record<AreaId, string>;
export interface Task {
  id: string;
  title: string;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
  areaId?: AreaId | null;
}
export interface Routine {
  id: string;
  title: string;
  createdAt: Timestamp;
  areaId: AreaId | null;
}
export interface QuestDraft {
  readonly id: string;
  readonly title: string;
  readonly areaId: AreaId | null;
  readonly kind: 'once' | 'daily';
}
export interface CompletionSubmission {
  readonly kind: 'once' | 'daily';
  readonly id: string;
  readonly date: string;
  readonly areaId: AreaId | null;
}
export interface Completion {
  id: string;
  questId: string;
  kind: 'once' | 'daily';
  date: string;
  areaId: AreaId | null;
}
export type AreaProgress = Record<AreaId, number>;
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid calendar date.');
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(year, month - 1, day);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day)
    throw new Error('Invalid calendar date.');
  return date;
}
function areaValue(value: unknown): AreaId | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || !AREA_IDS.includes(value as AreaId))
    throw new Error('Invalid area.');
  return value as AreaId;
}
function labelsValue(data: Record<string, unknown>): AreaLabels {
  return Object.fromEntries(
    AREA_IDS.map((id) => {
      if (typeof data[id] !== 'string') throw new Error('Invalid area label.');
      return [id, titleValue(data[id])];
    })
  ) as AreaLabels;
}
function completionId(submission: CompletionSubmission) {
  documentId(submission.id);
  validDate(submission.date);
  areaValue(submission.areaId);
  if (submission.kind === 'once') return `once_${submission.id}`;
  if (submission.kind === 'daily') return `daily_${submission.id}_${submission.date}`;
  throw new Error('Invalid quest kind.');
}
export interface TaskDraft {
  readonly id: string;
  readonly title: string;
}
export type TaskSection = 'active' | 'completed';
export type ListStatus = 'confirmed' | 'cached' | 'pending';
export interface TaskWindow {
  tasks: Task[];
  hasMore: boolean;
}

function titleValue(title: string) {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 200) throw new Error('Use a task title with 1–200 characters.');
  return trimmed;
}

function documentId(id: string) {
  if (!id || id.includes('/') || id === '.' || id === '..' || id.length > 128)
    throw new Error('Invalid document identity.');
  return id;
}

function profileValue(data: Record<string, unknown>): Profile {
  if (
    typeof data.dailyGoal !== 'number' ||
    !Number.isInteger(data.dailyGoal) ||
    data.dailyGoal < 1 ||
    data.dailyGoal > 20
  ) {
    throw new Error('Invalid private profile.');
  }
  return { dailyGoal: data.dailyGoal };
}

function taskValue(snapshot: DocumentSnapshot): Task {
  const data = snapshot.data();
  if (
    !data ||
    typeof data.title !== 'string' ||
    titleValue(data.title) !== data.title ||
    !(data.createdAt instanceof Timestamp) ||
    !(data.completedAt === null || data.completedAt instanceof Timestamp)
  ) {
    throw new Error('Invalid saved task.');
  }
  return {
    id: snapshot.id,
    title: data.title,
    createdAt: data.createdAt,
    completedAt: data.completedAt,
    areaId: areaValue(data.areaId),
  };
}

/** A repository belongs to exactly one current identity; discard it on session changes.
 * Mutations resolve only after server acknowledgement. Transactions fail offline.
 * Keep a TaskDraft for retries: a repeated create preserves the existing record.
 */
export function privateRepository(uid: string) {
  documentId(uid);
  const owner = auth.currentUser;
  if (!owner || owner.uid !== uid) throw new Error('Your session changed. Please sign in again.');
  let valid = true;
  let firstAuthEvent = true;
  const subscriptions = new Set<() => void>();
  function isOwner() {
    if (valid && auth.currentUser !== owner) invalidate();
    return valid;
  }
  function requireOwner() {
    if (!isOwner()) throw new Error('Your session changed. Please sign in again.');
  }
  let stopAuth = () => {};
  function invalidate() {
    if (!valid) return;
    valid = false;
    for (const stop of subscriptions) stop();
    subscriptions.clear();
    stopAuth();
  }
  stopAuth = onAuthStateChanged(auth, (user) => {
    if (firstAuthEvent && user === owner && auth.currentUser === owner) {
      firstAuthEvent = false;
      return;
    }
    firstAuthEvent = false;
    invalidate();
  });
  if (!valid) stopAuth();
  requireOwner();
  const tasks = collection(firestore, 'users', uid, 'tasks');
  const profile = doc(firestore, 'users', uid, 'profile', 'settings');
  const task = (id: string) => doc(firestore, 'users', uid, 'tasks', documentId(id));
  const routines = collection(firestore, 'users', uid, 'routines');
  const routine = (id: string) => doc(firestore, 'users', uid, 'routines', documentId(id));
  const routineIdentity = (id: string) =>
    doc(firestore, 'users', uid, 'routineIdentities', documentId(id));
  const completion = (id: string) => doc(firestore, 'users', uid, 'completions', documentId(id));
  const days = collection(firestore, 'users', uid, 'areaDays');
  const day = (areaId: AreaId, date: string) =>
    doc(firestore, 'users', uid, 'areaDays', `${areaId}_${date}`);
  const labels = doc(firestore, 'users', uid, 'profile', 'areas');
  const total = (areaId: AreaId) => doc(firestore, 'users', uid, 'areaTotals', areaId);

  function observe<T>(
    source: Query | DocumentReference,
    decode: (snapshot: QuerySnapshot | DocumentSnapshot) => T,
    next: (value: T) => void,
    error: (error: unknown) => void,
    status?: (status: ListStatus) => void
  ) {
    requireOwner();
    let active = true;
    let stopSnapshot = () => {};
    const stop = () => {
      if (!active) return;
      active = false;
      subscriptions.delete(stop);
      stopSnapshot();
    };
    subscriptions.add(stop);
    const receive = (snapshot: QuerySnapshot | DocumentSnapshot) => {
      if (!active || !isOwner()) return;
      status?.(
        snapshot.metadata.hasPendingWrites
          ? 'pending'
          : snapshot.metadata.fromCache
            ? 'cached'
            : 'confirmed'
      );
      if (snapshot.metadata.hasPendingWrites || snapshot.metadata.fromCache) return;
      try {
        next(decode(snapshot));
      } catch (reason) {
        error(reason);
      }
    };
    const fail = (reason: unknown) => {
      if (active && isOwner()) error(reason);
    };
    stopSnapshot =
      source.type === 'document'
        ? onSnapshot(source, { includeMetadataChanges: true }, receive, fail)
        : onSnapshot(source, { includeMetadataChanges: true }, receive, fail);
    if (!active) stopSnapshot();
    return stop;
  }

  return {
    dispose: invalidate,
    prepareQuest(title: string, kind: 'once' | 'daily', areaId: AreaId | null): QuestDraft {
      requireOwner();
      if (kind !== 'once' && kind !== 'daily') throw new Error('Invalid quest kind.');
      return Object.freeze({
        id: doc(kind === 'once' ? tasks : routines).id,
        title: titleValue(title),
        kind,
        areaId: areaValue(areaId),
      });
    },
    async createQuest(draft: QuestDraft) {
      requireOwner();
      const reference =
        draft.kind === 'once' ? task(draft.id) : draft.kind === 'daily' ? routine(draft.id) : null;
      if (!reference) throw new Error('Invalid quest kind.');
      const title = titleValue(draft.title);
      const areaId = areaValue(draft.areaId);
      await runTransaction(firestore, async (transaction) => {
        requireOwner();
        const current = await transaction.get(reference);
        requireOwner();
        if (!current.exists()) {
          if (draft.kind === 'once') {
            const preserved = await transaction.get(completion(`once_${documentId(draft.id)}`));
            requireOwner();
            if (preserved.exists())
              throw new Error('This quest identity has preserved completion history.');
          }
          if (draft.kind === 'daily') {
            const identity = routineIdentity(draft.id);
            const preserved = await transaction.get(identity);
            requireOwner();
            if (preserved.exists()) throw new Error('This routine identity has already been used.');
            transaction.set(identity, { createdAt: serverTimestamp() });
          }
          transaction.set(
            reference,
            draft.kind === 'once'
              ? { title, areaId, createdAt: serverTimestamp(), completedAt: null }
              : { title, areaId, createdAt: serverTimestamp() }
          );
        }
      });
      requireOwner();
    },
    async editQuest(kind: 'once' | 'daily', id: string, title: string, areaId: AreaId | null) {
      requireOwner();
      const reference = kind === 'once' ? task(id) : routine(id);
      const value = { title: titleValue(title), areaId: areaValue(areaId) };
      await runTransaction(firestore, async (transaction) => {
        requireOwner();
        const current = await transaction.get(reference);
        requireOwner();
        if (!current.exists()) throw new Error('This quest no longer exists.');
        transaction.update(reference, value);
      });
      requireOwner();
    },
    async deleteQuest(kind: 'once' | 'daily', id: string) {
      requireOwner();
      const reference = kind === 'once' ? task(id) : routine(id);
      await runTransaction(firestore, async (transaction) => {
        requireOwner();
        const current = await transaction.get(reference);
        requireOwner();
        if (current.exists()) {
          // A routine created before identity markers were introduced gets one
          // in the same transaction that removes it, preserving its identity.
          if (kind === 'daily') {
            const identity = routineIdentity(id);
            const preserved = await transaction.get(identity);
            requireOwner();
            if (!preserved.exists()) transaction.set(identity, { createdAt: serverTimestamp() });
          }
          transaction.delete(reference);
        }
      });
      requireOwner();
    },
    prepareCompletion(
      kind: 'once' | 'daily',
      id: string,
      areaId: AreaId | null,
      date = localDate()
    ): CompletionSubmission {
      requireOwner();
      const value = { kind, id, areaId: areaValue(areaId), date: validDate(date) };
      completionId(value);
      return Object.freeze(value);
    },
    async setQuestCompletion(submission: CompletionSubmission, completed: boolean) {
      requireOwner();
      const recordId = completionId(submission);
      const reference = completion(recordId);
      const quest = submission.kind === 'once' ? task(submission.id) : routine(submission.id);
      // A concurrent commit can make Rules reject the stale transaction before
      // Firestore reports an aborted conflict. Retry only when a server read
      // proves one of the documents involved actually changed.
      let observed: { reference: DocumentReference; exists: boolean; count?: number }[] = [];
      const attemptCompletion = () =>
        runTransaction(firestore, async (transaction) => {
          requireOwner();
          const [savedQuest, savedCompletion] = await Promise.all([
            transaction.get(quest),
            transaction.get(reference),
          ]);
          requireOwner();
          if (!savedQuest.exists()) throw new Error('This quest no longer exists.');
          observed = [{ reference, exists: savedCompletion.exists() }];
          // Existing records, not a later edit or retry payload, determine Undo credit.
          const existing = savedCompletion.exists() ? savedCompletion.data() : null;
          const creditArea = existing ? areaValue(existing.areaId) : submission.areaId;
          const creditDate = existing ? validDate(String(existing.date)) : submission.date;
          const counter = creditArea ? day(creditArea, creditDate) : null;
          const counterSnapshot =
            counter && completed !== !!existing ? await transaction.get(counter) : null;
          const currentCount = counterSnapshot?.exists() ? counterSnapshot.data().count : 0;
          if (counter && counterSnapshot)
            observed.push({
              reference: counter,
              exists: counterSnapshot.exists(),
              count: currentCount,
            });
          const changesDay =
            !!counter && !!counterSnapshot && (completed ? currentCount === 0 : currentCount === 1);
          const totalRef = creditArea && changesDay ? total(creditArea) : null;
          const totalSnapshot = totalRef ? await transaction.get(totalRef) : null;
          requireOwner();
          const previousTotal = totalSnapshot?.exists() ? totalSnapshot.data().count : 0;
          if (totalRef && totalSnapshot)
            observed.push({
              reference: totalRef,
              exists: totalSnapshot.exists(),
              count: previousTotal,
            });
          if (
            totalSnapshot &&
            (!Number.isSafeInteger(previousTotal) ||
              previousTotal < 0 ||
              (!completed && previousTotal < 1))
          )
            throw new Error('Invalid saved area total.');
          if (completed && !existing) {
            // A legacy completed task has no credit; never backfill it on retry.
            if (submission.kind === 'once' && savedQuest.data().completedAt !== null) return null;
            transaction.set(reference, {
              questId: submission.id,
              kind: submission.kind,
              date: submission.date,
              areaId: submission.areaId,
              createdAt: serverTimestamp(),
            });
            if (counter && counterSnapshot)
              transaction.set(counter, {
                areaId: creditArea,
                date: creditDate,
                count: (counterSnapshot.exists() ? counterSnapshot.data().count : 0) + 1,
                completionId: recordId,
              });
            if (totalRef)
              transaction.set(totalRef, {
                count: previousTotal + 1,
                date: creditDate,
                completionId: recordId,
              });
            if (submission.kind === 'once')
              transaction.update(quest, { completedAt: serverTimestamp() });
            return totalRef ? previousTotal + 1 : null;
          } else if (!completed && existing) {
            transaction.delete(reference);
            if (counter && counterSnapshot) {
              if (
                !counterSnapshot.exists() ||
                !Number.isSafeInteger(counterSnapshot.data().count) ||
                counterSnapshot.data().count < 1
              )
                throw new Error('Invalid saved area progress.');
              transaction.set(counter, {
                areaId: creditArea,
                date: creditDate,
                count: counterSnapshot.data().count - 1,
                completionId: recordId,
              });
            }
            if (totalRef)
              transaction.set(totalRef, {
                count: previousTotal - 1,
                date: creditDate,
                completionId: recordId,
              });
            if (submission.kind === 'once') transaction.update(quest, { completedAt: null });
          } else if (
            !completed &&
            submission.kind === 'once' &&
            savedQuest.data().completedAt !== null
          ) {
            transaction.update(quest, { completedAt: null });
          }
          return null;
        });
      let creditedTotal: number | null = null;
      for (let attempt = 0; ; attempt++) {
        try {
          creditedTotal = await attemptCompletion();
          break;
        } catch (reason) {
          requireOwner();
          if (
            attempt >= 2 ||
            !reason ||
            typeof reason !== 'object' ||
            !('code' in reason) ||
            reason.code !== 'permission-denied'
          )
            throw reason;
          let changed = false;
          try {
            const snapshots = await Promise.all(
              observed.map((entry) => getDocFromServer(entry.reference))
            );
            requireOwner();
            changed = snapshots.some(
              (snapshot, index) =>
                snapshot.exists() !== observed[index].exists ||
                (observed[index].count !== undefined &&
                  snapshot.exists() &&
                  snapshot.data().count !== observed[index].count)
            );
          } catch {
            requireOwner();
          }
          if (!changed) throw reason;
        }
      }
      requireOwner();
      return creditedTotal;
    },
    subscribeRoutines(
      size: number,
      next: (value: { routines: Routine[]; hasMore: boolean }) => void,
      error: (error: unknown) => void,
      status: (status: ListStatus) => void
    ) {
      if (!Number.isSafeInteger(size) || size < 1) throw new Error('Invalid routine window.');
      return observe(
        query(
          routines,
          orderBy('createdAt', 'desc'),
          orderBy(firestoreDocumentId(), 'desc'),
          limit(size + 1)
        ),
        (snapshot) => {
          if (!('docs' in snapshot)) throw new Error('Invalid routine snapshot.');
          return {
            routines: snapshot.docs.slice(0, size).map((item) => {
              const data = item.data();
              if (
                typeof data.title !== 'string' ||
                titleValue(data.title) !== data.title ||
                !(data.createdAt instanceof Timestamp)
              )
                throw new Error('Invalid saved routine.');
              return {
                id: item.id,
                title: data.title,
                createdAt: data.createdAt,
                areaId: areaValue(data.areaId),
              };
            }),
            hasMore: snapshot.docs.length > size,
          };
        },
        next,
        error,
        status
      );
    },
    subscribeQuestState(
      kind: 'once' | 'daily',
      id: string,
      next: (value: { exists: boolean; completed: boolean }) => void,
      error: (error: unknown) => void
    ) {
      const reference = kind === 'once' ? task(id) : routine(id);
      return observe(
        reference,
        (snapshot) => {
          if (!('exists' in snapshot)) throw new Error('Invalid quest snapshot.');
          if (!snapshot.exists()) return { exists: false, completed: false };
          if (kind === 'daily') return { exists: true, completed: false };
          const value = snapshot.data().completedAt;
          if (value !== null && !(value instanceof Timestamp))
            throw new Error('Invalid saved task.');
          return { exists: true, completed: value !== null };
        },
        next,
        error
      );
    },
    subscribeRoutineCompletion(
      id: string,
      date: string,
      next: (value: Completion | null) => void,
      error: (error: unknown) => void,
      status: (status: ListStatus) => void
    ) {
      const recordId = completionId({ kind: 'daily', id, date, areaId: null });
      return observe(
        completion(recordId),
        (snapshot) => {
          if (!('exists' in snapshot)) throw new Error('Invalid completion snapshot.');
          if (!snapshot.exists()) return null;
          const data = snapshot.data();
          const value: Completion = {
            id: snapshot.id,
            questId: documentId(data.questId),
            kind: data.kind,
            date: validDate(data.date),
            areaId: areaValue(data.areaId),
          };
          if (
            value.kind !== 'daily' ||
            completionId({
              kind: value.kind,
              id: value.questId,
              date: value.date,
              areaId: value.areaId,
            }) !== snapshot.id
          )
            throw new Error('Invalid saved completion.');
          return value;
        },
        next,
        error,
        status
      );
    },
    subscribeAreas(next: (value: AreaLabels) => void, error: (error: unknown) => void) {
      return observe(
        labels,
        (snapshot) => {
          if (!('exists' in snapshot)) throw new Error('Invalid area settings.');
          return snapshot.exists() ? labelsValue(snapshot.data()) : { ...DEFAULT_AREA_LABELS };
        },
        next,
        error
      );
    },
    async setAreaLabels(value: AreaLabels) {
      requireOwner();
      const normalized = labelsValue(value);
      await runTransaction(firestore, async (transaction) => {
        requireOwner();
        await transaction.get(labels);
        requireOwner();
        transaction.set(labels, normalized);
      });
      requireOwner();
    },
    async readProgress(): Promise<AreaProgress> {
      requireOwner();
      const counts = await Promise.all(
        AREA_IDS.map((id) =>
          getCountFromServer(query(days, where('areaId', '==', id), where('count', '>', 0)))
        )
      );
      requireOwner();
      return Object.fromEntries(
        AREA_IDS.map((id, index) => [id, counts[index].data().count])
      ) as AreaProgress;
    },
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
        if (!current.exists())
          transaction.set(reference, { title, createdAt: serverTimestamp(), completedAt: null });
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
    async deleteTask(id: string) {
      requireOwner();
      const reference = task(id);
      await runTransaction(firestore, async (transaction) => {
        requireOwner();
        const current = await transaction.get(reference);
        requireOwner();
        if (current.exists()) transaction.delete(reference);
      });
      requireOwner();
    },
    subscribeTaskWindow(
      section: TaskSection,
      size: number,
      next: (window: TaskWindow) => void,
      error: (error: unknown) => void,
      status: (status: ListStatus) => void
    ) {
      if (!Number.isSafeInteger(size) || size < 1) throw new Error('Invalid task window.');
      // Reobserve the complete bounded window on expansion, rather than appending stale
      // cursor pages. Realtime moves/deletes/recompletion cannot leave gaps or duplicates.
      const source =
        section === 'active'
          ? query(
              tasks,
              where('completedAt', '==', null),
              orderBy('createdAt', 'desc'),
              orderBy(firestoreDocumentId(), 'desc'),
              limit(size + 1)
            )
          : query(
              tasks,
              where('completedAt', '>', new Timestamp(0, 0)),
              orderBy('completedAt', 'desc'),
              orderBy(firestoreDocumentId(), 'desc'),
              limit(size + 1)
            );
      return observe(
        source,
        (snapshot) => {
          if (!('docs' in snapshot)) throw new Error('Invalid task snapshot.');
          return {
            tasks: snapshot.docs.slice(0, size).map(taskValue),
            hasMore: snapshot.docs.length > size,
          };
        },
        next,
        error,
        status
      );
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
      return observe(
        profile,
        (snapshot) => {
          if (!('exists' in snapshot) || !snapshot.exists())
            throw new Error('Your private profile is unavailable. Please retry.');
          return profileValue(snapshot.data());
        },
        next,
        error
      );
    },
  };
}
