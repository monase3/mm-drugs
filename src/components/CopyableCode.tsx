"use client";

import { useState } from "react";

export function CopyableCode({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available */
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-900 p-4">
      <code dir="ltr" className="break-all text-sm text-teal-300">
        {value}
      </code>
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-600"
      >
        {copied ? "تم النسخ ✓" : "نسخ"}
      </button>
    </div>
  );
}
