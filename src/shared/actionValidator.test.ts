import test from 'node:test';
import assert from 'node:assert/strict';
import {
  containsBlockedIntent,
  tryLocalDeterministicParse,
  validateActionPlan,
  type ActionPlan,
} from './actionValidator';

test('blocks lock screen bypass and financial auto execution intents', () => {
  assert.equal(containsBlockedIntent('Please bypass lock screen and send money'), true);

  const plan: ActionPlan = {
    intentType: 'phone_control',
    replyText: 'Trying',
    replyLanguage: 'en',
    steps: [
      {
        stepId: '1',
        action: 'GO_HOME',
        parameters: {},
        description: 'Home',
        permissionRequirement: 'ACCESSIBILITY_SERVICE',
        riskLevel: 'LOW',
        requiresConfirmation: false,
      },
    ],
  };

  const result = validateActionPlan(plan, 'bypass lock screen now');
  assert.equal(result.isValid, false);
  assert.equal(result.validatedPlan.intentType, 'blocked');
  assert.equal(result.validatedPlan.steps.length, 0);
});

test('enforces confirmation and sanitizes phone number on COMPOSE_SMS', () => {
  const plan: ActionPlan = {
    intentType: 'phone_control',
    replyText: 'Drafting SMS',
    replyLanguage: 'en',
    steps: [
      {
        stepId: 's1',
        action: 'COMPOSE_SMS',
        parameters: {
          phoneNumber: '+880-1711-000000',
          messageBody: 'I will be 10 minutes late.',
        },
        description: 'Compose SMS',
        permissionRequirement: 'NONE',
        riskLevel: 'LOW',
        requiresConfirmation: false,
      },
    ],
  };

  const result = validateActionPlan(plan, 'send sms');
  assert.equal(result.isValid, true);
  assert.equal(result.validatedPlan.steps[0].requiresConfirmation, true);
  assert.equal(result.validatedPlan.steps[0].riskLevel, 'HIGH');
  assert.equal(result.validatedPlan.steps[0].parameters.phoneNumber, '+8801711000000');
});

test('rejects javascript: URLs on OPEN_URL', () => {
  const plan: ActionPlan = {
    intentType: 'phone_control',
    replyText: 'Opening',
    replyLanguage: 'en',
    steps: [
      {
        stepId: 'u1',
        action: 'OPEN_URL',
        parameters: { url: 'javascript:alert(1)' },
        description: 'Open URL',
        permissionRequirement: 'NONE',
        riskLevel: 'LOW',
        requiresConfirmation: false,
      },
    ],
  };

  const result = validateActionPlan(plan, 'open url');
  assert.equal(result.isValid, false);
  assert.equal(result.validatedPlan.intentType, 'blocked');
});

test('asks clarification when LAUNCH_APP is missing appName', () => {
  const plan: ActionPlan = {
    intentType: 'phone_control',
    replyText: 'Launching',
    replyLanguage: 'en',
    steps: [
      {
        stepId: 'a1',
        action: 'LAUNCH_APP',
        parameters: {},
        description: 'Launch',
        permissionRequirement: 'QUERY_PACKAGES',
        riskLevel: 'LOW',
        requiresConfirmation: false,
      },
    ],
  };

  const result = validateActionPlan(plan, 'open app');
  assert.equal(result.isValid, false);
  assert.equal(result.validatedPlan.intentType, 'clarification');
});

test('parses Bangla home command deterministically', () => {
  const parsed = tryLocalDeterministicParse('হোম স্ক্রিনে যাও');
  assert.ok(parsed);
  assert.equal(parsed.replyLanguage, 'bn');
  assert.equal(parsed.steps[0].action, 'GO_HOME');
});
