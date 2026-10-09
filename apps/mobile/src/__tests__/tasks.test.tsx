import { beforeEach, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Timestamp } from 'firebase/firestore';
import TaskScreen from '../components/task-screen';
import type { privateRepository, TaskWindow } from '../lib/private-repository';

jest.mock('firebase/firestore', () => ({ Timestamp: class { seconds: number; nanoseconds: number; constructor(seconds: number, nanoseconds: number) { this.seconds = seconds; this.nanoseconds = nanoseconds; } } }));
const mockCreate = jest.fn<(draft: unknown) => Promise<void>>();
function prepare(title: string) {
  const trimmed = title.trim();
  if (!trimmed || trimmed.length > 200) throw new Error('Use a task title with 1–200 characters.');
  return { id: 'stable-draft', title: trimmed };
}
const mockPrepare = jest.fn(prepare);
const mockSubscribe = jest.fn<ReturnType<typeof privateRepository>['subscribeTaskWindow']>();
const repository = { prepareTask: mockPrepare, createTask: mockCreate, subscribeTaskWindow: mockSubscribe,
  renameTask: jest.fn(), setCompleted: jest.fn(), deleteTask: jest.fn() } as unknown as ReturnType<typeof privateRepository>;
const listeners: Record<string, (window: TaskWindow) => void> = {};
beforeEach(() => {
  jest.resetAllMocks();
  mockPrepare.mockImplementation(prepare);
  delete listeners.active; delete listeners.completed;
  mockSubscribe.mockImplementation((section, _size, next) => { listeners[section] = next; return jest.fn(); });
});

test('capture retains invalid and failed input, retries the same identity, and waits for acknowledgement', async () => {
  await render(<TaskScreen repository={repository} />);
  await fireEvent.changeText(screen.getByLabelText('Task title'), '   ');
  await fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
  expect(screen.getByRole('alert').props.children).toContain('1–200');
  expect(screen.getByLabelText('Task title').props.value).toBe('   ');
  await fireEvent.changeText(screen.getByLabelText('Task title'), '  Buy milk  ');
  let rejectSave!: (reason: Error) => void;
  mockCreate.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Saving task… Waiting for server confirmation.')).toBeTruthy();
  await act(() => rejectSave(new Error('offline')));
  expect(screen.getByLabelText('Task title').props.value).toBe('  Buy milk  ');
  mockCreate.mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry adding task' }));
  expect(mockPrepare).toHaveBeenCalledTimes(2); // invalid title then one submitted draft
  expect(mockCreate.mock.calls[0][0]).toBe(mockCreate.mock.calls[1][0]);
  expect(screen.getByLabelText('Task title').props.value).toBe('');
});

