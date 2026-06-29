import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Pencil, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getBill, deleteBill } from '../utils/storage';
import type { Bill } from '../types';

// ── Color palette — text only is black, no dark backgrounds ──
type RGB = [number, number, number];
const C_BLACK  : RGB = [0,   0,   0  ];
const C_MID    : RGB = [100, 100, 100];
const C_BORDER : RGB = [180, 180, 180];
const C_HEAD   : RGB = [230, 230, 230];
const C_ALT    : RGB = [246, 246, 246];
const C_BAND   : RGB = [238, 238, 238];
const C_WHITE  : RGB = [255, 255, 255];

// ── Amount in words (Indian numbering) ───────────────────────
const ONES = ['', 'One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen',
  'Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '');
}

function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n);
  return ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + belowHundred(n % 100) : '');
}

function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise  = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  const parts: string[] = [];
  let n = rupees;

  if (n >= 10_000_000) {
    parts.push(belowThousand(Math.floor(n / 10_000_000)) + ' Crore');
    n %= 10_000_000;
  }
  if (n >= 100_000) {
    parts.push(belowThousand(Math.floor(n / 100_000)) + ' Lakh');
    n %= 100_000;
  }
  if (n >= 1_000) {
    parts.push(belowThousand(Math.floor(n / 1_000)) + ' Thousand');
    n %= 1_000;
  }
  if (n > 0) parts.push(belowThousand(n));

  let result = parts.join(' ') + ' Rupees';
  if (paise > 0) result += ' and ' + belowHundred(paise) + ' Paise';
  return result + ' Only';
}

function itemTotal(item: Bill['items'][number]): number {
  if (item.qty === 0 && item.rate === 0) return 0;
  return (item.qty || 1) * item.rate;
}

