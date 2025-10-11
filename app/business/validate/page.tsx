'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface ValidationResult {
  success: boolean;
  message: string;
  perk?: {
    title: string;
    description: string;
    value?: string;
    business_name?: string;
    redemption_instructions?: string;
  };
  user?: {
    name: string;
    email: string;
  };
  error?: string;
  redemptionCount?: number;
  maxRedemptions?: number;
}

const COLORS = {
  bg: '#0B0F14',
  card: '#0F1217',
  cardElevated: '#111827',
  border: '#161B22',
  text: '#F8FAFC',
  textDim: '#9AA4B2',
  brass: '#E6B34D',
  brass600: '#C99934',
  mint: '#2CE8BD',
  red: '#EF4444',
  amber: '#F59E0B',
};

function Banner({ state, message }: { state: 'valid' | 'limit' | 'invalid' | 'redeemed'; message?: string }) {
  const stateConfig = {
    valid: { label: message || 'Valid code', bg: COLORS.mint, icon: '✓' },
    limit: { label: message || 'Limit reached', bg: COLORS.amber, icon: '⚠' },
    invalid: { label: message || 'Code not valid', bg: COLORS.red, icon: '✕' },
    redeemed: { label: message || 'Successfully redeemed!', bg: COLORS.mint, icon: '✓' },
  };
  
  const config = stateConfig[state];
  
  return (
    <div className="rounded-t-2xl p-6 text-center" style={{ background: config.bg }}>
      <div className="text-4xl font-bold mb-2" style={{ color: COLORS.bg }}>{config.icon}</div>
      <h1 className="text-xl font-semibold" style={{ color: COLORS.bg }}>{config.label}</h1>
    </div>
  );
}

