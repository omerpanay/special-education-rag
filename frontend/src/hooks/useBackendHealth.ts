import { useState, useEffect, useRef } from 'react';

type HealthStatus = 'healthy' | 'offline' | 'checking';

export function useBackendHealth(intervalMs = 30_000): HealthStatus {
  const [status, setStatus] = useState<HealthStatus>('checking');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = async () => {
    try {
      const res = await fetch('http://localhost:8000/health', {
        signal: AbortSignal.timeout(4000),
      });
      setStatus(res.ok ? 'healthy' : 'offline');
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    check(); // immediate check on mount
    timerRef.current = setInterval(check, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  return status;
}
