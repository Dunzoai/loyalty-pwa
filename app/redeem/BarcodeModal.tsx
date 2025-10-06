'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = { perkId: string; onClose: () => void };

type ModalState = 
  | { phase: 'loading' }
  | { phase: 'ready'; code: string; expiresAt: string }
  | { phase: 'error'; msg: string };

export default function BarcodeModal({ perkId, onClose }: Props) {
  const [state, setState] = useState<ModalState>({ phase: 'loading' });
  const [secondsLeft, setSecondsLeft] = useState(45);

  useEffect(() => {
    (async () => {
      try {
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setState({ phase: 'error', msg: 'Not authenticated' });
          return;
        }

        // Generate a temporary code WITHOUT hitting the database
        // Format: TEMP_<userId>_<perkId>_<timestamp>
        const timestamp = Date.now();
        const tempCode = `TEMP_${user.id}_${perkId}_${timestamp}`;
        
        // Calculate expiration time (45 seconds from now)
        const expiresAt = new Date(timestamp + 45000).toISOString();
        
        setState({ phase: 'ready', code: tempCode, expiresAt });
      } catch (err) {
        console.error('Error generating QR:', err);
        setState({ phase: 'error', msg: 'Failed to generate code' });
      }
    })();
  }, [perkId]);

  useEffect(() => {
    if (state.phase !== 'ready') return;
    const end = new Date(state.expiresAt).getTime();
    const id = setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsLeft(s);
      // Auto-close when timer hits 0
      if (s === 0) {
        onClose();
      }
    }, 250);
    return () => clearInterval(id);
  }, [state, onClose]);

  const qrSrc = useMemo(() => {
    if (state.phase !== 'ready') return '';
    // Include the full URL so scanning takes you to the validation page
    const validationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/business/validate?code=${state.code}`;
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(validationUrl)}&size=240x240`;
  }, [state]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-6 text-center">
        <h2 className="text-lg font-semibold mb-2">Show this code to redeem</h2>

        {state.phase === 'loading' && <p>Generating…</p>}

        {state.phase === 'error' && (
          <div className="text-red-600">
            <p className="mb-2">Couldn't generate code.</p>
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
            <div className="text-xs text-gray-500 mb-2">
              Scan with business app
            </div>
            <div
              className={`text-2xl font-bold ${
                secondsLeft <= 10 ? 'text-red-600' : 'text-gray-800'
              }`}
            >
              {secondsLeft}s
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Time remaining
            </div>
            
            {/* Show FULL code for manual entry if needed */}
            <div className="mt-3 p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Manual code (if scan fails):</p>
              <div className="font-mono text-xs break-all select-all text-gray-700">
                {state.code}
              </div>
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