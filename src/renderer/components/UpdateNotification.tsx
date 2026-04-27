import { Download, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { UpdateStatus } from '../electron';

export default function UpdateNotification() {
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
        // Reset dismissed state when a new update becomes available
        if (newStatus.updateAvailable && !prevStatus?.updateAvailable) {
          setIsDismissed(false);
        }
        return newStatus;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Don't show if dismissed, no update available, or error
  if (isDismissed || !status || !status.updateAvailable || status.error || status.readyToInstall) {
    return null;
  }

  const handleDownload = async () => {
    await window.electron.update.download();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="pointer-events-none fixed top-14 right-0 left-0 z-40 flex justify-center px-4 [-webkit-app-region:no-drag]">
      <div className="pointer-events-auto flex w-full max-w-3xl items-center gap-2.5 rounded-2xl border border-blue-200/70 bg-white/90 px-3 py-2.5 shadow-lg shadow-blue-200/60 backdrop-blur-md dark:border-blue-900/50 dark:bg-blue-950/70 dark:shadow-black/30">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
          <RefreshCw className="h-3.5 w-3.5" />
        </span>
        <div className="flex-1 space-y-1.5">
          <div>
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Update available: {status.updateInfo?.version}
            </p>
            {status.updateInfo?.releaseNotes && (
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {status.updateInfo.releaseNotes}
              </p>
            )}
          </div>
          {status.downloading && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200/70 dark:bg-blue-900/40">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-400"
                  style={{ width: `${status.downloadProgress}%` }}
                />
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Downloading… {Math.round(status.downloadProgress)}%
              </p>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!status.downloading && (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-full bg-blue-700 px-4 py-1.5 text-xs font-semibold tracking-wide text-white uppercase transition-colors hover:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="rounded-full border border-blue-200/70 p-1.5 text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-900/40"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
