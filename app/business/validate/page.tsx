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
  };
  user?: {
    name: string;
    email: string;
  };
  error?: string;
}

export default function BusinessValidatePage() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (code) {
      validateCode(code);
    }
  }, [code]);

  const validateCode = async (redemptionCode: string) => {
    setLoading(true);
    setResult(null);
    
    try {
      // Check if it's a TEMP code
      if (redemptionCode.startsWith('TEMP_')) {
        // Parse TEMP_userId_perkId_timestamp
        const parts = redemptionCode.split('_');
        if (parts.length !== 4) {
          throw new Error('Invalid code format');
        }

        const [, userId, perkId, timestamp] = parts;
        
        // Check if expired (45 seconds)
        const codeTime = parseInt(timestamp);
        const now = Date.now();
        if (now - codeTime > 45000) {
          setResult({
            success: false,
            message: 'Code Expired',
            error: 'This code has expired. Please generate a new one.'
          });
          return;
        }

        // Get perk details
        const { data: perk, error: perkError } = await supabase
          .from('perks')
          .select('*, businesses:business_id(name)')
          .eq('id', perkId)
          .single();

        if (perkError || !perk) {
          throw new Error('Invalid perk');
        }

        // Get user details
        const { data: userData } = await supabase
          .from('users')
          .select('name, email')
          .eq('id', userId)
          .single();

        // Check if already redeemed
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
            error: `This customer has already redeemed this perk ${count}/${maxRedemptions} times`,
            perk: {
              title: perk.title,
              description: perk.description,
              value: perk.value
            },
            user: userData || { name: 'Unknown', email: '' }
          });
          return;
        }

        // Valid and ready to redeem
        setResult({
          success: true,
          message: 'Valid Code',
          perk: {
            title: perk.title,
            description: perk.description,
            value: perk.value,
            business_name: perk.businesses?.name
          },
          user: userData || { name: 'Unknown User', email: '' }
        });

      } else {
        // Handle old format codes if any exist
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
    if (!code || !result?.success || validating) return;
    
    setValidating(true);
    
    try {
      // Parse the TEMP code again
      const parts = code.split('_');
      const [, userId, perkId] = parts;

      // Create redemption record - using 'code' instead of 'redemption_code'
      const { error: redeemError } = await supabase
        .from('perk_redemptions')
        .insert({
          user_id: userId,
          perk_id: perkId,
          status: 'redeemed',
          code: code  // Changed from 'redemption_code' to 'code'
        });

      if (redeemError) throw redeemError;

      // Update result to show success
      setResult(prev => prev ? {
        ...prev,
        success: false, // Prevent re-redemption
        message: '✅ Successfully Redeemed!',
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

  if (!code) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-xl text-center max-w-md w-full border border-gray-700">
          <div className="text-red-400 text-7xl mb-6">❌</div>
          <h1 className="text-2xl font-bold text-white mb-3">No Code Provided</h1>
          <p className="text-gray-400">Please scan a valid QR code to validate a redemption.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center max-w-md w-full border border-gray-700">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Validating Code</h1>
          <p className="text-gray-400">Checking redemption...</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const isSuccess = result.success;
  const isRedeemed = result.message.includes('Successfully Redeemed');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black py-8 px-4">
      <div className="max-w-md mx-auto bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700">
        {/* Header */}
        <div className={`p-6 text-center ${
          isRedeemed ? 'bg-gradient-to-r from-green-600 to-green-800' :
          isSuccess ? 'bg-gradient-to-r from-blue-600 to-green-600' : 
          'bg-gradient-to-r from-red-600 to-red-800'
        } text-white`}>
          <div className={`text-5xl mb-3 ${isRedeemed ? 'animate-bounce' : ''}`}>
            {isRedeemed ? '🎉' : isSuccess ? '✅' : '❌'}
          </div>
          <h1 className="text-2xl font-bold">{result.message}</h1>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {result.perk && (
            <div className="bg-gray-900 p-4 rounded-lg border-l-4 border-blue-500">
              <h2 className="text-xl font-bold text-white mb-2">
                {result.perk.title}
              </h2>
              <p className="text-gray-300">
                {result.perk.description}
              </p>
              {result.perk.value && (
                <p className="text-green-400 font-semibold mt-2">
                  Value: {result.perk.value}
                </p>
              )}
            </div>
          )}

          {result.user && (
            <div className="border-t border-gray-700 pt-5 space-y-3">
              <div className="flex justify-between items-center bg-gray-900 p-3 rounded-lg">
                <span className="text-gray-400 font-medium">Customer:</span>
                <span className="font-medium text-white">{result.user.name}</span>
              </div>
            </div>
          )}

          {result.error && !isRedeemed && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 p-4 rounded-lg">
              <p>{result.error}</p>
            </div>
          )}

          {/* Action Button */}
          {isSuccess && !isRedeemed && (
            <div className="pt-4">
              <button
                onClick={confirmRedemption}
                disabled={validating}
                className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-3 px-4 rounded-lg font-semibold
                         hover:from-green-700 hover:to-green-900 shadow-md hover:shadow-lg disabled:opacity-50 
                         disabled:cursor-not-allowed transition-all duration-300"
              >
                {validating ? 'Confirming...' : 'Confirm Redemption'}
              </button>
            </div>
          )}

          {isRedeemed && (
            <div className="text-center">
              <button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Code Display */}
        <div className="bg-gray-900 px-6 py-4 border-t border-gray-700">
          <div className="text-center">
            <span className="text-xs text-gray-400 block mb-1">Code</span>
            <span className="font-mono text-xs bg-gray-800 px-3 py-1 rounded text-blue-400 break-all">
              {code}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}