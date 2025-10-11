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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setState({ phase: 'error', msg: 'Not authenticated' });
          return;
        }

        const timestamp = Date.now();
        const tempCode = `TEMP_${user.id}_${perkId}_${timestamp}`;
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
      if (s === 0) {
        onClose();
      }
    }, 250);
    return () => clearInterval(id);
  }, [state, onClose]);

  const qrSrc = useMemo(() => {
    if (state.phase !== 'ready') return '';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const validationUrl = `${baseUrl}/business/validate?code=${state.code}`;
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(validationUrl)}&size=260x260&bgcolor=FFF3CC&color=0B0F14&margin=4`;
  }, [state]);

  const handleCopy = async () => {
    if (state.phase !== 'ready') return;
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const isExpired = secondsLeft <= 0;
  const isExpiringSoon = secondsLeft <= 10;

  return (
    <div 
      className="fixed inset-0 z-[100] grid place-items-center bg-black/70 px-4" 
      role="dialog" 
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl">
        <h2 className="text-lg font-semibold text-black">Show this code to redeem</h2>
        <p className="mt-1 text-sm text-black/60">Scan with the business app</p>

        {state.phase === 'loading' && (
          <div className="py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#E6B34D] mx-auto"></div>
            <p className="mt-4 text-sm text-black/60">Generating code...</p>
          </div>
        )}

        {state.phase === 'error' && (
          <div className="py-8">
            <div className="text-red-600 text-5xl mb-4">❌</div>
            <p className="text-red-600 font-semibold mb-2">Couldn't generate code</p>
            <p className="text-sm text-black/60">{state.msg}</p>
          </div>
        )}

        {state.phase === 'ready' && (
          <>
            <div className="mt-4 grid place-items-center">
              <img
                src={qrSrc}
                alt="QR code for redemption"
                className="rounded-xl shadow-sm"
                width={260}
                height={260}
              />
            </div>

            <div 
              className={`mt-3 text-sm ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-black/70'}`} 
              aria-live="polite"
              aria-atomic="true"
            >
              {isExpired ? (
                <span className="font-semibold">Code expired</span>
              ) : (
                <>
                  Expires in <strong className="text-base">{secondsLeft}s</strong>
                </>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-black/10 bg-black/5 p-3 text-left">
              <div className="text-xs font-medium text-black/70 mb-1">
                Manual code (if scan fails)
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 select-all break-all rounded-md bg-white px-2 py-1.5 font-mono text-[11px] text-black border border-black/10">
                  {state.code}
                </code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 rounded-md bg-black text-white px-3 py-1.5 text-xs font-semibold hover:bg-black/90 transition-colors"
                  aria-label="Copy code to clipboard"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-black text-white px-4 py-3 font-semibold hover:bg-black/90 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
