import { useState, type DragEvent, type ChangeEvent } from 'react';
import type { Analysis, EntryInput, FootprintEntry, Pledge } from '../types';
import { CAT_NAME } from '../data/catalogue';
import { todayStr } from '../utils/format';
import { parseBackup } from '../utils/backup';
import { Button } from './ui/Button';

interface DataToolsProps {
  entries: FootprintEntry[];
  analysis: Analysis;
  pledges: Pledge[];
  onImport: (entries: EntryInput[]) => Promise<number>;
  onImportPledges: (pledges: Pledge[]) => void;
  onClear: () => Promise<void>;
  onClearPledges: () => void;
  onNotify: (message: string) => void;
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function DataTools({ entries, analysis, pledges, onImport, onImportPledges, onClear, onClearPledges, onNotify }: DataToolsProps) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  function exportCsv() {
    if (analysis.monthTotal <= 0) {
      onNotify('There is nothing to download yet.');
      return;
    }
    const rows = [...entries].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
    const csv = [
      'date,category,activity,amount,unit,kg_co2e',
      ...rows.map((entry) =>
        [entry.date, CAT_NAME[entry.cat], entry.label, entry.amount, entry.unit, entry.kg].map(csvCell).join(','),
      ),
    ].join('\r\n');
    download(`carbon-log-${todayStr()}.csv`, `\ufeff${csv}`, 'text/csv;charset=utf-8');
    onNotify('CSV downloaded.');
  }

  function exportJson() {
    const backup = { app: 'carbonfootprint-india', version: 1, exportedAt: new Date().toISOString(), entries, pledges };
    download(`carbon-backup-${todayStr()}.json`, JSON.stringify(backup, null, 2), 'application/json');
    onNotify('JSON backup downloaded.');
  }

  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatus('That file is larger than 2 MB. Choose a JSON backup downloaded from this page.');
      return;
    }

    setBusy(true);
    try {
      const parsed = parseBackup(await file.text(), entries);
      const count = await onImport(parsed.entries);
      if (parsed.pledges.length) {
        const existing = new Set(pledges.map((pledge) => pledge.id));
        const imported = parsed.pledges.filter((pledge) => {
          if (existing.has(pledge.id)) return false;
          existing.add(pledge.id);
          return true;
        });
        onImportPledges(imported);
      }
      setStatus(`Imported ${count} ${count === 1 ? 'entry' : 'entries'}.${parsed.skipped ? ` Skipped ${parsed.skipped} duplicate or invalid entries.` : ''}`);
    } catch (error) {
      setStatus(error instanceof Error ? `Import failed: ${error.message}` : 'Import failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function clearAll() {
    if (!window.confirm('Delete every logged activity and pledge? This cannot be undone. Download a backup first if you need one.')) {
      return;
    }
    setBusy(true);
    try {
      await onClear();
      onClearPledges();
      setStatus('All entries and pledges were cleared.');
    } catch (error) {
      setStatus(error instanceof Error ? `Could not clear all entries: ${error.message}` : 'Could not clear all entries.');
    } finally {
      setBusy(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    void importFile(event.dataTransfer.files[0]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    void importFile(event.target.files?.[0]);
    event.target.value = '';
  }

  function printReport() {
    window.print();
  }

  async function shareSummary() {
    if (!entries.length) {
      onNotify('Log a few activities first, then share your summary.');
      return;
    }
    const annualTons = (analysis.monthTotal / 30) * 365 / 1000;
    let text = `In the last 30 days I logged ${analysis.monthTotal.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg CO₂e`;
    if (analysis.prevTotal > 0) {
      const percent = Math.round((Math.abs(analysis.monthTotal - analysis.prevTotal) / analysis.prevTotal) * 100);
      text += `, ${percent}% ${analysis.monthTotal <= analysis.prevTotal ? 'lower' : 'higher'} than the 30 days before`;
    }
    text += `. At this pace that is ${annualTons.toLocaleString('en-IN', { maximumFractionDigits: 2 })} t a year, against a 2.3 t target. Tracked with CarbonFootprint India.`;

    if ('share' in navigator) {
      try {
        await navigator.share({ title: 'My carbon footprint', text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    if ('clipboard' in navigator) {
      try {
        await navigator.clipboard.writeText(text);
        onNotify('Summary copied. Paste it wherever you like.');
        return;
      } catch {
        setStatus(`Could not share automatically. Copy this summary: ${text}`);
        return;
      }
    }
    setStatus(text);
  }

  return (
    <aside className="card data-tools" aria-labelledby="backup-title">
      <h3 id="backup-title" className="form-title">Back up or move your log</h3>
      <p className="muted">Export a spreadsheet or JSON backup, restore a backup from another device, or print a report.</p>
      <div className="tool-actions">
        <Button onClick={exportCsv}>Download CSV</Button>
        <Button variant="outline" onClick={exportJson}>Download JSON backup</Button>
        <Button variant="outline" onClick={printReport}>Print report</Button>
        <Button variant="outline" onClick={() => void shareSummary()}>Share my summary</Button>
      </div>
      <label
        className="dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        htmlFor="backup-file"
      >
        <strong>Drop a JSON backup here</strong>
        <span>or choose a file (up to 2 MB)</span>
      </label>
      <input id="backup-file" className="sr-only" type="file" accept=".json,application/json" onChange={handleFileChange} />
      {status && <p className="tool-status" role="status">{status}</p>}
      <Button variant="danger" disabled={busy} onClick={() => void clearAll()}>
        {busy ? 'Working…' : 'Clear all data'}
      </Button>
    </aside>
  );
}
