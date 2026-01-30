const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const cwd = 'e:/logistics/logistics-platorm';
const envPath = path.join(cwd, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const raw of envContent.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const eq = line.indexOf('=');
  if (eq <= 0) continue;
  const key = line.slice(0, eq).trim();
  let val = line.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
}

const token = process.env.E2E_ACCESS_TOKEN;
if (!token) {
  console.error('E2E_ACCESS_TOKEN missing in .env.local');
  process.exit(1);
}

const child = spawn('npm', ['run', 'dev', '--', '--turbo'], {
  cwd,
  env: process.env,
  shell: true,
});

let logs = '';
child.stdout.on('data', (d) => {
  const text = d.toString();
  logs += text;
  if (logs.length > 20000) logs = logs.slice(-20000);
});
child.stderr.on('data', (d) => {
  const text = d.toString();
  logs += text;
  if (logs.length > 20000) logs = logs.slice(-20000);
});

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch('http://localhost:3000/api/admin/companies', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 200 || res.status === 401 || res.status === 403) return true;
    } catch {
      // ignore
    }
    await sleep(1000);
  }
  return false;
}

async function run() {
  let ready = false;
  try {
    ready = await waitForServer();
    if (!ready) throw new Error('Dev server did not become ready in time');

    const companiesRes = await fetch('http://localhost:3000/api/admin/companies', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const companiesJson = await companiesRes.json().catch(() => null);
    if (!companiesRes.ok) {
      console.log('companies response', companiesRes.status, companiesJson);
      throw new Error('Failed to load companies');
    }
    const companies = (companiesJson && companiesJson.companies) || [];
    const companyId = companies[0] && companies[0].id;
    if (!companyId) {
      throw new Error('No company found to use for shipment creation');
    }

    const reference = `EMAIL-TEST-${Date.now()}`;
    const payload = {
      customer_name: 'Email Test',
      customer_email: process.env.SMTP_USER || 'test@example.com',
      customer_phone: '5551234567',
      company_id: companyId,
      reference_number: reference,
      origin_address: 'Kabul, Afghanistan',
      destination_address: 'Herat, Afghanistan',
      weight_kg: 5,
      description: 'Email test shipment',
      estimated_delivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const createRes = await fetch('http://localhost:3000/api/dashboard/shipments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const createJson = await createRes.json().catch(() => null);
    console.log('create response', createRes.status, createJson);

    await sleep(2000);
  } finally {
    child.kill('SIGTERM');
    await sleep(1000);
    if (logs) {
      const logLines = logs
        .split(/\r?\n/)
        .filter((line) => /sendShipment|mailer|error|warn|ready|failed/i.test(line))
        .slice(-80);
      if (logLines.length) {
        console.log('relevant logs:\n' + logLines.join('\n'));
      } else {
        console.log('no mail-related logs captured');
      }
    }
  }
}

run().catch((err) => {
  console.error(err);
  child.kill('SIGTERM');
  process.exitCode = 1;
});
