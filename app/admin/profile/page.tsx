'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

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
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // -------- Load admin businesses and pick which one to edit
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

      // ✅ Typed Supabase call — removes squiggle
      const { data: adminRows, error: adminErr } = await supabase
        .from('business_admins')
        .select('business_id, Businesses(*)')
        .order('business_id', { ascending: true })
        .returns<AdminLink[]>();

      if (cancelled) return;

      if (adminErr) {
        setError(adminErr.message);
        setLoading(false);
        return;
      }

      const rows: AdminLink[] = adminRows ?? [];
      setLinks(rows);

      // Decide initial pick:
      const param = search.get('business_id');
      const initial =
        (param && rows.find(r => r.business_id === param)?.business_id) ||
        rows[0]?.business_id ||
        null;

      setSelectedId(initial);

      if (initial) {
        const chosen = rows.find(r => r.business_id === initial)?.Businesses || null;
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

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const multi = links.length > 1;
  const currentName = useMemo(() => {
    if (!selectedId) return 'New business';
    const l = links.find(l => l.business_id === selectedId);
    return l?.Businesses?.name || 'Untitled business';
  }, [links, selectedId]);

  // -------- Upload logo
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

  // -------- Create & link a brand new business
  async function handleCreateBusiness() {
    setError(null);
    setSaved(false);
    setSaving(true);

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess?.session?.user?.id;
    if (!userId) {
      setSaving(false);
      router.replace('/login?next=/admin/profile');
      return;
    }

    // Create business first
    const { data: ins, error: insErr } = await supabase
      .from('Businesses')
      .insert({
        name: (form?.name || '').trim() || 'Untitled business',
        description: form?.description || '',
        website: form?.website || '',
        email: form?.email || '',
        phone: form?.phone || '',
        address: form?.address || '',
        logo_url: '',
        active: true,
      })
      .select('*')
      .single();

    if (insErr) {
      const msg =
        insErr.message.includes('row-level security')
          ? 'new row violates row-level security policy for table "Businesses". Add the INSERT policy shown below in Supabase (SQL provided).'
          : insErr.message;
      setError(msg);
      setSaving(false);
      return;
    }

    // Upload logo if provided
    let finalLogoUrl = '';
    if (logoFile && ins) {
      const uploadedUrl = await uploadLogoIfNeeded(ins.id);
      if (uploadedUrl) {
        finalLogoUrl = uploadedUrl;
        // Update the business with the logo URL
        const { error: updateErr } = await supabase
          .from('Businesses')
          .update({ logo_url: finalLogoUrl })
          .eq('id', ins.id);
        
        if (updateErr) {
          setError(updateErr.message);
          setSaving(false);
          return;
        }
      }
    }

    // Link user to business
    const { error: linkErr } = await supabase
      .from('business_admins')
      .insert({ business_id: ins.id, user_id: userId });

    if (linkErr) {
      setError(linkErr.message);
      setSaving(false);
      return;
    }

    const updatedBusiness = { ...ins, logo_url: finalLogoUrl } as Biz;
    setLinks(prev => [...prev, { business_id: ins.id, Businesses: updatedBusiness }]);
    setSelectedId(ins.id);
    setForm({
      id: ins.id,
      name: ins.name ?? '',
      description: ins.description ?? '',
      website: ins.website ?? '',
      email: ins.email ?? '',
      phone: ins.phone ?? '',
      address: ins.address ?? '',
      logo_url: finalLogoUrl,
      active: ins.active ?? true,
    });

    setSaved(true);
    setSaving(false);
    setLogoFile(null);
  }

  // -------- Save existing
  async function handleSave() {
    if (!form) return;
    setError(null);
    setSaved(false);
    setSaving(true);

    if (!form.id) {
      await handleCreateBusiness();
      setSaving(false);
      return;
    }

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

    setLinks(prev =>
      prev.map(l =>
        l.business_id === form.id
          ? { ...l, Businesses: { ...(l.Businesses || {}), ...form, logo_url } as Biz }
          : l
      )
    );

    setSaved(true);
    setSaving(false);
    setLogoFile(null);
  }

  function pickBusiness(id: string) {
    setSaved(false);
    setError(null);
    setSelectedId(id);

    const chosen = links.find(l => l.business_id === id)?.Businesses;
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
    } else {
      setForm({
        id: id,
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
  }

  if (loading) return <main className="p-6">Loading…</main>;

  return (
    <main className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Business Profile</h1>
      <p className="text-sm text-neutral-400 mb-4">
        This is what customers see in your perks and on your profile.
      </p>

      {/* Banner / selector */}
      <div className="mb-4 rounded-lg border border-neutral-700 bg-neutral-900 p-3 flex flex-wrap gap-3 items-center">
        <div className="text-sm">
          <span className="text-neutral-400">You're editing:</span>{' '}
          <span className="font-medium">{currentName}</span>
        </div>

        {multi && (
          <div className="ml-auto">
            <label className="text-xs block mb-1 text-neutral-400">
              Switch business
            </label>
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

      {/* Create new */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={handleCreateBusiness}
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
          {/* Logo */}
          <div>
            <label className="block text-sm mb-2">Logo</label>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 rounded-full overflow-hidden bg-neutral-800 ring-1 ring-black/20">
                {form.logo_url ? (
                  <Image
                    src={form.logo_url}
                    alt="logo"
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
              <div className="text-xs text-neutral-400">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.currentTarget.files?.[0] ?? null)}
                  className="cursor-pointer"
                />
                <div>PNG/JPG preferred. &lt; 4MB.</div>
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
              onChange={(e) =>
                setForm({ ...(form as Biz), description: e.target.value })
              }
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
                onChange={(e) =>
                  setForm({ ...(form as Biz), website: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Contact email</label>
              <input
                type="email"
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
                value={form.email ?? ''}
                onChange={(e) =>
                  setForm({ ...(form as Biz), email: e.target.value })
                }
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
                onChange={(e) =>
                  setForm({ ...(form as Biz), phone: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Address</label>
              <input
                className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2"
                value={form.address ?? ''}
                onChange={(e) =>
                  setForm({ ...(form as Biz), address: e.target.value })
                }
              />
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2">
            <input
              id="active"
              type="checkbox"
              checked={!!form.active}
              onChange={(e) =>
                setForm({ ...(form as Biz), active: e.target.checked })
              }
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