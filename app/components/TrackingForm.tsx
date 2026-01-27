'use client';

import { useState } from 'react';

export default function TrackingForm() {
  const [reference, setReference] = useState('');

  return (
    <form
      action="/tracking"
      method="get"
      className="mt-8 flex gap-2 max-w-md"
      onSubmit={(e) => {
        const trimmed = reference.trim();
        if (!trimmed) {
          e.preventDefault();
          return;
        }

        const input = e.currentTarget.querySelector('input[name="ref"]') as HTMLInputElement | null;
        if (input) input.value = trimmed;
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
