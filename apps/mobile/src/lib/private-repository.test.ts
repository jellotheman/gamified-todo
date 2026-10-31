import { beforeEach, expect, jest, test } from '@jest/globals';
import {
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { localDate, privateRepository } from './private-repository';

jest.mock('./firebase', () => ({ auth: { currentUser: { uid: 'owner-a' } }, firestore: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(() => jest.fn()) }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, ...path: string[]) => path.join('/')),
  doc: jest.fn((_db, ...path: string[]) => ({ path: path.join('/'), id: 'generated-id' })),
  getCountFromServer: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIME'),
  documentId: jest.fn(() => '__name__'),
  where: jest.fn(),
  Timestamp: class {},
  onSnapshot: jest.fn(),
  query: jest.fn(() => ({ type: 'query' })),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

const get =
  jest.fn<() => Promise<{ exists: () => boolean; data: () => Record<string, unknown> }>>();
const set = jest.fn();
const update = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(auth, { currentUser: { uid: 'owner-a' } });
  // SDK transaction callback is the approved database boundary.
  jest
    .mocked(runTransaction)
    .mockImplementation(async (_db, callback) =>
      callback({ get, set, update } as unknown as Parameters<typeof callback>[0])
    );
});

test('invalid titles and goals fail before reaching Firestore', async () => {
  const repository = privateRepository('owner-a');
  expect(() => repository.prepareTask('  ')).toThrow('1–200');
  expect(() => repository.prepareTask('x'.repeat(201))).toThrow('1–200');
  await expect(repository.setDailyGoal(0)).rejects.toThrow();
  await expect(repository.setDailyGoal(21)).rejects.toThrow();
  await expect(repository.setDailyGoal(2.5)).rejects.toThrow();
  expect(runTransaction).not.toHaveBeenCalled();
});

test('profile creation uses the default goal without overwriting an existing private goal', async () => {
  const repository = privateRepository('owner-a');
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  await repository.ensureProfile();
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/profile/settings' }),
    { dailyGoal: 3 }
  );
  set.mockClear();
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ dailyGoal: 8 }) });
  await repository.ensureProfile();
  expect(set).not.toHaveBeenCalled();
  await repository.setDailyGoal(20);
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/profile/settings' }),
    { dailyGoal: 20 }
  );
});

test('a transaction cannot write or resolve as success after the account changes during its read', async () => {
  const repository = privateRepository('owner-a');
  get.mockImplementationOnce(async () => {
    Object.assign(auth, { currentUser: { uid: 'owner-b' } });
    return { exists: () => false, data: () => ({}) };
  });
  await expect(repository.createTask({ id: 'task-1', title: 'Private' })).rejects.toThrow(
    'session changed'
  );
  expect(set).not.toHaveBeenCalled();
  await expect(repository.deleteTask('task-1')).rejects.toThrow('session changed');
});

test('private subscriptions use bounded owner queries and detach on identity change', () => {
  const stopSnapshot = jest.fn();
  jest.mocked(onSnapshot).mockReturnValueOnce(stopSnapshot);
  const repository = privateRepository('owner-a');
  repository.subscribeTaskWindow('active', 25, jest.fn(), jest.fn(), jest.fn());
  expect(query).toHaveBeenCalledWith(
    'users/owner-a/tasks',
    undefined,
    undefined,
    undefined,
    undefined
  );
  expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
  expect(limit).toHaveBeenCalledWith(26);
  const listener = jest.mocked(onAuthStateChanged).mock.calls[0][1];
  if (typeof listener !== 'function') throw new Error('Expected identity listener');
  listener(null);
  expect(stopSnapshot).toHaveBeenCalled();
});

test('a submitted task has one owner-private identity across uncertain save retries', async () => {
  const repository = privateRepository('owner-a');
  const draft = repository.prepareTask('  First task  ');
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  await repository.createTask(draft);
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/tasks/generated-id' }),
    {
      title: 'First task',
      createdAt: 'SERVER_TIME',
      completedAt: null,
    }
  );
  set.mockClear();
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ title: 'First task' }) });
  await repository.createTask(draft);
  expect(set).not.toHaveBeenCalled();
  expect(doc).toHaveBeenLastCalledWith(expect.anything(), 'users', 'owner-a', 'tasks', draft.id);
  expect(serverTimestamp).toHaveBeenCalled();
});

