import { jsPDF } from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import type { AgencyProfile } from '@/store/settings';
import type { Quote } from './types';
import { computeTotals } from './pricing';
import { addDays, formatDate, moneyText, paxLabel, titleCase } from './format';

/* Brand colours (RGB) — kept in sync with index.css */
const INK: [number, number, number] = [28, 26, 24];
const AMBER: [number, number, number] = [242, 183, 5];
const CREAM: [number, number, number] = [250, 246, 238];
const MUTED: [number, number, number] = [110, 104, 96];
const LINE: [number, number, number] = [228, 222, 210];

const PAGE_W = 595.28;
const MARGIN = 40;

type Doc = jsPDF & { lastAutoTable?: { finalY: number } };

function header(doc: Doc, agency: AgencyProfile, title: string, number: string, date: string) {
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_W, 92, 'F');
  doc.setFillColor(...AMBER);
  doc.rect(0, 92, PAGE_W, 4, 'F');

  // Monogram
  doc.setFillColor(...AMBER);
  doc.roundedRect(MARGIN, 26, 38, 38, 8, 8, 'F');
  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(agency.name.trim().charAt(0).toUpperCase() || 'I', MARGIN + 19, 52, { align: 'center' });

  doc.setTextColor(...CREAM);
  doc.setFontSize(16);
  doc.text(agency.name, MARGIN + 52, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 192, 178);
  doc.text(agency.tagline, MARGIN + 52, 56);
  doc.text(`GSTIN ${agency.gstin}`, MARGIN + 52, 68);

  doc.setTextColor(...AMBER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title.toUpperCase(), PAGE_W - MARGIN, 40, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CREAM);
  doc.text(number, PAGE_W - MARGIN, 56, { align: 'right' });
  doc.setTextColor(200, 192, 178);
  doc.text(date, PAGE_W - MARGIN, 68, { align: 'right' });
}

