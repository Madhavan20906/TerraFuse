import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDecisionFirewall } from '../lib/firewall.js';
import { calculateDeterministicImpact } from '../lib/calc.js';

test('evaluateDecisionFirewall: flags high landfill risk for single-use low recyclability materials', () => {
  const { impact } = calculateDeterministicImpact({
    material: 'PVC banner vinyl',
    quantity: 100,
    reuseCycles: 1,
    transportDistance: 200,
  });

  const evalResult = evaluateDecisionFirewall({
    material: 'PVC banner vinyl',
    quantity: 100,
    reuseCycles: 1,
    transportDistance: 200,
    impact,
    missingData: [],
  });

  const landfillFlag = evalResult.findings.find(f => f.code === 'WARN_HIGH_LANDFILL_RISK');
  assert.ok(landfillFlag, 'Must flag single-use PVC for high landfill risk');
  assert.equal(landfillFlag.severity, 'WARNING');
});

test('evaluateDecisionFirewall: flags missing critical data and prevents premature approval', () => {
  const { impact } = calculateDeterministicImpact({
    material: 'Recycled cardboard',
    quantity: 100,
    reuseCycles: 1,
    transportDistance: 100,
  });

  const evalResult = evaluateDecisionFirewall({
    quantity: 0,
    impact,
    missingData: [
      { field: 'quantity', severity: 'HIGH' },
    ],
  });

  const missingFlag = evalResult.findings.find(f => f.code === 'ERR_QTY_MISSING');
  assert.ok(missingFlag, 'Must flag missing critical quantity');
  assert.equal(evalResult.canApprove, false);
});