// ── PDF builder ───────────────────────────────────────────────
function buildPDF(bill: Bill): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 12;
  const cW = W - M * 2;

  const fmtDate = bill.date
    ? new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const grandTotal = bill.items.reduce((s, it) => s + itemTotal(it), 0);

  // ── ESTIMATE header — white bg, black bold text, gray bottom border ──
  doc.setFillColor(...C_WHITE);
  doc.rect(M, 8, cW, 13, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C_BLACK);
  doc.text('ESTIMATE', W / 2, 17, { align: 'center' });
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.4);
  doc.line(M, 21, W - M, 21);

  // ── Meta row — name left, challan no right, same line ────────
  let y = 28;
  const P = 8; // inner horizontal padding from outer border
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C_MID);
  doc.text('M/s :', M + P, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C_BLACK);
  doc.text(bill.customerName.toUpperCase(), M + P + 11, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C_MID);
  doc.text('Challan No :', W / 2 + 10, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C_BLACK);
  doc.text(bill.challanNo, W - M - P, y, { align: 'right' });

  // ── Second meta row — location left, date right ───────────────
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C_MID);
  doc.text('Location :', M + P, y);
  doc.setTextColor(...C_BLACK);
  doc.text(bill.location || '—', M + P + 18, y);

  doc.setTextColor(...C_MID);
  doc.text('Date :', W / 2 + 10, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C_BLACK);
  doc.text(fmtDate, W - M - P, y, { align: 'right' });

  // Divider
  y += 5;
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 3;

  // ── Items table ───────────────────────────────────────────────
  const rows = bill.items.map((it, i) => [
    String(i + 1),
    it.productName.toUpperCase(),
    String(it.pcs),
    it.qty === 0 ? '—' : `${it.qty.toLocaleString('en-IN')} ${it.unit}`,
    it.rate.toLocaleString('en-IN'),
    itemTotal(it).toLocaleString('en-IN', { maximumFractionDigits: 2 }),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: M + P, right: M + P },
    head: [['Sr', 'Product Name', 'Pcs', 'Qty / Unit', 'Rate', 'Total']],
    body: rows,
    headStyles: { fillColor: C_HEAD, textColor: C_BLACK, fontStyle: 'bold', fontSize: 8, halign: 'center', lineWidth: 0 },
    bodyStyles: { fontSize: 8, textColor: C_BLACK, lineWidth: 0, cellPadding: { top: 1.2, bottom: 1.2, left: 2, right: 2 } },
    alternateRowStyles: { fillColor: C_ALT },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 14 },
      3: { halign: 'right', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
    },
    styles: { lineWidth: 0 },
    didDrawCell: (data) => {
      doc.setDrawColor(...C_BORDER);
      doc.setLineWidth(0.2);
      if (data.section === 'head') {
        // draw only the bottom border of the header row
        const isLastCol = data.column.index === data.table.columns.length - 1;
        if (isLastCol) {
          doc.line(data.cell.x + data.cell.width, data.cell.y, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
        doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
      }
      if (data.section === 'body') {
        const x = data.cell.x + data.cell.width;
        const y = data.cell.y;
        const h = data.cell.height;
        doc.line(x, y, x, y + h);
        if (data.column.index === 0) {
          doc.line(data.cell.x, y, data.cell.x, y + h);
        }
        // bottom line on the last row
        const isLastRow = data.row.index === data.table.body.length - 1;
        if (isLastRow) {
          doc.line(data.cell.x, y + h, data.cell.x + data.cell.width, y + h);
        }
      }
    },
  });

  // ── Bottom section: pinned to page bottom ─────────────────────
  const pageH = doc.internal.pageSize.getHeight();
  const bottomY = pageH - M;

  const lineRowH = 8;
  const lineGap = 5.5;
  const leftW = cW * 0.62;
  const rightX = M + leftW + 2;
  const rightW = cW - leftW - 2;

  const infoRows: { label: string; value: string; italic?: boolean }[] = [
    { label: 'Amount in Words :', value: amountInWords(grandTotal), italic: true },
    { label: 'Narration :', value: bill.narration || 'OK' },
    ...(bill.note ? [{ label: 'Note :', value: bill.note }] : []),
  ];
  const sigBlockH = Math.max(infoRows.length * lineGap + 6, 20);

  const grandTotalTop = bottomY - lineRowH;
  const sigBlockTop   = grandTotalTop - sigBlockH;
  const subTotalTop   = sigBlockTop - lineRowH;

  // ── Sub Total row — full gray bg, label+price in right 30% ───
  const boxW   = cW * 0.3;
  const boxX   = M + cW * 0.7;
  const stMidY = subTotalTop + lineRowH / 2 + 1.5;
  doc.setFillColor(...C_ALT);
  doc.rect(M, subTotalTop, cW, lineRowH, 'F');
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(M, subTotalTop, cW, lineRowH, 'S');
  doc.rect(boxX, subTotalTop, boxW, lineRowH, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C_MID);
  doc.text('Sub Total', boxX + 2, stMidY);
  doc.setTextColor(...C_BLACK);
  doc.text(grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }), boxX + boxW - 2, stMidY, { align: 'right' });

  // ── Signature + Info block ────────────────────────────────────
  doc.setFillColor(...C_WHITE);
  doc.rect(M, sigBlockTop, cW, sigBlockH, 'F');
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(M, sigBlockTop, cW, sigBlockH, 'S');

  doc.setFontSize(8);
  let ly = sigBlockTop + 6;
  infoRows.forEach((row) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C_MID);
    doc.text(row.label, M + P, ly);
    doc.setFont('helvetica', row.italic ? 'bolditalic' : 'normal');
    doc.setTextColor(...C_BLACK);
    const labelW = doc.getTextWidth(row.label) + 3;
    doc.text(row.value, M + P + labelW, ly, { maxWidth: leftW - labelW - P - 2 });
    ly += lineGap;
  });

  const sigMidY  = sigBlockTop + sigBlockH / 2;
  const sigLineY = sigMidY + 2;
  doc.setDrawColor(...C_MID);
  doc.setLineWidth(0.3);
  doc.line(rightX + 4, sigLineY, rightX + rightW - 4, sigLineY);
  doc.setFontSize(7.5);
  doc.setTextColor(...C_MID);
  doc.text("Receiver's Signature", rightX + rightW / 2, sigLineY + 4, { align: 'center' });

  // ── Grand Total row — full gray bg, label+price in right 30% ─
  const gtMidY = grandTotalTop + lineRowH / 2 + 1.5;
  doc.setFillColor(...C_BAND);
  doc.rect(M, grandTotalTop, cW, lineRowH, 'F');
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(M, grandTotalTop, cW, lineRowH, 'S');
  doc.rect(boxX, grandTotalTop, boxW, lineRowH, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C_MID);
  doc.text('Grand Total', boxX + 2, gtMidY);
  doc.setTextColor(...C_BLACK);
  doc.text(grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 }), boxX + boxW - 2, gtMidY, { align: 'right' });

  // ── Outer border — full page height ──────────────────────────
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.5);
  doc.rect(M, 8, cW, bottomY - 8, 'S');

  return doc;
}

