const https = require('https');
const fs = require('fs');

const OLD_URL = 'https://hiuermzhgvtrygcuuxix.supabase.co';
const OLD_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BATCH_SIZE = 250;
const TABLE = 'payments';

function fetchBatch(offset) {
  return new Promise((resolve, reject) => {
    const url = `${OLD_URL}/rest/v1/${TABLE}?select=*&order=created_at.asc&offset=${offset}&limit=${BATCH_SIZE}`;
    const options = {
      headers: {
        'apikey': OLD_SERVICE_KEY,
        'Authorization': `Bearer ${OLD_SERVICE_KEY}`,
        'Accept': 'application/json'
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          return;
        }
        resolve(JSON.parse(data));
      });
    }).on('error', reject);
  });
}

function escapeSQL(val) {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val).replace(/'/g, "''");
  return `'${s}'`;
}

function rowToValues(row) {
  return `(${escapeSQL(row.id)}::uuid, ${escapeSQL(row.order_id)}::uuid, ${row.amount}, ${escapeSQL(row.method)}, ${row.reference === null ? 'NULL' : escapeSQL(row.reference)}, ${row.cash_register_id === null ? 'NULL' : escapeSQL(row.cash_register_id) + '::uuid'}, ${escapeSQL(row.created_at)}::timestamptz, ${row.received_amount === null ? 'NULL' : row.received_amount}, ${row.change_amount === null ? 'NULL' : row.change_amount}, ${escapeSQL(row.status)})`;
}

async function main() {
  if (!OLD_SERVICE_KEY) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var. Run with: set SUPABASE_SERVICE_ROLE_KEY=... && node migrate-payments.js');
    process.exit(1);
  }

  let offset = 0;
  let batchNum = 0;
  let totalRows = 0;
  const allSQL = [];

  console.log('Fetching payments from old DB...');

  while (true) {
    const rows = await fetchBatch(offset);
    if (rows.length === 0) break;

    console.log(`Batch ${batchNum}: ${rows.length} rows (offset ${offset})`);
    
    const values = rows.map(rowToValues).join(',\n');
    const sql = `INSERT INTO public.payments (id, order_id, amount, method, reference, cash_register_id, created_at, received_amount, change_amount, status) VALUES\n${values}\nON CONFLICT (id) DO NOTHING;`;
    
    allSQL.push(sql);
    fs.writeFileSync(`migrate-payments-batch-${String(batchNum).padStart(2, '0')}.sql`, sql, 'utf8');
    
    totalRows += rows.length;
    offset += BATCH_SIZE;
    batchNum++;

    if (rows.length < BATCH_SIZE) break;
  }

  // Also write a combined file
  fs.writeFileSync('migrate-payments-all.sql', allSQL.join('\n\n'), 'utf8');

  console.log(`\nDone! ${totalRows} rows across ${batchNum} batches.`);
  console.log(`Files: migrate-payments-batch-00.sql ... migrate-payments-batch-${String(batchNum - 1).padStart(2, '0')}.sql`);
  console.log(`Combined: migrate-payments-all.sql`);
}

main().catch(err => { console.error(err); process.exit(1); });
