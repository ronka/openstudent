/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveBuildChannel, shouldSendAnalytics } from './build-channel';

test('a dev bundle is development whatever channel the build has', () => {
  assert.equal(resolveBuildChannel({ isDev: true, updatesChannel: 'production', appEnv: 'production' }), 'development');
});

test('the native channel wins over the bundle env', () => {
  assert.equal(resolveBuildChannel({ isDev: false, updatesChannel: 'production', appEnv: undefined }), 'production');
  assert.equal(resolveBuildChannel({ isDev: false, updatesChannel: 'preview', appEnv: 'production' }), 'preview');
});

test('falls back to the bundle env, then unknown', () => {
  assert.equal(resolveBuildChannel({ isDev: false, updatesChannel: null, appEnv: 'production' }), 'production');
  assert.equal(resolveBuildChannel({ isDev: false, updatesChannel: null }), 'unknown');
});

test('only the production channel sends analytics', () => {
  assert.equal(shouldSendAnalytics('production'), true);
  for (const channel of ['development', 'preview', 'unknown']) {
    assert.equal(shouldSendAnalytics(channel), false);
  }
});
