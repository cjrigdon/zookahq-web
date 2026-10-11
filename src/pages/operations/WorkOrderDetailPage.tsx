import { useParams } from 'react-router-dom';
import { DetailRecord } from '../../components/DetailRecord';

export function WorkOrderDetailPage() {
  const { id } = useParams();

  return (
    <DetailRecord
      title={(r) => r.title}
      backTo="/operations/work-orders"
      backLabel="Back to work orders"
      queryKey={['work-order', id ?? '']}
      endpoint={`/operations/work-orders/${id}`}
      fields={[
        { name: 'title', label: 'Title', required: true },
        {
          name: 'status',
          label: 'Status',
          options: [
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ],
        },
        {
          name: 'priority',
          label: 'Priority',
          options: [
            { value: 'low', label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' },
          ],
        },
        { name: 'category', label: 'Category' },
        { name: 'location', label: 'Location' },
        { name: 'event_id', label: 'Event ID' },
        { name: 'due_at', label: 'Due at', type: 'datetime-local' },
        { name: 'completed_at', label: 'Completed at', type: 'datetime-local' },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'resolution_notes', label: 'Resolution notes', type: 'textarea' },
      ]}
      transformSave={(form) => ({
        ...form,
        event_id: form.event_id ? Number(form.event_id) : null,
        due_at: form.due_at || null,
        completed_at: form.completed_at || null,
      })}
    />
  );
}
