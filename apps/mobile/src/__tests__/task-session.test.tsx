import { beforeEach, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import IdentityScreen from '../components/identity-screen';
import type { Identity } from '../lib/identity';
import type { privateRepository, TaskWindow } from '../lib/private-repository';
import { identity } from '../lib/identity';
import { privateRepository as repositoryFactory } from '../lib/private-repository';

type Repository = ReturnType<typeof privateRepository>;
jest.mock('../lib/identity', () => ({ identity: { observe: jest.fn(), signOut: jest.fn() }, authMessage: () => 'Connection failed. Please retry.' }));
jest.mock('../lib/private-repository', () => ({ privateRepository: jest.fn() }));


const repositories = new Map<string, Repository>();
const callbacks = new Map<string, (window: TaskWindow) => void>();
const stops: jest.Mock[] = [];
let observe!: (user: Identity | null) => void;
beforeEach(() => {
  jest.resetAllMocks(); repositories.clear(); callbacks.clear(); stops.length = 0;
  jest.mocked(identity.observe).mockImplementation((next) => { observe = next; return jest.fn(); });
  jest.mocked(repositoryFactory).mockImplementation((uid) => {
    const repository = {
      ensureProfile: jest.fn<Repository['ensureProfile']>().mockResolvedValue(undefined),
      subscribeProfile: jest.fn<Repository['subscribeProfile']>((next) => { next({ dailyGoal: 3 }); return jest.fn(); }),
      subscribeTaskWindow: jest.fn<Repository['subscribeTaskWindow']>((section, _size, next) => {
        callbacks.set(`${uid}/${section}`, next); const stop = jest.fn(); stops.push(stop); return stop;
      }),
      prepareTask: jest.fn<Repository['prepareTask']>((title) => ({ id: `${uid}-draft`, title: title.trim() })),
      createTask: jest.fn<Repository['createTask']>(), renameTask: jest.fn(), setCompleted: jest.fn(), deleteTask: jest.fn(),
    } as unknown as Repository;
    repositories.set(uid, repository); return repository;
  });
});

test('account change and sign-out purge drafts and tasks, detach listeners and ignore late saves and snapshots', async () => {
  await render(<IdentityScreen />);
  await act(() => observe({ uid: 'a', email: 'a@example.com' }));
  const first = repositories.get('a')!;
  const oldCallback = callbacks.get('a/active')!;
  await fireEvent.changeText(screen.getByLabelText('New task title'), 'Private A');
  let resolveOld!: () => void;
  jest.mocked(first.createTask).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
  await act(() => observe({ uid: 'b', email: 'b@example.com' }));
  expect(screen.queryByText('a@example.com')).toBeNull();
  expect(screen.getByLabelText('New task title').props.value).toBe('');
  expect(stops[0]).toHaveBeenCalled(); expect(stops[1]).toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('New task title'), 'Private B');
  await act(() => { resolveOld(); oldCallback({ tasks: [{ id: 'a-task', title: 'Private A', createdAt: {} as TaskWindow['tasks'][number]['createdAt'], completedAt: null }], hasMore: false }); });
  expect(screen.getByLabelText('New task title').props.value).toBe('Private B');
  expect(screen.queryByText('Private A')).toBeNull();
  let rejectSignOut!: (reason: Error) => void;
  jest.mocked(identity.signOut).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSignOut = reject; }));
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(screen.queryByLabelText('New task title')).toBeNull();
  expect(stops[2]).toHaveBeenCalled(); expect(stops[3]).toHaveBeenCalled();
  await act(() => rejectSignOut(new Error('offline')));
  expect(screen.getByRole('button', { name: 'Retry sign out' })).toBeTruthy();
  expect(screen.queryByText('b@example.com')).toBeNull();
});

test('Account navigation preserves a draft and expanded windows while hiding inactive controls', async () => {
  await render(<IdentityScreen />);
  await act(() => observe({ uid: 'a', email: 'a@example.com' }));
  const repository = repositories.get('a')!;
  await act(() => callbacks.get('a/active')!({ tasks: [], hasMore: true }));
  await fireEvent.press(screen.getByRole('button', { name: 'Load more active tasks' }));
  await fireEvent.changeText(screen.getByLabelText('New task title'), 'Keep this draft');
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  expect(screen.getByText('a@example.com')).toBeTruthy();
  expect(screen.queryByLabelText('New task title')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to tasks' }));
  expect(screen.getByLabelText('New task title').props.value).toBe('Keep this draft');
  expect(repository.subscribeTaskWindow).toHaveBeenLastCalledWith('active', 50, expect.any(Function), expect.any(Function), expect.any(Function));
});
