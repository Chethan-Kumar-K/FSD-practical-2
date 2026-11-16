import { analyse } from '../utils/analysis';
import type { FootprintEntry } from '../types';

self.onmessage = (event: MessageEvent<{ id: number; entries: FootprintEntry[]; today: string }>) => {
  const { id, entries, today } = event.data;
  self.postMessage({ id, result: analyse(entries, today) });
};