test('deletion is an acknowledged transaction and remains retryable offline', async () => {
  const remove = jest.fn();
  jest
    .mocked(runTransaction)
    .mockImplementationOnce(async (_db, callback) =>
      callback({ get, delete: remove } as unknown as Parameters<typeof callback>[0])
    );
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
  await privateRepository('owner-a').deleteTask('task-1');
  expect(remove).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/tasks/task-1' })
  );
  jest.mocked(runTransaction).mockRejectedValueOnce(new Error('offline'));
  await expect(privateRepository('owner-a').deleteTask('task-1')).rejects.toThrow('offline');
});

test('section windows are bounded with deterministic order and report unconfirmed cache without exposing local writes', () => {
  const next = jest.fn();
  const status = jest.fn();
  const repository = privateRepository('owner-a');
  repository.subscribeTaskWindow('active', 25, next, jest.fn(), status);
  const receive = jest.mocked(onSnapshot).mock.calls[0][2] as (snapshot: unknown) => void;
  receive({ docs: [], metadata: { fromCache: true, hasPendingWrites: false } });
  expect(status).toHaveBeenLastCalledWith('cached');
  expect(next).not.toHaveBeenCalled();
  receive({ docs: [], metadata: { fromCache: false, hasPendingWrites: true } });
  expect(status).toHaveBeenLastCalledWith('pending');
  expect(next).not.toHaveBeenCalled();
  receive({ docs: [], metadata: { fromCache: false, hasPendingWrites: false } });
  expect(next).toHaveBeenLastCalledWith({ tasks: [], hasMore: false });
  expect(limit).toHaveBeenCalledWith(26);
  repository.subscribeTaskWindow('completed', 50, next, jest.fn(), status);
  expect(limit).toHaveBeenLastCalledWith(51);
  expect(orderBy).toHaveBeenCalledWith('completedAt', 'desc');
});

test('completion freezes its date and area, and repeated saved completions do not add credit', async () => {
  const repository = privateRepository('owner-a');
  const submitted = repository.prepareCompletion('daily', 'routine-1', 'health', '2026-10-31');
  expect(Object.isFrozen(submitted)).toBe(true);
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ areaId: 'home' }) });
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ count: 2 }) });
  await repository.setQuestCompletion(submitted, true);
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/completions/daily_routine-1_2026-10-31' }),
    {
      questId: 'routine-1',
      kind: 'daily',
      date: '2026-10-31',
      areaId: 'health',
      createdAt: 'SERVER_TIME',
    }
  );
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/areaDays/health_2026-10-31' }),
    { areaId: 'health', date: '2026-10-31', count: 3, completionId: 'daily_routine-1_2026-10-31' }
  );
  set.mockClear();
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
  get.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({ date: '2026-10-31', areaId: 'health' }),
  });
  await repository.setQuestCompletion(submitted, true);
  expect(set).not.toHaveBeenCalled();
});

test('undo uses the saved completion area and decrements its contribution, even after a quest edit', async () => {
  const remove = jest.fn();
  jest
    .mocked(runTransaction)
    .mockImplementationOnce(async (_db, callback) =>
      callback({ get, set, update, delete: remove } as unknown as Parameters<typeof callback>[0])
    );
  const repository = privateRepository('owner-a');
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ areaId: 'home' }) });
  get.mockResolvedValueOnce({
    exists: () => true,
    data: () => ({ date: '2026-10-30', areaId: 'health' }),
  });
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ count: 1 }) });
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ count: 5 }) });
  await repository.setQuestCompletion(
    repository.prepareCompletion('once', 'task-1', 'home', '2026-10-31'),
    false
  );
  expect(remove).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/completions/once_task-1' })
  );
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/areaDays/health_2026-10-30' }),
    { areaId: 'health', date: '2026-10-30', count: 0, completionId: 'once_task-1' }
  );
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/tasks/task-1' }),
    { completedAt: null }
  );
});

test('legacy completed tasks are never backfilled and can be undone', async () => {
  const repository = privateRepository('owner-a');
  const submitted = repository.prepareCompletion('once', 'old', null, '2026-10-31');
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ completedAt: 'OLD' }) });
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  await repository.setQuestCompletion(submitted, true);
  expect(set).not.toHaveBeenCalled();
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ completedAt: 'OLD' }) });
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  await repository.setQuestCompletion(submitted, false);
  expect(update).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/tasks/old' }),
    { completedAt: null }
  );
});

test('local calendar identity validates actual dates and avoids UTC conversion', () => {
  expect(localDate(new Date(2026, 9, 31, 23, 59))).toBe('2026-10-31');
  const repository = privateRepository('owner-a');
  expect(() => repository.prepareCompletion('daily', 'r', 'health', '2026-02-30')).toThrow(
    'Invalid calendar date'
  );
});

