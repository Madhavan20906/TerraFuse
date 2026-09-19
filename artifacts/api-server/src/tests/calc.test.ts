import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeterministicImpact, getDefaultUnitMass } from '../lib/calc.js';
import { generateDynamicAlternatives } from '../lib/alternatives.js';
import { findMaterialFactor, getTransportFactor } from '../lib/factors.js';

test('calculateDeterministicImpact: computes exact LCA values with documented formulas', () => {
  const quantity = 100;
  const reuseCycles = 1;
  const transportDistance = 200;
  const material = 'PVC banner vinyl';

  const result = calculateDeterministicImpact({
    material,
    quantity,
    reuseCycles,
    transportDistance,
    transportMode: 'truck',
  });

  const { impact, materialFactor, transportFactor } = result;

  const unitMass = getDefaultUnitMass(material);
  const totalMass = quantity * unitMass;
  const allocatedMass = totalMass * 1; // 1 cycle
  const prodCo2 = allocatedMass * materialFactor.co2ePerKg;
  const transCo2 = totalMass * transportDistance * transportFactor.co2ePerKg;
  const expectedTotalCo2 = Number((prodCo2 + transCo2).toFixed(2));

  assert.equal(impact.co2eKg, expectedTotalCo2);
  assert.equal(impact.landfillRisk, 'High');
  assert.equal(impact.recyclabilityPercent, materialFactor.recyclabilityRate);
  assert.ok(result.evidence.length >= 3);
});

test('calculateDeterministicImpact: reuse cycles reduce amortized production impact', () => {
  const singleUse = calculateDeterministicImpact({
    material: 'acm-panel',
    quantity: 50,
    reuseCycles: 1,
    transportDistance: 100,
  });

  const reusable = calculateDeterministicImpact({
    material: 'acm-panel',
    quantity: 50,
    reuseCycles: 5,
    transportDistance: 100,
  });

  assert.ok(reusable.impact.co2eKg < singleUse.impact.co2eKg, 'Reusable option must have lower footprint');
  assert.equal(reusable.impact.landfillRisk, 'Low');
  assert.equal(reusable.impact.confidence, 'Medium-high');
});

test('generateDynamicAlternatives: generates alternatives evaluated with identical formulas', () => {
  const baseline = {
    item: 'Wayfinding signs',
    material: 'PVC banner vinyl',
    quantity: 100,
    reuseCycles: 1,
    transportDistance: 400,
    price: 1500,
  };

  const alternatives = generateDynamicAlternatives(baseline);
  assert.ok(alternatives.length >= 3, 'Must return at least 3 alternatives');

  for (const alt of alternatives) {
    assert.ok(alt.name, 'Alternative must have name');
    assert.ok(alt.co2eKg > 0, 'Alternative must calculate co2e');
    assert.ok(typeof alt.co2eSavingsPercent === 'number');
    assert.ok(alt.cost > 0, 'Must have estimated cost');
    assert.ok(alt.evidenceLabel.length > 0, 'Must have citation/evidence label');
  }
});
