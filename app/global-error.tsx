'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error', { message: error.message, digest: error.digest, stack: error.stack });
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-black">Platform error</h1>
          <p className="mt-3 text-slate-400">
            A critical error occurred. Refresh the page or contact support if the issue persists.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Reload
            </button>
            <Link
              href="/"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-slate-500"
            >
              Return home
            </Link>
          </div>
          {error.digest ? (
            <p className="mt-4 text-xs text-slate-500">Error reference: {error.digest}</p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
