export interface BillItem {
  id: string;
  productName: string;
  qty: number;
  unit: 'CFT' | 'FOOT' | 'NOS' | 'KG' | 'SF' | 'MTR' | 'OTHER';
  pcs: number;
  rate: number;
}

export interface Bill {
  id: string;
  challanNo: string;
  date: string;
  customerName: string;
  location: string;

  items: BillItem[];
  note: string;
  narration: string;
  createdAt: string;
  updatedAt: string;
}
