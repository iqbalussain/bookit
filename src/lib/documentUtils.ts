import type { Quotation, Invoice, Client, BusinessSettings } from '@/types';
import { currencySymbols } from '@/types';

interface DocumentData {
  type: 'quotation' | 'invoice';
  document: Quotation | Invoice;
  client?: Client;
  settings: BusinessSettings;
}

export async function generatePDF({ type, document, client, settings }: DocumentData) {
  const currencySymbol = currencySymbols[settings.currency];
  
  // Create a printable HTML version
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download PDF');
    return;
  }

  const isInvoice = type === 'invoice';
  const invoice = isInvoice ? (document as Invoice) : null;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${document.number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          color: #1a1a2e;
          max-width: 800px;
          margin: 0 auto;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        .logo-section { display: flex; align-items: center; gap: 12px; }
        .logo { width: 60px; height: 60px; object-fit: contain; }
        .business-name { font-size: 24px; font-weight: bold; color: #3b82f6; }
        .doc-info { text-align: right; }
        .doc-type { 
          font-size: 28px; 
          font-weight: bold; 
          text-transform: uppercase;
          color: ${isInvoice ? '#10b981' : '#3b82f6'};
        }
        .doc-number { font-size: 14px; color: #6b7280; margin-top: 4px; }
        .doc-date { font-size: 14px; color: #6b7280; }
        
        .parties { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 40px;
          margin-bottom: 40px;
        }
        .party-section h3 { 
          font-size: 12px; 
          text-transform: uppercase; 
          color: #6b7280;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }
        .party-name { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
        .party-details { font-size: 14px; color: #4b5563; line-height: 1.6; }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 30px;
        }
        th { 
          background: #f3f4f6; 
          padding: 12px 16px; 
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          color: #6b7280;
          letter-spacing: 0.5px;
        }
        th:last-child { text-align: right; }
        td { 
          padding: 16px; 
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        td:last-child { text-align: right; }
        .item-name { font-weight: 500; }
        .item-desc { font-size: 13px; color: #6b7280; margin-top: 2px; }
        
        .totals { 
          display: flex; 
          justify-content: flex-end;
          margin-bottom: 40px;
        }
        .totals-box { 
          width: 280px;
          background: #f8fafc;
          border-radius: 8px;
          padding: 20px;
        }
        .total-row { 
          display: flex; 
          justify-content: space-between;
          padding: 8px 0;
        }
        .total-row.grand { 
          font-size: 20px; 
          font-weight: bold;
          border-top: 2px solid #e5e7eb;
          margin-top: 8px;
          padding-top: 16px;
          color: #1a1a2e;
        }
        
        .notes-section { 
          background: #f8fafc; 
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
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
    </head>
    <body>
      <div class="header">
        <div class="logo-section">
          ${settings.logo ? `<img src="${settings.logo}" class="logo" alt="Logo">` : ''}
          <div>
            <div class="business-name">${settings.name || 'Your Business'}</div>
            <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">
              ${settings.email || ''}
              ${settings.phone ? ` • ${settings.phone}` : ''}
            </div>
          </div>
        </div>
        <div class="doc-info">
          <div class="doc-type">${type}</div>
          <div class="doc-number">${document.number}</div>
          <div class="doc-date">Date: ${new Date(document.createdAt).toLocaleDateString('en-IN')}</div>
          ${isInvoice && invoice ? `<div class="doc-date">Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</div>` : ''}
        </div>
      </div>
      
      <div class="parties">
        <div class="party-section">
          <h3>From</h3>
          <div class="party-name">${settings.name || 'Your Business'}</div>
          <div class="party-details">
            ${settings.address ? `${settings.address}<br>` : ''}
            ${settings.taxNumber ? `GST: ${settings.taxNumber}` : ''}
          </div>
        </div>
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
      
      <table>
        <thead>
          <tr>
            <th style="width: 50px;">#</th>
            <th>Item</th>
            <th style="width: 80px;">Qty</th>
            <th style="width: 120px;">Rate</th>
            <th style="width: 120px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${document.items.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>
                <div class="item-name">${item.name}</div>
                ${item.description ? `<div class="item-desc">${item.description}</div>` : ''}
              </td>
              <td>${item.quantity}</td>
              <td>${currencySymbol}${item.rate.toLocaleString('en-IN')}</td>
              <td>${currencySymbol}${item.total.toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="totals">
        <div class="totals-box">
          <div class="total-row grand">
            <span>Total</span>
            <span>${currencySymbol}${document.netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
      
      ${document.notes ? `
        <div class="notes-section">
          <h4>Notes</h4>
          <p>${document.notes}</p>
        </div>
      ` : ''}
      
      ${document.terms ? `
        <div class="notes-section">
          <h4>Terms & Conditions</h4>
          <p>${document.terms}</p>
        </div>
      ` : ''}
      
      <div class="footer">
        Thank you for your business!
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

export function shareViaWhatsApp({ type, document, client, settings }: DocumentData) {
  const currencySymbol = currencySymbols[settings.currency];
  const isInvoice = type === 'invoice';
  
  // Encode values for URL safety
  const businessName = encodeURIComponent(settings.name || 'Your Business');
  const docNumber = encodeURIComponent(document.number);
  const clientName = encodeURIComponent(client?.name || 'Client');
  const amount = encodeURIComponent(`${currencySymbol}${document.netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  
  const message = encodeURIComponent(
    `Hi ${client?.name || ''},\n\n` +
    `Please find ${isInvoice ? 'invoice' : 'quotation'} details below:\n\n` +
    `📄 ${type.charAt(0).toUpperCase() + type.slice(1)}: ${document.number}\n` +
    `💰 Amount: ${currencySymbol}${document.netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
    `📅 Date: ${new Date(document.createdAt).toLocaleDateString('en-IN')}\n` +
    `${isInvoice ? `⏰ Due: ${new Date((document as Invoice).dueDate).toLocaleDateString('en-IN')}\n` : ''}` +
    `\nFrom: ${settings.name || 'Your Business'}\n` +
    `${settings.phone ? `📞 ${settings.phone}` : ''}`
  );

  const phoneNumber = client?.phone?.replace(/\D/g, '') || '';
  const whatsappUrl = phoneNumber
    ? `https://wa.me/${phoneNumber}?text=${message}`
    : `https://wa.me/?text=${message}`;

  window.open(whatsappUrl, '_blank');
}
