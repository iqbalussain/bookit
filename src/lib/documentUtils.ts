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

export async function generatePDF({ type, document: docData, client, settings }: DocumentData) {
  const pdfBlob = await generatePDFBlob({ type, document: docData, client, settings });
  const filename = `${type}-${docData.number}.pdf`;
  const objectUrl = window.URL.createObjectURL(pdfBlob);
  const anchor = window.document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
}

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
  void generatePDF({ type, document: docData, client, settings }).catch((err) => {
    console.error('PDF error:', err);
  });
}

export async function generatePDFBlob({ type, document: docData, client, settings }: DocumentData) {
  const currencySymbol = currencySymbols[settings.currency];
  const isInvoice = type === 'invoice';
  const invoice = isInvoice ? (docData as Invoice) : null;
  const isProjectInvoice = invoice?.invoiceType === 'project';
  const subtotal = Number((docData as Invoice).subtotal ?? docData.items.reduce((s, i) => s + i.total, 0)) || 0;
  const vatTotal = Number((docData as Invoice).vatTotal ?? docData.items.reduce((s, i) => s + (i.vatApplicable ? (i.vatAmount ?? 0) : 0), 0)) || 0;
  const discountAmount = Number((docData as Invoice).discountAmount) || 0;
  const projectSummary = invoice?.projectSummary ?? (isProjectInvoice ? {
    projectTotalValue: Number(invoice?.projectTotalValue) || 0,
    previousPercentage: 0,
    previousAmount: 0,
    currentPercentage: Number(invoice?.totalPercentage) || 0,
    currentAmount: subtotal,
    totalInvoicedPercentage: Number(invoice?.totalPercentage) || 0,
    totalInvoicedAmount: subtotal,
    remainingPercentage: Math.max(0, 100 - (Number(invoice?.totalPercentage) || 0)),
    remainingAmount: Math.max(0, (Number(invoice?.projectTotalValue) || 0) - subtotal),
  } : undefined);
  
  const formatMoney = (value: number) => `${currencySymbol}${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatPct = (value: number) => `${(Number(value) || 0).toFixed(2).replace(/\.00$/, '')}%`;

  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const usableWidth = pageWidth - margin * 2;
  const moneyPrefix = settings.currency === 'OMR' ? 'OMR ' : `${currencySymbol}`;
  const pdfMoney = (value: number) => `${moneyPrefix}${(Number(value) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();
  const sectionTitle = (title: string, y: number) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text(title.toUpperCase(), margin, y);
    pdf.setTextColor(17, 24, 39);
  };
  const addWrapped = (text: string, x: number, y: number, width: number, lineHeight = 4.6) => {
    const lines = pdf.splitTextToSize(clean(text), width);
    pdf.text(lines, x, y);
    return y + lines.length * lineHeight;
  };
  const addHeader = () => {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, pageWidth, 33, 'F');

    if (settings.logo) {
      try {
        pdf.addImage(settings.logo, 'PNG', margin, 7, 20, 20, undefined, 'FAST');
      } catch {
        try {
          pdf.addImage(settings.logo, 'JPEG', margin, 7, 20, 20, undefined, 'FAST');
        } catch {
          // Logo is optional; keep the document generation resilient.
        }
      }
    }

    const businessX = settings.logo ? margin + 25 : margin;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(37, 99, 235);
    pdf.text(clean(settings.name || 'Your Business'), businessX, 12, { maxWidth: 95 });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(75, 85, 99);
    const businessMeta = [
      settings.email,
      settings.phone,
      settings.address,
      settings.taxNumber ? `VAT: ${settings.taxNumber}` : '',
    ].filter(Boolean).map(clean);
    pdf.text(businessMeta, businessX, 17, { maxWidth: 100, lineHeightFactor: 1.35 });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(isInvoice ? 16 : 37, isInvoice ? 185 : 99, isInvoice ? 129 : 235);
    pdf.text(isProjectInvoice ? 'PROJECT INVOICE' : isInvoice ? 'INVOICE' : 'QUOTATION', pageWidth - margin, 12, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    pdf.text(`No: ${clean(docData.number)}`, pageWidth - margin, 18, { align: 'right' });
    pdf.text(`Date: ${new Date(docData.createdAt).toLocaleDateString('en-IN')}`, pageWidth - margin, 23, { align: 'right' });
    if (isInvoice && invoice?.dueDate) {
      pdf.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, pageWidth - margin, 28, { align: 'right' });
    }
  };
  const ensureRoom = (y: number, needed = 30) => {
    if (y + needed <= pageHeight - margin) return y;
    pdf.addPage();
    addHeader();
    return 45;
  };

  addHeader();

  let y = 44;
  sectionTitle('Bill To', y);
  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(clean(client?.name || 'Client'), margin, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  y += 5;
  y = addWrapped([client?.email, client?.phone, client?.address, client?.taxRegistrationNumber ? `VAT: ${client.taxRegistrationNumber}` : ''].filter(Boolean).join('\n'), margin, y, 85);

  if (settings.taxNumber) {
    sectionTitle('VAT Details', 44);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Supplier VAT No: ${clean(settings.taxNumber)}`, pageWidth - margin, 50, { align: 'right' });
  }

  if (isProjectInvoice) {
    y = ensureRoom(Math.max(y + 6, 70), 24);
    autoTable(pdf, {
      startY: y,
      body: [
        ['Project', clean(invoice?.projectName || invoice?.projectId || '-')],
        ['LPO Number', clean(invoice?.lpoNumber || '-')],
        ['Project Value', pdfMoney(invoice?.projectTotalValue || 0)],
      ],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.2, textColor: [17, 24, 39], lineColor: [229, 231, 235], lineWidth: 0.15 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 35 }, 1: { cellWidth: usableWidth - 35 } },
      margin: { left: margin, right: margin },
    });
    y = ((pdf as any).lastAutoTable?.finalY || y) + 8;
  } else {
    y = Math.max(y + 8, 72);
  }

  const regularRows = docData.items.map((item, index) => {
    const taxable = Number(item.total) || 0;
    const itemVat = item.vatApplicable ? Number(item.vatAmount ?? 0) || 0 : 0;
    return [
      String(index + 1),
      [clean(item.name), clean(item.description)].filter(Boolean).join('\n'),
      (Number(item.quantity) || 0).toLocaleString('en-IN'),
      pdfMoney(Number(item.rate) || 0),
      pdfMoney(taxable),
      item.vatApplicable ? `${Number(item.vatPercentage ?? 0).toFixed(2).replace(/\.00$/, '')}%` : '-',
      pdfMoney(itemVat),
      pdfMoney(taxable + itemVat),
    ];
  });
  const projectRows = docData.items.map((item, index) => [
    String(index + 1),
    clean(item.description || item.name),
    formatPct(item.completionPercentage || item.percentage || 0),
    pdfMoney(Number(item.total) || 0),
  ]);

  autoTable(pdf, {
    startY: y,
    head: [isProjectInvoice
      ? ['S.No', 'Description of Activities', 'Payment %', 'Amount']
      : ['S.No', 'Description', 'Qty', 'Rate', 'Subtotal', 'VAT %', 'VAT', 'Total']],
    body: isProjectInvoice ? projectRows : regularRows,
    theme: 'grid',
    margin: { left: margin, right: margin, top: 38, bottom: 18 },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      valign: 'top',
      textColor: [17, 24, 39],
      lineColor: [229, 231, 235],
      lineWidth: 0.12,
    },
    headStyles: { fillColor: [243, 244, 246], textColor: [75, 85, 99], fontStyle: 'bold' },
    columnStyles: isProjectInvoice
      ? { 0: { halign: 'center', cellWidth: 14 }, 1: { cellWidth: 116 }, 2: { halign: 'right', cellWidth: 28 }, 3: { halign: 'right', cellWidth: 28 } }
      : { 0: { halign: 'center', cellWidth: 12 }, 1: { cellWidth: 54 }, 2: { halign: 'right', cellWidth: 15 }, 3: { halign: 'right', cellWidth: 23 }, 4: { halign: 'right', cellWidth: 23 }, 5: { halign: 'right', cellWidth: 15 }, 6: { halign: 'right', cellWidth: 21 }, 7: { halign: 'right', cellWidth: 23 } },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) addHeader();
    },
  });

  y = ((pdf as any).lastAutoTable?.finalY || y) + 8;
  y = ensureRoom(y, 70);

  const totalsX = pageWidth - margin - 74;
  autoTable(pdf, {
    startY: y,
    body: [
      ['Subtotal', pdfMoney(subtotal)],
      ...(discountAmount > 0 ? [['Discount', `-${pdfMoney(discountAmount)}`]] : []),
      ['VAT', pdfMoney(vatTotal)],
      ['Total Amount', pdfMoney(docData.netTotal)],
    ],
    theme: 'plain',
    margin: { left: totalsX, right: margin },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 2.2 },
    columnStyles: { 0: { cellWidth: 35, fontStyle: 'bold', textColor: [75, 85, 99] }, 1: { cellWidth: 39, halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.row.index === data.table.body.length - 1) {
        data.cell.styles.fillColor = [248, 250, 252];
        data.cell.styles.fontSize = 12;
        data.cell.styles.textColor = [17, 24, 39];
      }
    },
  });

  y = ((pdf as any).lastAutoTable?.finalY || y) + 8;
  y = ensureRoom(y, 34);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Amount in Words:', margin, y);
  pdf.setFont('helvetica', 'normal');
  y = addWrapped(numberToWords(docData.netTotal, settings.currency), margin + 32, y, usableWidth - 32);

  const infoBlocks = [
    (settings.bankName || settings.bankAccountNumber) ? ['Bank Details', [settings.bankName ? `Bank: ${settings.bankName}` : '', settings.bankAccountNumber ? `Account No: ${settings.bankAccountNumber}` : ''].filter(Boolean).join('\n')] : null,
    docData.notes ? ['Notes', docData.notes] : null,
    docData.terms ? ['Terms & Conditions', docData.terms] : null,
  ].filter(Boolean) as [string, string][];

  for (const [title, content] of infoBlocks) {
    y = ensureRoom(y + 6, 24);
    sectionTitle(title, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    y = addWrapped(content, margin, y + 6, usableWidth);
  }

  y = ensureRoom(y + 12, 34);
  const sigX = pageWidth - margin - 52;
  if (settings.signature) {
    try {
      pdf.addImage(settings.signature, 'PNG', sigX + 8, y, 36, 14, undefined, 'FAST');
    } catch {
      try {
        pdf.addImage(settings.signature, 'JPEG', sigX + 8, y, 36, 14, undefined, 'FAST');
      } catch {
        // Signature is optional; the signature line remains.
      }
    }
  }
  pdf.setDrawColor(156, 163, 175);
  pdf.line(sigX, y + 19, sigX + 52, y + 19);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('Authorized Signature', sigX + 26, y + 24, { align: 'center' });

  if (isProjectInvoice && projectSummary) {
    pdf.addPage();
    addHeader();
    y = 45;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Project Summary', margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(75, 85, 99);
    pdf.text(`${clean(invoice?.projectName || invoice?.projectId || 'Project')} - ${clean(docData.number)}`, margin, y + 6);
    autoTable(pdf, {
      startY: y + 14,
      body: [
        ['Project Total Value', pdfMoney(projectSummary.projectTotalValue)],
        ['Previously Invoiced', `${formatPct(projectSummary.previousPercentage)} (${pdfMoney(projectSummary.previousAmount)})`],
        ['Current Invoice', `${formatPct(projectSummary.currentPercentage)} (${pdfMoney(projectSummary.currentAmount)})`],
        ['Total Invoiced', `${formatPct(projectSummary.totalInvoicedPercentage)} (${pdfMoney(projectSummary.totalInvoicedAmount)})`],
        ['Remaining', `${formatPct(projectSummary.remainingPercentage)} (${pdfMoney(projectSummary.remainingAmount)})`],
      ],
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { font: 'helvetica', fontSize: 10, cellPadding: 3, lineColor: [229, 231, 235], lineWidth: 0.15 },
      columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 58 }, 1: { cellWidth: usableWidth - 58, halign: 'right' } },
    });
  }

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    pdf.text('Thank you for your business!', margin, pageHeight - 8);
    pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return pdf.output('blob');

  const html = `
      <style>
        * { 
          margin: 0; 
          padding: 0; 
          box-sizing: border-box; 
        }
        
        .pdf-document { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
          padding: 20px 25px;
          color: #1a1a2e;
          max-width: 794px;
          min-height: 1123px;
          background: #ffffff;
          line-height: 1.4;
        }
        
        /* Header Section */
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e5e7eb;
          page-break-inside: avoid;
        }
        
        .logo-section { 
          display: flex; 
          align-items: flex-start; 
          gap: 12px; 
          flex: 1;
          min-width: 0;
        }
        
        .logo { 
          width: 120px; 
          height: 120px; 
          object-fit: contain; 
          flex-shrink: 0;
        }
        
        .business-info {
          flex: 1;
          min-width: 0;
        }
        
        .business-name { 
          font-size: 16px; 
          font-weight: 700; 
          color: #2563eb; 
          line-height: 1.2;
          margin-bottom: 5px;
          word-wrap: break-word;
        }
        
        .business-meta { 
          font-size: 11px; 
          color: #6b7280; 
          line-height: 1.3;
        }
        
        .business-meta br {
          display: block;
          margin: 2px 0;
        }
        
        .doc-info { 
          text-align: right; 
          flex-shrink: 0;
        }
        
        .doc-type { 
          font-size: 20px; 
          font-weight: bold; 
          text-transform: uppercase;
          color: ${isInvoice ? '#10b981' : '#3b82f6'};
          margin-bottom: 4px;
        }
        
        .doc-number { 
          font-size: 12px; 
          color: #374151; 
          font-weight: 600;
          margin-bottom: 3px;
        }
        
        .doc-date { 
          font-size: 11px; 
          color: #6b7280;
        }
        
        /* Parties Section */
        .parties { 
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }
        
        .party-section { 
          flex: 1;
        }
        
        .party-section h3 { 
          font-size: 11px; 
          text-transform: uppercase; 
          color: #6b7280;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        
        .party-name { 
          font-size: 15px; 
          font-weight: 600; 
          margin-bottom: 4px;
          color: #111827;
        }
        
        .party-details { 
          font-size: 11px; 
          color: #4b5563; 
          line-height: 1.5;
        }
        
        /* Project Meta */
        .project-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .meta-card {
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 10px;
          background: #fafbfc;
          min-width: 0;
        }
        
        .meta-label { 
          font-size: 9px; 
          color: #6b7280; 
          text-transform: uppercase; 
          letter-spacing: 0.35px; 
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .meta-value { 
          font-size: 10px; 
          font-weight: 400; 
          color: #111827; 
          word-wrap: break-word;
        }
        
        /* Table Styles */
        .items-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 20px;
          page-break-inside: auto;
        }

        .items-table thead {
          display: table-header-group;
        }
        
        .items-table tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        
        .items-table th { 
          background: #f3f4f6; 
          padding: 8px 10px; 
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: 0.35px;
          font-weight: 600;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .items-table td { 
          padding: 10px; 
          border-bottom: 1px solid #e5e7eb;
          font-size: 11px;
          vertical-align: top;
          word-wrap: break-word;
        }
        
        .numeric { 
          text-align: right; 
        }
        
        .item-name { 
          font-weight: 500; 
          font-size: 11px;
        }
        
        .item-desc { 
          font-size: 10px; 
          color: #6b7280; 
          margin-top: 3px;
          white-space: pre-line;
          line-height: 1.4;
        }
        
        /* Column Widths */
        .col-sno { width: 40px; }
        .col-description { width: auto; }
        .col-qty { width: 60px; }
        .col-rate { width: 90px; }
        .col-amount { width: 100px; }
        
        /* Summary Grid */
        .project-summary-page {
          break-before: page;
          page-break-before: always;
          page-break-inside: avoid;
          break-inside: avoid;
          padding-top: 20px;
        }

        .project-summary-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .project-summary-subtitle {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 16px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px 12px;
          margin: 15px 0 20px;
          padding: 12px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
        }
        
        .summary-row { 
          display: flex; 
          justify-content: space-between; 
          gap: 10px; 
          font-size: 10px;
          line-height: 1.2;
        }
        
        .summary-row strong { 
          color: #111827; 
          font-weight: 500;
        }
        
        .progress-wrap { 
          grid-column: 1 / -1; 
          margin-top: 4px;
        }
        
        .progress-track { 
          height: 6px; 
          border-radius: 3px; 
          background: #e5e7eb; 
          overflow: hidden;
          margin-top: 5px;
        }
        
        .progress-fill { 
          height: 100%; 
          background: ${projectSummary && projectSummary.totalInvoicedPercentage > 100 ? '#dc2626' : '#10b981'};
          transition: width 0.3s;
        }
        
        /* Totals Section */
        .totals { 
          display: flex; 
          justify-content: flex-end;
          margin-bottom: 20px;
        }
        
        .totals-box { 
          width: 280px;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
        }
        
        .total-row { 
          display: flex; 
          justify-content: space-between;
          gap: 16px;
          padding: 5px 0;
          font-size: 11px;
        }
        
        .total-row.grand { 
          font-size: 15px; 
          font-weight: bold;
          border-top: 2px solid #e5e7eb;
          margin-top: 6px;
          padding-top: 10px;
          color: #1a1a2e;
        }
        
        /* Amount in Words */
        .amount-in-words {
          margin-bottom: 18px;
          padding: 10px;
          background: #fafbfc;
          border: 1px solid #eef2f7;
          border-radius: 6px;
        }
        
        .amount-in-words p {
          font-size: 11px;
          color: #4b5563;
          line-height: 1.5;
        }
        
        .amount-in-words strong {
          font-size: 11px;
        }
        
        /* Notes Section */
        .notes-section { 
          background: #f8fafc; 
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          page-break-inside: avoid;
        }
        
        .notes-section h4 { 
          font-size: 11px; 
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 6px;
          font-weight: 600;
        }
        
        .notes-section p { 
          font-size: 11px; 
          color: #4b5563; 
          line-height: 1.5;
        }
        
        /* Footer */
        .footer {
          text-align: center;
          padding-top: 15px;
          margin-top: 10px;
          border-top: 1px solid #e5e7eb;
          font-size: 10px;
          color: #9ca3af;
        }

        .signature-section {
          display: flex;
          justify-content: flex-end;
          margin-top: 22px;
          page-break-inside: avoid;
        }

        .signature-box {
          width: 210px;
          text-align: center;
        }

        .signature-image {
          max-width: 180px;
          height: 70px;
          object-fit: contain;
          margin-bottom: 8px;
        }

        .signature-line {
          border-top: 1px solid #9ca3af;
          padding-top: 6px;
          font-size: 10px;
          font-weight: 600;
          color: #374151;
        }
        
        /* Page Break Handling */
        @media print {
          body { padding: 0; margin: 0; }
          .pdf-document { 
            padding: 15px;
            min-height: auto;
          }
          .items-table tr {
            page-break-inside: avoid;
          }
          .project-summary-page {
            break-before: page;
            page-break-before: always;
            page-break-inside: avoid;
          }
        }
        
        /* Compact spacing for many items */
        .items-table.compact td {
          padding: 6px 8px;
        }
      </style>
      
      <div class="pdf-document">
        <!-- Header -->
        <div class="header">
          <div class="logo-section">
            ${settings.logo ? `<img src="${settings.logo}" class="logo" alt="Logo" crossorigin="anonymous">` : ''}
            <div class="business-info">
              <div class="business-name">${escapeHtml(settings.name || 'Your Business')}</div>
              <div class="business-meta">
                ${settings.email ? `${escapeHtml(settings.email)}<br>` : ''}
                ${settings.phone ? `${escapeHtml(settings.phone)}${settings.address ? ' • ' : '<br>'}` : ''}
                ${settings.address ? `${escapeHtml(settings.address)}<br>` : ''}
                ${settings.taxNumber ? `VAT: ${escapeHtml(settings.taxNumber)}` : ''}
              </div>
            </div>
          </div>
          <div class="doc-info">
            <div class="doc-type">${isProjectInvoice ? 'Project Invoice' : type === 'invoice' ? 'INVOICE' : 'QUOTATION'}</div>
            <div class="doc-number">${escapeHtml(docData.number)}</div>
            <div class="doc-date">Date: ${new Date(docData.createdAt).toLocaleDateString('en-IN')}</div>
            ${isInvoice && invoice?.dueDate ? `<div class="doc-date">Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>` : ''}
          </div>
        </div>
        
        <!-- Parties -->
        <div class="parties">
          <div class="party-section">
            <h3>Bill To</h3>
            <div class="party-name">${escapeHtml(client?.name || 'Client')}</div>
            <div class="party-details">
              ${client?.email ? `${escapeHtml(client.email)}<br>` : ''}
              ${client?.phone ? `${escapeHtml(client.phone)}<br>` : ''}
              ${client?.address ? escapeHtml(client.address) : ''}
            </div>
          </div>
          ${settings.taxNumber ? `
          <div class="party-section">
            <h3>VAT Details</h3>
            <div class="party-details">
              ${settings.taxNumber ? `VAT No: ${escapeHtml(settings.taxNumber)}` : ''}
            </div>
          </div>
          ` : ''}
        </div>
        
        ${isProjectInvoice ? `
        <div class="project-meta">
          <div class="meta-card"><div class="meta-label">Project</div><div class="meta-value">${escapeHtml(invoice?.projectName || invoice?.projectId || '-')}</div></div>
          <div class="meta-card"><div class="meta-label">LPO Number</div><div class="meta-value">${escapeHtml(invoice?.lpoNumber || '-')}</div></div>
          <div class="meta-card"><div class="meta-label">Project Value</div><div class="meta-value">${formatMoney(invoice?.projectTotalValue || 0)}</div></div>
        </div>
        ` : ''}
        
        <!-- Items Table -->
        <table class="items-table ${docData.items.length > 5 ? 'compact' : ''}">
          <thead>
            ${isProjectInvoice ? `
            <tr>
              <th class="col-sno">Sl. No</th>
              <th class="col-description">Description of Activities</th>
              <th class="numeric col-qty">Payment %</th>
              <th class="numeric col-amount">Amount</th>
            </tr>
            ` : `
            <tr>
              <th class="col-sno">S.No</th>
              <th class="col-description">Description</th>
              <th class="numeric col-qty">Qty</th>
              <th class="numeric col-rate">Rate</th>
              <th class="numeric col-amount">Amount</th>
            </tr>
            `}
          </thead>
          <tbody>
            ${docData.items.map((item, index) => `
            <tr>
              <td class="col-sno">${index + 1}</td>
              ${isProjectInvoice ? `
                <td class="col-description"><div class="item-desc">${escapeHtml(item.description || item.name)}</div></td>
                <td class="numeric col-qty">${formatPct(item.completionPercentage || item.percentage || 0)}</td>
                <td class="numeric col-amount">${formatMoney(item.total)}</td>
              ` : `
                <td class="col-description">
                  <div class="item-name">${escapeHtml(item.name)}</div>
                  ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ''}
                </td>
                <td class="numeric col-qty">${item.quantity}</td>
                <td class="numeric col-rate">${formatMoney(item.rate)}</td>
                <td class="numeric col-amount">${formatMoney(item.total)}${item.vatApplicable && (item.vatAmount ?? 0) > 0 ? `<div style="font-size:10px;color:#555;">+VAT ${formatPct(item.vatPercentage ?? 0)} (${formatMoney(item.vatAmount ?? 0)})</div>` : ''}</td>
              `}
            </tr>
            `).join('')}
          </tbody>
        </table>
        
        <!-- Totals -->
        <div class="totals">
          <div class="totals-box">
            <div class="total-row">
              <span>Subtotal</span>
              <span>${formatMoney(subtotal)}</span>
            </div>
            ${discountAmount > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatMoney(discountAmount)}</span></div>` : ''}
            ${vatTotal > 0 ? `<div class="total-row"><span>VAT</span><span>${formatMoney(vatTotal)}</span></div>` : ''}
            <div class="total-row grand">
              <span>Grand Total</span>
              <span>${formatMoney(docData.netTotal)}</span>
            </div>
          </div>
        </div>
        
        <!-- Amount in Words -->
        <div class="amount-in-words">
          <p><strong>Amount in Words:</strong> ${numberToWords(docData.netTotal, settings.currency)}</p>
        </div>

        ${(settings.bankName || settings.bankAccountNumber) ? `
        <div class="notes-section">
          <h4>Bank Details</h4>
          <p>
            ${settings.bankName ? `<strong>Bank:</strong> ${escapeHtml(settings.bankName)}<br>` : ''}
            ${settings.bankAccountNumber ? `<strong>Account No:</strong> ${escapeHtml(settings.bankAccountNumber)}` : ''}
          </p>
        </div>
        ` : ''}

        ${docData.notes ? `
        <div class="notes-section">
          <h4>Notes</h4>
          <p>${escapeHtml(docData.notes)}</p>
        </div>
        ` : ''}
        
        ${docData.terms ? `
        <div class="notes-section">
          <h4>Terms & Conditions</h4>
          <p>${escapeHtml(docData.terms)}</p>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            ${settings.signature ? `<img src="${settings.signature}" class="signature-image" alt="Authorized signature" crossorigin="anonymous">` : '<div style="height: 70px;"></div>'}
            <div class="signature-line">Authorized Signature</div>
          </div>
        </div>
        
        <div class="footer">
          Thank you for your business!
        </div>

        ${isProjectInvoice && projectSummary ? `
        <section class="project-summary-page">
          <div class="project-summary-title">Project Summary</div>
          <div class="project-summary-subtitle">${escapeHtml(invoice?.projectName || invoice?.projectId || 'Project')} • ${escapeHtml(docData.number)}</div>
          <div class="summary-grid">
            <div class="summary-row"><span>Project Total Value</span><strong>${formatMoney(projectSummary.projectTotalValue)}</strong></div>
            <div class="summary-row"><span>Previously Invoiced</span><strong>${formatPct(projectSummary.previousPercentage)} (${formatMoney(projectSummary.previousAmount)})</strong></div>
            <div class="summary-row"><span>Current Invoice</span><strong>${formatPct(projectSummary.currentPercentage)} (${formatMoney(projectSummary.currentAmount)})</strong></div>
            <div class="summary-row"><span>Total Invoiced</span><strong>${formatPct(projectSummary.totalInvoicedPercentage)} (${formatMoney(projectSummary.totalInvoicedAmount)})</strong></div>
            <div class="summary-row"><span>Remaining</span><strong>${formatPct(projectSummary.remainingPercentage)} (${formatMoney(projectSummary.remainingAmount)})</strong></div>
            <div class="progress-wrap">
              <div class="summary-row" style="margin-bottom: 6px;"><span>Progress</span><strong>${formatPct(projectSummary.totalInvoicedPercentage)}</strong></div>
              <div class="progress-track"><div class="progress-fill" style="width: ${Math.min(100, Math.max(0, projectSummary.totalInvoicedPercentage))}%;"></div></div>
            </div>
          </div>
        </section>
        ` : ''}
      </div>
  `;

  // Helper function to escape HTML
  function escapeHtml(str: string | undefined | null): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const container = window.document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.pointerEvents = 'none';
  window.document.body.appendChild(container);

  try {
    const pdfElement = container.querySelector('.pdf-document') as HTMLElement | null;
    if (!pdfElement) {
      throw new Error('PDF document could not be prepared.');
    }

    await window.document.fonts?.ready;
    
    // Wait for images to load
    await Promise.all(
      Array.from(container.querySelectorAll('img')).map((img) => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          if (img.complete) resolve();
        });
      })
    );

    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = (html2pdfModule.default ?? html2pdfModule) as any;
    
    const worker = html2pdf()
      .set({
        margin: [3, 3, 2, 3],
        filename: `${type}-${docData.number}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794,
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true,
        },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(pdfElement)
      .toPdf()
      .get('pdf')
      .then((pdf: any) => {
        const pageCount = pdf.internal.getNumberOfPages();
        const pageWidth = pdf.internal.pageSize.getWidth();

        for (let page = 2; page <= pageCount; page += 1) {
          pdf.setPage(page);
          pdf.setFillColor(255, 255, 255);
          pdf.rect(0, 0, pageWidth, 18, 'F');
          pdf.setFontSize(9);
          pdf.setTextColor(37, 99, 235);
          pdf.text(settings.name || 'Your Business', 10, 8);
          pdf.setFontSize(8);
          pdf.setTextColor(55, 65, 81);
          pdf.text(`${isProjectInvoice ? 'Project Invoice' : type === 'invoice' ? 'Invoice' : 'Quotation'}: ${docData.number}`, pageWidth - 10, 8, { align: 'right' });
          pdf.setDrawColor(229, 231, 235);
          pdf.line(10, 13, pageWidth - 10, 13);
        }
      });

    return await worker.outputPdf('blob');
  } finally {
    container.remove();
  }
}
