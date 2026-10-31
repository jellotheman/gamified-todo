import { beforeEach, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import QuestScreen from '../components/quest-screen';
import type {
  privateRepository,
  CompletionSubmission,
  Routine,
  TaskWindow,
} from '../lib/private-repository';

type Repository = ReturnType<typeof privateRepository>;
let mockDate = '2026-10-31';
jest.mock('../lib/private-repository', () => ({
  AREA_IDS: ['learning', 'health', 'home'],
  DEFAULT_AREA_LABELS: { learning: 'Learning', health: 'Health', home: 'Home' },
  localDate: () => mockDate,
}));
let repository: Repository;
let publishDaily!: (value: { routines: Routine[]; hasMore: boolean }) => void;
let publishCompletion!: (
  value: { id: string; questId: string; kind: 'daily'; date: string; areaId: 'health' } | null
) => void;
let publishActive!: (value: TaskWindow) => void;
let publishQuest!: (value: { exists: boolean; completed: boolean }) => void;
const progress = { learning: 0, health: 4, home: 0 };
beforeEach(() => {
  mockDate = '2026-10-31';
  repository = {
    subscribeTaskWindow: jest.fn<Repository['subscribeTaskWindow']>((section, _size, next) => {
      if (section === 'active') publishActive = next;
      next({ tasks: [], hasMore: false });
      return jest.fn();
    }),
    subscribeRoutines: jest.fn<Repository['subscribeRoutines']>((_size, next) => {
      publishDaily = next;
      next({ routines: [], hasMore: false });
      return jest.fn();
    }),
    subscribeRoutineCompletion: jest.fn<Repository['subscribeRoutineCompletion']>(
      (_id, _date, next) => {
        publishCompletion = next;
        if (jest.mocked(repository?.subscribeRoutineCompletion).mock.calls.length === 1) next(null);
        return jest.fn();
      }
    ),
    subscribeQuestState: jest.fn<Repository['subscribeQuestState']>((_kind, _id, next) => {
      publishQuest = next;
      return jest.fn();
    }),
    subscribeAreas: jest.fn<Repository['subscribeAreas']>((next) => {
      next({ learning: 'Learning', health: 'Health', home: 'Home' });
      return jest.fn();
    }),
    readProgress: jest.fn<Repository['readProgress']>().mockResolvedValue(progress),
    prepareQuest: jest.fn<Repository['prepareQuest']>((title, kind, areaId) =>
      Object.freeze({ id: 'draft', title, kind, areaId })
    ),
    createQuest: jest.fn<Repository['createQuest']>().mockResolvedValue(undefined),
    prepareCompletion: jest.fn<Repository['prepareCompletion']>((kind, id, areaId, day) =>
      Object.freeze({ kind, id, areaId, date: day! })
    ),
    setQuestCompletion: jest.fn<Repository['setQuestCompletion']>().mockResolvedValue(undefined),
    editQuest: jest.fn<Repository['editQuest']>().mockResolvedValue(undefined),
    deleteQuest: jest.fn<Repository['deleteQuest']>().mockResolvedValue(undefined),
  } as unknown as Repository;
});

test('daily editor retains a dismissed draft and saves a stable categorized quest', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  await fireEvent.changeText(screen.getByLabelText('Quest title'), '  Walk  ');
  await fireEvent.press(screen.getByRole('radio', { name: 'Daily' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Health' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Close editor' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  expect(screen.getByLabelText('Quest title').props.value).toBe('  Walk  ');
  await fireEvent.press(screen.getByRole('button', { name: 'Save quest' }));
  expect(repository.createQuest).toHaveBeenCalledWith({
    id: 'draft',
    title: 'Walk',
    kind: 'daily',
    areaId: 'health',
  });
  expect(screen.queryByLabelText('Quest title')).toBeNull();
});

test('failed completion retries the frozen submission across midnight and shows only confirmed progress', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await act(() =>
    publishDaily({
      routines: [
        { id: 'r1', title: 'Walk', areaId: 'health', createdAt: {} as Routine['createdAt'] },
      ],
      hasMore: false,
    })
  );
  jest.mocked(repository.setQuestCompletion).mockRejectedValueOnce(new Error('offline'));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Walk' }));
  const submission = jest.mocked(repository.setQuestCompletion).mock
    .calls[0][0] as CompletionSubmission;
  expect(submission).toEqual({ kind: 'daily', id: 'r1', date: '2026-10-31', areaId: 'health' });
  mockDate = '2026-11-01';
  jest.mocked(repository.readProgress).mockResolvedValue({ ...progress, health: 5 });
  await fireEvent.press(screen.getByRole('button', { name: 'Retry completion for Walk' }));
  expect(repository.setQuestCompletion).toHaveBeenLastCalledWith(submission, true);
  expect(screen.queryByText('Health reached 5 recorded days!')).toBeNull();
  await fireEvent.press(screen.getByRole('tab', { name: 'Progress' }));
  expect(screen.getByText('5 recorded days')).toBeTruthy();
});

test('completed routines are observed separately and undo does not appear until disclosed', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await act(() =>
    publishDaily({
      routines: [
        { id: 'r1', title: 'Walk', areaId: 'health', createdAt: {} as Routine['createdAt'] },
      ],
      hasMore: false,
    })
  );
  await act(() =>
    publishCompletion({
      id: 'daily_r1_2026-10-31',
      questId: 'r1',
      kind: 'daily',
      date: '2026-10-31',
      areaId: 'health',
    })
  );
  expect(screen.queryByRole('checkbox', { name: 'Undo completion of Walk' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Show completed' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Undo completion of Walk' }));
  expect(repository.setQuestCompletion).toHaveBeenCalledWith(
    expect.objectContaining({ date: '2026-10-31', id: 'r1' }),
    false
  );
});

test('pick for me chooses a displayed one-off without completing it', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await act(() =>
    publishActive({
      tasks: [
        {
          id: 't1',
          title: 'Read',
          areaId: null,
          completedAt: null,
          createdAt: {} as TaskWindow['tasks'][number]['createdAt'],
        },
      ],
      hasMore: false,
    })
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Pick for me' }));
  expect(repository.setQuestCompletion).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Edit Read' })).toBeTruthy();
});

test('only the confirmed transaction that credits the milestone celebrates', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await act(() =>
    publishDaily({
      routines: [
        { id: 'r1', title: 'Walk', areaId: 'health', createdAt: {} as Routine['createdAt'] },
      ],
      hasMore: false,
    })
  );
  jest.mocked(repository.setQuestCompletion).mockResolvedValueOnce(5);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Walk' }));
  expect(screen.getByText('Health reached 5 recorded days!')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Undo Walk' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Undo Walk' }));
  expect(repository.setQuestCompletion).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: 'r1' }),
    false
  );
});

