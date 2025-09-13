'use client';

import { useState } from 'react';
import BarcodeModal from './BarcodeModal';

export default function RedeemModalLauncher({ perkId }: { perkId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center rounded-xl bg-black text-white px-3 py-1.5"
      >
        Redeem
      </button>

      {open && <BarcodeModal perkId={perkId} onClose={() => setOpen(false)} />}
    </>
  );
}