function footer(doc: Doc, agency: AgencyProfile) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...LINE);
    doc.line(MARGIN, 806, PAGE_W - MARGIN, 806);
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${agency.name} · ${agency.address} · ${agency.phone} · ${agency.email}`, MARGIN, 820);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, 820, { align: 'right' });
  }
}

function sectionTitle(doc: Doc, text: string, y: number) {
  doc.setFillColor(...AMBER);
  doc.rect(MARGIN, y - 8, 3, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...INK);
  doc.text(text, MARGIN + 10, y + 1);
  return y + 14;
}

function keyValueBlock(doc: Doc, x: number, y: number, title: string, rows: [string, string][], width = 240) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(title.toUpperCase(), x, y);
  let cy = y + 14;
  for (const [k, v] of rows) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(k, x, cy);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(v || '—', width - 80);
    doc.text(lines, x + 80, cy);
    cy += 12 * lines.length;
  }
  return cy;
}

function ensureSpace(doc: Doc, y: number, needed: number) {
  if (y + needed > 790) {
    doc.addPage();
    return 60;
  }
  return y;
}

const tableTheme = {
  theme: 'plain' as const,
  styles: { font: 'helvetica', fontSize: 8.5, textColor: INK, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 }, lineColor: LINE, lineWidth: { bottom: 0.5 } },
  headStyles: { fillColor: CREAM, textColor: MUTED, fontStyle: 'bold' as const, fontSize: 7.5 },
  margin: { left: MARGIN, right: MARGIN, top: 60, bottom: 50 },
};

/* ───────────────────────── Quotation ───────────────────────── */

export function quotationPdf(quote: Quote, agency: AgencyProfile) {
  const doc: Doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pax = quote.trip.adults + quote.trip.children;
  const t = computeTotals(quote.pricing, pax);
  header(doc, agency, 'Quotation', quote.number, `Issued ${formatDate(quote.updatedAt)} · valid 7 days`);

  let y = 124;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(quote.summary?.headline || `${quote.trip.nights}N/${quote.trip.nights + 1}D ${titleCase(quote.trip.destination)} holiday`, MARGIN, y, { maxWidth: PAGE_W - MARGIN * 2 });
  y += 26;

  const end = quote.trip.startDate ? addDays(quote.trip.startDate, quote.trip.nights) : '';
  const left = keyValueBlock(doc, MARGIN, y, 'Prepared for', [
    ['Client', quote.client.name],
    ['Email', quote.client.email],
    ['Phone', quote.client.phone],
  ]);
  const right = keyValueBlock(doc, PAGE_W / 2 + 10, y, 'Trip', [
    ['Destination', titleCase(quote.trip.destination)],
    ['Dates', quote.trip.startDate ? `${formatDate(quote.trip.startDate)} – ${formatDate(end)}` : 'Flexible'],
    ['Travellers', paxLabel(quote.trip.adults, quote.trip.children)],
    ['Hotel', quote.hotel ? `${quote.hotel.name}${quote.hotel.area ? `, ${quote.hotel.area}` : ''}` : `${quote.trip.hotelCategory}-star category`],
  ]);
  y = Math.max(left, right) + 12;

  y = sectionTitle(doc, 'Day-wise itinerary', y);
  const body: RowInput[] = [];
  for (const d of quote.itinerary) {
    body.push([
      {
        content: `Day ${d.day}${d.date ? ` · ${formatDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })}` : ''} — ${d.title}`,
        colSpan: 2,
        styles: { fontStyle: 'bold', fillColor: [247, 242, 230], textColor: INK },
      },
    ]);
    for (const item of d.items) body.push([item.time || '', `${item.title}${item.detail ? ` — ${item.detail}` : ''}`]);
    if (d.overnight && d.overnight !== '—') body.push(['', { content: `Overnight: ${d.overnight}${d.meals && d.meals !== '-' ? ` · Meals: ${d.meals}` : ''}`, styles: { textColor: MUTED, fontStyle: 'italic' } }]);
  }
  autoTable(doc, { ...tableTheme, startY: y, body, columnStyles: { 0: { cellWidth: 52, textColor: MUTED } } });
  y = (doc.lastAutoTable?.finalY ?? y) + 22;

  if (quote.summary && (quote.summary.inclusions.length || quote.summary.exclusions.length)) {
    y = ensureSpace(doc, y, 120);
    y = sectionTitle(doc, 'Inclusions & exclusions', y);
    const rows = Math.max(quote.summary.inclusions.length, quote.summary.exclusions.length);
    autoTable(doc, {
      ...tableTheme,
      startY: y,
      head: [['Included', 'Not included']],
      body: Array.from({ length: rows }, (_, i) => [quote.summary!.inclusions[i] ? `+  ${quote.summary!.inclusions[i]}` : '', quote.summary!.exclusions[i] ? `–  ${quote.summary!.exclusions[i]}` : '']),
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 22;
  }

  y = ensureSpace(doc, y, 170);
  y = sectionTitle(doc, 'Package cost', y);
  const cur = quote.pricing.currency;
  const priceRows: RowInput[] = [
    ['Package price (incl. services & agency fee)', moneyText(t.taxable)],
    quote.pricing.supply === 'intra'
      ? [`CGST ${quote.pricing.gstPct / 2}% + SGST ${quote.pricing.gstPct / 2}%`, moneyText(t.gst)]
      : [`IGST ${quote.pricing.gstPct}%`, moneyText(t.gst)],
    [{ content: 'Total payable', styles: { fontStyle: 'bold' } }, { content: moneyText(t.total), styles: { fontStyle: 'bold' } }],
    ['Per person', moneyText(t.perPerson)],
  ];
  if (cur !== 'INR') priceRows.push([{ content: `Approx. in ${cur} (ECB reference rate)`, styles: { textColor: MUTED } }, { content: moneyText(t.totalFx, cur), styles: { textColor: MUTED } }]);
  autoTable(doc, { ...tableTheme, startY: y, body: priceRows, columnStyles: { 1: { halign: 'right', cellWidth: 150 } } });
  y = (doc.lastAutoTable?.finalY ?? y) + 22;

  if (quote.summary?.tips.length) {
    y = ensureSpace(doc, y, 80);
    y = sectionTitle(doc, 'Good to know', y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    for (const tip of quote.summary.tips) {
      const lines = doc.splitTextToSize(`•  ${tip}`, PAGE_W - MARGIN * 2);
      y = ensureSpace(doc, y, lines.length * 12);
      doc.text(lines, MARGIN, y + 4);
      y += lines.length * 12;
    }
    y += 10;
  }

  y = ensureSpace(doc, y, 60);
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    doc.splitTextToSize('Rates are subject to availability at the time of confirmation. 25% advance confirms the booking; balance due 15 days before travel. Cancellation charges apply as per supplier policy. GST charged on the package value under SAC 998555 (tour operator services).', PAGE_W - MARGIN * 2),
    MARGIN,
    y + 4,
  );

  footer(doc, agency);
  doc.save(`${quote.number}-${quote.trip.destination.replace(/\s+/g, '-')}-quotation.pdf`);
}

/* ───────────────────────── Voucher ───────────────────────── */

export function voucherPdf(quote: Quote, agency: AgencyProfile, voucherNumber: string) {
  const doc: Doc = new jsPDF({ unit: 'pt', format: 'a4' });
  header(doc, agency, 'Service voucher', voucherNumber, `Against ${quote.number}`);
  const checkout = quote.trip.startDate ? addDays(quote.trip.startDate, quote.trip.nights) : null;

  let y = 128;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text(quote.hotel?.name ?? `${quote.trip.hotelCategory}-star hotel, ${titleCase(quote.trip.destination)}`, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(quote.hotel?.area ? `${quote.hotel.area}, ${titleCase(quote.trip.destination)}` : titleCase(quote.trip.destination), MARGIN, y + 15);
  y += 40;

  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head: [['Lead guest', 'Guests', 'Rooms', 'Check-in', 'Check-out', 'Nights', 'Meal plan']],
    body: [[quote.client.name || '—', paxLabel(quote.trip.adults, quote.trip.children), String(quote.trip.rooms), formatDate(quote.trip.startDate), formatDate(checkout), String(quote.trip.nights), quote.hotel?.mealPlan ?? 'As per itinerary']],
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 24;

  y = sectionTitle(doc, 'Services included', y);
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    body: (quote.summary?.inclusions.length ? quote.summary.inclusions : ['Accommodation as above']).map((s, i) => [String(i + 1), s]),
    columnStyles: { 0: { cellWidth: 24, textColor: MUTED } },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 24;

  y = sectionTitle(doc, 'Arrival schedule', y);
  autoTable(doc, {
    ...tableTheme,
    startY: y,
    body: quote.itinerary.slice(0, 1).flatMap((d) => d.items.map((i) => [i.time, i.title, i.detail])),
    columnStyles: { 0: { cellWidth: 52, textColor: MUTED }, 1: { cellWidth: 150, fontStyle: 'bold' } },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 24;

  y = ensureSpace(doc, y, 110);
  doc.setFillColor(...CREAM);
  doc.roundedRect(MARGIN, y, PAGE_W - MARGIN * 2, 74, 6, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text('Important', MARGIN + 14, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    doc.splitTextToSize(`Please present this voucher (printed or on your phone) with a government photo ID at check-in. Standard check-in 14:00, check-out 11:00. 24×7 travel desk: ${agency.phone}.`, PAGE_W - MARGIN * 2 - 28),
    MARGIN + 14,
    y + 36,
  );

  footer(doc, agency);
  doc.save(`${voucherNumber}-voucher.pdf`);
}

/* ───────────────────────── GST invoice ───────────────────────── */

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number) {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

/** 1,25,430 → "One Lakh Twenty Five Thousand Four Hundred Thirty" (Indian numbering). */
export function amountInWords(amount: number) {
  let n = Math.round(amount);
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1e3);
  n %= 1e3;
  const hundred = Math.floor(n / 100);
  n %= 100;
  if (crore) parts.push(`${amountInWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (n) parts.push(twoDigits(n));
  return parts.join(' ');
}

