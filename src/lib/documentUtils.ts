import type { Quotation, Invoice, Client, BusinessSettings } from '@/types';
import { currencySymbols } from '@/types';

interface DocumentData {
  type: 'quotation' | 'invoice';
  document: Quotation | Invoice;
  client?: Client;
  settings: BusinessSettings;
}

// Convert number to words for amount display
function numberToWords(num: number, currency: string): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Lakh', 'Crore'];

  const isOmani = currency === 'OMR';
  const currencyUnit = isOmani ? 'Omani Rial' : 'Rupee';
  const currencyUnitPlural = isOmani ? 'Omani Rials' : 'Rupees';

  function convertBelowThousand(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const tenPlace = Math.floor(n / 10);
      const remainder = n % 10;
      return tens[tenPlace] + (remainder ? ' ' + ones[remainder] : '');
    }
    const hundredPlace = Math.floor(n / 100);
    const afterHundred = n % 100;
    return ones[hundredPlace] + ' Hundred' + (afterHundred ? ' ' + convertBelowThousand(afterHundred) : '');
  }

  const intPart = Math.floor(num);
  const decimalPart = Math.round((num - intPart) * 100);

  if (intPart === 0) {
    return `Zero ${currencyUnitPlural} Only`;
  }

  let result = '';
  let scaleIndex = 0;
  let temp = intPart;

  while (temp > 0) {
    const chunk = temp % (scaleIndex === 0 ? 1000 : scaleIndex === 1 ? 1000 : 10000000);
    if (chunk !== 0) {
      result = convertBelowThousand(chunk) + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + ' ' + result;
    }
    temp = Math.floor(temp / (scaleIndex === 0 ? 1000 : scaleIndex === 1 ? 1000 : 10000000));
    scaleIndex++;
  }

  result = result.trim() + ' ' + (intPart === 1 ? currencyUnit : currencyUnitPlural);

  if (decimalPart > 0) {
    result += ' and ' + convertBelowThousand(decimalPart) + ' Fils';
  }

  result += ' Only';
  return result;
}

// ---------------- FIXED FUNCTION ----------------
export async function generatePDF({ type, document: docData, client, settings }: DocumentData) {
  const pdfBlob = await generatePDFBlob({ type, document: docData, client, settings });

  const filename = `${type}-${docData.number}.pdf`;
  const objectUrl = window.URL.createObjectURL(pdfBlob);

  const anchor = window.document.createElement('a'); // ✅ FIXED
  anchor.href = objectUrl;
  anchor.download = filename;

  window.document.body.appendChild(anchor); // ✅ FIXED
  anchor.click();
  anchor.remove();

  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
}

