import { findMaterialFactor, getTransportFactor, EnvironmentalFactor } from './factors';

export interface CalculationAssumptions {
  quantity: number;
  reuseCycles: number;
  transportDistance: number;
  material?: string;
  massKg?: number;
  transportMode?: string;
  isSupplierEpd?: boolean;
}

export interface ImpactMetrics {
  co2eKg: number;
  wasteKg: number;
  waterLiters: number;
  recyclabilityPercent: number;
  landfillRisk: 'Low' | 'Medium' | 'High';
  transportKg: number;
  confidence: 'High' | 'Medium-high' | 'Medium' | 'Low';
  uncertaintyPercent: number;
  breakdown: {
    productionCo2eKg: number;
    transportCo2eKg: number;
    allocatedMassKg: number;
    totalMassKg: number;
    cycleDiscount: number;
  };
}

export interface EvidenceItem {
  claim: string;
  source: string;
  excerpt: string;
  confidence: 'High' | 'Medium' | 'Low';
  applicability: string;
  assumption: string;
  verificationStatus: 'VERIFIED' | 'PARTIALLY VERIFIED' | 'UNVERIFIED' | 'ASSUMED';
  formulaExplanation: string;
}

export function getDefaultUnitMass(material: string): number {
  const m = material.toLowerCase();
  if (m.includes('aluminum') || m.includes('acm')) return 1.15;
  if (m.includes('cardboard') || m.includes('paper')) return 0.28;
  if (m.includes('fabric') || m.includes('polyester')) return 0.18;
  if (m.includes('wood')) return 1.45;
  if (m.includes('steel')) return 2.10;
  if (m.includes('coroplast') || m.includes('polypropylene')) return 0.32;
  return 0.45; // default ~450g per unit
}

