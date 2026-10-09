import { useEffect, useRef, useState, type RefObject } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { privateRepository, Task, TaskDraft, TaskSection, TaskWindow, ListStatus } from '../lib/private-repository';

type Repository = ReturnType<typeof privateRepository>;
const PAGE_SIZE = 25;
function TaskAction({ title, text = title, onPress, disabled = false }: { title: string; text?: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
    <Text style={styles.buttonText}>{text}</Text>
  </Pressable>;
}
function ErrorNotice({ children }: { children: string }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{children}</Text>;
}
function useTaskWindow(repository: Repository, section: TaskSection, sequence: RefObject<number>) {
  const [size, setSize] = useState(PAGE_SIZE);
  const [attempt, setAttempt] = useState(0);
  const [window, setWindow] = useState<(TaskWindow & { revision: number }) | null>(null);
  const [status, setStatus] = useState<ListStatus | 'loading' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    let stop = () => {};
    const fail = () => { if (active) setStatus('error'); };
    try {
      stop = repository.subscribeTaskWindow(section, size, (next) => {
        if (active) { setWindow({ ...next, revision: ++sequence.current }); setStatus('confirmed'); }
      }, fail, (next) => { if (active) setStatus(next); });
    } catch { fail(); }
    return () => { active = false; stop(); };
  }, [repository, section, size, attempt, sequence]);
  return { window, status, more: () => { setStatus('loading'); setSize(size + PAGE_SIZE); },
    retry: () => { setStatus('loading'); setAttempt(attempt + 1); } };
}
export default function TaskScreen({ repository }: { repository: Repository }) {
  const sequence = useRef(0);
  const activeTasks = useTaskWindow(repository, 'active', sequence);
  const completedTasks = useTaskWindow(repository, 'completed', sequence);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<{ kind: 'edit' | 'delete'; task: Task; title: string } | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [dialogPending, setDialogPending] = useState(false);
  const dialogBusy = useRef(false);
  const [completions, setCompletions] = useState<Record<string, { task: Task; desired: boolean; pending: boolean }>>({});
  const completionBusy = useRef(new Set<string>());
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function add() {
    if (busy.current) return;
    setError('');
    let submitted: TaskDraft;
    try { submitted = draft ?? repository.prepareTask(title); setDraft(submitted); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Use a task title with 1–200 characters.'); return; }
    busy.current = true; setPending(true);
    try {
      await repository.createTask(submitted);
      if (alive.current) { setDraft(null); setTitle(''); }
    } catch { if (alive.current) setError('Unable to confirm this task was saved. Check your connection and retry the same task.'); }
    finally { busy.current = false; if (alive.current) setPending(false); }
  }
  async function saveDialog() {
    if (!dialog || dialogBusy.current) return;
    setDialogError('');
    const trimmed = dialog.title.trim();
    if (dialog.kind === 'edit' && (!trimmed || trimmed.length > 200)) {
      setDialogError('Use a task title with 1–200 characters.'); return;
    }
    dialogBusy.current = true; setDialogPending(true);
    try {
      if (dialog.kind === 'edit') await repository.renameTask(dialog.task.id, trimmed);
      else await repository.deleteTask(dialog.task.id);
      if (alive.current) setDialog(null);
    } catch { if (alive.current) setDialogError('Unable to confirm this change was saved. Check your connection and retry.'); }
    finally { dialogBusy.current = false; if (alive.current) setDialogPending(false); }
  }
  async function complete(task: Task, desired: boolean) {
    if (completionBusy.current.has(task.id)) return;
    completionBusy.current.add(task.id);
    setCompletions((current) => ({ ...current, [task.id]: { task, desired, pending: true } }));
    try {
      await repository.setCompleted(task.id, desired);
      if (alive.current) setCompletions((current) => { const next = { ...current }; delete next[task.id]; return next; });
    } catch {
      if (alive.current) setCompletions((current) => ({ ...current, [task.id]: { task, desired, pending: false } }));
    } finally { completionBusy.current.delete(task.id); }
  }
  return <View style={styles.panel}>
    <Text style={styles.copy}>Make room for what matters. Start with one small task.</Text>
    <TextInput accessibilityLabel="New task title" placeholder="What would you like to do?" value={title}
      onChangeText={setTitle} editable={!pending && !draft} returnKeyType="done" onSubmitEditing={() => void add()} style={styles.input} />
    <Text style={styles.copy}>Use a title with 1–200 characters.</Text>
    {error ? <ErrorNotice>{error}</ErrorNotice> : null}
    {pending ? <Text accessibilityLiveRegion="polite">Saving task… Waiting for server confirmation.</Text> : null}
    {draft && !pending ? <Text style={styles.copy}>Retry saves the original submitted title. Your draft is kept until confirmed.</Text> : null}
    <TaskAction title={draft && !pending ? 'Retry adding task' : 'Add task'} disabled={pending} onPress={() => void add()} />
    {dialog ? <Modal visible animationType="slide" onRequestClose={() => { if (!dialogBusy.current) { setDialog(null); setDialogError(''); } }}>
      <SafeAreaView style={styles.modalPage}><KeyboardAvoidingView style={styles.modalPage} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}><View accessibilityViewIsModal style={styles.row}>
      <Text accessibilityRole="header" style={styles.taskTitle}>{dialog.kind === 'edit' ? 'Edit task' : 'Delete this task?'}</Text>
      {dialog.kind === 'edit' ? <TextInput autoFocus accessibilityLabel="Edit task title" value={dialog.title} editable={!dialogPending}
        onChangeText={(title) => { setDialog({ ...dialog, title }); setDialogError(''); }} returnKeyType="done" onSubmitEditing={() => void saveDialog()} style={styles.input} />
        : <Text style={styles.copy}>{dialog.task.title}{'\n'}This permanently removes the task. You can keep it instead.</Text>}
      {dialogError ? <ErrorNotice>{dialogError}</ErrorNotice> : null}
      {dialogPending ? <Text accessibilityLiveRegion="polite">Saving change… Waiting for server confirmation.</Text> : null}
      <TaskAction title={dialog.kind === 'edit' ? dialogError ? 'Retry saving title' : 'Save title' : dialogError ? 'Retry deletion' : 'Confirm deletion'}
        disabled={dialogPending} onPress={() => void saveDialog()} />
      <TaskAction title={dialog.kind === 'edit' ? 'Cancel editing' : 'Keep task'} disabled={dialogPending} onPress={() => { setDialog(null); setDialogError(''); }} />
    </View></ScrollView></KeyboardAvoidingView></SafeAreaView></Modal> : null}
    {Object.values(completions).map((operation) => <View key={operation.task.id} style={styles.panel}>
      {operation.pending ? <Text accessibilityLiveRegion="polite">Saving completion for {operation.task.title}… Waiting for server confirmation.</Text>
        : <><ErrorNotice>{`Unable to confirm completion change for ${operation.task.title}. Check your connection and retry.`}</ErrorNotice>
          <TaskAction title={`Retry completion for ${operation.task.title}`} onPress={() => void complete(operation.task, operation.desired)} /></>}
    </View>)}
    {(['active', 'completed'] as const).map((section) => {
      const list = section === 'active' ? activeTasks : completedTasks;
      const other = section === 'active' ? completedTasks : activeTasks;
      // Section listeners arrive independently. A newer confirmed window wins
      // conflicting membership; cache/error metadata never makes old rows fresh.
      const newer = (list.window?.revision ?? -1) > (other.window?.revision ?? -1);
      const tasks = list.window?.tasks.filter((task) => newer || !other.window?.tasks.some((otherTask) => otherTask.id === task.id)) ?? [];
      return <View key={section} style={styles.panel}>
        <Text accessibilityRole="header" style={styles.heading}>{section === 'active' ? 'Active' : 'Completed'}</Text>
        {list.status === 'loading' ? <Text accessibilityLiveRegion="polite">Loading {section} tasks…</Text> : null}
        {list.status === 'cached' ? <Text accessibilityLiveRegion="polite">Connection not confirmed. Showing last confirmed {section} tasks, if available.</Text> : null}
        {list.status === 'pending' ? <Text accessibilityLiveRegion="polite">Waiting for server confirmation of {section} tasks…</Text> : null}
        {list.status === 'error' ? <><ErrorNotice>Unable to load current tasks. Check your connection and retry.</ErrorNotice><TaskAction title={`Retry ${section} tasks`} onPress={list.retry} /></> : null}
        {list.status === 'confirmed' && tasks.length === 0 ? <Text style={styles.copy}>{section === 'active' ? 'A little space to begin. Add your first task above.' : 'Your finished tasks will appear here.'}</Text> : null}
        {tasks.map((task: Task) => <View key={task.id} style={styles.row}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          {completions[task.id] ? <Text style={styles.copy}>{completions[task.id].pending ? 'Saving completion…' : 'Completion change unconfirmed. Use the retry control above.'}</Text> : null}
          <TaskAction title={task.completedAt ? `Undo completion of ${task.title}` : `Complete ${task.title}`} disabled={!!completions[task.id] || dialog?.task.id === task.id}
            text={task.completedAt ? 'Undo completion' : 'Complete'} onPress={() => void complete(task, task.completedAt === null)} />
          <TaskAction title={`Edit ${task.title}`} text="Edit title" disabled={!!dialog || !!completions[task.id]} onPress={() => { setDialogError(''); setDialog({ kind: 'edit', task, title: task.title }); }} />
          <TaskAction title={`Delete ${task.title}`} text="Delete task" disabled={!!dialog || !!completions[task.id]} onPress={() => { setDialogError(''); setDialog({ kind: 'delete', task, title: task.title }); }} />
        </View>)}
        {list.window?.hasMore ? <TaskAction title={section === 'active' ? 'Load more active tasks' : 'Load older completed tasks'} disabled={list.status !== 'confirmed'} onPress={list.more} /> : null}
      </View>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  panel: { gap: 12 },
  modalPage: { flex: 1, backgroundColor: '#fff' },
  modalContent: { flexGrow: 1, padding: 24 },
  heading: { color: '#15251c', fontSize: 22, fontWeight: '700', marginTop: 20 },
  row: { gap: 8, padding: 16, backgroundColor: '#f0f5ef', borderRadius: 12 },
  taskTitle: { fontSize: 18, color: '#15251c', fontWeight: '600' },
  copy: { fontSize: 16, color: '#34483b' },
  input: { borderWidth: 1, borderColor: '#66756c', borderRadius: 8, minHeight: 48, padding: 12, fontSize: 16, color: '#15251c' },
  error: { fontSize: 16, color: '#9a2020' },
  button: { minHeight: 48, borderRadius: 8, backgroundColor: '#214d35', padding: 12, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
