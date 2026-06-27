import type { Bill } from '../types';

const STORAGE_KEY = 'sales_challans';

export function loadBills(): Bill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBills(bills: Bill[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

export function getBill(id: string): Bill | undefined {
  return loadBills().find((b) => b.id === id);
}

export function addBill(bill: Bill): void {
  const bills = loadBills();
  saveBills([...bills, bill]);
}

export function updateBill(updated: Bill): void {
  const bills = loadBills().map((b) => (b.id === updated.id ? updated : b));
  saveBills(bills);
}

export function deleteBill(id: string): void {
  saveBills(loadBills().filter((b) => b.id !== id));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function generateChallanNo(): string {
  const bills = loadBills();
  if (bills.length === 0) return 'AP/001';
  // Extract numeric part from existing challan numbers like AP/001, AP/667
  const nums = bills.map((b) => {
    const match = b.challanNo.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const next = Math.max(...nums) + 1;
  return `AP/${String(next).padStart(3, '0')}`;
}
