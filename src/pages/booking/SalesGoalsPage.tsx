import { ResourcePage } from '../../components/ResourcePage';

export function SalesGoalsPage() {
  return (
    <ResourcePage
      title="Sales Goals"
      description="Targets by period for the sales team."
      queryKey="booking-sales-goals"
      endpoint="/booking/sales-goals"
      initialForm={{
        name: '',
        period_type: 'month',
        period_start: '',
        period_end: '',
        target_amount: '0',
      }}
      fields={[
        { name: 'name', label: 'Name', required: true },
        {
          name: 'period_type',
          label: 'Period type',
          options: [
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' },
          ],
        },
        { name: 'period_start', label: 'Start', type: 'date', required: true },
        { name: 'period_end', label: 'End', type: 'date', required: true },
        { name: 'target_amount', label: 'Target amount', type: 'number', required: true },
      ]}
      transformPayload={(form) => ({
        ...form,
        target_amount: Number(form.target_amount || 0),
      })}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'period_type', label: 'Period' },
        {
          key: 'period_start',
          label: 'Start',
          render: (row: any) =>
            row.period_start ? String(row.period_start).slice(0, 10) : '—',
        },
        {
          key: 'period_end',
          label: 'End',
          render: (row: any) =>
            row.period_end ? String(row.period_end).slice(0, 10) : '—',
        },
        {
          key: 'target_amount',
          label: 'Target',
          render: (row: any) =>
            Number(row.target_amount).toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            }),
        },
      ]}
      detailTo={(row) => `/booking/sales-goals/${row.id}`}
    />
  );
}
