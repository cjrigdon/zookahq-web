import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ActionButton } from '../../components/ui/ActionButton';

type StyleForm = {
  id?: number;
  space_style_id: string;
  seating_capacity: string;
};

type AttributeDef = {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
};

type StyleDef = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
};

type SpaceDetail = {
  id: number;
  name: string;
  description?: string | null;
  area_sq_ft?: number | null;
  is_active: boolean;
  styles: Array<{
    id: number;
    space_style_id: number;
    code?: string | null;
    name?: string | null;
    seating_capacity: number;
    sort_order: number;
  }>;
  attributes: Array<{ space_attribute_id: number; name?: string; value: boolean }>;
};

const emptyCapacity = (): StyleForm => ({ space_style_id: '', seating_capacity: '' });

export function SpaceDetailPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-space', id ?? 'new'],
    queryFn: () =>
      api<{ data: SpaceDetail; attributes: AttributeDef[]; styles: StyleDef[] }>(
        `/admin/spaces/${id}`,
      ),
    enabled: !isNew,
  });

  const { data: attributeData } = useQuery({
    queryKey: ['admin-space-attributes'],
    queryFn: () => api<{ data: AttributeDef[] }>('/admin/space-attributes'),
    enabled: isNew,
  });

  const { data: styleData } = useQuery({
    queryKey: ['admin-space-styles'],
    queryFn: () => api<{ data: StyleDef[] }>('/admin/space-styles'),
    enabled: isNew,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [areaSqFt, setAreaSqFt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [capacities, setCapacities] = useState<StyleForm[]>([emptyCapacity()]);
  const [attributeAnswers, setAttributeAnswers] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const attributeDefs: AttributeDef[] = isNew
    ? attributeData?.data ?? []
    : data?.attributes ?? [];

  const styleDefs: StyleDef[] = useMemo(() => {
    const rows = isNew ? styleData?.data ?? [] : data?.styles ?? [];
    const selectedIds = new Set(
      capacities.map((row) => Number(row.space_style_id)).filter((value) => Number.isFinite(value) && value > 0),
    );
    return rows.filter((style) => style.is_active !== false || selectedIds.has(style.id));
  }, [isNew, styleData?.data, data?.styles, capacities]);

  useEffect(() => {
    if (!data?.data) return;
    const space = data.data;
    setName(space.name);
    setDescription(space.description ?? '');
    setAreaSqFt(space.area_sq_ft != null ? String(space.area_sq_ft) : '');
    setIsActive(space.is_active);
    setCapacities(
      space.styles.length > 0
        ? space.styles.map((style) => ({
            id: style.id,
            space_style_id: String(style.space_style_id),
            seating_capacity: String(style.seating_capacity),
          }))
        : [emptyCapacity()],
    );
    const answers: Record<number, boolean> = {};
    for (const attr of space.attributes ?? []) {
      answers[attr.space_attribute_id] = Boolean(attr.value);
    }
    setAttributeAnswers(answers);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        area_sq_ft: areaSqFt.trim() === '' ? null : Number(areaSqFt),
        is_active: isActive,
        styles: capacities.map((row, index) => ({
          ...(row.id ? { id: row.id } : {}),
          space_style_id: Number(row.space_style_id),
          seating_capacity: Number(row.seating_capacity || 0),
          sort_order: index,
        })),
        attributes: attributeDefs.map((attr) => ({
          space_attribute_id: attr.id,
          value: Boolean(attributeAnswers[attr.id]),
        })),
      };

      if (isNew) {
        return api<{ data: SpaceDetail }>('/admin/spaces', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      return api<{ data: SpaceDetail }>(`/admin/spaces/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      setError(null);
      await qc.invalidateQueries({ queryKey: ['admin-spaces'] });
      navigate('/admin/spaces');
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/admin/spaces/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-spaces'] });
      navigate('/admin/spaces');
    },
    onError: (err: Error) => setError(err.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (areaSqFt.trim() !== '') {
      const area = Number(areaSqFt);
      if (!Number.isFinite(area) || area < 0 || !Number.isInteger(area)) {
        setError('Area must be a whole number of square feet.');
        return;
      }
    }
    if (styleDefs.length === 0) {
      setError('Create at least one space style before setting capacities.');
      return;
    }
    if (capacities.length === 0 || capacities.some((row) => !row.space_style_id)) {
      setError('Each capacity row needs a style.');
      return;
    }
    const selectedIds = capacities.map((row) => row.space_style_id);
    if (new Set(selectedIds).size !== selectedIds.length) {
      setError('Each style can only be used once per space.');
      return;
    }
    if (
      capacities.some(
        (row) => Number(row.seating_capacity) < 0 || Number.isNaN(Number(row.seating_capacity)),
      )
    ) {
      setError('Each style needs a valid seating capacity.');
      return;
    }
    saveMutation.mutate();
  }

  function availableStylesForRow(index: number) {
    const selectedElsewhere = new Set(
      capacities
        .map((row, i) => (i === index ? null : row.space_style_id))
        .filter((value): value is string => Boolean(value)),
    );
    return styleDefs.filter((style) => {
      const current = capacities[index]?.space_style_id;
      return String(style.id) === current || !selectedElsewhere.has(String(style.id));
    });
  }

  if (!isNew && isLoading) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/spaces" className="text-sm text-primary hover:underline">
        Back to spaces
      </Link>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl">
        {isNew ? 'New space' : 'Edit space'}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Choose known seating styles, set capacities for this space, and answer yes/no attributes.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Name</span>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Description</span>
            <textarea
              className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Area (sq ft)</span>
            <input
              type="number"
              min={0}
              step={1}
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="e.g. 2500"
              value={areaSqFt}
              onChange={(e) => setAreaSqFt(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active
          </label>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-slate-900">Capacities by style</h3>
              <p className="text-xs text-slate-500">
                Select a known setup and enter how many guests this space holds in that style.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/admin/space-styles" className="text-sm text-primary hover:underline">
                Manage styles
              </Link>
              <ActionButton
                size="sm"
                variant="secondary"
                type="button"
                disabled={styleDefs.length === 0 || capacities.length >= styleDefs.length}
                onClick={() => setCapacities((current) => [...current, emptyCapacity()])}
              >
                Add capacity
              </ActionButton>
            </div>
          </div>
          {styleDefs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No styles configured yet.{' '}
              <Link to="/admin/space-styles" className="text-primary hover:underline">
                Create styles
              </Link>{' '}
              first.
            </p>
          ) : (
            <div className="space-y-3">
              {capacities.map((row, index) => (
                <div
                  key={row.id ?? `new-${index}`}
                  className="grid gap-3 rounded-md border border-slate-100 p-3 sm:grid-cols-[1.4fr_0.8fr_auto]"
                >
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Style</span>
                    <select
                      className="zhq-select zhq-select--block"
                      value={row.space_style_id}
                      onChange={(e) =>
                        setCapacities((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, space_style_id: e.target.value } : item,
                          ),
                        )
                      }
                      required
                    >
                      <option value="">Select style…</option>
                      {availableStylesForRow(index).map((style) => (
                        <option key={style.id} value={style.id}>
                          {style.name} ({style.code})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-slate-600">Seating capacity</span>
                    <input
                      type="number"
                      min={0}
                      className="w-full rounded-md border border-slate-300 px-3 py-2"
                      value={row.seating_capacity}
                      onChange={(e) =>
                        setCapacities((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, seating_capacity: e.target.value } : item,
                          ),
                        )
                      }
                      required
                    />
                  </label>
                  <div className="flex items-end">
                    <ActionButton
                      size="sm"
                      variant="danger"
                      type="button"
                      disabled={capacities.length === 1}
                      onClick={() =>
                        setCapacities((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </ActionButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-slate-900">Attributes</h3>
              <p className="text-xs text-slate-500">Yes/no answers for configurable space options.</p>
            </div>
            <Link to="/admin/space-attributes" className="text-sm text-primary hover:underline">
              Manage attributes
            </Link>
          </div>
          {attributeDefs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No attributes configured yet. Add them under Space attributes.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {attributeDefs.map((attr) => (
                <li key={attr.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{attr.name}</div>
                    {attr.description ? (
                      <div className="text-xs text-slate-500">{attr.description}</div>
                    ) : null}
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(attributeAnswers[attr.id])}
                      onChange={(e) =>
                        setAttributeAnswers((current) => ({
                          ...current,
                          [attr.id]: e.target.checked,
                        }))
                      }
                    />
                    Yes
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between gap-2">
          <div>
            {!isNew && (
              <ActionButton
                variant="danger"
                type="button"
                onClick={() => {
                  if (window.confirm('Delete this space?')) deleteMutation.mutate();
                }}
              >
                Delete
              </ActionButton>
            )}
          </div>
          <div className="flex gap-2">
            <ActionButton variant="secondary" type="button" onClick={() => navigate('/admin/spaces')}>
              Cancel
            </ActionButton>
            <ActionButton type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </ActionButton>
          </div>
        </div>
      </form>
    </div>
  );
}
