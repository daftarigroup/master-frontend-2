export async function fetchDepartmentsApi(): Promise<Array<{ id: string; name: string }>> {
  return [
    { id: 'dept-1', name: 'Engineering' },
    { id: 'dept-2', name: 'Production' },
    { id: 'dept-3', name: 'Quality' },
    { id: 'dept-4', name: 'Sales & Marketing' },
    { id: 'dept-5', name: 'Human Resources' },
    { id: 'dept-6', name: 'Finance & Accounts' },
    { id: 'dept-7', name: 'Administration' },
  ];
}
