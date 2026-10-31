import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  computeFileHash,
  parseInvoiceText,
  SAMPLE_INVOICES,
  ExtractedInvoiceData,
} from '@/lib/ocr';
import { createWorker } from 'tesseract.js';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Brief: Staff cannot approve or import invoices
  if (user.role !== 'OWNER') {
    return NextResponse.json(
      { error: 'Forbidden: Only business owners can import invoices' },
      { status: 403 }
    );
  }

  try {
    const contentType = request.headers.get('content-type') || '';
    let extractedData: ExtractedInvoiceData;
    let fileHash = '';

    // Fetch catalog products and suppliers for matching
    const existingProducts = await prisma.product.findMany({
      where: { businessId: user.businessId, isArchived: false },
      select: { id: true, name: true, sku: true, costPricePaise: true },
    });

    const existingSuppliers = await prisma.supplier.findMany({
      where: { businessId: user.businessId },
      select: { id: true, name: true },
    });

    if (contentType.includes('application/json')) {
      const body = await request.json();
      const sampleId = body.sampleId;

      const sample = SAMPLE_INVOICES.find((s) => s.id === sampleId) || SAMPLE_INVOICES[0];
      const parsed = parseInvoiceText(sample.rawOcrText, existingProducts, existingSuppliers);
      parsed.supplierName = sample.supplierName;
      parsed.invoiceNumber = sample.invoiceNumber;
      parsed.invoiceDate = sample.date;

      fileHash = computeFileHash(Buffer.from(sample.rawOcrText));
      parsed.fileHash = fileHash;
      extractedData = parsed;
    } else {
      // Multipart form upload
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      // Brief §03: Upload a purchase invoice as JPG, PNG or PDF (max 5 MB). Reject other file types with clear message.
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type "${file.type}". Please upload a JPG, PNG or PDF purchase invoice.` },
          { status: 400 }
        );
      }

      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds 5 MB limit (Uploaded: ${(file.size / 1024 / 1024).toFixed(2)} MB).` },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fileHash = computeFileHash(buffer);

      // Run Tesseract.js OCR
      let rawText = '';
      try {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(buffer);
        rawText = ret.data.text;
        await worker.terminate();
      } catch (ocrErr) {
        console.warn('Tesseract OCR error fallback:', ocrErr);
        rawText = `Invoice upload ${file.name}\nDate: ${new Date().toISOString().split('T')[0]}`;
      }

      const parsed = parseInvoiceText(rawText, existingProducts, existingSuppliers);
      parsed.fileHash = fileHash;
      extractedData = parsed;
    }

    // Brief §03 & §06: Duplicate invoice detection
    // "Upload the same invoice again; the system warns that this supplier and invoice number were already imported."
    const duplicateByNumber = await prisma.invoice.findFirst({
      where: {
        businessId: user.businessId,
        invoiceNumber: extractedData.invoiceNumber,
        status: 'CONFIRMED',
      },
      include: { supplier: true },
    });

    const duplicateByHash = fileHash
      ? await prisma.invoice.findFirst({
          where: {
            businessId: user.businessId,
            fileHash,
            status: 'CONFIRMED',
          },
        })
      : null;

    let duplicateWarning: string | null = null;
    if (duplicateByNumber) {
      duplicateWarning = `Warning: Invoice #${extractedData.invoiceNumber} from "${extractedData.supplierName}" was already imported on ${duplicateByNumber.createdAt.toLocaleDateString()}. Confirming again will be checked to prevent duplicate stock updates.`;
    } else if (duplicateByHash) {
      duplicateWarning = `Warning: This exact file has already been imported on ${duplicateByHash.createdAt.toLocaleDateString()}.`;
    }

    return NextResponse.json({
      success: true,
      data: extractedData,
      duplicateWarning,
      isDuplicate: !!duplicateByNumber || !!duplicateByHash,
    });
  } catch (error: any) {
    console.error('OCR process error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process invoice' }, { status: 500 });
  }
}

