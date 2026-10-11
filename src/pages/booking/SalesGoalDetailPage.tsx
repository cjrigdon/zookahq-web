import { useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function SalesGoalDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.name}
      backTo="/booking/sales-goals"
      backLabel="Back to sales goals"
      queryKey={['booking-sales-goal', id ?? '']}
      endpoint={`/booking/sales-goals/${id}`}
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
        { name: 'target_amount', label: 'Target amount', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        ...form,
        target_amount: Number(form.target_amount || 0),
      })}
    />
  );
}
