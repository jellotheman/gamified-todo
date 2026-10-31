import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AccessibilityInfo,
  AppState,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Checkbox } from 'react-native-paper';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Action, BodyText, colors, Field, fieldProps, Loading, PageHeading, ui } from './frontend';

import { useTaskWindow } from './use-task-window';

import {
  AREA_IDS,
  DEFAULT_AREA_LABELS,
  localDate,
  type AreaId,
  type AreaLabels,
  type AreaProgress,
  type CompletionSubmission,
  type ListStatus,
  type privateRepository,
  type QuestDraft,
  type Routine,
  type Task,
} from '../lib/private-repository';

type Repository = ReturnType<typeof privateRepository>;

type Quest = {
  id: string;
  kind: 'once' | 'daily';
  title: string;
  areaId: AreaId | null;
  done: boolean;
};

type Edit = {
  kind: 'new' | 'edit';
  quest?: Quest;
  title: string;
  recurrence: 'once' | 'daily';
  areaId: AreaId | null;
};

type Operation = {
  quest: Quest;
  submission: CompletionSubmission;
  desired: boolean;
  pending: boolean;
};

const PAGE = 25;

const MILESTONES = [5, 15, 30, 50, 80];

function randomIndex(length: number) {
  return Math.floor(Math.random() * length);
}