test('a first contribution atomically advances the area total and reports its confirmed value', async () => {
  const repository = privateRepository('owner-a');
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ count: 0 }) });
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ count: 4 }) });
  await expect(
    repository.setQuestCompletion(
      repository.prepareCompletion('daily', 'r1', 'health', '2026-10-31'),
      true
    )
  ).resolves.toBe(5);
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/areaTotals/health' }),
    { count: 5, date: '2026-10-31', completionId: 'daily_r1_2026-10-31' }
  );
});

test('a deleted quest with preserved completion history cannot be recreated', async () => {
  const repository = privateRepository('owner-a');
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
  await expect(
    repository.createQuest({ id: 'old', title: 'Old', kind: 'once', areaId: null })
  ).rejects.toThrow('preserved completion history');
  expect(set).not.toHaveBeenCalled();
});

test('calendar validation rejects impossible dates and accepts leap days', () => {
  const repository = privateRepository('owner-a');
  for (const date of ['2025-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '0000-01-01']) {
    expect(() => repository.prepareCompletion('daily', 'r1', null, date)).toThrow();
  }
  for (const date of ['2024-02-29', '2000-02-29', '2026-04-30']) {
    expect(repository.prepareCompletion('daily', 'r1', null, date).date).toBe(date);
  }
});

test('a transaction retry reports the winning total rather than an aborted concurrent milestone', async () => {
  const repository = privateRepository('owner-a');
  for (const total of [4, 5]) {
    get.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
    get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
    get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
    get.mockResolvedValueOnce({ exists: () => true, data: () => ({ count: total }) });
  }
  jest.mocked(runTransaction).mockImplementationOnce(async (_db, callback) => {
    const transaction = { get, set, update } as unknown as Parameters<typeof callback>[0];
    await callback(transaction); // Firestore discards writes after a conflicting read.
    return callback(transaction);
  });
  await expect(
    repository.setQuestCompletion(
      repository.prepareCompletion('daily', 'r1', 'health', '2026-10-31'),
      true
    )
  ).resolves.toBe(6);
});

test('daily creation writes the routine and its permanent identity together, and retry preserves both', async () => {
  const repository = privateRepository('owner-a');
  const draft = repository.prepareQuest('Walk', 'daily', 'health');
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  await repository.createQuest(draft);
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/routineIdentities/generated-id' }),
    { createdAt: 'SERVER_TIME' }
  );
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/routines/generated-id' }),
    { title: 'Walk', areaId: 'health', createdAt: 'SERVER_TIME' }
  );
  set.mockClear();
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
  await repository.createQuest(draft);
  expect(set).not.toHaveBeenCalled();
});

test('a deleted daily routine identity cannot be reused, even on an uncertain create retry', async () => {
  const repository = privateRepository('owner-a');
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ createdAt: 'OLD' }) });
  await expect(
    repository.createQuest({ id: 'old', title: 'Walk', kind: 'daily', areaId: null })
  ).rejects.toThrow('already been used');
  expect(set).not.toHaveBeenCalled();
});

test('deleting an older routine atomically retains its identity; newer routine markers are not rewritten', async () => {
  const remove = jest.fn();
  jest
    .mocked(runTransaction)
    .mockImplementation(async (_db, callback) =>
      callback({ get, set, update, delete: remove } as unknown as Parameters<typeof callback>[0])
    );
  const repository = privateRepository('owner-a');
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  await repository.deleteQuest('daily', 'legacy');
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/routineIdentities/legacy' }),
    { createdAt: 'SERVER_TIME' }
  );
  expect(remove).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'users/owner-a/routines/legacy' })
  );
  set.mockClear();
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({}) });
  await repository.deleteQuest('daily', 'new');
  expect(set).not.toHaveBeenCalled();
  expect(remove).toHaveBeenLastCalledWith(
    expect.objectContaining({ path: 'users/owner-a/routines/new' })
  );
});

test('routine identity creation aborts when the account changes during the identity read', async () => {
  const repository = privateRepository('owner-a');
  get.mockResolvedValueOnce({ exists: () => false, data: () => ({}) });
  get.mockImplementationOnce(async () => {
    Object.assign(auth, { currentUser: { uid: 'owner-b' } });
    return { exists: () => false, data: () => ({}) };
  });
  await expect(
    repository.createQuest({ id: 'new', title: 'Walk', kind: 'daily', areaId: null })
  ).rejects.toThrow('session changed');
  expect(set).not.toHaveBeenCalled();
});
