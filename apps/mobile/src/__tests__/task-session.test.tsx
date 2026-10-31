import { beforeEach, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import IdentityScreen from '../components/identity-screen';
import type { Identity } from '../lib/identity';
import type { privateRepository, TaskWindow } from '../lib/private-repository';
import { identity } from '../lib/identity';
import { privateRepository as repositoryFactory } from '../lib/private-repository';

type Repository = ReturnType<typeof privateRepository>;
jest.mock('../lib/identity', () => ({
  identity: { observe: jest.fn(), signOut: jest.fn() },
  authMessage: () => 'Connection failed. Please retry.',
}));
jest.mock('../lib/private-repository', () => ({
  privateRepository: jest.fn(),
  AREA_IDS: ['learning', 'health', 'home'],
  DEFAULT_AREA_LABELS: { learning: 'Learning', health: 'Health', home: 'Home' },
  localDate: () => '2026-10-31',
}));

const repositories = new Map<string, Repository>();
const callbacks = new Map<string, (window: TaskWindow) => void>();
const stops: jest.Mock[] = [];
let observe!: (user: Identity | null) => void;
beforeEach(() => {
  jest.resetAllMocks();
  repositories.clear();
  callbacks.clear();
  stops.length = 0;
  jest.mocked(identity.observe).mockImplementation((next) => {
    observe = next;
    return jest.fn();
  });
  jest.mocked(repositoryFactory).mockImplementation((uid) => {
    const repository = {
      dispose: jest.fn(),
      ensureProfile: jest.fn<Repository['ensureProfile']>().mockResolvedValue(undefined),
      subscribeProfile: jest.fn<Repository['subscribeProfile']>((next) => {
        next({ dailyGoal: 3 });
        return jest.fn();
      }),
      subscribeTaskWindow: jest.fn<Repository['subscribeTaskWindow']>((section, _size, next) => {
        callbacks.set(`${uid}/${section}`, next);
        const stop = jest.fn();
        stops.push(stop);
        return stop;
      }),
      subscribeRoutines: jest.fn<Repository['subscribeRoutines']>((_size, next) => {
        next({ routines: [], hasMore: false });
        return jest.fn();
      }),
      subscribeAreas: jest.fn<Repository['subscribeAreas']>((next) => {
        next({ learning: 'Learning', health: 'Health', home: 'Home' });
        return jest.fn();
      }),
      readProgress: jest
        .fn<Repository['readProgress']>()
        .mockResolvedValue({ learning: 0, health: 0, home: 0 }),
      prepareQuest: jest.fn<Repository['prepareQuest']>((title, kind, areaId) => ({
        id: `${uid}-draft`,
        title: title.trim(),
        kind,
        areaId,
      })),
      createQuest: jest.fn<Repository['createQuest']>(),
      setAreaLabels: jest.fn<Repository['setAreaLabels']>(),
    } as unknown as Repository;
    repositories.set(uid, repository);
    return repository;
  });
});

test('account change and sign-out purge drafts and tasks, detach listeners and ignore late saves and snapshots', async () => {
  await render(<IdentityScreen />);
  await act(() => observe({ uid: 'a', email: 'a@example.com' }));
  const first = repositories.get('a')!;
  const oldCallback = callbacks.get('a/active')!;
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  await fireEvent.changeText(screen.getByLabelText('Quest title'), 'Private A');
  let resolveOld!: () => void;
  jest.mocked(first.createQuest).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      })
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Save quest' }));
  await act(() => observe({ uid: 'b', email: 'b@example.com' }));
  expect(screen.queryByText('a@example.com')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  expect(screen.getByLabelText('Quest title').props.value).toBe('');
  expect(stops[0]).toHaveBeenCalled();
  expect(stops[1]).toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Quest title'), 'Private B');
  await act(() => {
    resolveOld();
    oldCallback({
      tasks: [
        {
          id: 'a-task',
          title: 'Private A',
          createdAt: {} as TaskWindow['tasks'][number]['createdAt'],
          completedAt: null,
        },
      ],
      hasMore: false,
    });
  });
  expect(screen.getByLabelText('Quest title').props.value).toBe('Private B');
  expect(screen.queryByText('Private A')).toBeNull();
  let rejectSignOut!: (reason: Error) => void;
  jest.mocked(identity.signOut).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectSignOut = reject;
      })
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Close editor' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Sign out' }));
  expect(screen.queryByLabelText('Quest title')).toBeNull();
  expect(stops[2]).toHaveBeenCalled();
  expect(stops[3]).toHaveBeenCalled();
  await act(() => rejectSignOut(new Error('offline')));
  expect(screen.getByRole('button', { name: 'Retry sign out' })).toBeTruthy();
  expect(screen.queryByText('b@example.com')).toBeNull();
});

test('Account navigation preserves a draft and expanded windows while hiding inactive controls', async () => {
  await render(<IdentityScreen />);
  await act(() => observe({ uid: 'a', email: 'a@example.com' }));
  const repository = repositories.get('a')!;
  await act(() => callbacks.get('a/active')!({ tasks: [], hasMore: true }));
  await fireEvent.press(screen.getByRole('button', { name: 'Load more quests' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  await fireEvent.changeText(screen.getByLabelText('Quest title'), 'Keep this draft');
  await fireEvent.press(screen.getByRole('button', { name: 'Close editor' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Account' }));
  expect(screen.getByText('a@example.com')).toBeTruthy();
  expect(screen.queryByLabelText('Quest title')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Back to quests' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  expect(screen.getByLabelText('Quest title').props.value).toBe('Keep this draft');
  expect(repository.subscribeTaskWindow).toHaveBeenLastCalledWith(
    'active',
    50,
    expect.any(Function),
    expect.any(Function),
    expect.any(Function)
  );
});

test('a new auth event for the same UID replaces the private screen and disposes the old repository', async () => {
  await render(<IdentityScreen />);
  await act(() => observe({ uid: 'a', email: 'a@example.com' }));
  const first = repositories.get('a')!;
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  await fireEvent.changeText(screen.getByLabelText('Quest title'), 'Previous session draft');
  await fireEvent.press(screen.getByRole('button', { name: 'Close editor' }));
  await act(() => observe({ uid: 'a', email: 'a@example.com' }));
  expect(first.dispose).toHaveBeenCalled();
  expect(repositories.get('a')).not.toBe(first);
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  expect(screen.getByLabelText('Quest title').props.value).toBe('');
});
