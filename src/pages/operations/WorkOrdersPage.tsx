import { api } from '../../api/client';
import { ResourcePage } from '../../components/ResourcePage';

export function WorkOrdersPage() {
  return (
    <ResourcePage
      title="Work Orders"
      description="Facilities and operations tasks across the venue."
      queryKey="operations-work-orders"
      endpoint="/operations/work-orders"
      initialForm={{
        title: '',
        status: 'open',
        priority: 'normal',
        category: 'facilities',
        location: '',
        due_at: '',
        description: '',
      }}
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
        { name: 'due_at', label: 'Due at', type: 'datetime-local' },
        { name: 'description', label: 'Description' },
      ]}
      transformPayload={(form) => ({
        ...form,
        due_at: form.due_at || null,
      })}
      columns={[
        { key: 'title', label: 'Title' },
        {
          key: 'priority',
          label: 'Priority',
          render: (row: any) =>
            row.priority === 'high' || row.priority === 'urgent' ? (
              <span className="rounded bg-accent/30 px-2 py-0.5 text-xs font-medium capitalize">
                {row.priority}
              </span>
            ) : (
              <span className="capitalize">{row.priority}</span>
            ),
        },
        { key: 'status', label: 'Status' },
        { key: 'location', label: 'Location' },
        {
          key: 'assignee',
          label: 'Assignee',
          render: (row: any) => row.assignee?.name ?? '—',
        },
      ]}
      detailTo={(row) => `/operations/work-orders/${row.id}`}
      actions={(row, { refresh }) =>
        row.status !== 'completed' ? (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => {
              void api(`/operations/work-orders/${row.id}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'completed' }),
              }).then(refresh);
            }}
          >
            Complete
          </button>
        ) : null
      }
    />
  );
}