export function calculateDeterministicImpact(assumptions: CalculationAssumptions): {
  impact: ImpactMetrics;
  evidence: EvidenceItem[];
  materialFactor: EnvironmentalFactor;
  transportFactor: EnvironmentalFactor;
} {
  const quantity = Math.max(1, assumptions.quantity || 1);
  const reuseCycles = Math.max(1, assumptions.reuseCycles || 1);
  const transportDistance = Math.max(0, assumptions.transportDistance || 0);
  const material = assumptions.material || 'PVC banner vinyl';
  const unitMass = assumptions.massKg && assumptions.massKg > 0 ? assumptions.massKg : getDefaultUnitMass(material);
  const transportMode = assumptions.transportMode || 'truck';

  const materialFactor = findMaterialFactor(material);
  const transportFactor = getTransportFactor(transportMode);

  // Deterministic lifecycle formulas
  // Cycle amortization curve: after reuseCycles uses, production impact is divided per event
  const cycleDiscount = Math.max(0.12, 1 / reuseCycles);
  const totalMassKg = quantity * unitMass;
  const allocatedMassKg = totalMassKg * cycleDiscount;

  const productionCo2eKg = allocatedMassKg * materialFactor.co2ePerKg;
  const transportCo2eKg = totalMassKg * transportDistance * transportFactor.co2ePerKg;
  const totalCo2eKg = productionCo2eKg + transportCo2eKg;

  const wasteKg = allocatedMassKg * materialFactor.wasteRatio;
  const waterLiters = allocatedMassKg * materialFactor.waterPerKg;
  const recyclabilityPercent = materialFactor.recyclabilityRate;

  let landfillRisk: 'Low' | 'Medium' | 'High' = materialFactor.landfillRisk;
  if (reuseCycles > 1) {
    landfillRisk = materialFactor.landfillRisk === 'High' ? 'Medium' : 'Low';
  }

  let confidence: 'High' | 'Medium-high' | 'Medium' | 'Low' = 'Medium';
  if (assumptions.isSupplierEpd) {
    confidence = 'High';
  } else if (materialFactor.confidence === 'High' && reuseCycles > 1) {
    confidence = 'Medium-high';
  } else if (materialFactor.confidence === 'High') {
    confidence = 'Medium';
  } else {
    confidence = 'Low';
  }

  const uncertaintyPercent = Math.round(
    materialFactor.uncertaintyPercent * (reuseCycles > 1 ? 0.9 : 1.1)
  );

  const impact: ImpactMetrics = {
    co2eKg: Number(totalCo2eKg.toFixed(2)),
    wasteKg: Number(wasteKg.toFixed(2)),
    waterLiters: Number(waterLiters.toFixed(1)),
    recyclabilityPercent,
    landfillRisk,
    transportKg: Number(transportCo2eKg.toFixed(2)),
    confidence,
    uncertaintyPercent,
    breakdown: {
      productionCo2eKg: Number(productionCo2eKg.toFixed(2)),
      transportCo2eKg: Number(transportCo2eKg.toFixed(2)),
      allocatedMassKg: Number(allocatedMassKg.toFixed(2)),
      totalMassKg: Number(totalMassKg.toFixed(2)),
      cycleDiscount: Number(cycleDiscount.toFixed(3)),
    },
  };

  const evidence: EvidenceItem[] = [
    {
      claim: `${materialFactor.name} lifecycle footprint is derived from verified environmental databases.`,
      source: `${materialFactor.source} (${materialFactor.version})`,
      excerpt: `Emission factor: ${materialFactor.co2ePerKg} kg CO2e/kg material; ${materialFactor.waterPerKg} L process water/kg. ${materialFactor.notes}`,
      confidence: materialFactor.confidence,
      applicability: materialFactor.applicability,
      assumption: `Production footprint assumes ${unitMass.toFixed(2)} kg unit mass across ${quantity} units amortized over ${reuseCycles} use cycles.`,
      verificationStatus: materialFactor.verificationStatus,
      formulaExplanation: `Allocated mass (${allocatedMassKg.toFixed(2)} kg) × ${materialFactor.co2ePerKg} kg CO2e/kg = ${productionCo2eKg.toFixed(2)} kg CO2e.`,
    },
    {
      claim: `Transport accounts for ${transportCo2eKg > 0 ? ((transportCo2eKg / Math.max(0.1, totalCo2eKg)) * 100).toFixed(1) : '0'}% of the total carbon footprint.`,
      source: `${transportFactor.source} (${transportFactor.version})`,
      excerpt: `Freight emission factor: ${(transportFactor.co2ePerKg * 1000).toFixed(4)} kg CO2e per tonne-km for ${transportFactor.name}.`,
      confidence: transportFactor.confidence,
      applicability: `Covers ${transportDistance} km one-way freight delivery for ${totalMassKg.toFixed(1)} kg total shipment weight.`,
      assumption: `Calculated as standard single-stage freight without expedited air surcharge unless specified.`,
      verificationStatus: transportFactor.verificationStatus,
      formulaExplanation: `Total freight weight (${totalMassKg.toFixed(2)} kg) × ${transportDistance} km × ${transportFactor.co2ePerKg} = ${transportCo2eKg.toFixed(2)} kg CO2e.`,
    },
    {
      claim: `End-of-life recovery status: rated ${landfillRisk} landfill risk with ${recyclabilityPercent}% circular recovery potential.`,
      source: `${materialFactor.source} Municipal Recovery Audit`,
      excerpt: materialFactor.notes,
      confidence: materialFactor.confidence,
      applicability: `Reflects realistic regional processing capabilities in commercial/institutional waste streams.`,
      assumption: `Multi-use reduces per-event residual landfill generation by factor of ${cycleDiscount.toFixed(2)}.`,
      verificationStatus: materialFactor.verificationStatus,
      formulaExplanation: `Residual waste = ${allocatedMassKg.toFixed(2)} kg allocated mass × ${materialFactor.wasteRatio} waste ratio = ${wasteKg.toFixed(2)} kg.`,
    },
  ];

  return { impact, evidence, materialFactor, transportFactor };
}
