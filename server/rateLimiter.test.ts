import test from 'node:test';
import assert from 'node:assert/strict';
import { SlidingWindowRateLimiter, validateInterpretBody } from './rateLimiter';

test('rate limiter allows up to maxRequests then blocks until window expires', () => {
  const limiter = new SlidingWindowRateLimiter(2, 1000);
  const t0 = 10_000;

  const r1 = limiter.check('client-1', t0);
  const r2 = limiter.check('client-1', t0 + 100);
  const r3 = limiter.check('client-1', t0 + 200);
  const r4 = limiter.check('client-1', t0 + 1200);

  assert.equal(r1.allowed, true);
  assert.equal(r2.allowed, true);
  assert.equal(r3.allowed, false);
  assert.equal(r3.remaining, 0);
  assert.equal(r4.allowed, true);
});

test('validateInterpretBody rejects empty prompts and overly long prompts', () => {
  const empty = validateInterpretBody({ prompt: '   ' });
  assert.equal(empty.ok, false);

  const tooLong = validateInterpretBody({ prompt: 'a'.repeat(1501) });
  assert.equal(tooLong.ok, false);

  const valid = validateInterpretBody({
    prompt: 'Open YouTube',
    preferredLanguage: 'en',
    installedAppNames: ['YouTube', 'Settings'],
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.prompt, 'Open YouTube');
    assert.equal(valid.data.installedAppNames.length, 2);
  }
});