export default function BusinessValidatePage() {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get('code');
  
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);

  useEffect(() => {
    if (codeFromUrl) {
      validateCode(codeFromUrl);
    }
  }, [codeFromUrl]);

  const validateCode = async (redemptionCode: string) => {
    setLoading(true);
    setResult(null);
    setHasValidated(true);
    
    try {
      if (redemptionCode.startsWith('TEMP_')) {
        const parts = redemptionCode.split('_');
        if (parts.length !== 4) {
          throw new Error('Invalid code format');
        }

        const [, userId, perkId, timestamp] = parts;
        
        const codeTime = parseInt(timestamp);
        const now = Date.now();
        if (now - codeTime > 45000) {
          setResult({
            success: false,
            message: 'Code Expired',
            error: 'This code has expired. Please ask the customer to generate a new one.'
          });
          setLoading(false);
          return;
        }

        const { data: perk, error: perkError } = await supabase
          .from('perks')
          .select('*, businesses:business_id(name)')
          .eq('id', perkId)
          .single();

        if (perkError || !perk) {
          throw new Error('Invalid perk');
        }

        const { data: userData } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', userId)
          .single();

        const { count } = await supabase
          .from('perk_redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('perk_id', perkId)
          .eq('status', 'redeemed');

        const maxRedemptions = perk.max_redemptions_per_user || 1;
        if (count && count >= maxRedemptions) {
          setResult({
            success: false,
            message: 'Limit Reached',
            error: `This customer has already redeemed this perk ${count}/${maxRedemptions} times.`,
            perk: {
              title: perk.title,
              description: perk.description,
              value: perk.value,
              redemption_instructions: perk.redemption_instructions
            },
            user: userData || { name: 'Unknown', email: '' },
            redemptionCount: count,
            maxRedemptions
          });
          setLoading(false);
          return;
        }

        setResult({
          success: true,
          message: 'Valid Code',
          perk: {
            title: perk.title,
            description: perk.description,
            value: perk.value,
            business_name: perk.businesses?.name,
            redemption_instructions: perk.redemption_instructions
          },
          user: userData || { name: 'Unknown User', email: '' }
        });

      } else {
        throw new Error('Please use the updated app to generate QR codes');
      }
    } catch (err: any) {
      setResult({
        success: false,
        message: 'Invalid Code',
        error: err.message || 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmRedemption = async () => {
    const code = codeFromUrl || manualCode;
    if (!code || !result?.success || validating) return;
    
    setValidating(true);
    
    try {
      const parts = code.split('_');
      const [, userId, perkId] = parts;

      const { error: redeemError } = await supabase
        .from('perk_redemptions')
        .insert({
          user_id: userId,
          perk_id: perkId,
          status: 'redeemed',
          code: code
        });

      if (redeemError) throw redeemError;

      setResult(prev => prev ? {
        ...prev,
        success: false,
        message: '✓ Successfully Redeemed!',
        error: undefined
      } : null);
      
    } catch (err: any) {
      setResult(prev => prev ? {
        ...prev,
        success: false,
        message: 'Error',
        error: err.message || 'Failed to confirm redemption'
      } : null);
    } finally {
      setValidating(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      validateCode(manualCode.trim());
    }
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: COLORS.bg }}>
      <div className="max-w-xl mx-auto rounded-2xl overflow-hidden border shadow-lg" style={{ borderColor: COLORS.border, background: COLORS.card }}>
        
        {loading && (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 mx-auto mb-4" style={{ borderColor: COLORS.brass }}></div>
            <h1 className="text-xl font-semibold mb-2" style={{ color: COLORS.text }}>Validating Code</h1>
            <p className="text-sm" style={{ color: COLORS.textDim }}>Checking redemption...</p>
          </div>
        )}

        {!loading && result && (
          <>
            <Banner 
              state={
                result.message.includes('Successfully Redeemed') ? 'redeemed' :
                result.success ? 'valid' :
                result.message.includes('Limit') ? 'limit' : 'invalid'
              } 
              message={result.message} 
            />

            <div className="p-6 space-y-4">
              {result.perk && (
                <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, background: COLORS.cardElevated }}>
                  <h2 className="text-lg font-semibold mb-1" style={{ color: COLORS.text }}>
                    {result.perk.title}
                  </h2>
                  {result.perk.description && (
                    <p className="text-sm mb-2" style={{ color: COLORS.textDim }}>
                      {result.perk.description}
                    </p>
                  )}
                  {result.perk.value && (
                    <div className="inline-block px-2 py-1 rounded-lg text-sm font-semibold" style={{ background: `${COLORS.mint}15`, color: COLORS.mint }}>
                      Value: {result.perk.value}
                    </div>
                  )}
                </div>
              )}

              {result.user && (
                <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: COLORS.textDim }}>Customer:</span>
                  <div className="rounded-lg border px-3 py-2" style={{ borderColor: COLORS.border, background: COLORS.cardElevated, color: COLORS.text }}>
                    {result.user.name}
                  </div>
                </div>
              )}

              {result.message.includes('Limit') && result.error && (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: '#7F1D1D', background: 'rgba(239,68,68,0.15)', color: '#FCA5A5' }}>
                  {result.error}
                </div>
              )}

              {result.perk?.redemption_instructions && (
                <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, background: '#0F141B' }}>
                  <div className="text-sm font-semibold mb-2" style={{ color: COLORS.text }}>
                    Redemption instructions
                  </div>
                  <p className="text-sm" style={{ color: COLORS.textDim }}>
                    {result.perk.redemption_instructions}
                  </p>
                </div>
              )}

              {result.error && result.message.includes('Invalid') && (
                <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: COLORS.red, background: `${COLORS.red}15`, color: COLORS.red }}>
                  {result.error}
                </div>
              )}

              {result.success && !result.message.includes('Successfully') && (
                <button
                  onClick={confirmRedemption}
                  disabled={validating}
                  className="w-full rounded-xl px-4 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ 
                    background: COLORS.mint, 
                    color: COLORS.bg 
                  }}
                >
                  {validating ? 'Confirming...' : 'Confirm redemption'}
                </button>
              )}

              {result.message.includes('Successfully Redeemed') && (
                <button
                  onClick={() => window.location.href = '/business/validate'}
                  className="w-full rounded-xl px-4 py-3 font-semibold transition-colors"
                  style={{ 
                    background: COLORS.brass, 
                    color: COLORS.bg 
                  }}
                >
                  Validate Another
                </button>
              )}

              <div className="rounded-xl border p-3" style={{ borderColor: COLORS.border, background: '#0F141B' }}>
                <div className="text-xs font-medium mb-1" style={{ color: COLORS.textDim }}>Code</div>
                <code className="block break-all font-mono text-[11px] px-2 py-1 rounded" style={{ background: COLORS.bg, color: COLORS.text }}>
                  {codeFromUrl || manualCode}
                </code>
              </div>
            </div>
          </>
        )}

        {!loading && !hasValidated && !codeFromUrl && (
          <>
            <div className="p-6 text-center" style={{ background: COLORS.cardElevated }}>
              <h1 className="text-xl font-semibold" style={{ color: COLORS.text }}>Validate Redemption</h1>
              <p className="mt-1 text-sm" style={{ color: COLORS.textDim }}>Scan QR code or enter code manually</p>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: COLORS.text }}>
                    Enter redemption code
                  </label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="TEMP_..."
                    className="w-full rounded-xl px-4 py-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2"
                    style={{ 
                      background: COLORS.cardElevated, 
                      border: `1px solid ${COLORS.border}`,
                      color: COLORS.text
                    }}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="w-full rounded-xl px-4 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ 
                    background: COLORS.brass, 
                    color: COLORS.bg 
                  }}
                >
                  Validate Code
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
