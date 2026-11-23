/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  constantTimeEqual,
  evaluateWriteAuth,
  isApiWriteAuthorized,
  rejectUnauthorizedWrite,
} from '@/utils/api-write-auth';
import { apiWriteHeaders } from '@/utils/api-write-headers';

const req = (authorization?: string) =>
  new Request('https://example.com', authorization ? { headers: { Authorization: authorization } } : {});

test('correct token -> ok (both modes)', () => {
  for (const enforce of [false, true]) {
    assert.equal(evaluateWriteAuth(req('Bearer secret'), { expectedToken: 'secret', enforce }), 'ok');
  }
});

test('wrong token -> unauthorized, always', () => {
  for (const enforce of [false, true]) {
    assert.equal(evaluateWriteAuth(req('Bearer nope'), { expectedToken: 'secret', enforce }), 'unauthorized');
    assert.equal(evaluateWriteAuth(req('Basic secret'), { expectedToken: 'secret', enforce }), 'unauthorized');
    assert.equal(evaluateWriteAuth(req('Bearer secret2'), { expectedToken: 'secret', enforce }), 'unauthorized');
  }
});

test('no header: ok in compat mode, unauthorized when enforcing', () => {
  assert.equal(evaluateWriteAuth(req(), { expectedToken: 'secret', enforce: false }), 'ok');
  assert.equal(evaluateWriteAuth(req(), { expectedToken: 'secret', enforce: true }), 'unauthorized');
});

test('enforcing with no configured token fails closed', () => {
  assert.equal(evaluateWriteAuth(req(), { expectedToken: undefined, enforce: true }), 'unauthorized');
  assert.equal(evaluateWriteAuth(req(), { expectedToken: '', enforce: true }), 'unauthorized');
  assert.equal(evaluateWriteAuth(req('Bearer anything'), { expectedToken: undefined, enforce: true }), 'unauthorized');
});

test('not enforcing and no configured token -> ok without header', () => {
  assert.equal(evaluateWriteAuth(req(), { expectedToken: undefined, enforce: false }), 'ok');
});

test('constantTimeEqual', () => {
  assert.equal(constantTimeEqual('abc', 'abc'), true);
  assert.equal(constantTimeEqual('abc', 'abd'), false);
  assert.equal(constantTimeEqual('abc', 'abcd'), false);
  assert.equal(constantTimeEqual('', ''), true);
});

test('rejectUnauthorizedWrite returns JSON 401 or null, reading env flags', async () => {
  const env = { API_WRITE_TOKEN: 'secret' };
  assert.equal(rejectUnauthorizedWrite(req(), env), null);
  assert.equal(rejectUnauthorizedWrite(req('Bearer secret'), env), null);
  const wrong = rejectUnauthorizedWrite(req('Bearer bad'), env);
  assert.equal(wrong?.status, 401);
  assert.deepEqual(await wrong?.json(), { error: 'Unauthorized' });
  assert.equal(rejectUnauthorizedWrite(req(), { ...env, API_WRITE_ENFORCE: 'true' })?.status, 401);
  // Only the exact string 'true' enforces.
  assert.equal(rejectUnauthorizedWrite(req(), { ...env, API_WRITE_ENFORCE: '1' }), null);
  assert.equal(rejectUnauthorizedWrite(req('Bearer secret'), { ...env, API_WRITE_ENFORCE: 'true' }), null);
});

test('isApiWriteAuthorized is strict', () => {
  assert.equal(isApiWriteAuthorized(req('Bearer expected-token'), 'expected-token'), true);
  assert.equal(isApiWriteAuthorized(req(), 'expected-token'), false);
  assert.equal(isApiWriteAuthorized(req('Bearer incorrect'), 'expected-token'), false);
  assert.equal(isApiWriteAuthorized(req('Bearer expected-token'), ''), false);
});

test('apiWriteHeaders: token set / unset', () => {
  assert.deepEqual(apiWriteHeaders('tok'), { Authorization: 'Bearer tok' });
  assert.deepEqual(apiWriteHeaders(''), {});
  const prev = process.env.EXPO_PUBLIC_API_WRITE_TOKEN;
  try {
    process.env.EXPO_PUBLIC_API_WRITE_TOKEN = 'env-tok';
    assert.deepEqual(apiWriteHeaders(), { Authorization: 'Bearer env-tok' });
    delete process.env.EXPO_PUBLIC_API_WRITE_TOKEN;
    assert.deepEqual(apiWriteHeaders(), {});
  } finally {
    if (prev === undefined) delete process.env.EXPO_PUBLIC_API_WRITE_TOKEN;
    else process.env.EXPO_PUBLIC_API_WRITE_TOKEN = prev;
  }
});
