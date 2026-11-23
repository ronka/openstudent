/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Runs the REAL POST handlers with a fake Request. Each is sent a deliberately invalid
 * body, so a request that passes auth is answered 400 by validation *before* any database
 * call (the DATABASE_URL below is a dummy; nothing connects). 401 therefore means "auth
 * rejected" and 400 means "auth passed".
 */
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/unused';
process.env.API_WRITE_TOKEN = 'test-token';

const post = (authorization?: string) =>
  new Request('https://example.com/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) },
    body: '{}',
  });

async function handlers() {
  const studyGroups = await import('@/app/api/study-groups+api');
  const report = await import('@/app/api/study-groups/[id]/report+api');
  const shared = await import('@/app/api/shared-deadlines+api');
  return [
    ['study-groups', (r: Request) => studyGroups.POST(r)],
    ['report', (r: Request) => report.POST(r, { id: 'x' })],
    ['shared-deadlines', (r: Request) => shared.POST(r)],
  ] as const;
}

async function statuses(authorization?: string) {
  return Promise.all((await handlers()).map(async ([name, run]) => [name, (await run(post(authorization))).status] as const));
}

test('compat mode (default): no header passes auth, correct token passes, wrong token is 401', async () => {
  delete process.env.API_WRITE_ENFORCE;
  for (const [name, status] of await statuses()) assert.equal(status, 400, `${name} no header`);
  for (const [name, status] of await statuses('Bearer test-token')) assert.equal(status, 400, `${name} correct`);
  for (const [name, status] of await statuses('Bearer wrong')) assert.equal(status, 401, `${name} wrong`);
});

test('API_WRITE_ENFORCE=true: no header is 401, correct token still passes', async () => {
  process.env.API_WRITE_ENFORCE = 'true';
  try {
    for (const [name, status] of await statuses()) assert.equal(status, 401, `${name} no header`);
    for (const [name, status] of await statuses('Bearer test-token')) assert.equal(status, 400, `${name} correct`);
  } finally {
    delete process.env.API_WRITE_ENFORCE;
  }
});

test('401 body is JSON { error: "Unauthorized" }', async () => {
  const [, run] = (await handlers())[0];
  const response = await run(post('Bearer wrong'));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Unauthorized' });
});
