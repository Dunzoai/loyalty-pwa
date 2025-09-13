'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

/** --- Types --- */
type Biz = {
  id: string;
  name: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  active: boolean | null;
};

type AdminLink = {
  business_id: string;
  Businesses: Biz | null;
};

const BUCKET = 'business-logos';

export default function AdminProfilePage() {
  const router = useRouter();
  const search = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [links, setLinks] = useState<AdminLink[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [form, setForm] = useState<Biz | null>(null);

  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  /** ---------- Load businesses this user admins ---------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      setSaved(false);

      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        router.replace('/login?next=/admin/profile');
        return;
      }

      const { data: adminRows, error: adminErr } = await supabase
        .from('business_admins')
        .select('business_id, Businesses(*)')
        .order('business_id', { ascending: true });

      if (adminErr) {
        if (!cancelled) {
          setError(adminErr.message);
          setLoading(false);
        }
        return;
      }

      // ✅ TS-safe mapping
      const rows: AdminLink[] = (adminRows ?? []).map((r: any) => ({
        business_id: r.business_id,
        Businesses: r.Businesses ?? null,
      }));
      if (cancelled) return;

      setLinks(rows);

      // Pick initial business: ?business_id → first linked → new (blank)
      const param = search.get('business_id');
      const initialId =
        (param && rows.some((r) => r.business_id === param) ? param : null) ??
        rows[0]?.business_id ??
        null;

      setSelectedId(initialId);

      if (initialId) {
        const chosen = rows.find((r) => r.business_id === initialId)?.Businesses || null;
        setForm(
          chosen
            ? {
                id: chosen.id,
                name: chosen.name ?? '',
                description: chosen.description ?? '',
                website: chosen.website ?? '',
                email: chosen.email ?? '',
                phone: chosen.phone ?? '',
                address: chosen.address ?? '',
                logo_url: chosen.logo_url ?? '',
                active: chosen.active ?? true,
              }
            : null
        );
      } else {
        // New blank form
        setForm({
          id: '',
          name: '',
          description: '',
          website: '',
          email: '',
          phone: '',
          address: '',
          logo_url: '',
          active: true,
        });
      }

      // clear any dangling preview
      setLogoFile(null);
      setLogoPreview(null);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const multi = links.length > 1;
  const currentName = useMemo(() => {
    if (!selectedId) return 'New business';
    const l = links.find((l) => l.business_id === selectedId);
    return l?.Businesses?.name || 'Untitled business';
  }, [links, selectedId]);

  /** ---------- Helpers ---------- */
  function startNewBusiness() {
    // Clear to a brand-new (unsaved) business form
    setSelectedId(null);
    setForm({
      id: '',
      name: '',
      description: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      logo_url: '',
      active: true,
    });
    setError(null);
    setSaved(false);
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
  }

  function pickBusiness(id: string) {
    setSelectedId(id);
    setError(null);
    setSaved(false);
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);

    const chosen = links.find((l) => l.business_id === id)?.Businesses;
    if (chosen) {
      setForm({
        id: chosen.id,
        name: chosen.name ?? '',
        description: chosen.description ?? '',
        website: chosen.website ?? '',
        email: chosen.email ?? '',
        phone: chosen.phone ?? '',
        address: chosen.address ?? '',
        logo_url: chosen.logo_url ?? '',
        active: chosen.active ?? true,
      });
    }
  }

  async function uploadLogoIfNeeded(bizId: string): Promise<string | null> {
    if (!logoFile) return null;
    const key = `${bizId}/${crypto.randomUUID()}-${logoFile.name}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(key, logoFile, { upsert: false, cacheControl: '3600' });
    if (upErr) {
      setError(upErr.message);
      return null;
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return pub?.publicUrl ?? null;
  }

  /** ---------- Save (insert or update) ---------- */
  async function handleSave() {
    if (!form) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id;
    if (!userId) {
      setSaving(false);
      router.replace('/login?next=/admin/profile');
      return;
    }

    // INSERT new
    if (!form.id) {
      const { data: ins, error: insErr } = await supabase
        .from('Businesses')
        .insert({
          name: (form.name || '').trim() || 'Untitled business',
          description: form.description || '',
          website: form.website || '',
          email: form.email || '',
          phone: form.phone || '',
          address: form.address || '',
          logo_url: '',
          active: true,
          // (optional) created_by: userId, if you added that column
        })
        .select('*')
        .single();

      if (insErr) {
        const msg = insErr.message.includes('row-level security')
          ? 'New row violates row-level security policy for table "Businesses". Ensure the INSERT policy exists.'
          : insErr.message;
        setError(msg);
        setSaving(false);
        return;
      }

      // link current user as admin for this business
      const { error: linkErr } = await supabase
        .from('business_admins')
        .insert({ business_id: ins!.id, user_id: userId });
      if (linkErr) {
        setError(linkErr.message);
        setSaving(false);
        return;
      }

      // upload logo now (if any) and patch the row with the public URL
      let newLogoUrl = null as string | null;
      if (logoFile) {
        newLogoUrl = await uploadLogoIfNeeded(ins!.id);
        if (newLogoUrl) {
          await supabase
            .from('Businesses')
            .update({ logo_url: newLogoUrl })
            .eq('id', ins!.id);
        }
      }

      const newBiz: Biz = {
        id: ins!.id,
        name: ins!.name ?? '',
        description: ins!.description ?? '',
        website: ins!.website ?? '',
        email: ins!.email ?? '',
        phone: ins!.phone ?? '',
        address: ins!.address ?? '',
        logo_url: newLogoUrl || ins!.logo_url ?? '',
        active: ins!.active ?? true,
      };

      // update local cache + UI
      setLinks((prev) => [...prev, { business_id: ins!.id, Businesses: newBiz }]);
      setSelectedId(ins!.id);
      setForm(newBiz);
      setLogoFile(null);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview(null);
      setSaved(true);
      setSaving(false);
      return;
    }

    // UPDATE existing
    let logo_url = form.logo_url || '';
    const uploaded = await uploadLogoIfNeeded(form.id);
    if (uploaded) logo_url = uploaded;

    const { error: updErr } = await supabase
      .from('Businesses')
      .update({
        name: (form.name || '').trim(),
        description: form.description || '',
        website: form.website || '',
        email: form.email || '',
        phone: form.phone || '',
        address: form.address || '',
        logo_url,
        active: form.active ?? true,
      })
      .eq('id', form.id);

    if (updErr) {
      setError(updErr.message);
      setSaving(false);
      return;
    }

    // sync local cache
    setLinks((prev) =>
      prev.map((l) =>
        l.business_id === form.id
          ? { ...l, Businesses: { ...(l.Businesses || {}), ...form, logo_url } as Biz }
          : l
      )
    );
    setForm({ ...(form as Biz), logo_url });
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    setSaved(true);
    setSaving(false);
  }

  /** ---------- Render ---------- */
  if (loading) return <main className="p-6">Loading…</main>;

  return (
    <main className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Business Profile</h1>
      <p className="text-sm text-neutral-400 mb-4">
        This is what customers see in your perks and on your profile.
      </p>

      {/* Banner + switcher */}
      <div className="mb-4 rounded-lg border border-neutral-700 bg-neutral-900 p-3 flex flex-wrap gap-3 items-center">
        <div className="text-sm">
          <span className="text-neutral-400">You’re editing:</span>{' '}
          <span className="font-medium">{currentName}</span>
        </div>

        {multi && (
          <div className="ml-auto">
            <label className="text-xs block mb-1 text-neutral-400">Switch business</label>
            <select
              className="rounded-md bg-neutral-800 border border-neutral-700 px-2 py-1 text-sm"
              value={selectedId ?? ''}
              onChange={(e) => pickBusiness(e.target.value)}
            >
              {links.map((l) => (
                <option key={l.business_id} value={l.business_id}>
                  {l.Businesses?.name || 'Untitled business'}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Add new */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={startNewBusiness}
          className="px-3 py-2 rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-sm"
          disabled={saving}
        >
          + Add a new business
        </button>
        <span className="text-xs text-neutral-500">
          You can manage multiple businesses under one login.
        </span>
      </div>

      {/* Notices */}
      {error && (
        <div className="mb-4 rounded-md border border-red-400 bg-red-950/40 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 rounded-md border border-emerald-400 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
          Saved!
        </div>
      )}

      {/* Form */}
      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-5"
        >
          {/* Logo picker (styled + instant preview) */}
          <div>
            <label className="block text-sm mb-2">Logo</label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-neutral-800 ring-1 ring-black/20 flex items-center justify-center">
                {/* Use <img> for instant local preview; it’s fine for small avatars */}
                {(logoPreview || form.logo_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview || (form.logo_url as string)}
                    alt="logo preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="text-xs text-neutral-500">No logo</div>
                )}
              </div>

              <div className="text-xs text-neutral-300">
                <label
                  htmlFor="logo-file"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 cursor-pointer"
                >
                  Choose file
                </label>
                <input
                  id="logo-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0] ?? null;
                    setLogoFile(file);
                    setSaved(false);
                    if (logoPreview) URL.revokeObjectURL(logoPreview);
                    setLogoPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
                <div className="mt-1 text-neutral-500">PNG/JPG preferred. &lt; 4MB.</div>
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm mb-1">Business name *</label>
            <input
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...(form as Biz), name: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm mb-1">Short description</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...(form as Biz), description: e.target.value })}
            />
          </div>

          {/* Website + Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Website</label>
              <input
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
                placeholder="https://example.com"
                value={form.website ?? ''}
                onChange={(e) => setForm({ ...(form as Biz), website: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Contact email</label>
              <input
                type="email"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...(form as Biz), email: e.target.value })}
              />
            </div>
          </div>

          {/* Phone + Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Phone</label>
              <input
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...(form as Biz), phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Address</label>
              <input
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
                value={form.address ?? ''}
                onChange={(e) => setForm({ ...(form as Biz), address: e.target.value })}
              />
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => setForm({ ...(form as Biz), active: e.target.checked })}
            />
            <label htmlFor="active" className="text-sm">
              Active
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
