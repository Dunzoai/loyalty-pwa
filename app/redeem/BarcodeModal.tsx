'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = { perkId: string; onClose: () => void };

export default function BarcodeModal({ perkId, onClose }: Props) {
  const [state, setState] = useState<
    | { phase: 'loading' }
    | { phase: 'ready'; code: string; expiresAt: string }
    | { phase: 'error'; msg: string }
  >({ phase: 'loading' });
  const [secondsLeft, setSecondsLeft] = useState(45);

  useEffect(() => {
    (async () => {
      const res = await fetch('/redeem/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perkId }),
      });
      const data = await res.json();
      if (!data.ok) return setState({ phase: 'error', msg: data.error ?? 'failed' });
      setState({ phase: 'ready', code: data.code, expiresAt: data.expiresAt });
    })();
  }, [perkId]);

  useEffect(() => {
    if (state.phase !== 'ready') return;
    const end = new Date(state.expiresAt).getTime();
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(s);
    }, 250);
    return () => clearInterval(id);
  }, [state]);

  const qrSrc = useMemo(() => {
    if (state.phase !== 'ready') return '';
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
      state.code
    )}&size=240x240`;
  }, [state]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center">
        <h2 className="text-lg font-semibold mb-2">Show this code to redeem</h2>

        {state.phase === 'loading' && <p>Generating…</p>}

        {state.phase === 'error' && (
          <div className="text-red-600">
            <p className="mb-2">Couldn’t generate code.</p>
            <p className="text-sm opacity-70">{state.msg}</p>
          </div>
        )}

        {state.phase === 'ready' && (
          <>
            <img
              src={qrSrc}
              alt="QR code"
              className="mx-auto mb-3 rounded-md border"
              width={240}
              height={240}
            />
            <div className="font-mono text-xs break-all mb-2">{state.code}</div>
            <div
              className={`text-sm ${
                secondsLeft <= 5 ? 'text-red-600 font-semibold' : 'text-gray-600'
              }`}
            >
              Expires in {secondsLeft}s
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2 bg-black text-white"
        >
          Close
        </button>
      </div>
    </div>
  );
}
