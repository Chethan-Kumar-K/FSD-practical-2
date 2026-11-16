import { useEffect, useState } from 'react';

interface ApiSupportProps {
  analysisMode: 'worker' | 'main';
}

interface ApiCheck {
  name: string;
  supported: boolean | 'partial';
  note: string;
}

export function ApiSupport({ analysisMode }: ApiSupportProps) {
  const [checks, setChecks] = useState<ApiCheck[]>([]);

  useEffect(() => {
    let storage = false;
    try {
      localStorage.setItem('__cfi_check', '1');
      localStorage.removeItem('__cfi_check');
      storage = true;
    } catch {
      storage = false;
    }
    setChecks([
      { name: 'Browser storage', supported: storage, note: storage ? 'Theme and reminder preferences can be saved.' : 'Browser storage is blocked.' },
      { name: 'GPS location', supported: 'geolocation' in navigator, note: window.isSecureContext ? 'Used only when you start a GPS trip.' : 'GPS tracking requires HTTPS or localhost.' },
      { name: 'CSS charts', supported: true, note: 'Charts are rendered accessibly with HTML and CSS.' },
      { name: 'Web workers', supported: typeof Worker === 'function', note: analysisMode === 'worker' ? 'Insights are calculated in a background worker.' : 'Insights are calculated on the main thread.' },
      { name: 'Notifications', supported: 'Notification' in window, note: 'Daily reminders require this page to stay open.' },
      { name: 'File backup', supported: 'FileReader' in window && 'Blob' in window && Reflect.has(URL, 'createObjectURL'), note: 'Import and download JSON backups.' },
      { name: 'Share', supported: 'share' in navigator ? true : 'clipboard' in navigator ? 'partial' : false, note: 'Uses the native share sheet or a clipboard fallback when available.' },
      { name: 'Form validation', supported: 'checkValidity' in document.createElement('input'), note: 'Amounts and dates are checked before saving.' },
      { name: 'Scroll observation', supported: 'IntersectionObserver' in window, note: 'Used for scroll-triggered section reveals.' },
    ]);
  }, [analysisMode]);

  return (
    <details className="api-support">
      <summary>Browser features and compatibility</summary>
      <div className="api-table-wrap">
        <table className="api-table">
          <thead><tr><th>Feature</th><th>Status</th><th>How it is used</th></tr></thead>
          <tbody>
            {checks.map((check) => (
              <tr key={check.name}>
                <th scope="row">{check.name}</th>
                <td className={check.supported === true ? 'api-supported' : check.supported === 'partial' ? 'api-partial' : 'api-unsupported'}>
                  {check.supported === true ? 'Supported' : check.supported === 'partial' ? 'Partly supported' : 'Not supported'}
                </td>
                <td>{check.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
