import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../app.js';
import { initDb } from '@workspace/db';

let server: http.Server;
let baseUrl: string;

test.before(async () => {
  await initDb();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = 'http://127.0.0.1:' + addr.port;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    if (typeof (server as any).closeAllConnections === 'function') {
      (server as any).closeAllConnections();
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('API: GET /api/health returns ok status', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const json = (await res.json()) as any;
  assert.equal(json.status, 'ok');
});

test('API: Decision lifecycle (create, get, recalculate, review, audit, certificate)', async () => {
  // 1. Create a decision record
  const createRes = await fetch(`${baseUrl}/api/decisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'test-officer' },
    body: JSON.stringify({
      name: 'spring-festival-quote.txt',
      sourceText: `Procurement Request: Spring Festival Wayfinding
Organization: Campus Events Office
Item: Wayfinding signs
Material: PVC banner vinyl
Quantity: 100 units
Total Price: 1500 USD
Location: North Quad
Use Case: 3-day campus orientation event
Transport Distance: 350 km
Reuse: 1 cycle`,
    }),
  });

  assert.equal(createRes.status, 201);
  const created = (await createRes.json()) as any;
  assert.ok(created.id > 0);
  assert.equal(created.status, 'intake');
  assert.ok(created.impact.co2eKg > 0);
  assert.ok(created.alternatives.length >= 3);
  assert.ok(created.firewallFlags.length > 0);

  const decisionId = created.id;

  // 2. Fetch created decision
  const getRes = await fetch(`${baseUrl}/api/decisions/${decisionId}`, {
    headers: { 'x-user-id': 'test-officer' },
  });
  assert.equal(getRes.status, 200);
  const fetched = (await getRes.json()) as any;
  assert.equal(fetched.id, decisionId);

  // 3. Patch assumptions (dynamic recalculation)
  const initialCo2 = fetched.impact.co2eKg;
  const patchRes = await fetch(`${baseUrl}/api/decisions/${decisionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'test-officer' },
    body: JSON.stringify({
      assumptions: {
        quantity: 100,
        reuseCycles: 4, // Increase reuse cycles to amortize impact
        transportDistance: 200,
        material: 'PVC banner vinyl',
      },
    }),
  });
  assert.equal(patchRes.status, 200);
  const patched = (await patchRes.json()) as any;
  assert.ok(patched.impact.co2eKg < initialCo2, 'Increasing reuse cycles must reduce amortized CO2e');

  // 4. Update workflow status to approved
  const reviewRes = await fetch(`${baseUrl}/api/decisions/${decisionId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-user-id': 'procurement-lead' },
    body: JSON.stringify({
      status: 'approved',
      reviewer: 'Procurement Lead Alex',
      reviewNotes: 'Verified budget allocation and circular reusable plan.',
      selectedAlternative: 'Aluminum composite',
    }),
  });
  assert.equal(reviewRes.status, 200);
  const reviewed = (await reviewRes.json()) as any;
  assert.equal(reviewed.status, 'approved');
  assert.equal(reviewed.reviewer, 'Procurement Lead Alex');
  assert.ok(reviewed.approvedAt);

  // 5. Get audit trail
  const auditRes = await fetch(`${baseUrl}/api/decisions/${decisionId}/audit`, {
    headers: { 'x-user-id': 'test-officer' },
  });
  assert.equal(auditRes.status, 200);
  const auditLogs = (await auditRes.json()) as any[];
  assert.ok(Array.isArray(auditLogs));
  assert.ok(auditLogs.length >= 2, 'Must contain creation and status update audit events');

  // 6. Get verification certificate
  const certRes = await fetch(`${baseUrl}/api/decisions/${decisionId}/certificate`, {
    headers: { 'x-user-id': 'test-officer' },
  });
  assert.equal(certRes.status, 200);
  const cert = (await certRes.json()) as any;
  assert.equal(cert.decisionId, decisionId);
  assert.equal(cert.status, 'approved');
  assert.ok(cert.verificationChecksum);
  assert.equal(cert.reviewer, 'Procurement Lead Alex');
});
