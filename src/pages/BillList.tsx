import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, FileText, PlusCircle } from 'lucide-react';
import { loadBills, deleteBill } from '../utils/storage';
import type { Bill } from '../types';

export default function BillList() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setBills(loadBills().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }, []);

  function handleDelete(id: string) {
    deleteBill(id);
    setBills((prev) => prev.filter((b) => b.id !== id));
    setDeleteId(null);
  }

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
          <FileText size={36} className="text-blue-500" />
        </div>
        <p className="text-gray-500 text-base">No challans yet</p>
        <button
          onClick={() => navigate('/new')}
          className="flex items-center gap-2 bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow active:scale-95 transition-transform"
        >
          <PlusCircle size={18} />
          Create First Challan
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 py-3 space-y-3">
      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Challan No.</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Items</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill, i) => (
              <tr key={bill.id} className="border-t border-gray-100 hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-blue-700">{bill.challanNo}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{bill.customerName}</div>
                  <div className="text-xs text-gray-400">{bill.location}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{bill.date}</td>
                <td className="px-4 py-3 text-gray-500">{bill.items.length} items</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => navigate(`/view/${bill.id}`)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors" title="View">
                      <Eye size={17} />
                    </button>
                    <button onClick={() => navigate(`/edit/${bill.id}`)} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 transition-colors" title="Edit">
                      <Pencil size={17} />
                    </button>
                    <button onClick={() => setDeleteId(bill.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 transition-colors" title="Delete">
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {bills.map((bill, i) => (
          <div key={bill.id} className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-xs text-gray-400 mr-2">#{i + 1}</span>
                <span className="font-bold text-blue-700 text-sm">{bill.challanNo}</span>
              </div>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{bill.challanNo}</span>
            </div>
            <div className="font-semibold text-gray-800">{bill.customerName}</div>
            <div className="text-xs text-gray-400 mb-1">{bill.location}</div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span>{bill.date}</span>
              <span>{bill.items.length} items</span>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate(`/view/${bill.id}`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium active:scale-95 transition-transform"
              >
                <Eye size={15} /> View
              </button>
              <button
                onClick={() => navigate(`/edit/${bill.id}`)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-medium active:scale-95 transition-transform"
              >
                <Pencil size={15} /> Edit
              </button>
              <button
                onClick={() => setDeleteId(bill.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-medium active:scale-95 transition-transform"
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Delete Challan?</h3>
            <p className="text-gray-500 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium active:scale-95 transition-transform"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