test('saved tasks restore in sections, older history expands, and stale callbacks stop on unmount', async () => {
  const rendered = await render(<TaskScreen repository={repository} />);
  expect(screen.getByText('Loading active tasks…')).toBeTruthy();
  await act(() => listeners.active({ tasks: [{ id: 'one', title: 'Read', createdAt: new Timestamp(10, 0), completedAt: null }], hasMore: false }));
  await act(() => listeners.completed({ tasks: [{ id: 'two', title: 'Walk', createdAt: new Timestamp(5, 0), completedAt: new Timestamp(20, 0) }], hasMore: true }));
  expect(screen.getByRole('checkbox', { name: 'Complete Read' })).toBeTruthy();
  expect(screen.getByRole('checkbox', { name: 'Undo completion of Walk' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Load older completed tasks' }));
  expect(mockSubscribe).toHaveBeenLastCalledWith('completed', 50, expect.any(Function), expect.any(Function), expect.any(Function));
  const late = listeners.active;
  await rendered.unmount();
  await act(() => late({ tasks: [], hasMore: false }));
  expect(mockSubscribe.mock.results[0].value).toHaveBeenCalled();
});



test('editing retains failed input and deletion requires confirmation with recoverable failure', async () => {
  await render(<TaskScreen repository={repository} />);
  await act(() => listeners.active({ tasks: [{ id: 'one', title: 'Read', createdAt: new Timestamp(10, 0), completedAt: null }], hasMore: false }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Read' }));
  await fireEvent.changeText(screen.getByLabelText('Edit task title'), '   ');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(repository.renameTask).not.toHaveBeenCalled();
  await fireEvent.changeText(screen.getByLabelText('Edit task title'), 'Read a book');
  jest.mocked(repository.renameTask).mockRejectedValueOnce(new Error('offline'));
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  expect(screen.getByLabelText('Edit task title').props.value).toBe('Read a book');
  jest.mocked(repository.renameTask).mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry saving title' }));
  expect(repository.renameTask).toHaveBeenLastCalledWith('one', 'Read a book');
  await fireEvent.press(screen.getByRole('button', { name: 'Task actions for Read' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete task' }));
  expect(repository.deleteTask).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Keep task' }));
  expect(repository.deleteTask).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: 'Task actions for Read' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete task' }));
  jest.mocked(repository.deleteTask).mockRejectedValueOnce(new Error('offline'));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete task' }));
  expect(screen.getByRole('button', { name: 'Retry deletion' })).toBeTruthy();
  jest.mocked(repository.deleteTask).mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry deletion' }));
  expect(repository.deleteTask).toHaveBeenLastCalledWith('one');
});

test('completion coalesces taps, retries desired state, then supports saved undo and recompletion', async () => {
  await render(<TaskScreen repository={repository} />);
  const task = { id: 'one', title: 'Read', createdAt: new Timestamp(10, 0), completedAt: null };
  await act(() => listeners.active({ tasks: [task], hasMore: false }));
  let rejectSave!: (error: Error) => void;
  jest.mocked(repository.setCompleted).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Read' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Read' }));
  expect(repository.setCompleted).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Saving completion for Read… Waiting for server confirmation.')).toBeTruthy();
  await act(() => rejectSave(new Error('offline')));
  jest.mocked(repository.setCompleted).mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByRole('button', { name: 'Retry completion for Read' }));
  expect(repository.setCompleted).toHaveBeenLastCalledWith('one', true);
  await act(() => listeners.completed({ tasks: [{ ...task, completedAt: new Timestamp(20, 0) }], hasMore: false }));
  expect(screen.queryByRole('checkbox', { name: 'Complete Read' })).toBeNull(); // no duplicate when section listeners arrive out of order
  jest.mocked(repository.setCompleted).mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Undo completion of Read' }));
  expect(repository.setCompleted).toHaveBeenLastCalledWith('one', false);
  await act(() => listeners.completed({ tasks: [], hasMore: false }));
  await act(() => listeners.active({ tasks: [task], hasMore: false }));
  jest.mocked(repository.setCompleted).mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Read' }));
  expect(repository.setCompleted).toHaveBeenLastCalledWith('one', true);
});

test('confirmed saved capture, edit, completion, undo and deletion restore after remount', async () => {
  let saved: TaskWindow['tasks'] = [];
  const publish = () => {
    listeners.active?.({ tasks: saved.filter((task) => !task.completedAt), hasMore: false });
    listeners.completed?.({ tasks: saved.filter((task) => task.completedAt), hasMore: false });
  };
  mockSubscribe.mockImplementation((section, _size, next) => { listeners[section] = next; publish(); return jest.fn(); });
  mockCreate.mockImplementation(async (draft) => {
    const submitted = draft as { id: string; title: string };
    saved = [{ ...submitted, createdAt: new Timestamp(10, 0), completedAt: null }]; publish();
  });
  jest.mocked(repository.renameTask).mockImplementation(async (id, title) => { saved = saved.map((task) => task.id === id ? { ...task, title } : task); publish(); });
  jest.mocked(repository.setCompleted).mockImplementation(async (id, desired) => { saved = saved.map((task) => task.id === id ? { ...task, completedAt: desired ? new Timestamp(20, 0) : null } : task); publish(); });
  jest.mocked(repository.deleteTask).mockImplementation(async (id) => { saved = saved.filter((task) => task.id !== id); publish(); });
  let rendered = await render(<TaskScreen repository={repository} />);
  await fireEvent.changeText(screen.getByLabelText('Task title'), 'Read');
  await fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Read' }));
  await fireEvent.changeText(screen.getByLabelText('Edit task title'), 'Read the book');
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Read the book' }));
  await rendered.unmount();
  rendered = await render(<TaskScreen repository={repository} />);
  expect(screen.getByRole('checkbox', { name: 'Undo completion of Read the book' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Undo completion of Read the book' }));
  await rendered.unmount();
  rendered = await render(<TaskScreen repository={repository} />);
  expect(screen.getByRole('checkbox', { name: 'Complete Read the book' })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Task actions for Read the book' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete task' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete task' }));
  await rendered.unmount();
  await render(<TaskScreen repository={repository} />);
  expect(screen.queryByText('Read the book')).toBeNull();
  expect(screen.getByText('A little space to begin. Add your first task above.')).toBeTruthy();
});


test('long titles remain editable and list cache, pending, failure and recovery are honest', async () => {
  await render(<TaskScreen repository={repository} />);
  await fireEvent.changeText(screen.getByLabelText('Task title'), 'x'.repeat(201));
  await fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
  expect(screen.getByRole('alert').props.children).toContain('1–200');
  expect(screen.getByLabelText('Task title').props.value).toHaveLength(201);
  const status = mockSubscribe.mock.calls[0][4];
  const fail = mockSubscribe.mock.calls[0][3];
  await act(() => status('cached'));
  expect(screen.getByText('Connection not confirmed. Showing last confirmed active tasks, if available.')).toBeTruthy();
  expect(screen.queryByText('A little space to begin. Add your first task above.')).toBeNull();
  await act(() => status('pending'));
  expect(screen.getByText('Waiting for server confirmation of active tasks…')).toBeTruthy();
  await act(() => fail(new Error('unavailable')));
  await fireEvent.press(screen.getByRole('button', { name: 'Retry active tasks' }));
  expect(screen.getByText('Loading active tasks…')).toBeTruthy();
  await act(() => listeners.active({ tasks: [], hasMore: false }));
  expect(screen.getByText('A little space to begin. Add your first task above.')).toBeTruthy();
});

test('expanded history replaces stale pages on realtime rename, undo and deletion without duplicates', async () => {
  await render(<TaskScreen repository={repository} />);
  const first = { id: 'new', title: 'Newer', createdAt: new Timestamp(10, 0), completedAt: new Timestamp(30, 0) };
  const older = { id: 'old', title: 'Older', createdAt: new Timestamp(5, 0), completedAt: new Timestamp(20, 0) };
  await act(() => listeners.completed({ tasks: [first], hasMore: true }));
  const stalePage = listeners.completed;
  await fireEvent.press(screen.getByRole('button', { name: 'Load older completed tasks' }));
  await act(() => listeners.completed({ tasks: [first, older], hasMore: false }));
  await act(() => stalePage({ tasks: [first], hasMore: true }));
  expect(screen.getByRole('checkbox', { name: 'Undo completion of Older' })).toBeTruthy();
  await act(() => listeners.completed({ tasks: [{ ...older, title: 'Revised older' }], hasMore: false }));
  expect(screen.queryByText('Newer')).toBeNull();
  expect(screen.queryByText('Older')).toBeNull();
  await act(() => listeners.active({ tasks: [{ ...older, title: 'Revised older', completedAt: null }], hasMore: false }));
  expect(screen.getAllByText('Revised older')).toHaveLength(1);
  await act(() => listeners.completed({ tasks: [], hasMore: false }));
  expect(screen.getByRole('checkbox', { name: 'Complete Revised older' })).toBeTruthy();
});

test('saved undo uses fresh active membership when the completed listener retains stale data after failure', async () => {
  await render(<TaskScreen repository={repository} />);
  const task = { id: 'one', title: 'Read', createdAt: new Timestamp(10, 0), completedAt: new Timestamp(20, 0) };
  await act(() => listeners.active({ tasks: [], hasMore: false }));
  await act(() => listeners.completed({ tasks: [task], hasMore: false }));
  jest.mocked(repository.setCompleted).mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Undo completion of Read' }));
  expect(repository.setCompleted).toHaveBeenLastCalledWith('one', false);
  await act(() => listeners.active({ tasks: [{ ...task, completedAt: null }], hasMore: false }));
  await act(() => mockSubscribe.mock.calls[1][3](new Error('unavailable')));
  expect(screen.getByRole('checkbox', { name: 'Complete Read' })).toBeTruthy();
  expect(screen.queryByRole('checkbox', { name: 'Undo completion of Read' })).toBeNull();
  expect(screen.getAllByText('Read')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Retry completed tasks' })).toBeTruthy();
});

test('saved completion uses fresh completed membership when the active listener retains stale data after failure', async () => {
  await render(<TaskScreen repository={repository} />);
  const task = { id: 'one', title: 'Read', createdAt: new Timestamp(10, 0), completedAt: null };
  await act(() => listeners.completed({ tasks: [], hasMore: false }));
  await act(() => listeners.active({ tasks: [task], hasMore: false }));
  jest.mocked(repository.setCompleted).mockResolvedValueOnce(undefined);
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Complete Read' }));
  expect(repository.setCompleted).toHaveBeenLastCalledWith('one', true);
  await act(() => listeners.completed({ tasks: [{ ...task, completedAt: new Timestamp(20, 0) }], hasMore: false }));
  await act(() => mockSubscribe.mock.calls[0][3](new Error('unavailable')));
  expect(screen.getByRole('checkbox', { name: 'Undo completion of Read' })).toBeTruthy();
  expect(screen.queryByRole('checkbox', { name: 'Complete Read' })).toBeNull();
  expect(screen.getAllByText('Read')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Retry active tasks' })).toBeTruthy();
});


test('task actions expose editing and guarded deletion without changing a saved task', async () => {
  await render(<TaskScreen repository={repository} />);
  await act(() => listeners.active({ tasks: [{ id: 'one', title: 'Read', createdAt: new Timestamp(10, 0), completedAt: null }], hasMore: false }));
  await fireEvent.press(screen.getByRole('button', { name: 'Task actions for Read' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete task' }));
  expect(screen.getByText('This permanently removes the task. You can keep it instead.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Keep task' }));
  expect(screen.getByRole('checkbox', { name: 'Complete Read' }).props.accessibilityState.checked).toBe(false);
});

test('keyboard Done and Add coalesce while capture is awaiting acknowledgement', async () => {
  await render(<TaskScreen repository={repository} />);
  let finish!: () => void;
  mockCreate.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await fireEvent.changeText(screen.getByLabelText('Task title'), 'Read');
  await fireEvent(screen.getByLabelText('Task title'), 'submitEditing');
  await fireEvent.press(screen.getByRole('button', { name: 'Add task' }));
  expect(screen.getByRole('button', { name: 'Add task' }).props.accessibilityState.busy).toBe(true);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  await act(() => finish());
  expect(screen.getByLabelText('Task title').props.value).toBe('');
});

test('pending editor cannot be cancelled and failed input remains recoverable', async () => {
  await render(<TaskScreen repository={repository} />);
  await act(() => listeners.active({ tasks: [{ id: 'one', title: 'Read', createdAt: new Timestamp(10, 0), completedAt: null }], hasMore: false }));
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Read' }));
  await fireEvent.changeText(screen.getByLabelText('Edit task title'), 'Read a book');
  let rejectSave!: (reason: Error) => void;
  jest.mocked(repository.renameTask).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save changes' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByLabelText('Edit task title').props.value).toBe('Read a book');
  await act(() => rejectSave(new Error('offline')));
  expect(screen.getByRole('button', { name: 'Retry saving title' })).toBeTruthy();
});


test('completion exposes checked and pending semantics for web and native users', async () => {
  await render(<TaskScreen repository={repository} />);
  const task = { id: 'one', title: 'Read', createdAt: new Timestamp(10, 0), completedAt: new Timestamp(20, 0) };
  await act(() => listeners.completed({ tasks: [task], hasMore: false }));
  expect(screen.getByRole('checkbox', { name: 'Undo completion of Read' }).props.accessibilityState.checked).toBe(true);
  let finish!: () => void;
  jest.mocked(repository.setCompleted).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  await fireEvent.press(screen.getByRole('checkbox', { name: 'Undo completion of Read' }));
  const control = screen.getByRole('checkbox', { name: 'Undo completion of Read' });
  expect(control.props.accessibilityState.busy).toBe(true);
  expect(control.props.accessibilityState.disabled).toBe(true);
  expect(control.props.accessibilityState.checked).toBe(true);
  await act(() => finish());
});
