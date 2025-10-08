'use client';

import { useState } from 'react';
import BarcodeModal from './BarcodeModal';

export default function RedeemModalLauncher({ perkId }: { perkId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl bg-[#E6B34D] hover:bg-[#C99934] text-[#0B0F14] font-semibold px-4 py-2 transition-colors"
      >
        Redeem
      </button>

      {open && <BarcodeModal perkId={perkId} onClose={() => setOpen(false)} />}
    </>
  );
}
