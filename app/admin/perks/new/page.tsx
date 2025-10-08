'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type CardTier = 'shortlist' | 'founding_shortlist' | 'ambassador' | 'all';
type Biz = { id: string; name: string | null };

function sanitizeFileName(name: string) {
  const base = name.toLowerCase().replace(/\s+/g, '-');
  return base.replace(/[^a-z0-9._-]/g, '');
}

export default function NewPerkPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // admin + businesses context
  const [isAdmin, setIsAdmin] = useState(false);
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Subscription tier tracking
  const [businessTier, setBusinessTier] = useState('starter');
  const [perksAllowed, setPerksAllowed] = useState(2);
  const [currentPerkCount, setCurrentPerkCount] = useState(0);
  const [isFounding ShortlistPerk, setIsFounding ShortlistPerk] = useState(false);

  // basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tier, setTier] = useState<CardTier>('shortlist');
  
  // schedule
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  
  // redemption rules
  const [maxRedemptionsTotal, setMaxRedemptionsTotal] = useState<string>('');
  const [maxRedemptionsPerUser, setMaxRedemptionsPerUser] = useState<string>('1');
  const [redemptionInstructions, setRedemptionInstructions] = useState('');
  const [value, setValue] = useState<string>('');
  
  // media
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // must be logged in
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        if (!session) throw new Error('You must be signed in.');

        // check role from public.Users
        const { data: userRow, error: roleErr } = await supabase
          .from('Users')
          .select('role')
          .eq('email', session.user.email as string)
          .maybeSingle();

        if (roleErr) throw roleErr;
        if ((userRow?.role ?? 'member') !== 'admin') {
          setIsAdmin(false);
          throw new Error('Not authorized (admin only).');
        }
        setIsAdmin(true);

        // load businesses you admin
        let bizRows: Biz[] = [];

        // prefer the view if it exists
        const { data: viewRows, error: viewErr } = await supabase
          .from('my_businesses')
          .select('id, name');

        if (!viewErr && Array.isArray(viewRows)) {
          bizRows = viewRows as Biz[];
        } else {
          // fallback: join business_admins -> Businesses
          const { data: joinRows, error: joinErr } = await supabase
            .from('business_admins')
            .select('business_id, Businesses:business_id(id,name)')
            .eq('user_id', session.user.id);

          if (joinErr) throw joinErr;

          bizRows = (joinRows ?? [])
            .map((r: any) => ({
              id: r?.business_id,
              name: r?.Businesses?.name ?? null,
            }))
            .filter((b: Biz) => !!b.id);
        }

        if (!bizRows.length) throw new Error('No business found for your admin account.');
        setBusinesses(bizRows);
        setBusinessId(bizRows[0].id); // default to first

        // Check business tier and perk limits
        if (bizRows.length > 0) {
          const { data: bizDetails } = await supabase
            .from('businesses')
            .select('subscription_tier, perks_allowed')
            .eq('id', bizRows[0].id)
            .single();

          // Count current active perks (excluding founder perks)
          const { count: currentPerks } = await supabase
            .from('perks')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', bizRows[0].id)
            .eq('active', true)
            .eq('is_founder_perk', false);

          setBusinessTier(bizDetails?.subscription_tier || 'starter');
          setPerksAllowed(bizDetails?.perks_allowed || 2);
          setCurrentPerkCount(currentPerks || 0);
        }
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Update when business selection changes
  useEffect(() => {
    if (businessId && businesses.length > 0) {
      (async () => {
        const { data: bizDetails } = await supabase
          .from('businesses')
          .select('subscription_tier, perks_allowed')
          .eq('id', businessId)
          .single();

        const { count: currentPerks } = await supabase
          .from('perks')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('active', true)
          .eq('is_founder_perk', false);

        setBusinessTier(bizDetails?.subscription_tier || 'starter');
        setPerksAllowed(bizDetails?.perks_allowed || 2);
        setCurrentPerkCount(currentPerks || 0);
      })();
    }
  }, [businessId]);

  // Update image preview when file changes
  useEffect(() => {
    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile);
      setImagePreview(objectUrl);
      
      // Clean up the URL when component unmounts
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setImagePreview(null);
    }
  }, [imageFile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isAdmin || !businessId) {
      setError('Not authorized or no business selected.');
      return;
    }
    if (!title.trim()) {
      setError('Please add a title.');
      return;
    }

    // Check perk limits (unless it's a founder perk)
    if (!isFounding ShortlistPerk && currentPerkCount >= perksAllowed) {
      setError(`You've reached your perk limit (${currentPerkCount}/${perksAllowed}). Create a founder perk or upgrade your plan.`);
      return;
    }

    setSaving(true);

    try {
      // 1) optional image upload
      let image_url: string | null = null;
      if (imageFile) {
        const cleanName = sanitizeFileName(imageFile.name || 'perk.jpg');
        const key = `${businessId}/${Date.now()}-${cleanName}`;

        const { error: upErr } = await supabase
          .storage
          .from('perk-images')
          .upload(key, imageFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: imageFile.type || 'image/*',
          });

        if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);

        const { data: pub } = supabase.storage.from('perk-images').getPublicUrl(key);
        image_url = pub?.publicUrl ?? null;
      }

      // 2) Parse date strings into ISO format for database
      const starts_at = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
      const ends_at = endDate ? new Date(endDate).toISOString() : null;
      
      // 3) Parse redemptions
      const max_redemptions_total = maxRedemptionsTotal ? parseInt(maxRedemptionsTotal, 10) : null;
      const max_redemptions_per_user = maxRedemptionsPerUser ? parseInt(maxRedemptionsPerUser, 10) : 1;

      // 4) insert perk with lowercase table name and founder flag
      const { error: insErr } = await supabase.from('perks').insert({
        title: title.trim(),
        description: description.trim() || null,
        required_card_tier: tier,
        business_id: businessId,
        image_url,
        is_sponsored: false,
        is_founder_perk: isFounding ShortlistPerk,
        active: isActive,
        starts_at,
        ends_at,
        max_redemptions_total,
        max_redemptions_per_user,
        redemption_instructions: redemptionInstructions.trim() || null,
        value: value.trim() || null,
      });

      if (insErr) throw insErr;

      // 5) back to dashboard
      router.push('/admin/dashboard');
    } catch (e: any) {
      setError(e.message ?? String(e));
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 relative">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-700 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-t-4 border-blue-500 rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-gray-100 p-6">
        <div className="max-w-xl mx-auto bg-gray-800 rounded-lg p-6">
          <h1 className="text-xl font-semibold mb-2">Admin Access Required</h1>
          <p className="text-red-400 mb-4">{error ?? 'You do not have permission to access this page.'}</p>
          <Link 
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="bg-gray-900 shadow sticky top-0 z-10 py-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold mb-3 sm:mb-0">Add New Perk</h1>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-700 rounded hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {/* Business Selection */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          {businesses.length > 1 ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Business</label>
              <select
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
                value={businessId ?? ''}
                onChange={(e) => setBusinessId(e.target.value)}
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name ?? b.id}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <span className="text-sm text-gray-400">Business:</span>{' '}
              <span className="font-medium text-white">
                {businesses[0]?.name ?? businesses[0]?.id}
              </span>
            </div>
          )}
          <div className="mt-2 text-sm text-gray-400">
            Tier: <span className="text-white capitalize">{businessTier}</span> • 
            Perks: <span className="text-white">{currentPerkCount}/{perksAllowed}</span>
          </div>
        </div>

        {/* Perk Limit Warning */}
        {!isFounding ShortlistPerk && currentPerkCount >= perksAllowed && (
          <div className="mb-6 bg-yellow-900/30 border border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-300">
              ⚠️ You've reached your perk limit ({currentPerkCount}/{perksAllowed}). 
              You can still create a founder-exclusive perk, or deactivate an existing perk to add a new one.
            </p>
          </div>
        )}

        {/* Founding Shortlist Perk Option */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isFounding ShortlistPerk"
              checked={isFounding ShortlistPerk}
              onChange={(e) => setIsFounding ShortlistPerk(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-700 bg-gray-900"
            />
            <label htmlFor="isFounding ShortlistPerk" className="text-sm font-medium text-gray-300">
              This is a Founding Shortlist-exclusive perk
            </label>
          </div>
          
          {isFounding ShortlistPerk && (
            <div className="mt-3 bg-blue-900/30 border border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                ✨ Founding Shortlist perks are only visible to founder cardholders and don't count against your perk limit.
              </p>
            </div>
          )}
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Basic Info Section */}
          <div className="bg-gray-800 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-medium border-b border-gray-700 pb-2">Basic Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title*</label>
              <input
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
                placeholder="e.g. 2 for 1 Smoothies"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Keep it concise and appealing (50 characters max)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
                placeholder="Describe what customers get and any conditions"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Add details like how to redeem, limitations, etc.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Value</label>
              <input
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
                placeholder="e.g. $5 off, 20% discount, Free dessert"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Specify the monetary value or discount percentage</p>
            </div>
          </div>

          {/* Availability Section */}
          <div className="bg-gray-800 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-medium border-b border-gray-700 pb-2">Availability</h2>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-300">Active (immediately available)</label>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for no expiration</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {isFounding ShortlistPerk ? 'Founding Shortlist Card Required' : 'Required Membership Level'}
              </label>
              {isFounding ShortlistPerk ? (
                <div className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2">
                  Founding Shortlist Only
                </div>
              ) : (
                <select
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as CardTier)}
                >
                  <option value="all">All Members</option>
                  <option value="insider">Shortlist</option>
                  <option value="founder">Founding Shortlist</option>
                  <option value="influencer">Ambassador</option>
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {isFounding ShortlistPerk 
                  ? 'Only founder cardholders can access this perk' 
                  : 'Select which membership tiers can access this perk'}
              </p>
            </div>
          </div>

          {/* Redemption Rules Section */}
          <div className="bg-gray-800 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-medium border-b border-gray-700 pb-2">Redemption Rules</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Maximum Total Redemptions (Optional)</label>
              <input
                type="number"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
                placeholder="e.g. 100"
                min="1"
                value={maxRedemptionsTotal}
                onChange={(e) => setMaxRedemptionsTotal(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Limit total redemptions across all customers (leave empty for unlimited)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Max Redemptions Per Customer
              </label>
              <input
                type="number"
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
                placeholder="e.g. 1"
                min="1"
                max="10"
                value={maxRedemptionsPerUser}
                onChange={(e) => setMaxRedemptionsPerUser(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                How many times can each individual customer redeem this perk? (Default: 1)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Redemption Instructions</label>
              <textarea
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
                placeholder="Instructions for staff when redeeming this perk"
                rows={3}
                value={redemptionInstructions}
                onChange={(e) => setRedemptionInstructions(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">These instructions will be visible to staff when validating the perk</p>
            </div>
          </div>

          {/* Media Section */}
          <div className="bg-gray-800 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-medium border-b border-gray-700 pb-2">Media</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Perk Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Recommended: 600x400px, JPEG or PNG format</p>
              
              {imagePreview && (
                <div className="mt-3 p-2 border border-gray-700 rounded bg-gray-900">
                  <p className="text-xs text-gray-400 mb-1">Image Preview:</p>
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-40 rounded mx-auto"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="flex-1 py-2 px-4 border border-gray-700 rounded hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            
            <button 
              type="submit" 
              disabled={saving || (!isFounding ShortlistPerk && currentPerkCount >= perksAllowed)} 
              className="flex-1 py-2 px-4 bg-blue-600 rounded text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
            >
              {!isFounding ShortlistPerk && currentPerkCount >= perksAllowed 
                ? 'Perk Limit Reached' 
                : saving 
                ? 'Saving…' 
                : 'Save Perk'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}