test('routine listener errors expose an explicit status retry', async () => {
  let fail!: (reason: unknown) => void;
  jest
    .mocked(repository.subscribeRoutineCompletion)
    .mockImplementation((_id, _date, _next, error) => {
      fail = error;
      return jest.fn();
    });
  await render(<QuestScreen repository={repository} visible />);
  await act(() =>
    publishDaily({
      routines: [
        { id: 'r1', title: 'Walk', areaId: 'health', createdAt: {} as Routine['createdAt'] },
      ],
      hasMore: false,
    })
  );
  await act(() => fail(new Error('offline')));
  expect(
    screen.getByRole('checkbox', { name: 'Complete Walk' }).props.accessibilityState.disabled
  ).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry status for Walk' }));
  expect(repository.subscribeRoutineCompletion).toHaveBeenCalledTimes(2);
});

test('a new daily undo after midnight is blocked even before the clock refreshes', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await act(() =>
    publishDaily({
      routines: [
        { id: 'r1', title: 'Walk', areaId: 'health', createdAt: {} as Routine['createdAt'] },
      ],
      hasMore: false,
    })
  );
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Walk' }));
  expect(screen.getByRole('button', { name: 'Undo Walk' })).toBeTruthy();
  mockDate = '2026-11-01';
  await fireEvent.press(screen.getByRole('button', { name: 'Undo Walk' }));
  expect(repository.setQuestCompletion).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Undo Walk' })).toBeNull();
});

test('confirmed external undo and deletion clear stale undo feedback', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await act(() =>
    publishDaily({
      routines: [
        { id: 'r1', title: 'Walk', areaId: 'health', createdAt: {} as Routine['createdAt'] },
      ],
      hasMore: false,
    })
  );
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Walk' }));
  expect(screen.getByRole('button', { name: 'Undo Walk' })).toBeTruthy();
  await act(() => publishCompletion(null));
  expect(screen.queryByRole('button', { name: 'Undo Walk' })).toBeNull();
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Walk' }));
  expect(screen.getByRole('button', { name: 'Undo Walk' })).toBeTruthy();
  await act(() => publishQuest({ exists: false, completed: false }));
  expect(screen.queryByRole('button', { name: 'Undo Walk' })).toBeNull();
});

test('deleting a completed quest clears its undo feedback immediately', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await act(() =>
    publishDaily({
      routines: [
        { id: 'r1', title: 'Walk', areaId: 'health', createdAt: {} as Routine['createdAt'] },
      ],
      hasMore: false,
    })
  );
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Walk' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Quest actions for Walk' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete quest' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Confirm delete quest' }));
  expect(screen.queryByRole('button', { name: 'Undo Walk' })).toBeNull();
});