export default function BillView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (id) {
      const b = getBill(id);
      if (b) setBill(b);
      else navigate('/');
    }
  }, [id, navigate]);

  function handleDownloadPDF() {
    if (!bill) return;
    setDownloading(true);
    try {
      const doc = buildPDF(bill);
      doc.save(`Challan_${bill.challanNo.replace(/\//g, '-')}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  function handleDelete() {
    if (id) {
      deleteBill(id);
      navigate('/');
    }
  }

  if (!bill) return null;

  const formattedDate = bill.date
    ? new Date(bill.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const grandTotal = bill.items.reduce((s, it) => s + itemTotal(it), 0);

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 pb-24">
      {/* Top action bar */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <span className="flex-1 font-bold text-gray-800 text-base">Challan #{bill.challanNo}</span>
        <button onClick={() => navigate(`/edit/${bill.id}`)} className="p-2 rounded-xl bg-amber-50 text-amber-700 active:scale-95 transition-transform">
          <Pencil size={18} />
        </button>
        <button onClick={() => setShowDelete(true)} className="p-2 rounded-xl bg-red-50 text-red-600 active:scale-95 transition-transform">
          <Trash2 size={18} />
        </button>
      </div>

      {/* Screen preview */}
      <div ref={printRef} className="bg-white rounded-2xl shadow overflow-hidden mx-2">
        {/* Header — white bg, black text, gray border */}
        <div className="text-center py-3 border-b border-gray-200">
          <div className="font-bold text-xl tracking-widest text-gray-900">ESTIMATE</div>
        </div>

        {/* Meta — name + challan no on same row, location + date on second row */}
        <div className="px-6 pt-3 pb-2">
          <div className="flex justify-between items-baseline border-b border-gray-200 pb-2">
            <div>
              <span className="text-xs text-gray-500">M/s </span>
              <span className="font-bold text-sm text-gray-900 uppercase">{bill.customerName}</span>
            </div>
            <div className="text-right text-xs">
              <span className="text-gray-500">Challan No : </span>
              <span className="font-bold text-gray-900">{bill.challanNo}</span>
            </div>
          </div>
          <div className="flex justify-between items-baseline pt-2">
            <div>
              <span className="text-gray-500 text-xs">Location: </span>
              <span className="font-semibold text-gray-700 text-xs">{bill.location || '—'}</span>
            </div>
            <div className="text-right text-xs">
              <span className="text-gray-500">Date : </span>
              <span className="font-bold text-gray-900">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Items table */}
        <div className="px-4 pb-3 overflow-x-auto">
          <table className="w-full text-xs table-fixed border-collapse" style={{ minWidth: 420 }}>
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-1 py-1.5 text-center font-bold text-gray-700">Sr</th>
                <th className="border border-gray-300 px-2 py-1.5 text-left font-bold text-gray-700">Product Name</th>
                <th className="border border-gray-300 px-1 py-1.5 text-right font-bold text-gray-700">Qty</th>
                <th className="border border-gray-300 px-1 py-1.5 text-center font-bold text-gray-700">Pcs</th>
                <th className="border border-gray-300 px-1 py-1.5 text-right font-bold text-gray-700">Rate</th>
                <th className="border border-gray-300 px-1 py-1.5 text-right font-bold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border-l border-r border-gray-200 px-1 py-2 text-center text-gray-500">{i + 1}</td>
                  <td className="border-r border-gray-200 px-2 py-2 text-gray-900 font-semibold">{item.productName}</td>
                  <td className="border-r border-gray-200 px-1 py-2 text-right text-gray-700">
                    {item.qty === 0 ? '—' : <>{item.qty.toLocaleString('en-IN')} <span className="text-gray-400">{item.unit}</span></>}
                  </td>
                  <td className="border-r border-gray-200 px-1 py-2 text-center text-gray-700">{item.pcs}</td>
                  <td className="border-r border-gray-200 px-1 py-2 text-right text-gray-700">{item.rate.toLocaleString('en-IN')}</td>
                  <td className="border-r border-gray-200 px-1 py-2 text-right font-bold text-gray-900">
                    {itemTotal(item).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold text-gray-900">
                <td colSpan={5} className="border-t border-l border-r border-gray-300 px-2 py-2 text-right text-xs uppercase tracking-widest">Grand Total</td>
                <td className="border-t border-r border-gray-300 px-1 py-2 text-right text-sm font-extrabold">
                  {grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom block — two columns: info left, signature right */}
        <div className="mx-5 mb-4 border border-gray-200 rounded bg-white flex">
          {/* Left: Amount / Narration / Note */}
          <div className="flex-1 px-3 py-2 space-y-1 text-xs">
            <div>
              <span className="font-semibold text-gray-500">Amount in Words : </span>
              <span className="italic text-gray-900">{amountInWords(grandTotal)}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-500">Narration : </span>
              <span className="text-gray-800">{bill.narration || 'OK'}</span>
            </div>
            {bill.note && (
              <div>
                <span className="font-semibold text-gray-500">Note : </span>
                <span className="text-gray-800">{bill.note}</span>
              </div>
            )}
          </div>
          {/* Right: Receiver's Signature */}
          <div className="w-36 flex flex-col items-center justify-center py-3 gap-1">
            <div className="w-28 border-t border-gray-400"></div>
            <span className="text-xs text-gray-500">Receiver's Signature</span>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t border-gray-200 flex gap-3 max-w-2xl mx-auto">
        <button onClick={() => navigate('/')} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium active:scale-95 transition-transform">
          Back
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-700 text-white font-semibold shadow active:scale-95 transition-transform disabled:opacity-60"
        >
          <Download size={18} />
          {downloading ? 'Generating...' : 'Download PDF'}
        </button>
      </div>

      {/* Delete modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-lg text-gray-800 mb-2">Delete Challan?</h3>
            <p className="text-gray-500 text-sm mb-5">Challan <strong>{bill.challanNo}</strong> will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium active:scale-95 transition-transform">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
