import { ResourcePage } from '../../components/ResourcePage';

export function BudgetsPage() {
  return (
    <ResourcePage
      title="AR Budgets"
      description="Budget vs actual tracking by period."
      queryKey="accounting-budgets"
      endpoint="/accounting/ar-budgets"
      initialForm={{
        name: '',
        period_type: 'month',
        period_start: '',
        period_end: '',
        budget_amount: '0',
        actual_amount: '0',
      }}
      fields={[
        { name: 'name', label: 'Name', required: true },
        {
          name: 'period_type',
          label: 'Period',
          options: [
            { value: 'month', label: 'Month' },
            { value: 'quarter', label: 'Quarter' },
            { value: 'year', label: 'Year' },
          ],
        },
        { name: 'period_start', label: 'Start', type: 'date', required: true },
        { name: 'period_end', label: 'End', type: 'date', required: true },
        { name: 'budget_amount', label: 'Budget amount', type: 'number', required: true },
        { name: 'actual_amount', label: 'Actual amount', type: 'number' },
      ]}
      transformPayload={(form) => ({
        ...form,
        budget_amount: Number(form.budget_amount || 0),
        actual_amount: Number(form.actual_amount || 0),
      })}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'period_type', label: 'Period' },
        {
          key: 'budget_amount',
          label: 'Budget',
          render: (row: any) =>
            Number(row.budget_amount).toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            }),
        },
        {
          key: 'actual_amount',
          label: 'Actual',
          render: (row: any) =>
            Number(row.actual_amount).toLocaleString(undefined, {
              style: 'currency',
              currency: 'USD',
            }),
        },
      ]}
      detailTo={(row) => `/accounting/budgets/${row.id}`}
    />
  );
}
