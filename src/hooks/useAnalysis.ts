import { useEffect, useRef, useState } from 'react';
import type { Analysis, FootprintEntry } from '../types';
import { analyse } from '../utils/analysis';
import { todayStr } from '../utils/format';

interface WorkerResponse {
  id: number;
  result: Analysis;
}

export function useAnalysis(entries: FootprintEntry[], today = todayStr()) {
  const [analysis, setAnalysis] = useState(() => analyse(entries, today));
  const [mode, setMode] = useState<'worker' | 'main'>('main');
  const worker = useRef<Worker | null>(null);
  const entriesRef = useRef(entries);
  const requestId = useRef(0);

  entriesRef.current = entries;

  useEffect(() => {
    if (typeof Worker !== 'function') return;
    try {
      const instance = new Worker(new URL('../workers/analysisWorker.ts', import.meta.url), { type: 'module' });
      worker.current = instance;
      setMode('worker');
      instance.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id === requestId.current) setAnalysis(event.data.result);
      };
      instance.onerror = () => {
        instance.terminate();
        worker.current = null;
        setMode('main');
        setAnalysis(analyse(entriesRef.current, todayStr()));
      };
      return () => {
        instance.terminate();
        worker.current = null;
      };
    } catch {
      setMode('main');
    }
  }, []);

  useEffect(() => {
    const id = ++requestId.current;
    if (worker.current) {
      try {
        worker.current.postMessage({ id, entries, today });
        return;
      } catch {
        worker.current.terminate();
        worker.current = null;
        setMode('main');
      }
    }
    setAnalysis(analyse(entries, today));
  }, [entries, today]);

  return { analysis, mode };
}
