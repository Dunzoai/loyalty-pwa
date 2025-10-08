'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type CardTier = 'shortlist' | 'founding_shortlist' | 'ambassador' | 'all';

function sanitizeFileName(name: string) {
  const base = name.toLowerCase().replace(/\s+/g, '-');
  return base.replace(/[^a-z0-9._-]/g, '');
}

export default function EditPerkPage() {
  const router = useRouter();
  const params = useParams();
  const perkId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tier, setTier] = useState<CardTier>('shortlist');
  
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  
  const [maxRedemptionsTotal, setMaxRedemptionsTotal] = useState<string>('');
  const [maxRedemptionsPerUser, setMaxRedemptionsPerUser] = useState<string>('1');
  const [redemptionInstructions, setRedemptionInstructions] = useState('');
  const [value, setValue] = useState<string>('');
  
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isFoundingShortlistPerk, setIsFoundingShortlistPerk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Check auth
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        if (!session) throw new Error('You must be signed in.');

        // Check role
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

        // Load the perk data
        const { data: perkData, error: perkErr } = await supabase
          .from('perks')
          .select('*, businesses(name)')
          .eq('id', perkId)
          .single();

        if (perkErr) throw perkErr;
        if (!perkData) throw new Error('Perk not found.');

        // Check if user is admin of this business
        const { data: adminCheck } = await supabase
          .from('business_admins')
          .select('business_id')
          .eq('user_id', session.user.id)
          .eq('business_id', perkData.business_id)
          .maybeSingle();

        if (!adminCheck) throw new Error('Not authorized to edit this perk.');

        // Populate form fields
        setBusinessId(perkData.business_id);
        setBusinessName(perkData.businesses?.name || '');
        setTitle(perkData.title || '');
        setDescription(perkData.description || '');
        setTier(perkData.required_card_tier || 'shortlist');
        setStartDate(perkData.starts_at ? perkData.starts_at.split('T')[0] : '');
        setEndDate(perkData.ends_at ? perkData.ends_at.split('T')[0] : '');
        setIsActive(perkData.active ?? true);
        setMaxRedemptionsTotal(perkData.max_redemptions_total?.toString() || '');
        setMaxRedemptionsPerUser(perkData.max_redemptions_per_user?.toString() || '1');
        setRedemptionInstructions(perkData.redemption_instructions || '');
        setValue(perkData.value || '');
        setCurrentImageUrl(perkData.image_url || null);
        setIsFoundingShortlistPerk(perkData.is_founder_perk || false);

      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [perkId]);

  useEffect(() => {
    if (imageFile) {
      const objectUrl = URL.createObjectURL(imageFile);
      setImagePreview(objectUrl);
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

    setSaving(true);

    try {
      let image_url = currentImageUrl;
      
      // Upload new image if provided
      if (imageFile) {
        const cleanName = sanitizeFileName(imageFile.name || 'perk.jpg');
        const filePath = `perks/${Date.now()}-${cleanName}`;
        const { error: uploadErr } = await supabase.storage
          .from('perk-images')
          .upload(filePath, imageFile, { upsert: false });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('perk-images')
          .getPublicUrl(filePath);
        image_url = urlData.publicUrl;
      }

      const perkData: any = {
        title: title.trim(),
        description: description.trim() || null,
        required_card_tier: isFoundingShortlistPerk ? 'founding_shortlist' : tier,
        active: isActive,
        starts_at: startDate || null,
        ends_at: endDate || null,
        max_redemptions_total: maxRedemptionsTotal ? parseInt(maxRedemptionsTotal, 10) : null,
        max_redemptions_per_user: maxRedemptionsPerUser ? parseInt(maxRedemptionsPerUser, 10) : 1,
        redemption_instructions: redemptionInstructions.trim() || null,
        value: value.trim() || null,
        image_url,
        is_founder_perk: isFoundingShortlistPerk,
      };

      const { error: updateErr } = await supabase
        .from('perks')
        .update(perkData)
        .eq('id', perkId);

      if (updateErr) throw updateErr;

      router.push('/admin/perks');
    } catch (err: any) {
      setError(err.message ?? String(err));
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] flex items-center justify-center">
        <p className="text-[#9AA4B2]">Loading perk...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] p-6">
        <div className="max-w-xl mx-auto bg-[#0F1217] border border-[#161B22] rounded-[14px] p-6">
          <h1 className="text-xl font-semibold mb-2">Admin Access Required</h1>
          <p className="text-[#EF4444] mb-4">{error ?? 'You do not have permission to access this page.'}</p>
          <Link 
            href="/"
            className="inline-block px-4 py-2 bg-[#E6B34D] hover:bg-[#C99934] text-[#0B0F14] font-semibold rounded-xl transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F14] text-[#F8FAFC] pb-24">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-[#111827] border-b border-[#161B22]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Edit Perk</h1>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => router.back()}
              className="rounded-xl border border-[#161B22] bg-[#0F1217] text-[#F8FAFC] px-3.5 py-2 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              form="perk-form"
              disabled={saving}
              className="rounded-xl bg-[#E6B34D] hover:bg-[#C99934] text-[#0B0F14] font-semibold px-3.5 py-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="rounded-[14px] bg-[#EF4444]/10 border border-[#EF4444] p-4">
            <p className="text-[#EF4444] text-sm">{error}</p>
          </div>
        )}

        {/* Business Info */}
        <section className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.24)]">
          <h2 className="text-sm font-semibold mb-3">Business</h2>
          <div className="text-[#F8FAFC] font-medium">
            {businessName || businessId}
          </div>
        </section>

        {/* Founding Shortlist Perk Toggle */}
        <section className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.24)]">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="isFoundingShortlistPerk"
              checked={isFoundingShortlistPerk}
              onChange={(e) => setIsFoundingShortlistPerk(e.target.checked)}
              className="h-5 w-5 rounded bg-white/10 accent-[#2CE8BD] border border-[#161B22]"
            />
            <span className="text-sm font-medium">This is a Founding Shortlist-exclusive perk</span>
          </label>
          
          {isFoundingShortlistPerk && (
            <div className="mt-3 rounded-xl bg-[#2CE8BD]/10 border border-[#2CE8BD]/30 p-3">
              <p className="text-sm text-[#2CE8BD]">
                ✨ Founding Shortlist perks are only visible to founder cardholders and don't count against your perk limit.
              </p>
            </div>
          )}
        </section>

        <form id="perk-form" className="space-y-6" onSubmit={handleSubmit}>
          {/* Basic Information */}
          <section className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.24)] space-y-4">
            <h2 className="text-sm font-semibold">Basic Information</h2>
            
            <div>
              <label className="block text-sm mb-1">
                Title <span className="text-[#9AA4B2]">({title.length}/50)</span>
              </label>
              <input
                className="w-full rounded-xl bg-[#111827] border border-[#161B22] px-4 py-3 text-[#F8FAFC] placeholder:text-[#9AA4B2]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
                placeholder="e.g. 2 for 1 Smoothies"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                required
              />
              <p className="text-xs text-[#9AA4B2] mt-1">Keep it concise and appealing</p>
            </div>
            
            <div>
              <label className="block text-sm mb-1">Description</label>
              <textarea
                className="w-full rounded-xl bg-[#111827] border border-[#161B22] px-4 py-3 text-[#F8FAFC] placeholder:text-[#9AA4B2]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
                placeholder="Describe what customers get and any conditions"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-[#9AA4B2] mt-1">Add details like how to redeem, limitations, etc.</p>
            </div>

            <div>
              <label className="block text-sm mb-1">Value</label>
              <input
                className="w-full rounded-xl bg-[#111827] border border-[#161B22] px-4 py-3 text-[#F8FAFC] placeholder:text-[#9AA4B2]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
                placeholder="e.g. $5 off, 20% discount, Free dessert"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <p className="text-xs text-[#9AA4B2] mt-1">Specify the monetary value or discount percentage</p>
            </div>
          </section>

          {/* Availability */}
          <section className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.24)] space-y-4">
            <h2 className="text-sm font-semibold">Availability</h2>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-5 w-5 rounded bg-white/10 accent-[#2CE8BD] border border-[#161B22]"
              />
              <span className="text-sm">Active (visible to cardholders)</span>
            </label>

            {!isActive && (
              <div className="rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3">
                <p className="text-sm text-[#F59E0B]">
                  ℹ️ This perk is currently hidden from cardholders. Toggle "Active" to make it visible again.
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full rounded-xl bg-[#111827] border border-[#161B22] px-4 py-3 text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm mb-1">End Date <span className="text-[#9AA4B2]">(Optional)</span></label>
                <input
                  type="date"
                  className="w-full rounded-xl bg-[#111827] border border-[#161B22] px-4 py-3 text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <p className="text-xs text-[#9AA4B2] mt-1">Leave empty for no expiration</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm mb-1">
                {isFoundingShortlistPerk ? 'Founding Shortlist Only' : 'Required Membership Level'}
              </label>
              {isFoundingShortlistPerk ? (
                <div className="rounded-xl bg-[#E6B34D]/10 border border-[#E6B34D]/30 px-4 py-3">
                  <span className="text-[#E6B34D] font-medium">Founding Shortlist</span>
                </div>
              ) : (
                <select
                  className="w-full rounded-xl bg-[#111827] border border-[#161B22] text-[#F8FAFC] px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as CardTier)}
                >
                  <option value="shortlist">Shortlist</option>
                  <option value="ambassador">Ambassador</option>
                  <option value="founding_shortlist">Founding Shortlist</option>
                  <option value="all">All Members</option>
                </select>
              )}
            </div>
          </section>

          {/* Redemption Rules */}
          <section className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.24)] space-y-4">
            <h2 className="text-sm font-semibold">Redemption Rules</h2>
            
            <div>
              <label className="block text-sm mb-1">Max Redemptions Per User</label>
              <input
                type="number"
                className="w-full rounded-xl bg-[#111827] border border-[#161B22] px-4 py-3 text-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
                placeholder="1"
                value={maxRedemptionsPerUser}
                onChange={(e) => setMaxRedemptionsPerUser(e.target.value)}
                min="1"
              />
              <p className="text-xs text-[#9AA4B2] mt-1">How many times can one person redeem this?</p>
            </div>

            <div>
              <label className="block text-sm mb-1">Total Redemption Limit <span className="text-[#9AA4B2]">(Optional)</span></label>
              <input
                type="number"
                className="w-full rounded-xl bg-[#111827] border border-[#161B22] px-4 py-3 text-[#F8FAFC] placeholder:text-[#9AA4B2]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
                placeholder="Leave empty for unlimited"
                value={maxRedemptionsTotal}
                onChange={(e) => setMaxRedemptionsTotal(e.target.value)}
                min="1"
              />
              <p className="text-xs text-[#9AA4B2] mt-1">Total number of times this perk can be redeemed by all users</p>
            </div>

            <div>
              <label className="block text-sm mb-1">Redemption Instructions</label>
              <textarea
                className="w-full rounded-xl bg-[#111827] border border-[#161B22] px-4 py-3 text-[#F8FAFC] placeholder:text-[#9AA4B2]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3A86FF]"
                placeholder="Tell customers how to redeem (e.g., Show QR code at checkout)"
                rows={3}
                value={redemptionInstructions}
                onChange={(e) => setRedemptionInstructions(e.target.value)}
              />
            </div>
          </section>

          {/* Image Upload */}
          <section className="rounded-[14px] bg-[#0F1217] border border-[#161B22] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.24)] space-y-4">
            <h2 className="text-sm font-semibold">Perk Image</h2>
            
            {currentImageUrl && !imagePreview && (
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-[#161B22]">
                <img src={currentImageUrl} alt="Current image" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-[#111827]/90 text-xs text-[#F8FAFC] rounded-lg">Current</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm mb-1">
                {currentImageUrl ? 'Replace Image' : 'Upload Image'} <span className="text-[#9AA4B2]">(Optional)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-[#9AA4B2] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#E6B34D] file:text-[#0B0F14] hover:file:bg-[#C99934] file:cursor-pointer"
              />
              <p className="text-xs text-[#9AA4B2] mt-1">Recommended: 1200x900px, max 5MB</p>
            </div>

            {imagePreview && (
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-[#161B22]">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 bg-[#2CE8BD]/90 text-[#0B0F14] text-xs font-semibold rounded-lg">New Preview</span>
                </div>
              </div>
            )}
          </section>
        </form>
      </main>
    </div>
  );
}