test('pick excludes pending and failed one-off operations', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await act(() =>
    publishActive({
      tasks: [
        {
          id: 't1',
          title: 'Read',
          areaId: null,
          completedAt: null,
          createdAt: {} as TaskWindow['tasks'][number]['createdAt'],
        },
      ],
      hasMore: false,
    })
  );
  let reject!: (error: Error) => void;
  jest.mocked(repository.setQuestCompletion).mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      })
  );
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Read' }));
  expect(
    screen.getByRole('button', { name: 'Pick for me' }).props.accessibilityState.disabled
  ).toBe(true);
  await act(() => reject(new Error('offline')));
  expect(
    screen.getByRole('button', { name: 'Pick for me' }).props.accessibilityState.disabled
  ).toBe(true);
});

test('confirmed external undo clears a one-off completion notice', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await act(() =>
    publishActive({
      tasks: [
        {
          id: 't1',
          title: 'Read',
          areaId: null,
          completedAt: null,
          createdAt: {} as TaskWindow['tasks'][number]['createdAt'],
        },
      ],
      hasMore: false,
    })
  );
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Read' }));
  expect(screen.getByRole('button', { name: 'Undo Read' })).toBeTruthy();
  await act(() => publishQuest({ exists: true, completed: false }));
  expect(screen.queryByRole('button', { name: 'Undo Read' })).toBeNull();
});

test('view tabs and editor radio groups expose their current selection', async () => {
  await render(<QuestScreen repository={repository} visible />);
  expect(screen.getByRole('tab', { name: 'Quests' }).props.accessibilityState.selected).toBe(true);
  expect(screen.getByRole('tab', { name: 'Progress' }).props.accessibilityState.selected).toBe(
    false
  );
  await fireEvent.press(screen.getByRole('tab', { name: 'Progress' }));
  expect(screen.getByRole('tab', { name: 'Progress' }).props.accessibilityState.selected).toBe(
    true
  );
  await fireEvent.press(screen.getByRole('tab', { name: 'Quests' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  expect(screen.getByRole('radio', { name: 'Once' }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole('radio', { name: 'Daily' }).props.accessibilityState.checked).toBe(false);
  expect(screen.getByRole('radio', { name: 'No area' }).props.accessibilityState.checked).toBe(
    true
  );
  await fireEvent.press(screen.getByRole('radio', { name: 'Daily' }));
  await fireEvent.press(screen.getByRole('radio', { name: 'Health' }));
  expect(screen.getByRole('radio', { name: 'Once' }).props.accessibilityState.checked).toBe(false);
  expect(screen.getByRole('radio', { name: 'Daily' }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole('radio', { name: 'No area' }).props.accessibilityState.checked).toBe(
    false
  );
  expect(screen.getByRole('radio', { name: 'Health' }).props.accessibilityState.checked).toBe(true);
});

test('editor, actions and deletion modals have distinct accessible names', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  expect(screen.getByTestId('quest-dialog').props.accessibilityLabel).toBe('Add quest');
  await fireEvent.press(screen.getByRole('button', { name: 'Close editor' }));
  await act(() =>
    publishActive({
      tasks: [
        {
          id: 't1',
          title: 'Read',
          areaId: null,
          completedAt: null,
          createdAt: {} as TaskWindow['tasks'][number]['createdAt'],
        },
      ],
      hasMore: false,
    })
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Quest actions for Read' }));
  expect(screen.getByTestId('quest-dialog').props.accessibilityLabel).toBe('Quest actions');
  await fireEvent.press(screen.getByRole('button', { name: 'Delete quest' }));
  expect(screen.getByTestId('quest-dialog').props.accessibilityLabel).toBe('Delete this quest?');
  await fireEvent.press(screen.getByRole('button', { name: 'Keep quest' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Read' }));
  expect(screen.getByTestId('quest-dialog').props.accessibilityLabel).toBe('Edit quest');
});

test('the editor wraps long titles and submits the full validated value', async () => {
  await render(<QuestScreen repository={repository} visible />);
  await fireEvent.press(screen.getByRole('button', { name: 'Add quest' }));
  const title = `${'A clear next step '.repeat(12).slice(0, 199)}x`;
  expect(screen.getByLabelText('Quest title').props.multiline).toBe(true);
  await fireEvent.changeText(screen.getByLabelText('Quest title'), title);
  expect(screen.getByLabelText('Quest title').props.value).toBe(title);
  await fireEvent.press(screen.getByRole('button', { name: 'Save quest' }));
  expect(repository.createQuest).toHaveBeenCalledWith(
    expect.objectContaining({ title: title.trim() })
  );
});