// ---------------- WHATSAPP ----------------
export async function shareViaWhatsApp({ type, document: docData, client, settings }: DocumentData) {
  const currencySymbol = currencySymbols[settings.currency];
  const isInvoice = type === 'invoice';

  const netTotal = docData.netTotal;

  const message = encodeURIComponent(
    `Hi ${client?.name || 'Client'},\n\n` +
    `${isInvoice ? 'Invoice' : 'Quotation'}: ${docData.number}\n` +
    `Amount: ${currencySymbol}${netTotal}\n`
  );

  const phone = client?.phone?.replace(/\D/g, '') || '';
  const url = phone
    ? `https://wa.me/${phone}?text=${message}`
    : `https://wa.me/?text=${message}`;

  window.open(url, '_blank');

  // Run PDF generation in the background so share stays user-gesture initiated
  void generatePDF({ type, document: docData, client, settings }).catch((err) => {
    console.error('PDF error:', err);
  });
}
// Helper function to generate PDF as blob
export async function generatePDFBlob({ type, document: docData, client, settings }: DocumentData) {
  const currencySymbol = currencySymbols[settings.currency];
  const isInvoice = type === 'invoice';
  const invoice = isInvoice ? (docData as Invoice) : null;
  const isProjectInvoice = invoice?.invoiceType === 'project';
  const subtotal = Number((docData as Invoice).subtotal ?? docData.items.reduce((s, i) => s + i.total, 0)) || 0;
  const vatTotal = Number((docData as Invoice).vatTotal ?? docData.items.reduce((s, i) => s + (i.vatApplicable ? (i.vatAmount ?? 0) : 0), 0)) || 0;
  const discountAmount = Number((docData as Invoice).discountAmount) || 0;
  const projectSummary = invoice?.projectSummary;
  const formatMoney = (value: number) => `${currencySymbol}${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const formatPct = (value: number) => `${(Number(value) || 0).toFixed(2).replace(/\.00$/, '')}%`;

  const html = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        .pdf-document { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 34px;
          color: #1a1a2e;
          width: 794px;
          min-height: 1123px;
          background: #ffffff;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: center;
          gap: 24px;
          margin-bottom: 30px;
          padding-bottom: 18px;
          border-bottom: 2px solid #e5e7eb;
        }
        .logo-section { display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1; }
        .logo { width: 76px; height: 76px; object-fit: contain; flex: 0 0 auto; }
        .business-name { font-size: 21px; line-height: 1.2; font-weight: 700; color: #2563eb; overflow-wrap: anywhere; }
        .business-meta { font-size: 12px; color: #6b7280; margin-top: 5px; line-height: 1.45; }
        .doc-info { text-align: right; flex: 0 0 190px; }
        .doc-type { 
          font-size: 26px; 
          font-weight: bold; 
          text-transform: uppercase;
          color: ${isInvoice ? '#10b981' : '#3b82f6'};
        }
        .doc-number { font-size: 13px; color: #374151; margin-top: 5px; font-weight: 600; }
        .doc-date { font-size: 12px; color: #6b7280; margin-top: 3px; }
        
        .parties { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 26px;
          margin-bottom: 28px;
        }
        .party-section h3 { 
          font-size: 12px; 
          text-transform: uppercase; 
          color: #6b7280;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .party-name { font-size: 17px; font-weight: 600; margin-bottom: 4px; }
        .party-details { font-size: 13px; color: #4b5563; line-height: 1.55; }
        .project-meta {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          margin-bottom: 22px;
        }
        .meta-card {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 10px 12px;
          background: #fbfdff;
        }
        .meta-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.35px; margin-bottom: 4px; }
        .meta-value { font-size: 13px; font-weight: 700; color: #111827; overflow-wrap: anywhere; }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          table-layout: fixed;
          margin-bottom: 24px;
        }
        th { 
          background: #f3f4f6; 
          padding: 10px 12px; 
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: 0.35px;
        }
        th.numeric, td.numeric { text-align: right; }
        td { 
          padding: 12px; 
          border-bottom: 1px solid #e5e7eb;
          font-size: 13px;
          vertical-align: top;
          overflow-wrap: anywhere;
        }
        .item-name { font-weight: 500; }
        .item-desc { font-size: 12px; color: #6b7280; margin-top: 3px; white-space: pre-line; line-height: 1.45; }
        
        .totals { 
          display: flex; 
          justify-content: flex-end;
          margin-bottom: 28px;
        }
        .totals-box { 
          width: 310px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
        }
        .total-row { 
          display: flex; 
          justify-content: space-between;
          gap: 16px;
          padding: 7px 0;
          font-size: 13px;
        }
        .total-row.grand { 
          font-size: 18px; 
          font-weight: bold;
          border-top: 2px solid #e5e7eb;
          margin-top: 8px;
          padding-top: 14px;
          color: #1a1a2e;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 14px;
          margin: 0 0 24px 0;
          padding: 14px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }
        .summary-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; }
        .summary-row strong { color: #111827; }
        .progress-wrap { grid-column: 1 / -1; margin-top: 4px; }
        .progress-track { height: 8px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
        .progress-fill { height: 100%; background: ${projectSummary && projectSummary.totalInvoicedPercentage > 100 ? '#dc2626' : '#10b981'}; }
        
        .amount-in-words {
          margin-bottom: 22px;
          padding: 13px;
          background: #fafbfc;
          border: 1px solid #eef2f7;
          border-radius: 6px;
        }
        .amount-in-words p {
          font-size: 13px;
          color: #4b5563;
          line-height: 1.6;
        }
        
        .notes-section { 
          background: #f8fafc; 
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 14px;
        }
        .notes-section h4 { 
          font-size: 12px; 
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 8px;
        }
        .notes-section p { font-size: 14px; color: #4b5563; line-height: 1.6; }
        
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #9ca3af;
        }
        
        @media print {
          body { padding: 20px; }
          .no-print { display: none; }
        }
      </style>
      <div class="pdf-document">
      <div class="header">
        <div class="logo-section">
          ${settings.logo ? `<img src="${settings.logo}" class="logo" alt="Logo">` : ''}
          <div>
            <div class="business-name">${settings.name || 'Your Business'}</div>
            <div class="business-meta">
              ${settings.email || ''}
              ${settings.phone ? ` • ${settings.phone}<br>` : ''}
          ${settings.address ? `${settings.address}<br>` : ''}
              ${settings.taxNumber ? `GST: ${settings.taxNumber}` : ''}
            </div>
          </div>
        </div>
        <div class="doc-info">
          <div class="doc-type">${isProjectInvoice ? 'Project Invoice' : type}</div>
          <div class="doc-number">${docData.number}</div>
          <div class="doc-date">Date: ${new Date(docData.createdAt).toLocaleDateString('en-IN')}</div>
          ${isInvoice && invoice ? `<div class="doc-date">Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>` : ''}
        </div>
      </div>
      <div class="parties">
        <div class="party-section">
          <h3>Bill To</h3>
          <div class="party-name">${client?.name || 'Client'}</div>
          <div class="party-details">
            ${client?.email ? `${client.email}<br>` : ''}
            ${client?.phone ? `${client.phone}<br>` : ''}
            ${client?.address || ''}
          </div>
        </div>
      </div>
      ${isProjectInvoice ? `
        <div class="project-meta">
          <div class="meta-card"><div class="meta-label">Project</div><div class="meta-value">${invoice?.projectName || invoice?.projectId || '-'}</div></div>
          <div class="meta-card"><div class="meta-label">LPO Number</div><div class="meta-value">${invoice?.lpoNumber || '-'}</div></div>
          <div class="meta-card"><div class="meta-label">Project Value</div><div class="meta-value">${formatMoney(invoice?.projectTotalValue || 0)}</div></div>
        </div>
      ` : ''}
      
      <table>
        <thead>
          ${isProjectInvoice ? `
            <tr>
              <th style="width: 52px;">Sl. No</th>
              <th>Description of Activities</th>
              <th class="numeric" style="width: 130px;">Payment %</th>
              <th class="numeric" style="width: 130px;">Amount</th>
            </tr>
          ` : `
            <tr>
              <th style="width: 52px;">S.No</th>
              <th>Description</th>
              <th class="numeric" style="width: 76px;">Qty</th>
              <th class="numeric" style="width: 110px;">Rate</th>
              <th class="numeric" style="width: 120px;">Amount</th>
            </tr>
          `}
        </thead>
        <tbody>
          ${docData.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              ${isProjectInvoice ? `
                <td><div class="item-desc">${item.description || item.name}</div></td>
                <td class="numeric">${formatPct(item.percentage || 0)}</td>
                <td class="numeric">${formatMoney(item.total)}</td>
              ` : `
                <td>
                  <div class="item-name">${item.name}</div>
                  ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
                </td>
                <td class="numeric">${item.quantity}</td>
                <td class="numeric">${formatMoney(item.rate)}</td>
                <td class="numeric">${formatMoney(item.total + (item.vatApplicable ? (item.vatAmount ?? 0) : 0))}</td>
              `}
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${isProjectInvoice && projectSummary ? `
        <div class="summary-grid">
          <div class="summary-row"><span>Project Total Value</span><strong>${formatMoney(projectSummary.projectTotalValue)}</strong></div>
          <div class="summary-row"><span>Previously Invoiced %</span><strong>${formatPct(projectSummary.previousPercentage)}</strong></div>
          <div class="summary-row"><span>Previously Invoiced Amount</span><strong>${formatMoney(projectSummary.previousAmount)}</strong></div>
          <div class="summary-row"><span>Current Invoice %</span><strong>${formatPct(projectSummary.currentPercentage)}</strong></div>
          <div class="summary-row"><span>Current Invoice Amount</span><strong>${formatMoney(projectSummary.currentAmount)}</strong></div>
          <div class="summary-row"><span>Total Invoiced</span><strong>${formatPct(projectSummary.totalInvoicedPercentage)} / ${formatMoney(projectSummary.totalInvoicedAmount)}</strong></div>
          <div class="summary-row"><span>Remaining %</span><strong>${formatPct(projectSummary.remainingPercentage)}</strong></div>
          <div class="summary-row"><span>Remaining Amount</span><strong>${formatMoney(projectSummary.remainingAmount)}</strong></div>
          <div class="progress-wrap">
            <div class="summary-row" style="margin-bottom: 6px;"><span>Progress</span><strong>${formatPct(projectSummary.totalInvoicedPercentage)}</strong></div>
            <div class="progress-track"><div class="progress-fill" style="width: ${Math.min(100, Math.max(0, projectSummary.totalInvoicedPercentage))}%;"></div></div>
          </div>
        </div>
      ` : ''}
      
      <div class="totals">
        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal</span>
            <span>${formatMoney(subtotal)}</span>
          </div>
          ${discountAmount > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatMoney(discountAmount)}</span></div>` : ''}
          ${!isProjectInvoice ? `<div class="total-row"><span>VAT</span><span>${formatMoney(vatTotal)}</span></div>` : ''}
          <div class="total-row"><span>Total After Adjustments</span><span>${formatMoney(docData.netTotal)}</span></div>
          <div class="total-row grand">
            <span>Grand Total</span>
            <span>${formatMoney(docData.netTotal)}</span>
          </div>
        </div>
      </div>
      
      <div class="amount-in-words">
        <p><strong>Amount in Words:</strong> ${numberToWords(docData.netTotal, settings.currency)}</p>
      </div>
      
      ${(settings.bankName || settings.bankAccountNumber) ? `
        <div class="notes-section">
          <h4>Account Details</h4>
          <p>
            ${settings.bankName ? `<strong>Bank:</strong> ${settings.bankName}<br>` : ''}
            ${settings.bankAccountNumber ? `<strong>Account No:</strong> ${settings.bankAccountNumber}` : ''}
          </p>
        </div>
      ` : ''}

      ${docData.notes ? `
        <div class="notes-section">
          <h4>Notes</h4>
          <p>${docData.notes}</p>
        </div>
      ` : ''}
      
      ${docData.terms ? `
        <div class="notes-section">
          <h4>Terms & Conditions</h4>
          <p>${docData.terms}</p>
        </div>
      ` : ''}
      
      <div class="footer">
        Thank you for your business!
      </div>
    </div>
  `;

  const container = window.document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-1';
  window.document.body.appendChild(container);

  try {
    const pdfElement = container.querySelector('.pdf-document') as HTMLElement | null;
    if (!pdfElement) {
      throw new Error('PDF document could not be prepared.');
    }

    await window.document.fonts?.ready;
    await Promise.all(
      Array.from(container.querySelectorAll('img')).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      })
    );

    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = (html2pdfModule.default ?? html2pdfModule) as any;
    const worker = html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `${type}-${docData.number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          windowWidth: 794,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(pdfElement)
      .toPdf();

    return await worker.outputPdf('blob');
  } finally {
    container.remove();
  }
}
