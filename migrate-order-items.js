const https = require('https');
const fs = require('fs');

// Read token from MCP config
const config = JSON.parse(fs.readFileSync('.vscode/mcp.json', 'utf8'));
const OLD_TOKEN = config.servers.supabase.env.SUPABASE_ACCESS_TOKEN;
const OLD_PROJECT = 'hiuermzhgvtrygcuuxix';
const BATCH_SIZE = 500;

function executeSql(projectId, token, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query });
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${projectId}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`Parse error: ${body.substring(0, 500)}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  const str = String(value);
  return "'" + str.replace(/'/g, "''") + "'";
}

async function main() {
  const countResult = await executeSql(OLD_PROJECT, OLD_TOKEN, 'SELECT count(*) FROM public.order_items;');
  const total = parseInt(countResult[0].count);
  console.log(`Total rows in old DB: ${total}`);

  const numBatches = Math.ceil(total / BATCH_SIZE);
  console.log(`Will process ${numBatches} batches of ${BATCH_SIZE}`);

  const dir = 'migration-order-items';
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  let totalExported = 0;

  for (let i = 0; i < numBatches; i++) {
    const offset = i * BATCH_SIZE;
    process.stdout.write(`Batch ${i}: OFFSET ${offset}...`);

    const rows = await executeSql(OLD_PROJECT, OLD_TOKEN,
      `SELECT id, order_id, product_id, quantity, unit_price::text, subtotal::text, notes, status::text, created_at::text
       FROM public.order_items ORDER BY created_at LIMIT ${BATCH_SIZE} OFFSET ${offset};`
    );

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      console.log(` no rows, done.`);
      break;
    }

    console.log(` ${rows.length} rows`);

    const values = rows.map(r =>
      `(${escapeSQL(r.id)},${escapeSQL(r.order_id)},${escapeSQL(r.product_id)},${r.quantity},${escapeSQL(r.unit_price)},${escapeSQL(r.subtotal)},${escapeSQL(r.notes || '')},${escapeSQL(r.status)},${escapeSQL(r.created_at)})`
    );

    const sql = `INSERT INTO public.order_items (id, order_id, product_id, quantity, unit_price, subtotal, notes, status, created_at) VALUES\n${values.join(',\n')}\nON CONFLICT (id) DO NOTHING;`;

    const file = `${dir}/batch-${String(i).padStart(3, '0')}.sql`;
    fs.writeFileSync(file, sql);
    totalExported += rows.length;
    console.log(`  -> ${file} (${(sql.length / 1024).toFixed(1)}KB)`);
  }

  console.log(`\nDone. Exported ${totalExported} rows in ${numBatches} batch files.`);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
