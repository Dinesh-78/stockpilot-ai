'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  FileText,
  Upload,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  FileCheck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { formatPaiseToRupees, rupeesToPaise } from '@/lib/money';
import { SAMPLE_INVOICES } from '@/lib/ocr';

export default function InvoiceUploadPage() {
  const [user, setUser] = useState<any>(null);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setUser(d.user));

    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setCatalogProducts(d.products || []));
  }, []);

  const isOwner = user?.role === 'OWNER';

  async function handleFileUpload(file: File) {
    setSelectedFile(file);
    setProcessing(true);
    setFeedback(null);
    setDuplicateWarning(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/invoices/process-ocr', {
        method: 'POST',
        body: formData,
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to process OCR on invoice');

      setExtractedData(resData.data);
      if (resData.duplicateWarning) {
        setDuplicateWarning(resData.duplicateWarning);
      }
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
      setExtractedData(null);
    } finally {
      setProcessing(false);
    }
  }

  async function handleLoadSample(sampleId: string) {
    setProcessing(true);
    setFeedback(null);
    setDuplicateWarning(null);
    setSelectedFile(null);

    try {
      const res = await fetch('/api/invoices/process-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleId }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to process sample invoice');

      setExtractedData(resData.data);
      if (resData.duplicateWarning) {
        setDuplicateWarning(resData.duplicateWarning);
      }
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    } finally {
      setProcessing(false);
    }
  }

  function updateLine(index: number, field: string, value: any) {
    if (!extractedData) return;
    const lines = [...extractedData.lineItems];
    lines[index] = { ...lines[index], [field]: value };

    if (field === 'quantity' || field === 'unitPricePaise') {
      const qty = parseFloat(lines[index].quantity) || 0;
      const rate = lines[index].unitPricePaise || 0;
      lines[index].lineTotalPaise = Math.round(qty * rate);
    }

    const calculatedSum = lines.reduce((sum, l) => sum + (l.lineTotalPaise || 0), 0);
    const tax = Math.round(calculatedSum * 0.05);

    setExtractedData({
      ...extractedData,
      lineItems: lines,
      calculatedSumPaise: calculatedSum,
      totalAmountPaise: calculatedSum + tax,
    });
  }

  function removeLine(index: number) {
    if (!extractedData) return;
    const lines = extractedData.lineItems.filter((_: any, i: number) => i !== index);
    const calculatedSum = lines.reduce((sum: number, l: any) => sum + (l.lineTotalPaise || 0), 0);
    setExtractedData({
      ...extractedData,
      lineItems: lines,
      calculatedSumPaise: calculatedSum,
    });
  }

  function addEmptyLine() {
    if (!extractedData) return;
    const newLine = {
      id: Math.random().toString(),
      rawProductName: 'New Product Item',
      matchedProductId: catalogProducts[0]?.id || null,
      matchedProductName: catalogProducts[0]?.name || null,
      quantity: 10,
      unitPricePaise: 10000,
      lineTotalPaise: 100000,
      confidence: 1.0,
      isNewProduct: false,
    };
    setExtractedData({
      ...extractedData,
      lineItems: [...extractedData.lineItems, newLine],
    });
  }

  async function handleConfirmInvoice() {
    if (!extractedData) return;
    setConfirming(true);
    setFeedback(null);

    try {
      const payload = {
        supplierName: extractedData.supplierName,
        supplierId: extractedData.matchedSupplierId,
        invoiceNumber: extractedData.invoiceNumber,
        invoiceDate: extractedData.invoiceDate,
        lineItems: extractedData.lineItems,
        totalAmountPaise: extractedData.totalAmountPaise,
        fileHash: extractedData.fileHash,
        rawOcrText: extractedData.rawOcrText,
      };

      const res = await fetch('/api/invoices/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to confirm invoice');

      setFeedback({ message: resData.message, type: 'success' });
      setExtractedData(null);
      setSelectedFile(null);
      setDuplicateWarning(null);
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    } finally {
      setConfirming(false);
    }
  }

  if (user && !isOwner) {
    return (
      <AppShell pageTitle="OCR Invoice Import">
        <div className="max-w-md mx-auto py-16 text-center">
          <div className="w-16 h-16 bg-[#fee2e2] text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">Owner Authorization Required</h3>
          <p className="text-xs text-slate-500 mb-6">
            Priya (Staff) cannot approve supplier invoices or modify product stock according to store rules.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle="OCR Purchase Invoices">
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Invoice OCR Import & Human Review</h2>
        <p className="text-xs text-slate-500 font-medium">
          Extract printed invoices with Tesseract.js. Mandatory human review before any stock change.
        </p>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          className={`p-4 mb-6 rounded-3xl text-xs font-bold flex items-center gap-2 shadow-soft ${
            feedback.type === 'success'
              ? 'bg-[#e8fadc] text-[#1c532f] border border-[#cbeec1]'
              : 'bg-[#fdf2f2] text-rose-900 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-brand-primary flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Duplicate Alert (Brief §03 & §06) */}
      {duplicateWarning && (
        <div className="p-4 mb-6 rounded-3xl bg-[#fef3c7] border border-amber-300 text-amber-950 text-xs font-bold flex items-center gap-2 shadow-soft">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-black text-amber-900 uppercase">Duplicate Invoice Notice</p>
            <p className="font-medium text-amber-800">{duplicateWarning}</p>
          </div>
        </div>
      )}

      {/* Step 1: Upload or Pick Demo Sample */}
      {!extractedData && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File Drag & Drop Zone */}
          <div className="lg:col-span-7 bg-white p-8 rounded-3xl border-2 border-dashed border-[#d9e2d6] hover:border-brand-primary transition-colors text-center flex flex-col items-center justify-center min-h-[320px] shadow-soft">
            <div className="w-16 h-16 rounded-3xl bg-[#f6f8f5] text-brand-primary flex items-center justify-center mb-4 shadow-sm">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base mb-1">
              Upload Purchase Invoice (JPG, PNG, PDF)
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              Accepted files up to 5 MB. Tesseract OCR will extract vendor name, invoice number, line items, and quantities.
            </p>

            <label className="cursor-pointer px-6 py-3 bg-brand-primary hover:bg-[#0b2f24] text-white font-extrabold rounded-2xl text-xs shadow-soft transition-all flex items-center gap-2">
              <span>Select Invoice File</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
                className="hidden"
              />
            </label>

            {processing && (
              <div className="mt-6 flex items-center gap-2 text-brand-primary text-xs font-bold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Analyzing invoice layout and optical characters...
              </div>
            )}
          </div>

          {/* Quick 1-Click Sample Fixtures for Judges */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-[#e8ece6] shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-brand-primary" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  1-Click Hackathon Test Invoices
                </h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Instant test fixtures from the brief (no image file required):
              </p>

              <div className="space-y-3">
                {SAMPLE_INVOICES.map((sample) => (
                  <div
                    key={sample.id}
                    className="p-4 rounded-2xl border border-[#e8ece6] hover:border-brand-primary bg-[#f9fbf8] transition-all text-xs"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-extrabold text-slate-900">{sample.title}</span>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{sample.invoiceNumber}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Items: {sample.lines.map((l) => l.rawProductName.split(' ')[0]).join(', ')} · Total:{' '}
                      {formatPaiseToRupees(sample.totalAmountPaise)}
                    </p>
                    <button
                      onClick={() => handleLoadSample(sample.id)}
                      disabled={processing}
                      className="w-full py-2 px-3 bg-white hover:bg-brand-lime text-brand-dark border border-[#ccd8ca] rounded-xl text-xs font-bold transition-colors"
                    >
                      Process with OCR →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Split-Screen Review & Confirm (Brief §03: Human reviews & confirms before any stock changes) */}
      {extractedData && (
        <div className="space-y-6">
          <div className="p-4 bg-[#e8fadc] border border-[#cbeec1] rounded-3xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-soft">
            <div>
              <span className="font-black text-slate-900 block text-sm">
                Human Review & Confirmation
              </span>
              <span className="text-slate-600">
                Verify extracted line items below. Nothing touches stock until confirmed by the store owner.
              </span>
            </div>
            <button
              onClick={() => setExtractedData(null)}
              className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-100 rounded-xl border border-[#e8ece6] font-bold text-xs"
            >
              Discard & Upload Again
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Raw Text Left */}
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-[#e8ece6] shadow-soft flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-brand-primary" />
                  OCR Extracted Source
                </h3>
                <p className="text-xs text-slate-500 mb-3">Raw output from OCR stream</p>

                <pre className="p-4 bg-[#0e392c] text-[#c2f07d] font-mono text-[11px] rounded-2xl overflow-x-auto whitespace-pre-wrap max-h-[380px] leading-relaxed">
                  {extractedData.rawOcrText}
                </pre>
              </div>

              <div className="mt-4 pt-3 border-t border-[#f0f4ee] text-[10px] text-slate-400 font-mono">
                SHA-256 Hash: {extractedData.fileHash ? extractedData.fileHash.substring(0, 16) + '...' : 'N/A'}
              </div>
            </div>

            {/* Editable Review Table Right */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-[#e8ece6] shadow-soft">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-4 bg-[#f8faf7] rounded-2xl border border-[#edf2ea] text-xs">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-0.5">Supplier</label>
                  <input
                    type="text"
                    value={extractedData.supplierName}
                    onChange={(e) => setExtractedData({ ...extractedData, supplierName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-0.5">Invoice #</label>
                  <input
                    type="text"
                    value={extractedData.invoiceNumber}
                    onChange={(e) => setExtractedData({ ...extractedData, invoiceNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-0.5">Invoice Date</label>
                  <input
                    type="date"
                    value={extractedData.invoiceDate}
                    onChange={(e) => setExtractedData({ ...extractedData, invoiceDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl font-bold text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Line items table */}
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#f0f4ee] text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-2">Catalog Match</th>
                      <th className="py-2.5 px-2 w-20">Quantity</th>
                      <th className="py-2.5 px-2 w-28">Unit Rate (₹)</th>
                      <th className="py-2.5 px-2">Line Total</th>
                      <th className="py-2.5 px-2 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f8f3]">
                    {extractedData.lineItems.map((line: any, idx: number) => {
                      const isLowConfidence = line.confidence < 0.9;

                      return (
                        <tr key={line.id || idx} className="hover:bg-[#f9fbf8]">
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              value={line.rawProductName}
                              onChange={(e) => updateLine(idx, 'rawProductName', e.target.value)}
                              className={`w-full px-2 py-1 border rounded-xl font-bold ${
                                isLowConfidence ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'
                              }`}
                            />
                          </td>

                          <td className="py-2.5 px-2">
                            <select
                              value={line.matchedProductId || ''}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const found = catalogProducts.find((p) => p.id === selectedId);
                                updateLine(idx, 'matchedProductId', selectedId);
                                updateLine(idx, 'matchedProductName', found?.name || null);
                              }}
                              className="w-full px-2 py-1 border border-slate-200 rounded-xl bg-white font-medium"
                            >
                              <option value="">(New Product - Auto Create)</option>
                              {catalogProducts.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={line.quantity}
                              onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border border-slate-200 rounded-xl font-bold"
                            />
                          </td>

                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              step="0.01"
                              value={(line.unitPricePaise / 100).toFixed(2)}
                              onChange={(e) => updateLine(idx, 'unitPricePaise', rupeesToPaise(e.target.value))}
                              className="w-full px-2 py-1 border border-slate-200 rounded-xl font-bold"
                            />
                          </td>

                          <td className="py-2.5 px-2 font-black text-slate-900">
                            {formatPaiseToRupees(line.lineTotalPaise)}
                          </td>

                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={() => removeLine(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={addEmptyLine}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#f6f8f5] hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Line
                </button>

                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">
                    Subtotal: {formatPaiseToRupees(extractedData.calculatedSumPaise || 0)}
                  </p>
                  <p className="text-sm font-black text-slate-900">
                    Grand Total: {formatPaiseToRupees(extractedData.totalAmountPaise || 0)}
                  </p>
                </div>
              </div>

              {/* Confirm Action */}
              <div className="pt-4 border-t border-[#f0f4ee] flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  ⚡ All product quantities increment atomically in one ACID transaction.
                </span>

                <button
                  onClick={handleConfirmInvoice}
                  disabled={confirming}
                  className="w-full sm:w-auto px-6 py-3 bg-brand-primary hover:bg-[#0b2f24] text-white font-extrabold rounded-2xl text-xs shadow-soft flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4 text-brand-lime" />
                  {confirming ? 'Updating Stock...' : 'Confirm & Update Stock Atomically'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
