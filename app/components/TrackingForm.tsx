'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function TrackingForm() {
  const router = useRouter();
  const [reference, setReference] = useState('');

  return (
    <form
      action="/tracking"
      className="mt-8 flex gap-2 max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = reference.trim();
        if (!trimmed) return;
        router.push(`/tracking?ref=${encodeURIComponent(trimmed)}`);
      }}
    >
      <input
        id="trackingInput"
        name="ref"
        placeholder="Enter reference number"
        className="flex-1 px-4 py-3 rounded bg-white text-black"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
      />
      <button
        type="submit"
        className="bg-blue-600 px-6 py-3 rounded font-bold hover:bg-blue-700 transition"
      >
        Track
      </button>
    </form>
  );
}