export default function QuestScreen({
  repository,
  visible,
}: {
  repository: Repository;
  visible: boolean;
}) {
  const revision = useRef(0);

  const active = useTaskWindow(repository, 'active', revision);

  const completed = useTaskWindow(repository, 'completed', revision);

  const [routineSize, setRoutineSize] = useState(PAGE);

  const [routines, setRoutines] = useState<Routine[]>([]);

  const [routineMore, setRoutineMore] = useState(false);

  const [routineStatus, setRoutineStatus] = useState<ListStatus | 'loading' | 'error'>('loading');

  const [routineAttempt, setRoutineAttempt] = useState(0);

  const [today, setToday] = useState(localDate);

  const [routineDone, setRoutineDone] = useState<Record<string, boolean>>({});

  const [routineReady, setRoutineReady] = useState<Record<string, boolean>>({});

  const [labels, setLabels] = useState<AreaLabels>(DEFAULT_AREA_LABELS);

  const [areaError, setAreaError] = useState(false);

  const [areaAttempt, setAreaAttempt] = useState(0);

  const [progress, setProgress] = useState<AreaProgress | null>(null);

  const [progressError, setProgressError] = useState(false);

  const [milestone, setMilestone] = useState('');

  const [view, setView] = useState<'quests' | 'progress'>('quests');

  const [collapsed, setCollapsed] = useState(true);

  const [picked, setPicked] = useState('');

  const [editor, setEditor] = useState<Edit | null>(null);

  const [newDraft, setNewDraft] = useState<Edit>({
    kind: 'new',
    title: '',
    recurrence: 'once',
    areaId: null,
  });

  const [editDrafts, setEditDrafts] = useState<Record<string, Edit>>({});

  const [dialog, setDialog] = useState<{ kind: 'actions' | 'delete'; quest: Quest } | null>(null);

  const [error, setError] = useState('');

  const [create, setCreate] = useState<{ draft: QuestDraft; pending: boolean } | null>(null);

  const [changes, setChanges] = useState<
    Record<
      string,
      { quest: Quest; title: string; areaId: AreaId | null; pending: boolean; deleting: boolean }
    >
  >({});

  const [operations, setOperations] = useState<Record<string, Operation>>({});

  const [feedback, setFeedback] = useState<
    Record<string, { quest: Quest; submission: CompletionSubmission; desired: boolean }>
  >({});

  const [routineErrors, setRoutineErrors] = useState<Record<string, boolean>>({});

  const busy = useRef(new Set<string>());

  const alive = useRef(true);

  const loadId = useRef(0);

  const addButton = useRef<View>(null);

  const rowOrigins = useRef<Record<string, View | null>>({});

  const focusOrigin = useRef<string | null>(null);

  const dialogHeading = useRef<View>(null);

  const editorInput = useRef<TextInput>(null);

  const key = (quest: Quest) => `${quest.kind}:${quest.id}`;

  useEffect(() => {
    const generation = loadId;
    alive.current = true;
    return () => {
      alive.current = false;
      generation.current++;
    };
  }, []);

  const refreshProgress = useCallback(async () => {
    const request = ++loadId.current;

    try {
      const value = await repository.readProgress();
      if (alive.current && request === loadId.current) {
        setProgress(value);
        setProgressError(false);
      }
      return value;
    } catch {
      if (alive.current && request === loadId.current) {
        setProgress(null);
        setProgressError(true);
      }
      return null;
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return refreshProgress();
    });
    return () => {
      active = false;
    };
  }, [refreshProgress]);

  useEffect(() => {
    const update = () => {
      setToday(localDate());
      void refreshProgress();
    };

    const now = new Date();

    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const timer = setTimeout(update, next.getTime() - now.getTime() + 100);

    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });

    return () => {
      clearTimeout(timer);
      listener?.remove();
    };
  }, [today, refreshProgress]);

  useEffect(() => {
    let live = true;

    let stop = () => {};

    const fail = () => {
      if (live) setAreaError(true);
    };

    try {
      stop = repository.subscribeAreas((value) => {
        if (live) {
          setLabels(value);
          setAreaError(false);
        }
      }, fail);
    } catch {
      fail();
    }

    return () => {
      live = false;
      stop();
    };
  }, [repository, areaAttempt]);

  useEffect(() => {
    let live = true;

    let stop = () => {};

    const fail = () => {
      if (live) setRoutineStatus('error');
    };

    try {
      stop = repository.subscribeRoutines(
        routineSize,
        (value) => {
          if (live) {
            setRoutines(value.routines);
            setRoutineMore(value.hasMore);
            setRoutineStatus('confirmed');
          }
        },
        fail,
        (value) => {
          if (live) setRoutineStatus(value);
        }
      );
    } catch {
      fail();
    }

    return () => {
      live = false;
      stop();
    };
  }, [repository, routineSize, routineAttempt]);

  useEffect(() => {
    let live = true;

    const stops = routines.map((routine) => {
      try {
        return repository.subscribeRoutineCompletion(
          routine.id,
          today,
          (value) => {
            if (live) {
              setRoutineDone((old) => ({ ...old, [`${today}:${routine.id}`]: !!value }));
              setRoutineReady((old) => ({ ...old, [`${today}:${routine.id}`]: true }));
              setRoutineErrors((old) => ({ ...old, [`${today}:${routine.id}`]: false }));
            }
          },
          () => {
            if (live) {
              setRoutineReady((old) => ({ ...old, [`${today}:${routine.id}`]: false }));
              setRoutineErrors((old) => ({ ...old, [`${today}:${routine.id}`]: true }));
            }
          },
          (status) => {
            if (live && status !== 'confirmed')
              setRoutineReady((old) => ({ ...old, [`${today}:${routine.id}`]: false }));
          }
        );
      } catch {
        if (live) setRoutineErrors((old) => ({ ...old, [`${today}:${routine.id}`]: true }));
        return () => {};
      }
    });

    return () => {
      live = false;
      stops.forEach((stop) => stop());
    };
  }, [repository, routines, today, routineAttempt]);

  useEffect(() => {
    let live = true;

    const stops: (() => void)[] = [];

    for (const [id, item] of Object.entries(feedback)) {
      const clear = () => {
        if (live)
          setFeedback((old) => {
            if (old[id] !== item) return old;
            const next = { ...old };
            delete next[id];
            return next;
          });
      };

      try {
        stops.push(
          repository.subscribeQuestState(
            item.quest.kind,
            item.quest.id,
            (state) => {
              if (!state.exists || (item.quest.kind === 'once' && state.completed !== item.desired))
                clear();
            },
            () => {}
          )
        );

        if (item.quest.kind === 'daily')
          stops.push(
            repository.subscribeRoutineCompletion(
              item.quest.id,
              item.submission.date,

              (value) => {
                if (!!value !== item.desired) clear();
              },
              () => {},
              () => {}
            )
          );
      } catch {
        /* Keep feedback until a confirmed observation can reconcile it. */
      }
    }

    return () => {
      live = false;
      stops.forEach((stop) => stop());
    };
  }, [repository, feedback]);

  function focusAdd() {
    requestAnimationFrame(() => {
      const node =
        (focusOrigin.current && rowOrigins.current[focusOrigin.current]) || addButton.current;
      focusOrigin.current = null;
      if (!node || !alive.current) return;
      if (Platform.OS === 'web') (node as unknown as { focus?: () => void }).focus?.();
      else {
        const handle = findNodeHandle(node);
        if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
      }
    });
  }

  function dismissEditor() {
    if (editor?.kind === 'new') setNewDraft(editor);
    else if (editor?.quest) setEditDrafts((old) => ({ ...old, [key(editor.quest!)]: editor }));
    setEditor(null);
    setError('');
    focusAdd();
  }

  function openEdit(quest: Quest) {
    focusOrigin.current = key(quest);
    setError('');
    setEditor(
      editDrafts[key(quest)] ?? {
        kind: 'edit',
        quest,
        title: quest.title,
        recurrence: quest.kind,
        areaId: quest.areaId,
      }
    );
  }

  async function saveCreate(draft: QuestDraft) {
    if (busy.current.has('create')) return;

    busy.current.add('create');
    setCreate({ draft, pending: true });

    try {
      await repository.createQuest(draft);
      if (alive.current) setCreate(null);
    } catch {
      if (alive.current) setCreate({ draft, pending: false });
    } finally {
      busy.current.delete('create');
    }
  }

  async function saveChange(change: {
    quest: Quest;
    title: string;
    areaId: AreaId | null;
    deleting: boolean;
  }) {
    const id = key(change.quest);
    if (busy.current.has(id)) return;

    if (change.deleting)
      setFeedback((old) => {
        const next = { ...old };
        delete next[id];
        return next;
      });

    busy.current.add(id);
    setChanges((old) => ({ ...old, [id]: { ...change, pending: true } }));

    try {
      if (change.deleting) await repository.deleteQuest(change.quest.kind, change.quest.id);
      else
        await repository.editQuest(change.quest.kind, change.quest.id, change.title, change.areaId);
      if (alive.current)
        setChanges((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });
    } catch {
      if (alive.current) setChanges((old) => ({ ...old, [id]: { ...change, pending: false } }));
    } finally {
      busy.current.delete(id);
    }
  }

  function submitEditor() {
    if (!editor) return;

    const title = editor.title.trim();

    if (!title || title.length > 200) {
      setError('Use a quest title with 1–200 characters.');
      return;
    }

    if (editor.kind === 'new') {
      if (create) {
        setError('Finish or retry the previous quest first.');
        return;
      }

      const draft = repository.prepareQuest(title, editor.recurrence, editor.areaId);

      setNewDraft({ kind: 'new', title: '', recurrence: 'once', areaId: null });
      setEditor(null);
      setError('');
      focusAdd();
      void saveCreate(draft);
    } else if (editor.quest) {
      const quest = editor.quest;
      setEditDrafts((old) => {
        const next = { ...old };
        delete next[key(quest)];
        return next;
      });
      setEditor(null);
      setError('');
      focusAdd();
      void saveChange({ quest, title, areaId: editor.areaId, deleting: false });
    }
  }

  async function complete(
    quest: Quest,
    desired: boolean,
    saved?: CompletionSubmission,
    retry = false
  ) {
    const id = key(quest);
    if (busy.current.has(id)) return;

    const date = localDate();

    if (date !== today) setToday(date);

    if (
      quest.kind === 'daily' &&
      !retry &&
      ((saved && saved.date !== date) || (!saved && date !== today))
    ) {
      setFeedback((old) => {
        const next = { ...old };
        delete next[id];
        return next;
      });

      return;
    }

    const submission =
      saved ?? repository.prepareCompletion(quest.kind, quest.id, quest.areaId, date);

    setFeedback((old) => {
      const next = { ...old };
      delete next[id];
      return next;
    });

    busy.current.add(id);
    setOperations((old) => ({ ...old, [id]: { quest, submission, desired, pending: true } }));

    try {
      const creditedTotal = await repository.setQuestCompletion(submission, desired);

      void refreshProgress();

      if (alive.current) {
        setOperations((old) => {
          const next = { ...old };
          delete next[id];
          return next;
        });

        setFeedback((old) => ({ ...old, [id]: { quest, submission, desired } }));

        if (
          !saved &&
          desired &&
          submission.areaId &&
          typeof creditedTotal === 'number' &&
          MILESTONES.includes(creditedTotal)
        )
          setMilestone(`${labels[submission.areaId]} reached ${creditedTotal} recorded days!`);
      }
    } catch {
      if (alive.current)
        setOperations((old) => ({ ...old, [id]: { quest, submission, desired, pending: false } }));
    } finally {
      busy.current.delete(id);
    }
  }

  const taskQuests = (section: typeof active, other: typeof active) =>
    (section.window?.tasks ?? [])
      .filter(
        (task) =>
          (section.window?.revision ?? -1) > (other.window?.revision ?? -1) ||
          !other.window?.tasks.some((item) => item.id === task.id)
      )
      .map((task: Task): Quest => ({
        id: task.id,
        kind: 'once',
        title: task.title,
        areaId: task.areaId ?? null,
        done: task.completedAt !== null,
      }));

  const activeQuests = taskQuests(active, completed);

  const completedQuests = taskQuests(completed, active);

  const candidates =
    active.status === 'confirmed'
      ? activeQuests.filter(
          (quest) =>
            !operations[key(quest)] && !changes[key(quest)] && !feedback[key(quest)]?.desired
        )
      : [];

  function pickQuest() {
    if (!candidates.length) return;

    const index = randomIndex(candidates.length);

    setPicked(key(candidates[index]));
  }

  const daily = routines.map((routine): Quest => ({
    ...routine,
    kind: 'daily',
    done: !!routineDone[`${today}:${routine.id}`],
  }));

  function row(quest: Quest) {
    const id = key(quest);
    const operation = operations[id];
    const change = changes[id];

    const disabled =
      !!operation || !!change || (quest.kind === 'daily' && !routineReady[`${today}:${quest.id}`]);

    return (
      <View
        key={id}
        style={[
          styles.row,
          picked === id && candidates.some((candidate) => key(candidate) === id) && styles.picked,
        ]}
      >
        <View style={styles.rowControls}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={
              quest.done ? `Undo completion of ${quest.title}` : `Complete ${quest.title}`
            }
            accessibilityState={{ checked: quest.done, disabled, busy: !!operation?.pending }}
            disabled={disabled}
            onPress={() => void complete(quest, !quest.done)}
            style={styles.check}
          >
            <View
              aria-hidden
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Checkbox.Android
                status={quest.done ? 'checked' : 'unchecked'}
                color={colors.saved}
                uncheckedColor={colors.secondary}
                accessible={false}
              />
            </View>
          </Pressable>

          <Pressable
            ref={(node) => {
              rowOrigins.current[id] = node;
            }}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${quest.title}`}
            disabled={disabled}
            onPress={() => openEdit(quest)}
            style={styles.title}
          >
            <BodyText style={styles.questTitle}>{quest.title}</BodyText>
            <BodyText style={styles.meta}>
              {quest.kind === 'daily' ? 'Daily' : 'Once'}
              {quest.areaId ? ` · ${labels[quest.areaId]}` : ''}
            </BodyText>
          </Pressable>

          <Action
            title={`Quest actions for ${quest.title}`}
            text="•••"
            disabled={disabled}
            onPress={() => {
              focusOrigin.current = id;
              setDialog({ kind: 'actions', quest });
            }}
          />
        </View>

        {quest.kind === 'daily' && routineErrors[`${today}:${quest.id}`] ? (
          <>
            <BodyText style={ui.error}>Unable to load today&apos;s completion.</BodyText>
            <Action
              title={`Retry status for ${quest.title}`}
              onPress={() => setRoutineAttempt((n) => n + 1)}
            />
          </>
        ) : null}

        {operation ? (
          operation.pending ? (
            <BodyText style={styles.meta}>Saving completion…</BodyText>
          ) : (
            <BodyText style={ui.error}>Completion not confirmed. Use retry above.</BodyText>
          )
        ) : null}

        {change ? (
          change.pending ? (
            <BodyText style={styles.meta}>Saving quest…</BodyText>
          ) : (
            <BodyText style={ui.error}>Change not confirmed. Use retry above.</BodyText>
          )
        ) : null}
      </View>
    );
  }

  const listStatus = (status: string, retry: () => void, name: string) =>
    status === 'error' ? (
      <>
        <BodyText style={ui.error}>Unable to load {name}.</BodyText>
        <Action title={`Retry ${name}`} onPress={retry} />
      </>
    ) : status !== 'confirmed' ? (
      <BodyText style={styles.meta}>Waiting for confirmed {name}…</BodyText>
    ) : null;

  return (
    <View style={styles.root}>
      <View style={styles.nav} accessibilityRole="tablist" accessibilityLabel="Quest Board views">
        <Action
          title="Quests"
          compact
          selected={view === 'quests'}
          primary={view === 'quests'}
          onPress={() => setView('quests')}
        />
        <Action
          title="Progress"
          compact
          selected={view === 'progress'}
          primary={view === 'progress'}
          onPress={() => {
            setView('progress');
            void refreshProgress();
          }}
        />
      </View>

      {milestone ? (
        <View style={ui.frame}>
          <BodyText accessibilityLiveRegion="polite" style={ui.label}>
            {milestone}
          </BodyText>
          <Action title="Dismiss celebration" onPress={() => setMilestone('')} />
        </View>
      ) : null}

      <View
        style={view === 'quests' ? undefined : { display: 'none' }}
        accessibilityElementsHidden={view !== 'quests' || !visible}
        importantForAccessibility={view !== 'quests' || !visible ? 'no-hide-descendants' : 'auto'}
      >
        <View style={styles.root}>
          <BodyText style={styles.intro}>Small steps count. Choose a quest for today.</BodyText>

          <View ref={addButton}>
            <Action
              title="Add quest"
              compact
              primary
              onPress={() => {
                focusOrigin.current = null;
                setError('');
                setEditor(newDraft);
              }}
            />
          </View>

          {create ? (
            create.pending ? (
              <Loading text="Saving quest…" />
            ) : (
              <View style={ui.frame}>
                <BodyText style={ui.error}>Quest not confirmed: {create.draft.title}</BodyText>
                <Action title="Retry adding quest" onPress={() => void saveCreate(create.draft)} />
              </View>
            )
          ) : null}

          {Object.values(feedback).map((item) => (
            <View key={`feedback-${key(item.quest)}`} style={ui.frame}>
              <BodyText accessibilityLiveRegion="polite" style={styles.meta}>
                {item.desired
                  ? `Completed ${item.quest.title}.`
                  : `Undid completion of ${item.quest.title}.`}
              </BodyText>
              {item.desired && (item.quest.kind === 'once' || item.submission.date === today) ? (
                <Action
                  title={`Undo ${item.quest.title}`}
                  onPress={() => void complete(item.quest, false, item.submission)}
                />
              ) : null}
              <Action
                title={`Dismiss feedback for ${item.quest.title}`}
                onPress={() =>
                  setFeedback((old) => {
                    const next = { ...old };
                    delete next[key(item.quest)];
                    return next;
                  })
                }
              />
            </View>
          ))}

          {Object.values(operations)
            .filter((operation) => operation.pending)
            .map((operation) => (
              <BodyText
                key={`pending-${key(operation.quest)}`}
                accessibilityLiveRegion="polite"
                style={styles.meta}
              >
                Saving {operation.desired ? 'completion' : 'undo'} for {operation.quest.title}…
              </BodyText>
            ))}

          {Object.values(operations)
            .filter((operation) => !operation.pending)
            .map((operation) => (
              <View key={`retry-${key(operation.quest)}`} style={ui.frame}>
                <BodyText style={ui.error}>
                  Completion for {operation.quest.title} was not confirmed.
                </BodyText>
                <Action
                  title={`Retry completion for ${operation.quest.title}`}
                  onPress={() =>
                    void complete(operation.quest, operation.desired, operation.submission, true)
                  }
                />
              </View>
            ))}

          {Object.values(changes)
            .filter((change) => !change.pending)
            .map((change) => (
              <View key={`retry-${key(change.quest)}`} style={ui.frame}>
                <BodyText style={ui.error}>
                  Change to {change.quest.title} was not confirmed.
                </BodyText>
                <Action
                  title={`Retry change for ${change.quest.title}`}
                  onPress={() => void saveChange(change)}
                />
              </View>
            ))}

          <Action title="Pick for me" compact disabled={!candidates.length} onPress={pickQuest} />

          {areaError ? (
            <>
              <BodyText style={ui.error}>Unable to load area names.</BodyText>
              <Action title="Retry area names" onPress={() => setAreaAttempt((n) => n + 1)} />
            </>
          ) : null}

          <BodyText accessibilityRole="header" style={styles.heading}>
            Daily routines
          </BodyText>

          {listStatus(routineStatus, () => setRoutineAttempt((n) => n + 1), 'routines')}

          {routineStatus === 'confirmed' && daily.length === 0 ? (
            <BodyText style={styles.meta}>Add a daily quest to build a routine.</BodyText>
          ) : null}

          {daily.filter((quest) => !quest.done).map(row)}

          {routineMore ? (
            <Action title="Load more routines" onPress={() => setRoutineSize((n) => n + PAGE)} />
          ) : null}

          <BodyText accessibilityRole="header" style={styles.heading}>
            One-off quests
          </BodyText>

          {listStatus(active.status, active.retry, 'quests')}

          {active.status === 'confirmed' && activeQuests.length === 0 ? (
            <BodyText style={styles.meta}>Your next quest starts here.</BodyText>
          ) : null}

          {activeQuests.map(row)}

          {active.window?.hasMore ? (
            <Action
              title="Load more quests"
              disabled={active.status !== 'confirmed'}
              onPress={active.more}
            />
          ) : null}

          <Action
            title={collapsed ? 'Show completed' : 'Hide completed'}
            compact
            onPress={() => setCollapsed(!collapsed)}
          />

          {!collapsed ? (
            <View style={styles.root}>
              {daily.filter((quest) => quest.done).map(row)}

              {listStatus(completed.status, completed.retry, 'completed quests')}

              {completedQuests.map(row)}

              {completed.window?.hasMore ? (
                <Action
                  title="Load older completed quests"
                  disabled={completed.status !== 'confirmed'}
                  onPress={completed.more}
                />
              ) : null}

              {completed.status === 'confirmed' &&
              !completedQuests.length &&
              !daily.some((quest) => quest.done) ? (
                <BodyText style={styles.meta}>Completed quests appear here.</BodyText>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={view === 'progress' ? styles.root : { display: 'none' }}
        accessibilityElementsHidden={view !== 'progress' || !visible}
        importantForAccessibility={view !== 'progress' || !visible ? 'no-hide-descendants' : 'auto'}
      >
        <BodyText style={styles.intro}>
          Every recorded day adds up. These marks reflect activity, not mastery; missed days never
          remove progress.
        </BodyText>

        {progressError ? (
          <BodyText style={ui.error}>
            Progress is unavailable. Check your connection and refresh.
          </BodyText>
        ) : !progress ? (
          <Loading text="Loading progress…" />
        ) : (
          AREA_IDS.map((id) => (
            <View key={id} style={ui.frame}>
              <BodyText accessibilityRole="header" style={styles.heading}>
                {labels[id]}
              </BodyText>
              <BodyText style={styles.questTitle}>
                {progress[id]} recorded {progress[id] === 1 ? 'day' : 'days'}
              </BodyText>
              <BodyText style={styles.meta}>
                {MILESTONES.map((n) => `${progress[id] >= n ? '◆' : '◇'} ${n}`).join('    ')}
              </BodyText>
            </View>
          ))
        )}

        <Action title="Refresh progress" onPress={() => void refreshProgress()} />
      </View>

      {editor ? (
        <Modal
          testID="quest-dialog"
          transparent
          visible
          animationType="none"
          accessibilityLabel={editor.kind === 'new' ? 'Add quest' : 'Edit quest'}
          onShow={() => editorInput.current?.focus()}
          onRequestClose={dismissEditor}
        >
          <SafeAreaView style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalAlign}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.sheetScroll}
              >
                <View accessibilityViewIsModal style={styles.sheet}>
                  <PageHeading>{editor.kind === 'new' ? 'Add quest' : 'Edit quest'}</PageHeading>

                  <Field
                    ref={editorInput}
                    {...fieldProps}
                    compact
                    multiline
                    numberOfLines={3}
                    contentStyle={{
                      minHeight: 96,
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                      textAlignVertical: 'top',
                    }}
                    label="Quest title"
                    accessibilityLabel="Quest title"
                    value={editor.title}
                    onChangeText={(title) => {
                      setEditor({ ...editor, title });
                      setError('');
                    }}
                  />

                  {editor.kind === 'new' ? (
                    <View style={styles.fieldGroup}>
                      <BodyText style={styles.fieldLabel}>How often?</BodyText>
                      <View
                        style={styles.nav}
                        accessibilityRole="radiogroup"
                        accessibilityLabel="How often?"
                      >
                        <Action
                          title="Once"
                          choice
                          compact
                          selected={editor.recurrence === 'once'}
                          primary={editor.recurrence === 'once'}
                          onPress={() => setEditor({ ...editor, recurrence: 'once' })}
                        />
                        <Action
                          title="Daily"
                          choice
                          compact
                          selected={editor.recurrence === 'daily'}
                          primary={editor.recurrence === 'daily'}
                          onPress={() => setEditor({ ...editor, recurrence: 'daily' })}
                        />
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.fieldGroup}>
                    <BodyText style={styles.fieldLabel}>Area (optional)</BodyText>
                    <View
                      style={styles.nav}
                      accessibilityRole="radiogroup"
                      accessibilityLabel="Area, optional"
                    >
                      <Action
                        title="No area"
                        choice
                        compact
                        selected={editor.areaId === null}
                        primary={editor.areaId === null}
                        onPress={() => setEditor({ ...editor, areaId: null })}
                      />
                      {AREA_IDS.map((id) => (
                        <Action
                          key={id}
                          title={labels[id]}
                          choice
                          compact
                          selected={editor.areaId === id}
                          primary={editor.areaId === id}
                          onPress={() => setEditor({ ...editor, areaId: id })}
                        />
                      ))}
                    </View>
                  </View>

                  {error ? (
                    <BodyText accessibilityRole="alert" style={ui.error}>
                      {error}
                    </BodyText>
                  ) : null}

                  <View style={styles.sheetActions}>
                    <Action
                      title={editor.kind === 'new' ? 'Save quest' : 'Save changes'}
                      compact
                      primary
                      onPress={submitEditor}
                    />
                    <Action title="Close editor" compact quiet onPress={dismissEditor} />
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      ) : null}

      {dialog ? (
        <Modal
          testID="quest-dialog"
          transparent
          visible
          animationType="none"
          accessibilityLabel={dialog.kind === 'actions' ? 'Quest actions' : 'Delete this quest?'}
          onShow={() => {
            const node = dialogHeading.current;
            if (!node) return;
            if (Platform.OS === 'web') (node as unknown as { focus?: () => void }).focus?.();
            else {
              const handle = findNodeHandle(node);
              if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
            }
          }}
          onRequestClose={() => {
            setDialog(null);
            focusAdd();
          }}
        >
          <SafeAreaView style={styles.modalBackdrop}>
            <View style={styles.modalAlign}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.sheetScroll}
              >
                <View accessibilityViewIsModal style={styles.sheet}>
                  <View ref={dialogHeading} tabIndex={-1}>
                    <PageHeading>
                      {dialog.kind === 'actions' ? 'Quest actions' : 'Delete this quest?'}
                    </PageHeading>
                  </View>
                  <BodyText style={styles.questTitle}>{dialog.quest.title}</BodyText>
                  {dialog.kind === 'actions' ? (
                    <>
                      <Action
                        title="Edit quest"
                        onPress={() => {
                          const quest = dialog.quest;
                          setDialog(null);
                          openEdit(quest);
                        }}
                      />
                      <Action
                        title="Delete quest"
                        danger
                        onPress={() => setDialog({ ...dialog, kind: 'delete' })}
                      />
                      <Action
                        title="Cancel"
                        onPress={() => {
                          setDialog(null);
                          focusAdd();
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <BodyText style={styles.meta}>
                        Past progress remains. This quest will be removed.
                      </BodyText>
                      <Action
                        title="Confirm delete quest"
                        danger
                        onPress={() => {
                          const quest = dialog.quest;
                          setDialog(null);
                          focusAdd();
                          void saveChange({
                            quest,
                            title: quest.title,
                            areaId: quest.areaId,
                            deleting: true,
                          });
                        }}
                      />
                      <Action
                        title="Keep quest"
                        onPress={() => {
                          setDialog(null);
                          focusAdd();
                        }}
                      />
                    </>
                  )}
                </View>
              </ScrollView>
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  nav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  heading: { ...ui.section, fontSize: 21, lineHeight: 28, marginTop: 12 },
  intro: { ...ui.copy, fontSize: 17, lineHeight: 24 },
  meta: { fontSize: 16, lineHeight: 23, color: colors.secondary },
  questTitle: { fontSize: 19, lineHeight: 26, color: colors.ink },
  row: { borderBottomWidth: 1, borderColor: colors.panel, paddingVertical: 8, gap: 8 },
  picked: { backgroundColor: '#3B301B', borderColor: colors.gold, borderWidth: 1 },
  rowControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  modalBackdrop: { flex: 1, backgroundColor: '#000000BB' },
  modalAlign: { flex: 1, justifyContent: 'flex-end' },
  sheetScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.panel,
    borderTopWidth: 2,
    borderColor: colors.gold,
    padding: 20,
    paddingBottom: 12,
    gap: 12,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: { color: colors.ink, fontSize: 17, lineHeight: 24 },
  sheetActions: { gap: 4, marginTop: 2 },
});
