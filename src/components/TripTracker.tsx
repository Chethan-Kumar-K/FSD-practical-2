import { useEffect, useRef, useState } from 'react';
import { categories } from '../data/catalogue';
import { fmt } from '../utils/format';
import { Button } from './ui/Button';

interface TripTrackerProps {
  onUseTrip: (kind: string, kilometers: number) => void;
}

interface Position {
  latitude: number;
  longitude: number;
}

const TRAVEL_OPTIONS = categories.travel.options.filter((option) => option.id !== 'flight');

function distanceMeters(from: Position, to: Position): number {
  const radius = 6371000;
  const radians = Math.PI / 180;
  const lat = (to.latitude - from.latitude) * radians;
  const lon = (to.longitude - from.longitude) * radians;
  const a =
    Math.sin(lat / 2) ** 2 +
    Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians) * Math.sin(lon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}

export function TripTracker({ onUseTrip }: TripTrackerProps) {
  const [kind, setKind] = useState('car');
  const [active, setActive] = useState(false);
  const [kilometers, setKilometers] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [positionText, setPositionText] = useState('Not started');
  const [status, setStatus] = useState('');
  const previous = useRef<Position | null>(null);
  const meters = useRef(0);
  const startTime = useRef(0);
  const watchId = useRef<number | null>(null);
  const demoInterval = useRef<number | null>(null);
  const clockInterval = useRef<number | null>(null);
  const demoLatitude = useRef(20.5937);
  const demoMode = useRef(false);

  function acceptPosition(position: Position, accuracy: number) {
    setPositionText(`${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)} (±${Math.round(accuracy)} m)${demoMode.current ? ' simulated' : ''}`);
    if (accuracy > 80) {
      setStatus(`Waiting for a stronger GPS signal (±${Math.round(accuracy)} m).`);
      return;
    }
    setStatus(demoMode.current ? 'Demo mode: positions are simulated; no GPS is used.' : 'Tracking. Keep this page open while you travel.');
    if (previous.current) {
      const gap = distanceMeters(previous.current, position);
      if (gap >= Math.max(5, accuracy * 0.5)) {
        meters.current += gap;
        previous.current = position;
        setKilometers(meters.current / 1000);
      }
    } else {
      previous.current = position;
    }
  }

  function stopTracking(saveTrip: boolean) {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    if (demoInterval.current !== null) window.clearInterval(demoInterval.current);
    if (clockInterval.current !== null) window.clearInterval(clockInterval.current);
    watchId.current = null;
    demoInterval.current = null;
    clockInterval.current = null;
    setActive(false);
    if (!saveTrip) return;

    const distance = meters.current / 1000;
    if (distance < 0.05) {
      setStatus('That trip was under 50 m, so nothing was added.');
      return;
    }
    const rounded = Math.max(0.1, Math.round(distance * 10) / 10);
    onUseTrip(kind, rounded);
    setStatus(`Trip of ${fmt(rounded)} km added to the activity form. Review it and save.`);
  }

  function start(demo: boolean) {
    previous.current = null;
    meters.current = 0;
    startTime.current = Date.now();
    demoMode.current = demo;
    setKilometers(0);
    setSeconds(0);
    setPositionText(demo ? 'Starting simulated trip…' : 'Locating…');
    setActive(true);
    setStatus(demo ? 'Demo mode: positions are simulated; no GPS is used.' : 'Asking for your location…');
    clockInterval.current = window.setInterval(() => setSeconds(Math.floor((Date.now() - startTime.current) / 1000)), 1000);

    if (demo) {
      demoLatitude.current = 20.5937;
      acceptPosition({ latitude: demoLatitude.current, longitude: 78.9629 }, 8);
      demoInterval.current = window.setInterval(() => {
        demoLatitude.current += 0.0009;
        acceptPosition({ latitude: demoLatitude.current, longitude: 78.9629 }, 8);
      }, 600);
      return;
    }

    if (!navigator.geolocation) {
      setActive(false);
      setStatus('This browser does not support geolocation. Try the demo trip instead.');
      if (clockInterval.current !== null) window.clearInterval(clockInterval.current);
      clockInterval.current = null;
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (result) =>
        acceptPosition(
          { latitude: result.coords.latitude, longitude: result.coords.longitude },
          result.coords.accuracy,
        ),
      (error) => {
        const messages: Record<number, string> = {
          1: 'Location permission was denied. Allow location for this site or try the demo trip.',
          2: 'Your position is unavailable. Check that location services are turned on.',
          3: 'Finding your position timed out. Try again with a stronger signal.',
        };
        const message = messages[error.code] ?? 'Could not read your position.';
        setStatus(window.isSecureContext ? message : `${message} Location tracking requires HTTPS or localhost.`);
        if (error.code === 1) stopTracking(false);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
  }

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (active) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [active]);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
      if (demoInterval.current !== null) window.clearInterval(demoInterval.current);
      if (clockInterval.current !== null) window.clearInterval(clockInterval.current);
    },
    [],
  );

  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <section className="card feature-card" aria-labelledby="trip-title">
      <h3 id="trip-title" className="form-title">Measure a trip</h3>
      <p className="muted">Use GPS to measure distance or try a simulated walk. Your location is only used while tracking.</p>
      <label className="field trip-mode">
        <span>Travel mode</span>
        <select value={kind} disabled={active} onChange={(event) => setKind(event.target.value)}>
          {TRAVEL_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <div className="trip-metrics">
        <p><strong>{kilometers.toFixed(2)} km</strong><span>Distance</span></p>
        <p><strong>{time}</strong><span>Elapsed</span></p>
      </div>
      <p className="muted trip-position">{positionText}</p>
      <div className="feature-actions">
        <Button disabled={active} onClick={() => start(false)}>Start GPS trip</Button>
        <Button variant="outline" disabled={active} onClick={() => start(true)}>Try demo trip</Button>
        <Button variant="outline" disabled={!active} onClick={() => stopTracking(true)}>Stop and use distance</Button>
      </div>
      <p className="tool-status" role="status">{status}</p>
    </section>
  );
}
