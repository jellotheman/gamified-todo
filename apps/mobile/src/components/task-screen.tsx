import { useEffect, useRef, useState, type RefObject } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, AccessibilityInfo, findNodeHandle } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { Action, Field, fieldProps, colors, ui, Loading, PageHeading } from './frontend';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { privateRepository, Task, TaskDraft, TaskSection, TaskWindow, ListStatus } from '../lib/private-repository';

type Repository = ReturnType<typeof privateRepository>;
const PAGE_SIZE = 25;
const TaskAction = Action;
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
  const [dialog, setDialog] = useState<{ kind: 'actions' | 'edit' | 'delete'; task: Task; title: string } | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [dialogPending, setDialogPending] = useState(false);
  const dialogBusy = useRef(false);
  const origins = useRef<Record<string, View | null>>({});
  const dialogHeading = useRef<View>(null);
  const composer = useRef<TextInput>(null);
  function focus(node: { focus?: () => void } | View | Text | null | undefined) {
    if (!node) return;
    if (Platform.OS === 'web') (node as unknown as { focus?: () => void }).focus?.();
    else { const handle = findNodeHandle(node as View); if (handle) AccessibilityInfo.setAccessibilityFocus(handle); }
  }
  function closeDialog(afterDelete = false) {
    if (dialogBusy.current) return;
    const id = dialog?.task.id;
    setDialog(null); setDialogError('');
    requestAnimationFrame(() => {
      if (!alive.current) return;
      const origin = !afterDelete && id ? origins.current[id] : null;
      if (origin) focus(origin); else composer.current?.focus();
    });
  }
  function openDialog(kind: 'actions' | 'edit' | 'delete', task: Task) {
    setDialogError(''); setDialog({ kind, task, title: task.title });
  }

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
      if (alive.current) { dialogBusy.current = false; closeDialog(dialog.kind === 'delete'); }
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
    <View style={ui.frame}>
    <Field ref={composer} {...fieldProps} label="Task title" accessibilityLabel="Task title" placeholder="What would you like to do?" value={title}
      onChangeText={setTitle} editable={!pending && !draft} returnKeyType="done" onSubmitEditing={() => void add()} />
    <Text style={styles.copy}>Use a title with 1–200 characters.</Text>
    {error ? <ErrorNotice>{error}</ErrorNotice> : null}
    {pending ? <Loading text="Saving task… Waiting for server confirmation." /> : null}
    {draft && !pending ? <Text style={styles.copy}>Retry saves the original submitted title. Your draft is kept until confirmed.</Text> : null}
    <TaskAction title={draft && !pending ? 'Retry adding task' : 'Add task'} primary busy={pending} disabled={pending} onPress={() => void add()} />
    </View>
    {dialog ? <Modal visible animationType="none" onShow={() => { if (dialog.kind !== 'edit') focus(dialogHeading.current); }} onRequestClose={() => closeDialog(false)}>
      <SafeAreaView style={ui.page}><KeyboardAvoidingView style={ui.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.container}><View accessibilityViewIsModal style={ui.panel}>
      <View ref={dialogHeading} tabIndex={-1}><PageHeading>{dialog.kind === 'edit' ? 'Edit task' : dialog.kind === 'actions' ? 'Task actions' : 'Delete this task?'}</PageHeading></View>
      {dialog.kind === 'edit' ? <Field {...fieldProps} autoFocus label="Edit task title" accessibilityLabel="Edit task title" value={dialog.title} editable={!dialogPending}
        onChangeText={(title) => { setDialog({ ...dialog, title }); setDialogError(''); }} returnKeyType="done" onSubmitEditing={() => void saveDialog()} />
        : <Text style={styles.taskTitle}>{dialog.task.title}</Text>}
      {dialog.kind === 'delete' ? <Text style={styles.copy}>This permanently removes the task. You can keep it instead.</Text> : null}
      {dialogError ? <ErrorNotice>{dialogError}</ErrorNotice> : null}
      {dialogPending ? <Loading text="Saving change… Waiting for server confirmation." /> : null}
      {dialog.kind === 'actions' ? <>
        <TaskAction title="Edit task" onPress={() => openDialog('edit', dialog.task)} />
        <TaskAction title="Delete task" danger onPress={() => openDialog('delete', dialog.task)} />
        <TaskAction title="Cancel" onPress={() => closeDialog(false)} />
      </> : <>
      <TaskAction title={dialog.kind === 'edit' ? dialogError ? 'Retry saving title' : 'Save changes' : dialogError ? 'Retry deletion' : 'Delete task'}
        primary={dialog.kind === 'edit'} danger={dialog.kind === 'delete'} busy={dialogPending} disabled={dialogPending} onPress={() => void saveDialog()} />
      <TaskAction title={dialog.kind === 'edit' ? 'Cancel' : 'Keep task'} disabled={dialogPending} onPress={() => closeDialog(false)} />
      </>}
    </View></ScrollView></KeyboardAvoidingView></SafeAreaView></Modal> : null}
    {Object.values(completions).map((operation) => <View key={operation.task.id} style={styles.panel}>
      {operation.pending ? <Text style={styles.copy} accessibilityLiveRegion="polite">Saving completion for {operation.task.title}… Waiting for server confirmation.</Text>
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
        {list.status === 'loading' ? <Text style={styles.copy} accessibilityLiveRegion="polite">Loading {section} tasks…</Text> : null}
        {list.status === 'cached' ? <Text style={styles.copy} accessibilityLiveRegion="polite">Connection not confirmed. Showing last confirmed {section} tasks, if available.</Text> : null}
        {list.status === 'pending' ? <Text style={styles.copy} accessibilityLiveRegion="polite">Waiting for server confirmation of {section} tasks…</Text> : null}
        {list.status === 'error' ? <><ErrorNotice>Unable to load current tasks. Check your connection and retry.</ErrorNotice><TaskAction title={`Retry ${section} tasks`} onPress={list.retry} /></> : null}
        {list.status === 'confirmed' && tasks.length === 0 ? <Text style={styles.copy}>{section === 'active' ? 'A little space to begin. Add your first task above.' : 'Your finished tasks will appear here.'}</Text> : null}
        {tasks.map((task: Task) => <View key={task.id} style={styles.row}>
          <View style={styles.rowControls}>
          <Pressable style={({ pressed }) => [styles.checkTarget, pressed && styles.pressed]} accessibilityRole="checkbox" accessibilityLabel={task.completedAt ? `Undo completion of ${task.title}` : `Complete ${task.title}`}
            aria-checked={!!task.completedAt} aria-busy={!!completions[task.id]?.pending} aria-disabled={!!completions[task.id] || dialog?.task.id === task.id}
            accessibilityState={{ checked: !!task.completedAt, disabled: !!completions[task.id] || dialog?.task.id === task.id, busy: !!completions[task.id]?.pending }}
            disabled={!!completions[task.id] || dialog?.task.id === task.id} onPress={() => void complete(task, task.completedAt === null)}>
          <View aria-hidden pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Checkbox.Android theme={{ colors: { primary: colors.saved } }} status={task.completedAt ? 'checked' : 'unchecked'} color={colors.saved} uncheckedColor={colors.secondary}
            accessible={false} disabled={!!completions[task.id] || dialog?.task.id === task.id} /></View></Pressable>
          <Pressable ref={(node) => { origins.current[task.id] = node; }} accessibilityRole="button" accessibilityLabel={`Edit ${task.title}`}
            aria-disabled={!!dialog || !!completions[task.id]} accessibilityState={{ disabled: !!dialog || !!completions[task.id] }} disabled={!!dialog || !!completions[task.id]}
            onPress={() => openDialog('edit', task)} style={({ pressed }) => [styles.titleTarget, pressed && styles.pressed]}>
            <Text style={[styles.taskTitle, task.completedAt && styles.completed]}>{task.title}</Text>
          </Pressable>
          <View style={styles.actionsTarget}><TaskAction title={`Task actions for ${task.title}`} text="Actions" disabled={!!dialog || !!completions[task.id]} onPress={() => openDialog('actions', task)} /></View></View>
          {completions[task.id] ? <Text style={styles.copy}>{completions[task.id].pending ? 'Saving completion…' : 'Completion change unconfirmed. Use the retry control above.'}</Text> : null}
        </View>)}
        {list.window?.hasMore ? <TaskAction title={section === 'active' ? 'Load more active tasks' : 'Load older completed tasks'} disabled={list.status !== 'confirmed'} onPress={list.more} /> : null}
      </View>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  panel: { gap: 16 },
  heading: { ...ui.section, marginTop: 24 },
  row: { gap: 8, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.secondary, minHeight: 56 },
  rowControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 8 },
  actionsTarget: { alignSelf: 'flex-start', maxWidth: '100%' },
  checkTarget: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  titleTarget: { flexGrow: 1, flexShrink: 1, flexBasis: 120, minHeight: 48, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 4 },
  pressed: { backgroundColor: colors.panel },
  taskTitle: { fontSize: 17, lineHeight: 24, color: colors.ink, flexShrink: 1 },
  completed: { textDecorationLine: 'line-through' },
  copy: ui.copy,
  error: ui.error,
});
