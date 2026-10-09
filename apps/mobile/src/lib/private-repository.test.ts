import { beforeEach, expect, jest, test } from '@jest/globals';
import { doc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { privateRepository } from './private-repository';

jest.mock('./firebase', () => ({ auth: { currentUser: { uid: 'owner-a' } }, firestore: {} }));
jest.mock('firebase/auth', () => ({ onAuthStateChanged: jest.fn(() => jest.fn()) }));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn((_db, ...path: string[]) => path.join('/')),
  doc: jest.fn((_db, ...path: string[]) => ({ path: path.join('/'), id: 'generated-id' })),
  runTransaction: jest.fn(), serverTimestamp: jest.fn(() => 'SERVER_TIME'),
  deleteDoc: jest.fn(), onSnapshot: jest.fn(), query: jest.fn(() => ({ type: 'query' })), orderBy: jest.fn(), limit: jest.fn(),
}));

const get = jest.fn<() => Promise<{ exists: () => boolean; data: () => Record<string, unknown> }>>();
const set = jest.fn();
const update = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(auth, { currentUser: { uid: 'owner-a' } });
  // SDK transaction callback is the approved database boundary.
  jest.mocked(runTransaction).mockImplementation(async (_db, callback) =>
    callback({ get, set, update } as unknown as Parameters<typeof callback>[0]));
});

test('completion requests preserve saved timestamps; undo and recompletion produce the requested state', async () => {
  const repository = privateRepository('owner-a');
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ completedAt: 'OLD_TIME' }) });
  await repository.setCompleted('task-1', true);
  expect(update).not.toHaveBeenCalled();
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ completedAt: 'OLD_TIME' }) });
  await repository.setCompleted('task-1', false);
  expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'users/owner-a/tasks/task-1' }), { completedAt: null });
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ completedAt: null }) });
  await repository.setCompleted('task-1', true);
  expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ path: 'users/owner-a/tasks/task-1' }), { completedAt: 'SERVER_TIME' });
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
  expect(set).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/owner-a/profile/settings' }), { dailyGoal: 3 });
  set.mockClear();
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ dailyGoal: 8 }) });
  await repository.ensureProfile();
  expect(set).not.toHaveBeenCalled();
  await repository.setDailyGoal(20);
  expect(set).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/owner-a/profile/settings' }), { dailyGoal: 20 });
});

test('a transaction cannot write or resolve as success after the account changes during its read', async () => {
  const repository = privateRepository('owner-a');
  get.mockImplementationOnce(async () => {
    Object.assign(auth, { currentUser: { uid: 'owner-b' } });
    return { exists: () => false, data: () => ({}) };
  });
  await expect(repository.createTask({ id: 'task-1', title: 'Private' })).rejects.toThrow('session changed');
  expect(set).not.toHaveBeenCalled();
  await expect(repository.deleteTask('task-1')).rejects.toThrow('session changed');
});

test('private subscriptions use bounded owner queries and detach on identity change', () => {
  const stopSnapshot = jest.fn();
  jest.mocked(onSnapshot).mockReturnValueOnce(stopSnapshot);
  const repository = privateRepository('owner-a');
  repository.subscribeTasks(jest.fn(), jest.fn());
  expect(query).toHaveBeenCalledWith('users/owner-a/tasks', undefined, undefined);
  expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
  expect(limit).toHaveBeenCalledWith(50);
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
  expect(set).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/owner-a/tasks/generated-id' }), {
    title: 'First task', createdAt: 'SERVER_TIME', completedAt: null,
  });
  set.mockClear();
  get.mockResolvedValueOnce({ exists: () => true, data: () => ({ title: 'First task' }) });
  await repository.createTask(draft);
  expect(set).not.toHaveBeenCalled();
  expect(doc).toHaveBeenLastCalledWith(expect.anything(), 'users', 'owner-a', 'tasks', draft.id);
  expect(serverTimestamp).toHaveBeenCalled();
});
