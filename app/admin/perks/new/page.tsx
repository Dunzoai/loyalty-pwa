'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type CardTier = 'insider' | 'founder' | 'influencer';
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

  // form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tier, setTier] = useState<CardTier>('insider');
  const [imageFile, setImageFile] = useState<File | null>(null);

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
          // IMPORTANT: include business_id and the related business
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
      } catch (e: any) {
        setError(e.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
            upsert: true,                 // OK with the RLS policy we wrote
            contentType: imageFile.type || 'image/*',
          });

        if (upErr) throw new Error(`Image upload failed: ${upErr.message}`);

        const { data: pub } = supabase.storage.from('perk-images').getPublicUrl(key);
        image_url = pub?.publicUrl ?? null;
      }

      // 2) insert perk
      const { error: insErr } = await supabase.from('Perks').insert({
        title: title.trim(),
        description: description.trim() || null,
        required_card_tier: tier,
        business_id: businessId,
        image_url,
        is_sponsored: false,
        active: true,
        starts_at: new Date().toISOString(),
      });

      if (insErr) throw insErr;

      // 3) back to feed
      router.push('/');
    } catch (e: any) {
      setError(e.message ?? String(e));
      setSaving(false);
    }
  }

  if (loading) return <main className="p-6">Loading…</main>;

  if (!isAdmin) {
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold mb-2">Admin only</h1>
        <p className="text-sm text-red-600">{error ?? 'You do not have access.'}</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Add New Perk</h1>

      {/* If multiple businesses, let admin choose; if one, it’s already selected */}
      {businesses.length > 1 ? (
        <div className="mb-3">
          <label className="block text-sm mb-1">Business</label>
          <select
            className="w-full border rounded px-3 py-2"
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
        <p className="text-sm text-gray-500 mb-3">
          Business:{' '}
          <span className="font-medium">
            {businesses[0]?.name ?? businesses[0]?.id}
          </span>
        </p>
      )}

      <form className="space-y-3" onSubmit={handleSubmit}>
        <input
          className="w-full border rounded px-3 py-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full border rounded px-3 py-2"
          placeholder="Description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          className="w-full border rounded px-3 py-2"
          value={tier}
          onChange={(e) => setTier(e.target.value as CardTier)}
        >
          <option value="insider">Insider</option>
          <option value="founder">Founder</option>
          <option value="influencer">Influencer</option>
        </select>

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="w-full border rounded px-3 py-2"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded bg-blue-600 text-white py-2 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Perk'}
        </button>
      </form>
    </main>
  );
}
