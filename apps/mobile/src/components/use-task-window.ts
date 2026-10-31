import { useEffect, useState, type RefObject } from 'react';
import type {
  privateRepository,
  TaskSection,
  TaskWindow,
  ListStatus,
} from '../lib/private-repository';

type Repository = ReturnType<typeof privateRepository>;
const PAGE_SIZE = 25;
export function useTaskWindow(
  repository: Repository,
  section: TaskSection,
  sequence: RefObject<number>
) {
  const [size, setSize] = useState(PAGE_SIZE);
  const [attempt, setAttempt] = useState(0);
  const [window, setWindow] = useState<(TaskWindow & { revision: number }) | null>(null);
  const [status, setStatus] = useState<ListStatus | 'loading' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    let stop = () => {};
    const fail = () => {
      if (active) setStatus('error');
    };
    try {
      stop = repository.subscribeTaskWindow(
        section,
        size,
        (next) => {
          if (active) {
            setWindow({ ...next, revision: ++sequence.current });
            setStatus('confirmed');
          }
        },
        fail,
        (next) => {
          if (active) setStatus(next);
        }
      );
    } catch {
      fail();
    }
    return () => {
      active = false;
      stop();
    };
  }, [repository, section, size, attempt, sequence]);
  return {
    window,
    status,
    more: () => {
      setStatus('loading');
      setSize(size + PAGE_SIZE);
    },
    retry: () => {
      setStatus('loading');
      setAttempt(attempt + 1);
    },
  };
}
