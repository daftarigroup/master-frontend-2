// Helper utilities for Petty Cash System

export const toDateOnly = (dateStr: any) => (dateStr ? String(dateStr).slice(0, 10) : dateStr);

export const formatDate = (dateStr: any) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDateForInput = (dateStr: any) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayDate = () => {
  const today = new Date();
  return formatDateForInput(today);
};

export const getTodayDateFormatted = () => {
  return formatDate(new Date());
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
};

export const isDateInRange = (date: any, fromDate?: string, toDate?: string) => {
  const checkDate = new Date(date);
  const startDate = fromDate ? new Date(fromDate) : new Date('1900-01-01');
  const endDate = toDate ? new Date(toDate) : new Date('2099-12-31');
  return checkDate >= startDate && checkDate <= endDate;
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const getPendingCount = (expenses: any[]) => {
  return expenses.filter((e) => e.status === 'PENDING').length;
};

export const getTodaysExpenses = (expenses: any[]) => {
  const today = getTodayDate();
  return expenses
    .filter((e) => toDateOnly(e.date) === today && e.status === 'APPROVED')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
};

export const getTodaysCredits = (credits: any[]) => {
  const today = getTodayDate();
  return credits
    .filter((c) => toDateOnly(c.date) === today)
    .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
};