export function invoicePdf(quote: Quote, agency: AgencyProfile, invoiceNumber: string, invoiceDate: string) {
  const doc: Doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pax = quote.trip.adults + quote.trip.children;
  const t = computeTotals(quote.pricing, pax);
  const intra = quote.pricing.supply === 'intra';
  header(doc, agency, 'Tax invoice', invoiceNumber, `Date ${formatDate(invoiceDate)}`);

  let y = 128;
  const left = keyValueBlock(doc, MARGIN, y, 'Supplier', [
    ['Name', agency.name],
    ['GSTIN', agency.gstin],
    ['Address', agency.address],
    ['State', agency.state],
  ]);
  const right = keyValueBlock(doc, PAGE_W / 2 + 10, y, 'Bill to', [
    ['Name', quote.client.name],
    ['Email', quote.client.email],
    ['Phone', quote.client.phone],
    ['Place of supply', quote.client.state || (intra ? agency.state : 'Other state')],
  ]);
  y = Math.max(left, right) + 14;

  const end = quote.trip.startDate ? addDays(quote.trip.startDate, quote.trip.nights) : null;
  const description = `Tour package — ${titleCase(quote.trip.destination)}, ${quote.trip.nights}N/${quote.trip.nights + 1}D${quote.trip.startDate ? ` (${formatDate(quote.trip.startDate)} – ${formatDate(end)})` : ''}, ${paxLabel(quote.trip.adults, quote.trip.children)}. Ref ${quote.number}`;
  const head = intra
    ? [['#', 'Description', 'SAC', 'Taxable value', `CGST ${quote.pricing.gstPct / 2}%`, `SGST ${quote.pricing.gstPct / 2}%`, 'Amount']]
    : [['#', 'Description', 'SAC', 'Taxable value', `IGST ${quote.pricing.gstPct}%`, 'Amount']];
  const row = intra
    ? ['1', description, '998555', moneyText(t.taxable), moneyText(t.cgst), moneyText(t.sgst), moneyText(t.total)]
    : ['1', description, '998555', moneyText(t.taxable), moneyText(t.igst), moneyText(t.total)];

  autoTable(doc, {
    ...tableTheme,
    startY: y,
    head,
    body: [row],
    columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: intra ? 170 : 220 }, 2: { cellWidth: 44 } },
    didParseCell: (data) => {
      if (data.column.index >= 3) data.cell.styles.halign = 'right';
    },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 16;

  autoTable(doc, {
    ...tableTheme,
    startY: y,
    margin: { left: PAGE_W / 2, right: MARGIN },
    body: [
      ['Taxable value', moneyText(t.taxable)],
      ...(intra ? [['CGST', moneyText(t.cgst)], ['SGST', moneyText(t.sgst)]] : [['IGST', moneyText(t.igst)]]),
      [{ content: 'Invoice total', styles: { fontStyle: 'bold', fillColor: CREAM } }, { content: moneyText(t.total), styles: { fontStyle: 'bold', fillColor: CREAM } }],
    ],
    columnStyles: { 1: { halign: 'right' } },
  });
  y = (doc.lastAutoTable?.finalY ?? y) + 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(`Amount in words: Indian Rupees ${amountInWords(t.total)} Only`, PAGE_W - MARGIN * 2), MARGIN, y);
  y += 28;

  y = sectionTitle(doc, 'Payment details', y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(agency.bankDetails, MARGIN, y + 4);
  y += 34;

  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    doc.splitTextToSize('Declaration: GST charged at 5% on the gross package value for tour operator services (SAC 998555) without input tax credit. This is a computer-generated invoice and does not require a signature.', PAGE_W - MARGIN * 2),
    MARGIN,
    y,
  );

  footer(doc, agency);
  doc.save(`${invoiceNumber}-tax-invoice.pdf`);
}
