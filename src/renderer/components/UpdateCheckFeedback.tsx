import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { UpdateStatus } from '../electron';

export default function UpdateCheckFeedback() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

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
      setStatus(newStatus);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const wrapperClasses =
    'pointer-events-none fixed top-14 right-0 left-0 z-40 flex justify-center px-4 [-webkit-app-region:no-drag]';
  const cardBase =
    'pointer-events-auto flex w-full max-w-3xl items-center gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md';

  // Show checking indicator
  if (status?.checking) {
    return (
      <div className={wrapperClasses}>
        <div
          className={`${cardBase} border-neutral-200/80 bg-white/90 shadow-neutral-300/60 dark:border-neutral-800 dark:bg-neutral-900/70 dark:shadow-black/30`}
        >
          <Loader2 className="h-4 w-4 animate-spin text-neutral-600 dark:text-neutral-300" />
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
            Checking for updates…
          </p>
        </div>
      </div>
    );
  }

  // Show "no update available" message when check completes
  if (status?.lastCheckComplete && !status.updateAvailable && !status.error) {
    return (
      <div className={wrapperClasses}>
        <div
          className={`${cardBase} border-green-200/70 bg-white/90 text-green-900 shadow-green-200/60 dark:border-green-900/50 dark:bg-green-950/70 dark:text-green-100 dark:shadow-black/30`}
        >
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-300" />
          <p className="text-sm font-semibold">You&apos;re up to date. No updates available.</p>
        </div>
      </div>
    );
  }

  // Show error message
  if (status?.lastCheckComplete && status.error) {
    return (
      <div className={wrapperClasses}>
        <div
          className={`${cardBase} border-red-200/70 bg-white/90 text-red-900 shadow-red-200/60 dark:border-red-900/50 dark:bg-red-950/70 dark:text-red-100 dark:shadow-black/30`}
        >
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-300" />
          <p className="text-sm font-semibold">{status.error}</p>
        </div>
      </div>
    );
  }

  return null;
}
