import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { ReportResultTable } from './ReportResultTable';

type FilterRow = { field: string; op: string; value: string };

export function ReportBuilderPage() {
  const [params] = useSearchParams();
  const fromId = params.get('from');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: catalogData } = useQuery({
    queryKey: ['reporting-catalog'],
    queryFn: () => api<{ data: any[] }>('/reporting/catalog'),
  });

  const { data: existing } = useQuery({
    queryKey: ['saved-report', fromId],
    queryFn: () => api<{ data: any }>(`/reporting/saved-reports/${fromId}`),
    enabled: !!fromId,
  });

  const datasets = catalogData?.data ?? [];
  const [name, setName] = useState('Untitled report');
  const [description, setDescription] = useState('');
  const [dataset, setDataset] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState('');
  const [sortColumn, setSortColumn] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [chartType, setChartType] = useState('bar');
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const activeDataset = useMemo(
    () => datasets.find((d) => d.key === dataset) ?? null,
    [datasets, dataset],
  );

  useEffect(() => {
    if (!dataset && datasets[0]) {
      setDataset(datasets[0].key);
      setColumns(datasets[0].columns.slice(0, 5).map((c: any) => c.key));
      setGroupBy(datasets[0].default_group_by ?? '');
      setSortColumn(datasets[0].columns[0]?.key ?? '');
    }
  }, [datasets, dataset]);

  useEffect(() => {
    const report = existing?.data;
    if (!report) return;
    setName(report.name);
    setDescription(report.description ?? '');
    setDataset(report.dataset);
    setColumns(report.columns ?? []);
    setGroupBy(report.group_by ?? '');
    setSortColumn(report.sort_column ?? '');
    setSortDirection(report.sort_direction === 'asc' ? 'asc' : 'desc');
    setChartType(report.chart_type ?? 'bar');
    setFilters(
      (report.filters ?? []).map((f: any) => ({
        field: f.field,
        op: f.op ?? 'eq',
        value: String(f.value ?? ''),
      })),
    );
    setAiPrompt(report.ai_prompt ?? '');
  }, [existing]);

  const applyDataset = (key: string) => {
    const def = datasets.find((d) => d.key === key);
    setDataset(key);
    if (def) {
      setColumns(def.columns.slice(0, 5).map((c: any) => c.key));
      setGroupBy(def.default_group_by ?? '');
      setSortColumn(def.columns[0]?.key ?? '');
      setFilters([]);
    }
  };

  const toggleColumn = (key: string) => {
    setColumns((prev) => (prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]));
  };

  const runMutation = useMutation({
    mutationFn: () =>
      api<{ data: any }>('/reporting/run', {
        method: 'POST',
        body: JSON.stringify({
          dataset,
          columns,
          filters: filters
            .filter((f) => f.field && f.value !== '')
            .map((f) => ({ field: f.field, op: f.op, value: f.value })),
          group_by: groupBy || undefined,
          sort_column: sortColumn || undefined,
          sort_direction: sortDirection,
        }),
      }),
    onSuccess: (res) => {
      setError(null);
      setResult(res.data);
    },
    onError: (err: Error) => setError(err.message),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      api<{ data: any }>(fromId ? `/reporting/saved-reports/${fromId}` : '/reporting/saved-reports', {
        method: fromId ? 'PUT' : 'POST',
        body: JSON.stringify({
          name,
          description: description || undefined,
          dataset,
          columns,
          filters: filters
            .filter((f) => f.field && f.value !== '')
            .map((f) => ({ field: f.field, op: f.op, value: f.value })),
          group_by: groupBy || null,
          sort_column: sortColumn || null,
          sort_direction: sortDirection,
          chart_type: chartType,
          ai_prompt: aiPrompt || null,
        }),
      }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['saved-reports'] });
      navigate(`/reporting/library/${res.data.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const aiMutation = useMutation({
    mutationFn: () =>
      api<{ data: any }>('/reporting/ai/suggest', {
        method: 'POST',
        body: JSON.stringify({ prompt: aiPrompt }),
      }),
    onSuccess: (res) => {
      const s = res.data.suggestion;
      setAiNote(`Suggestion from ${res.data.provider} mode`);
      setName(s.name);
      setDescription(s.description ?? '');
      setDataset(s.dataset);
      setColumns(s.columns ?? []);
      setGroupBy(s.group_by ?? '');
      setSortColumn(s.sort_column ?? '');
      setSortDirection(s.sort_direction === 'asc' ? 'asc' : 'desc');
      setChartType(s.chart_type ?? 'bar');
      setFilters(
        (s.filters ?? []).map((f: any) => ({
          field: f.field,
          op: f.op ?? 'eq',
          value: String(f.value ?? ''),
        })),
      );
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Report builder</h2>
          <p className="text-sm text-slate-600">
            Choose a dataset, columns, and filters — or describe what you need in plain language.
          </p>
        </div>
        <Link to="/reporting/library" className="text-sm text-primary">
          Back to library
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="mb-2 text-sm font-medium">AI assist</h3>
        <form
          className="flex flex-col gap-3 md:flex-row"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            aiMutation.mutate();
          }}
        >
          <input
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder='e.g. "Show open AR invoices by status"'
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
            disabled={!aiPrompt.trim() || aiMutation.isPending}
          >
            {aiMutation.isPending ? 'Thinking…' : 'Suggest'}
          </button>
        </form>
        {aiNote && <p className="mt-2 text-xs text-slate-500">{aiNote}</p>}
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 lg:grid-cols-2">
        <label className="block text-sm lg:col-span-2">
          <span className="mb-1 block text-slate-600">Report name</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm lg:col-span-2">
          <span className="mb-1 block text-slate-600">Description</span>
          <input
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Dataset</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={dataset}
            onChange={(e) => applyDataset(e.target.value)}
          >
            {datasets.map((d) => (
              <option key={d.key} value={d.key}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Chart type</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
          >
            {['none', 'bar', 'pie', 'line'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="lg:col-span-2">
          <div className="mb-2 text-sm text-slate-600">Columns</div>
          <div className="flex flex-wrap gap-2">
            {(activeDataset?.columns ?? []).map((col: any) => (
              <label
                key={col.key}
                className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm ${
                  columns.includes(col.key)
                    ? 'border-primary bg-support/50 text-primary'
                    : 'border-slate-200'
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={columns.includes(col.key)}
                  onChange={() => toggleColumn(col.key)}
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-600">Group by</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="">None</option>
            {(activeDataset?.columns ?? []).map((col: any) => (
              <option key={col.key} value={col.key}>
                {col.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Sort</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={sortColumn}
              onChange={(e) => setSortColumn(e.target.value)}
            >
              {(activeDataset?.columns ?? []).map((col: any) => (
                <option key={col.key} value={col.key}>
                  {col.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Direction</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2"
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </label>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-600">Filters</span>
            <button
              type="button"
              className="text-sm text-primary"
              onClick={() =>
                setFilters((prev) => [
                  ...prev,
                  { field: activeDataset?.columns?.[0]?.key ?? '', op: 'eq', value: '' },
                ])
              }
            >
              + Add filter
            </button>
          </div>
          <div className="space-y-2">
            {filters.map((filter, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-4">
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={filter.field}
                  onChange={(e) =>
                    setFilters((prev) =>
                      prev.map((f, i) => (i === index ? { ...f, field: e.target.value } : f)),
                    )
                  }
                >
                  {(activeDataset?.columns ?? []).map((col: any) => (
                    <option key={col.key} value={col.key}>
                      {col.label}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={filter.op}
                  onChange={(e) =>
                    setFilters((prev) =>
                      prev.map((f, i) => (i === index ? { ...f, op: e.target.value } : f)),
                    )
                  }
                >
                  {['eq', 'neq', 'contains', 'gt', 'gte', 'lt', 'lte'].map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-1"
                  value={filter.value}
                  onChange={(e) =>
                    setFilters((prev) =>
                      prev.map((f, i) => (i === index ? { ...f, value: e.target.value } : f)),
                    )
                  }
                />
                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() => setFilters((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium"
          onClick={() => runMutation.mutate()}
          disabled={!dataset || columns.length === 0 || runMutation.isPending}
        >
          {runMutation.isPending ? 'Running…' : 'Run report'}
        </button>
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white"
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || !dataset || columns.length === 0 || saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving…' : fromId ? 'Update report' : 'Save report'}
        </button>
      </div>

      {result && <ReportResultTable result={result} />}
    </div>
  );
}
