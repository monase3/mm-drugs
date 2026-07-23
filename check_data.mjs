import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_xy9DkbXt0VNE@ep-calm-truth-asaun4so.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require');

const pharmacies = await sql('SELECT id, name, city, latitude, longitude FROM pharmacies LIMIT 10');
console.log('PHARMACIES:', JSON.stringify(pharmacies, null, 2));

const drugs = await sql(`SELECT d.id, d.name, d.unit, di.price, di.quantity, p.name as pharmacy, p.city 
FROM drugs d 
JOIN drug_inventory di ON di.drug_id = d.id 
JOIN pharmacies p ON p.id = di.pharmacy_id 
LIMIT 30`);
console.log('DRUGS:', JSON.stringify(drugs, null, 2));

const drugNames = await sql('SELECT DISTINCT name FROM drugs ORDER BY name LIMIT 20');
console.log('DRUG NAMES:', JSON.stringify(drugNames, null, 2));
