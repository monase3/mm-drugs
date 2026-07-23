import pg from 'pg';
const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_xy9DkbXt0VNE@ep-calm-truth-asaun4so.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

// 1. Create new pharmacies in Aden (Senafar area)
const pharmacies = [
  { name: 'صيدلية الشفاء', city: 'عدن', address: 'حي السنافر، بجانب مسجد الفردوس', phone: '+967770111001', lat: 12.7860, lng: 45.0190 },
  { name: 'صيدلية الحياة', city: 'عدن', address: 'حي crater، شارع الثورة', phone: '+967770111002', lat: 12.7920, lng: 45.0280 },
  { name: 'صيدلية البشري', city: 'عدن', address: 'حي المعلا، شارع صلاح الدين', phone: '+967770111003', lat: 12.7800, lng: 45.0100 },
  { name: 'صيدلية النور', city: 'عدن', address: 'حي التواهي، شارع الشهداء', phone: '+967770111004', lat: 12.7750, lng: 45.0350 },
];

const pharmacyIds = [];
for (const p of pharmacies) {
  const r = await pool.query(
    `INSERT INTO pharmacies (name, license_number, city, address, phone, latitude, longitude, geom, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography, TRUE)
     RETURNING id`,
    [p.name, `LIC-${p.name.replace(/[^a-zA-Z]/g, '').slice(0,8)}-${Date.now().toString(36)}`, p.city, p.address, p.phone, p.lat, p.lng]
  );
  pharmacyIds.push({ id: r.rows[0].id, name: p.name });
  console.log(`Created pharmacy: ${p.name} (${r.rows[0].id})`);
}

// 2. Create drugs (shared + unique)
const sharedDrugs = [
  { name: 'بانادول', unit: 'شريط' },
  { name: 'أوغمنتين', unit: 'شريط' },
  { name: 'فينتولين', unit: 'عبوة' },
  { name: 'أموكسيسيلين', unit: 'شريط' },
];

const uniqueDrugs = [
  { name: 'فولتارين', unit: 'شريط', pharmacyIndex: 0 },
  { name: 'نوروفين', unit: 'شريط', pharmacyIndex: 0 },
  { name: 'بروفين', unit: 'شريط', pharmacyIndex: 1 },
  { name: 'لوميل', unit: 'عبوة', pharmacyIndex: 1 },
  { name: 'روفين', unit: 'شريط', pharmacyIndex: 2 },
  { name: 'سيتال', unit: 'شريط', pharmacyIndex: 2 },
  { name: 'دوفاستون', unit: 'شريط', pharmacyIndex: 3 },
  { name: 'بريمول', unit: 'شريط', pharmacyIndex: 3 },
];

// Insert all drugs and get IDs
const allDrugs = [...sharedDrugs.map(d => ({ ...d, shared: true })), ...uniqueDrugs.map(d => ({ ...d, shared: false }))];
const drugIds = {};

for (const d of allDrugs) {
  // Check if drug exists
  const existing = await pool.query('SELECT id FROM drugs WHERE name = $1', [d.name]);
  let drugId;
  if (existing.rows.length > 0) {
    drugId = existing.rows[0].id;
  } else {
    const r = await pool.query(
      'INSERT INTO drugs (name, unit) VALUES ($1, $2) RETURNING id',
      [d.name, d.unit]
    );
    drugId = r.rows[0].id;
  }
  drugIds[d.name] = drugId;
  console.log(`Drug: ${d.name} -> ${drugId}`);
}

// 3. Insert inventory for each pharmacy
const prices = {
  'بانادول': 3.75, 'أوغمنتين': 18.50, 'فينتولين': 12.00, 'أموكسيسيلين': 5.25,
  'فولتارين': 8.00, 'نوروفين': 6.50, 'بروفين': 7.25, 'لوميل': 15.00,
  'روفين': 9.00, 'سيتال': 5.50, 'دوفاستون': 22.00, 'بريمول': 18.75,
};

for (const pharmacy of pharmacyIds) {
  // Add shared drugs to all pharmacies
  for (const d of sharedDrugs) {
    const qty = Math.floor(Math.random() * 150) + 20;
    await pool.query(
      `INSERT INTO inventory (pharmacy_id, drug_id, quantity, price, expiry_date, batch_number)
       VALUES ($1, $2, $3, $4, '2027-12-31', $5)`,
      [pharmacy.id, drugIds[d.name], qty, prices[d.name], `BATCH-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`]
    );
  }
  console.log(`Added shared drugs to ${pharmacy.name}`);
}

// Add unique drugs to specific pharmacies
for (const d of uniqueDrugs) {
  const pharmacy = pharmacyIds[d.pharmacyIndex];
  const qty = Math.floor(Math.random() * 100) + 15;
  await pool.query(
    `INSERT INTO inventory (pharmacy_id, drug_id, quantity, price, expiry_date, batch_number)
     VALUES ($1, $2, $3, $4, '2027-06-30', $5)`,
    [pharmacy.id, drugIds[d.name], qty, prices[d.name], `BATCH-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`]
  );
  console.log(`Added ${d.name} to ${pharmacy.name}`);
}

// Also add the original Riyadh pharmacy with these drugs
const riyadhPharmacy = '80603d00-3559-4527-94af-be9e62da0f12';
for (const d of sharedDrugs) {
  const qty = Math.floor(Math.random() * 150) + 20;
  // Check if already exists
  const exists = await pool.query(
    'SELECT id FROM inventory WHERE pharmacy_id = $1 AND drug_id = $2',
    [riyadhPharmacy, drugIds[d.name]]
  );
  if (exists.rows.length === 0) {
    await pool.query(
      `INSERT INTO inventory (pharmacy_id, drug_id, quantity, price, expiry_date, batch_number)
       VALUES ($1, $2, $3, $4, '2027-12-31', $5)`,
      [riyadhPharmacy, drugIds[d.name], qty, prices[d.name], `BATCH-R-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`]
    );
    console.log(`Added ${d.name} to صيدلية النهضة (Riyadh)`);
  }
}

console.log('\n=== DONE ===');
console.log('Pharmacies:', pharmacyIds.map(p => `${p.name} (${p.id})`).join(', '));
await pool.end();
