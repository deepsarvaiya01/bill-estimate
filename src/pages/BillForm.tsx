import { useState, useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusCircle, Trash2 } from 'lucide-react';
import { getBill, addBill, updateBill, generateId, generateChallanNo } from '../utils/storage';
import type { Bill, BillItem } from '../types';

const UNITS: BillItem['unit'][] = ['CFT', 'FOOT', 'NOS', 'KG', 'SF', 'MTR', 'OTHER'];

function emptyItem(): BillItem {
  return { id: generateId(), productName: '', qty: 0, unit: 'NOS', pcs: 0, rate: 0 };
}

function itemTotal(item: BillItem): number {
  return item.qty * item.pcs * item.rate;
}

function emptyBill(): Omit<Bill, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    challanNo: generateChallanNo(),
    date: new Date().toISOString().split('T')[0],
    customerName: '',
    location: '',
    items: [emptyItem()],
    note: '',
    narration: 'OK',
  };
}

export default function BillForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const tableRef = useRef<HTMLTableElement>(null);

  const [form, setForm] = useState(emptyBill());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      const bill = getBill(id);
      if (bill) {
        const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = bill;
        setForm(rest);
      }
    }
  }, [id]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function setItem(itemId: string, field: keyof BillItem, value: string | number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === itemId ? { ...it, [field]: value } : it)),
    }));
    if (field === 'productName') {
      setErrors((prev) => {
        const idx = form.items.findIndex((it) => it.id === itemId);
        const next = { ...prev };
        delete next[`item_${idx}`];
        return next;
      });
    }
  }

  function addItem() {
    const newItem = emptyItem();
    setForm((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    // Focus first cell of new row after render
    setTimeout(() => {
      const rows = tableRef.current?.querySelectorAll('tbody tr');
      if (rows) {
        const lastRow = rows[rows.length - 1];
        const input = lastRow?.querySelector<HTMLInputElement>('input[data-col="name"]');
        input?.focus();
      }
    }, 50);
  }

  function removeItem(itemId: string) {
    if (form.items.length === 1) return;
    setForm((prev) => ({ ...prev, items: prev.items.filter((it) => it.id !== itemId) }));
  }

  // Tab through columns; on last col of last row, add new row
  function handleKeyDown(e: KeyboardEvent<HTMLElement>, rowIdx: number, col: 'name' | 'qty' | 'unit' | 'pcs' | 'rate') {
    if (e.key !== 'Enter' && e.key !== 'Tab') return;
    if (e.key === 'Tab' && e.shiftKey) return;
    const order: typeof col[] = ['name', 'qty', 'unit', 'pcs', 'rate'];
    const colIdx = order.indexOf(col);
    const isLastCol = colIdx === order.length - 1;
    const isLastRow = rowIdx === form.items.length - 1;

    if (isLastCol && isLastRow) {
      e.preventDefault();
      addItem();
    } else if (e.key === 'Enter' || isLastCol) {
      e.preventDefault();
      // Move to next row same col or next col same row
      const nextCol = isLastCol ? order[0] : order[colIdx + 1];
      const nextRow = isLastCol ? rowIdx + 1 : rowIdx;
      const rows = tableRef.current?.querySelectorAll('tbody tr');
      const targetRow = rows?.[nextRow];
      const input = targetRow?.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-col="${nextCol}"]`);
      input?.focus();
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.customerName.trim()) e.customerName = 'Required';
    if (!form.date) e.date = 'Required';
    if (form.items.length === 0) e.items = 'Add at least one item';
    form.items.forEach((it, i) => {
      if (!it.productName.trim()) e[`item_${i}`] = 'required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const now = new Date().toISOString();
    if (isEdit && id) {
      const existing = getBill(id)!;
      updateBill({ ...existing, ...form, updatedAt: now });
    } else {
      addBill({ ...form, id: generateId(), createdAt: now, updatedAt: now });
    }
    navigate('/');
  }

  const cellCls = 'border border-gray-200 focus:outline-none focus:bg-blue-50 focus:border-blue-400 transition-colors text-sm px-2 py-2 w-full bg-white';
  const errCellCls = 'border border-red-300 bg-red-50';

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-24 space-y-4">
      <h2 className="text-lg font-bold text-gray-800">{isEdit ? 'Edit Challan' : 'New Challan'}</h2>

      {/* Challan details */}
      <div className="bg-white rounded-2xl shadow p-4 space-y-3">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Challan Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Challan No.</label>
            <div className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 text-blue-700 font-bold tracking-wide select-all">
              {form.challanNo}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date *</label>
            <input
              type="date"
              className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 ${errors.date ? 'border-red-400' : 'border-gray-200'}`}
              value={form.date}
              onChange={(e) => setField('date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Customer info */}
      <div className="bg-white rounded-2xl shadow p-4 space-y-3">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Customer Info</p>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Customer Name (M/s) *</label>
          <input
            className={`w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 ${errors.customerName ? 'border-red-400' : 'border-gray-200'}`}
            placeholder="Customer name"
            value={form.customerName}
            onChange={(e) => setField('customerName', e.target.value)}
          />
          {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Location</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="City / Area"
            value={form.location}
            onChange={(e) => setField('location', e.target.value)}
          />
        </div>
      </div>

      {/* Items — inline table */}
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
            Items <span className="text-gray-400 normal-case font-normal">(Tab / Enter to move between cells)</span>
          </p>
          <button
            onClick={addItem}
            className="flex items-center gap-1 text-blue-700 text-xs font-medium active:scale-95 transition-transform"
          >
            <PlusCircle size={15} /> Add Row
          </button>
        </div>

        {errors.items && <p className="text-red-500 text-xs px-4 py-1">{errors.items}</p>}

        <table ref={tableRef} className="w-full border-collapse text-xs table-fixed">
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '27%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
              <th className="border border-gray-200 px-1 py-2 text-center">#</th>
              <th className="border border-gray-200 px-1 py-2 text-left">Product</th>
              <th className="border border-gray-200 px-1 py-2 text-center">Qty / Unit</th>
              <th className="border border-gray-200 px-1 py-2 text-center">Pcs</th>
              <th className="border border-gray-200 px-1 py-2 text-right">Rate</th>
              <th className="border border-gray-200 px-1 py-2 text-right">Total</th>
              <th className="border border-gray-200 px-1 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {form.items.map((item, i) => (
              <tr key={item.id} className="group hover:bg-blue-50/40 transition-colors">
                {/* Row number */}
                <td className="border border-gray-200 text-center text-gray-400 select-none py-1">
                  {i + 1}
                </td>

                {/* Product Name */}
                <td className={`border p-0 ${errors[`item_${i}`] ? errCellCls : 'border-gray-200'}`}>
                  <input
                    data-col="name"
                    className={`${cellCls} ${errors[`item_${i}`] ? 'bg-red-50' : ''}`}
                    placeholder="Name"
                    value={item.productName}
                    onChange={(e) => setItem(item.id, 'productName', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, i, 'name')}
                  />
                </td>

                {/* Qty + Unit combined */}
                <td className="border border-gray-200 p-0">
                  <div className="flex">
                    <input
                      data-col="qty"
                      type="number"
                      inputMode="decimal"
                      className="w-1/2 border-r border-gray-200 focus:outline-none focus:bg-blue-50 text-xs px-1 py-2 text-right bg-white"
                      placeholder="0"
                      value={item.qty || ''}
                      onChange={(e) => setItem(item.id, 'qty', parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => handleKeyDown(e, i, 'qty')}
                      onFocus={(e) => e.target.select()}
                    />
                    <select
                      data-col="unit"
                      className="w-1/2 focus:outline-none focus:bg-blue-50 text-xs px-0.5 py-2 text-center bg-white cursor-pointer appearance-none"
                      value={item.unit}
                      onChange={(e) => setItem(item.id, 'unit', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, i, 'unit')}
                    >
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </td>

                {/* Pcs */}
                <td className="border border-gray-200 p-0">
                  <input
                    data-col="pcs"
                    type="number"
                    inputMode="decimal"
                    className={`${cellCls} text-right`}
                    placeholder="0"
                    value={item.pcs || ''}
                    onChange={(e) => setItem(item.id, 'pcs', parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => handleKeyDown(e, i, 'pcs')}
                    onFocus={(e) => e.target.select()}
                  />
                </td>

                {/* Rate */}
                <td className="border border-gray-200 p-0">
                  <input
                    data-col="rate"
                    type="number"
                    inputMode="decimal"
                    className={`${cellCls} text-right`}
                    placeholder="0"
                    value={item.rate || ''}
                    onChange={(e) => setItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => handleKeyDown(e, i, 'rate')}
                    onFocus={(e) => e.target.select()}
                  />
                </td>

                {/* Total (read-only) */}
                <td className="border border-gray-200 px-1 py-1 text-right text-gray-700 font-medium bg-gray-50 select-none">
                  {itemTotal(item).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>

                {/* Delete */}
                <td className="border border-gray-200 text-center p-0.5">
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={form.items.length === 1}
                    className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-20 disabled:cursor-not-allowed transition-colors active:scale-95"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}

            {/* Grand total row */}
            <tr className="bg-blue-700 text-white font-semibold">
              <td colSpan={5} className="border border-blue-600 px-2 py-2 text-right text-xs uppercase tracking-wide">
                Grand Total
              </td>
              <td className="border border-blue-600 px-1 py-2 text-right text-sm">
                {form.items.reduce((sum, it) => sum + itemTotal(it), 0)
                  .toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </td>
              <td className="border border-blue-600"></td>
            </tr>
          </tbody>
        </table>

        {/* Add row button below table */}
        <button
          onClick={addItem}
          className="w-full py-2.5 text-blue-600 text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors border-t border-gray-100 active:scale-95"
        >
          <PlusCircle size={15} /> Add Row
        </button>
      </div>

      {/* Note + Narration */}
      <div className="bg-white rounded-2xl shadow p-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Narration</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="e.g. OK, Payment received, Against order..."
            value={form.narration}
            onChange={(e) => setField('narration', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            rows={2}
            placeholder="Any additional notes..."
            value={form.note}
            onChange={(e) => setField('note', e.target.value)}
          />
        </div>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-gray-200 flex gap-3 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium active:scale-95 transition-transform"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-3 rounded-xl bg-blue-700 text-white font-semibold shadow active:scale-95 transition-transform"
        >
          {isEdit ? 'Save Changes' : 'Create Challan'}
        </button>
      </div>
    </div>
  );
}
