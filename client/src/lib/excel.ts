import type { AiHotel, Lead, OsmHotel } from './types';

const bold = (value: string) => ({ value, fontWeight: 'bold' as const, backgroundColor: '#F6EED9' });

/* write-excel-file is loaded on demand so it never weighs down the first page load. */
async function writer() {
  return (await import('write-excel-file/browser')).default;
}

export async function exportAiHotels(hotels: AiHotel[], city: string) {
  const writeXlsxFile = await writer();
  await writeXlsxFile(hotels, {
    sheet: 'Hotels',
    stickyRowsCount: 1,
    columns: [
      { header: bold('Hotel'), cell: (h) => h.name, width: 34 },
      { header: bold('Area'), cell: (h) => h.area, width: 20 },
      { header: bold('Stars'), cell: (h) => h.starCategory, width: 8 },
      { header: bold('Price / night (INR)'), cell: (h) => ({ value: h.pricePerNight, format: '#,##0' }), width: 18 },
      { header: bold('Guest rating'), cell: (h) => h.rating, width: 12 },
      { header: bold('Reviews'), cell: (h) => h.reviewCount, width: 10 },
      { header: bold('Meal plan'), cell: (h) => h.mealPlan, width: 10 },
      { header: bold('Rooms left'), cell: (h) => h.availableRooms, width: 11 },
      { header: bold('Km from centre'), cell: (h) => h.distanceFromCenterKm, width: 14 },
      { header: bold('Amenities'), cell: (h) => h.amenities.join(', '), width: 50 },
      { header: bold('Room types'), cell: (h) => h.roomTypes.join(', '), width: 30 },
      { header: bold('Highlight'), cell: (h) => h.highlight, width: 60 },
      { header: bold('Address'), cell: (h) => h.address, width: 40 },
    ],
  }).toFile(`itinera-ai-hotels-${city.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
}

export async function exportOsmHotels(hotels: OsmHotel[], city: string) {
  const writeXlsxFile = await writer();
  await writeXlsxFile(hotels, {
    sheet: 'OpenStreetMap hotels',
    stickyRowsCount: 1,
    columns: [
      { header: bold('Hotel'), cell: (h) => h.name, width: 36 },
      { header: bold('Stars'), cell: (h) => h.stars ?? '', width: 8 },
      { header: bold('Address'), cell: (h) => h.address ?? '', width: 44 },
      { header: bold('Phone'), cell: (h) => h.phone ?? '', width: 20 },
      { header: bold('Website'), cell: (h) => h.website ?? '', width: 40 },
      { header: bold('Amenities'), cell: (h) => h.amenities.join(', '), width: 36 },
      { header: bold('Latitude'), cell: (h) => h.lat, width: 12 },
      { header: bold('Longitude'), cell: (h) => h.lon, width: 12 },
      { header: bold('OSM link'), cell: (h) => h.osmUrl, width: 44 },
    ],
  }).toFile(`itinera-osm-hotels-${city.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
}

export async function exportLeads(leads: Lead[]) {
  const writeXlsxFile = await writer();
  await writeXlsxFile(leads, {
    sheet: 'Enquiries',
    stickyRowsCount: 1,
    columns: [
      { header: bold('Received'), cell: (l) => new Date(l.createdAt).toLocaleString('en-IN'), width: 20 },
      { header: bold('Status'), cell: (l) => l.status, width: 11 },
      { header: bold('Customer'), cell: (l) => l.customerName ?? '', width: 22 },
      { header: bold('Email'), cell: (l) => l.email ?? '', width: 28 },
      { header: bold('Phone'), cell: (l) => l.phone ?? '', width: 16 },
      { header: bold('Destination'), cell: (l) => l.destination ?? '', width: 16 },
      { header: bold('Start date'), cell: (l) => l.startDate ?? '', width: 12 },
      { header: bold('Nights'), cell: (l) => l.nights ?? '', width: 8 },
      { header: bold('Adults'), cell: (l) => l.adults, width: 8 },
      { header: bold('Children'), cell: (l) => l.children, width: 9 },
      { header: bold('Budget (INR)'), cell: (l) => (l.budget ? { value: l.budget, format: '#,##0' } : ''), width: 14 },
      { header: bold('Trip type'), cell: (l) => l.tripType, width: 12 },
      { header: bold('Channel'), cell: (l) => l.channel, width: 11 },
      { header: bold('Urgency'), cell: (l) => l.urgency, width: 10 },
      { header: bold('Summary'), cell: (l) => l.summary, width: 60 },
      { header: bold('Missing info'), cell: (l) => l.missingInfo.join(', '), width: 34 },
    ],
  }).toFile(`itinera-enquiries-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
