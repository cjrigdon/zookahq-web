import { useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function ArBudgetDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.name}
      backTo="/accounting/budgets"
      backLabel="Back to budgets"
      queryKey={['ar-budget', id ?? '']}
      endpoint={`/accounting/ar-budgets/${id}`}
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
        { name: 'period_start', label: 'Period start', type: 'date' },
        { name: 'period_end', label: 'Period end', type: 'date' },
        { name: 'gl_account_id', label: 'GL account ID' },
        { name: 'budget_amount', label: 'Budget amount', type: 'number' },
        { name: 'actual_amount', label: 'Actual amount', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        ...form,
        gl_account_id: form.gl_account_id ? Number(form.gl_account_id) : null,
        budget_amount: Number(form.budget_amount || 0),
        actual_amount: Number(form.actual_amount || 0),
      })}
    />
  );
}
