import { calculateDeterministicImpact } from './calc';

export interface DynamicAlternative {
  name: string;
  summary: string;
  cost: number;
  material: string;
  co2eKg: number;
  wasteKg: number;
  waterLiters: number;
  reuseCycles: number;
  risk: string;
  evidenceLabel: string;
  co2eSavingsPercent: number;
}

export function generateDynamicAlternatives(params: {
  item: string;
  material: string;
  quantity: number;
  price: number;
  reuseCycles: number;
  transportDistance: number;
}): DynamicAlternative[] {
  const quantity = Math.max(1, params.quantity || 1);
  const basePrice = Math.max(10, params.price || 1000);
  const baseDistance = Math.max(0, params.transportDistance || 100);

  // Baseline impact for comparison
  const baseCalc = calculateDeterministicImpact({
    quantity,
    reuseCycles: Math.max(1, params.reuseCycles || 1),
    transportDistance: baseDistance,
    material: params.material,
  });

  // Alternative 1: High Durability Circular System (e.g. Aluminum Composite / Modular Metal)
  const alt1Reuse = 8;
  const alt1Cost = Math.round(basePrice * 1.33); // Higher upfront, lower cost per use
  const alt1Calc = calculateDeterministicImpact({
    quantity,
    reuseCycles: alt1Reuse,
    transportDistance: Math.round(baseDistance * 0.8), // local sign shop or supplier
    material: 'Aluminum composite',
  });
  const alt1Savings = Math.round(
    Math.max(0, ((baseCalc.impact.co2eKg - alt1Calc.impact.co2eKg) / Math.max(0.1, baseCalc.impact.co2eKg)) * 100)
  );

  // Alternative 2: Lightweight Low-Carbon Fiber (e.g. Recycled Cardboard / Kraft)
  const alt2Reuse = 2;
  const alt2Cost = Math.round(basePrice * 0.8); // Budget friendly
  const alt2Calc = calculateDeterministicImpact({
    quantity,
    reuseCycles: alt2Reuse,
    transportDistance: baseDistance,
    material: 'Recycled corrugated cardboard',
  });
  const alt2Savings = Math.round(
    Math.max(0, ((baseCalc.impact.co2eKg - alt2Calc.impact.co2eKg) / Math.max(0.1, baseCalc.impact.co2eKg)) * 100)
  );

  // Alternative 3: Modular Rental Fabric System (Closed-loop service)
  const alt3Reuse = 12;
  const alt3Cost = Math.round(basePrice * 1.15);
  const alt3Calc = calculateDeterministicImpact({
    quantity,
    reuseCycles: alt3Reuse,
    transportDistance: Math.round(baseDistance * 1.2), // round-trip freight
    material: 'Dye-sublimated polyester fabric',
  });
  const alt3Savings = Math.round(
    Math.max(0, ((baseCalc.impact.co2eKg - alt3Calc.impact.co2eKg) / Math.max(0.1, baseCalc.impact.co2eKg)) * 100)
  );

  return [
    {
      name: 'Aluminum composite',
      summary: 'Durable panels that can return to your facility inventory or sign shop for future event cycles.',
      cost: alt1Cost,
      material: 'Aluminum composite',
      co2eKg: alt1Calc.impact.co2eKg,
      wasteKg: alt1Calc.impact.wasteKg,
      waterLiters: alt1Calc.impact.waterLiters,
      reuseCycles: alt1Reuse,
      risk: 'Lower landfill risk',
      evidenceLabel: 'Campus sign shop quote & WARM EPD',
      co2eSavingsPercent: alt1Savings,
    },
    {
      name: 'Recycled cardboard',
      summary: 'Short-run 100% recycled fiber panels with straightforward municipal curb recycling.',
      cost: alt2Cost,
      material: 'Recycled corrugated cardboard',
      co2eKg: alt2Calc.impact.co2eKg,
      wasteKg: alt2Calc.impact.wasteKg,
      waterLiters: alt2Calc.impact.waterLiters,
      reuseCycles: alt2Reuse,
      risk: 'Moderate water use',
      evidenceLabel: 'DEFRA conversion factors 2024',
      co2eSavingsPercent: alt2Savings,
    },
    {
      name: 'Rental fabric system',
      summary: 'Printed fabric sleeves on rented modular frames; return logistics and frame recovery included.',
      cost: alt3Cost,
      material: 'Dye-sublimated polyester fabric',
      co2eKg: alt3Calc.impact.co2eKg,
      wasteKg: alt3Calc.impact.wasteKg,
      waterLiters: alt3Calc.impact.waterLiters,
      reuseCycles: alt3Reuse,
      risk: 'Lowest material risk',
      evidenceLabel: 'Textile Exchange circular report',
      co2eSavingsPercent: alt3Savings,
    },
  ];
}
