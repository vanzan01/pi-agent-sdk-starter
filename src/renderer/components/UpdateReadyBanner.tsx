import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { UpdateStatus } from '../electron';

export default function UpdateReadyBanner() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Load initial status
    window.electron.update
      .getStatus()
      .then((initialStatus) => {
        setStatus(initialStatus);
      })
      .catch(() => {
        // Ignore errors in dev mode
      });

    // Listen for status changes
    const unsubscribe = window.electron.update.onStatusChanged((newStatus) => {
      setStatus((prevStatus) => {
        // Reset dismissed state when update becomes ready
        if (newStatus.readyToInstall && !prevStatus?.readyToInstall) {
          setIsDismissed(false);
        }
        return newStatus;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Don't show if dismissed, not ready, or error
  if (isDismissed || !status || !status.readyToInstall || status.error) {
    return null;
  }

  const handleInstall = async () => {
    await window.electron.update.install();
  };

  return (
    <div className="pointer-events-none fixed top-14 right-0 left-0 z-40 flex justify-center px-4 [-webkit-app-region:no-drag]">
      <div className="pointer-events-auto flex w-full max-w-3xl items-center justify-between gap-4 rounded-2xl border border-green-200/70 bg-white/90 px-4 py-3 shadow-lg shadow-green-200/60 backdrop-blur-md dark:border-green-900/50 dark:bg-green-950/70 dark:shadow-black/30">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700 dark:bg-green-900/60 dark:text-green-200">
            <RefreshCw className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-green-900 dark:text-green-100">
              Update ready: {status.updateInfo?.version}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300">
              Restart to finish installing the update.
            </p>
          </div>
        </div>
        <button
          onClick={handleInstall}
          className="flex items-center gap-1.5 rounded-full bg-green-700 px-4 py-1.5 text-xs font-semibold tracking-wide text-white uppercase transition-colors hover:bg-green-800 dark:bg-green-500 dark:hover:bg-green-400"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Restart & Install
        </button>
      </div>
    </div>
  );
}
