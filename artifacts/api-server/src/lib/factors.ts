export interface EnvironmentalFactor {
  id: string;
  name: string;
  category: 'material' | 'transport' | 'packaging' | 'disposal';
  co2ePerKg: number;
  waterPerKg: number;
  wasteRatio: number;
  recyclabilityRate: number;
  landfillRisk: 'Low' | 'Medium' | 'High';
  source: string;
  sourceUrl: string;
  geography: string;
  methodology: string;
  version: string;
  uncertaintyPercent: number;
  confidence: 'High' | 'Medium' | 'Low';
  verificationStatus: 'VERIFIED' | 'PARTIALLY VERIFIED' | 'UNVERIFIED' | 'ASSUMED';
  applicability: string;
  notes: string;
}

export const MATERIAL_FACTORS: Record<string, EnvironmentalFactor> = {
  'pvc-banner': {
    id: 'pvc-banner',
    name: 'PVC Banner Vinyl',
    category: 'material',
    co2ePerKg: 3.12,
    waterPerKg: 18.4,
    wasteRatio: 0.95,
    recyclabilityRate: 8,
    landfillRisk: 'High',
    source: 'PlasticsEurope & Oregon DEQ Materials Recovery Review',
    sourceUrl: 'https://www.oregon.gov/deq/recycling',
    geography: 'North America / EU',
    methodology: 'Cradle-to-gate LCA plus municipal curbside residual sorting audit',
    version: '2023.2',
    uncertaintyPercent: 12,
    confidence: 'High',
    verificationStatus: 'VERIFIED',
    applicability: 'Post-event banner vinyl, flexible PVC film with plasticizers',
    notes: 'Rarely accepted in curbside recovery due to plasticizers and inks.'
  },
  'acm-panel': {
    id: 'acm-panel',
    name: 'Aluminum Composite Material (ACM)',
    category: 'material',
    co2ePerKg: 8.24,
    waterPerKg: 52.0,
    wasteRatio: 0.12,
    recyclabilityRate: 85,
    landfillRisk: 'Low',
    source: 'US EPA WARM v16 & Aluminum Association EPD',
    sourceUrl: 'https://www.epa.gov/warm',
    geography: 'North America',
    methodology: 'Cradle-to-gate with high post-consumer scrap recovery allocation',
    version: '2023.1',
    uncertaintyPercent: 10,
    confidence: 'High',
    verificationStatus: 'VERIFIED',
    applicability: 'Rigid architectural and sign panels reusable across multiple seasons',
    notes: 'High upfront embodied carbon mitigated dramatically across multi-use cycles.'
  },
  'recycled-cardboard': {
    id: 'recycled-cardboard',
    name: 'Recycled Corrugated Cardboard',
    category: 'material',
    co2ePerKg: 0.74,
    waterPerKg: 4.2,
    wasteRatio: 0.08,
    recyclabilityRate: 92,
    landfillRisk: 'Low',
    source: 'UK DEFRA GHG Conversion Factors & FEFCO European LCA',
    sourceUrl: 'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting',
    geography: 'Global / Regional',
    methodology: 'Closed-loop fiber recycling allocation, cradle-to-grave',
    version: '2024.1',
    uncertaintyPercent: 8,
    confidence: 'High',
    verificationStatus: 'VERIFIED',
    applicability: 'Short-run temporary indoor/covered signage and packaging',
    notes: 'Readily accepted in virtually all municipal recycling streams.'
  },
  'virgin-kraft': {
    id: 'virgin-kraft',
    name: 'Virgin Kraft Paperboard',
    category: 'material',
    co2ePerKg: 1.48,
    waterPerKg: 14.8,
    wasteRatio: 0.15,
    recyclabilityRate: 78,
    landfillRisk: 'Low',
    source: 'US EPA WARM v16',
    sourceUrl: 'https://www.epa.gov/warm',
    geography: 'North America',
    methodology: 'Virgin chemical pulp manufacturing with biogenic credit',
    version: '2023.1',
    uncertaintyPercent: 14,
    confidence: 'Medium',
    verificationStatus: 'PARTIALLY VERIFIED',
    applicability: 'Heavyweight graphic board and posters',
    notes: 'Biodegradable with broad municipal acceptance.'
  },
  'polyester-fabric': {
    id: 'polyester-fabric',
    name: 'Dye-Sublimated Polyester Fabric',
    category: 'material',
    co2ePerKg: 5.40,
    waterPerKg: 38.0,
    wasteRatio: 0.10,
    recyclabilityRate: 62,
    landfillRisk: 'Low',
    source: 'Textile Exchange Material Change Index & Ecoinvent 3.9',
    sourceUrl: 'https://textileexchange.org',
    geography: 'Global',
    methodology: 'Synthetics yarn extrusion and sublimation printing lifecycle',
    version: '2023.4',
    uncertaintyPercent: 15,
    confidence: 'Medium',
    verificationStatus: 'PARTIALLY VERIFIED',
    applicability: 'Modular tension fabric systems and banner sleeves',
    notes: 'Compact for return logistics and lightweight for freight.'
  },
  'polypropylene': {
    id: 'polypropylene',
    name: 'Fluted Polypropylene (Coroplast)',
    category: 'material',
    co2ePerKg: 2.15,
    waterPerKg: 12.5,
    wasteRatio: 0.65,
    recyclabilityRate: 28,
    landfillRisk: 'Medium',
    source: 'PlasticsEurope Eco-profile for Polypropylene',
    sourceUrl: 'https://plasticseurope.org',
    geography: 'Europe & North America',
    methodology: 'Steam cracking and profile extrusion cradle-to-gate',
    version: '2023.1',
    uncertaintyPercent: 12,
    confidence: 'High',
    verificationStatus: 'VERIFIED',
    applicability: 'Outdoor yard signs and temporary event markers',
    notes: 'Technically #5 recyclable, but frequently landfilled due to size/light weight.'
  },
  'pcr-pet': {
    id: 'pcr-pet',
    name: 'Post-Consumer Recycled (PCR) PET Sheet',
    category: 'material',
    co2ePerKg: 1.18,
    waterPerKg: 6.8,
    wasteRatio: 0.20,
    recyclabilityRate: 80,
    landfillRisk: 'Low',
    source: 'Association of Plastic Recyclers (APR) LCA',
    sourceUrl: 'https://plasticsrecycling.org',
    geography: 'North America',
    methodology: 'Bottle-to-sheet mechanical recycling process',
    version: '2023.2',
    uncertaintyPercent: 11,
    confidence: 'High',
    verificationStatus: 'VERIFIED',
    applicability: 'Rigid transparent and opaque sign substrate',
    notes: '60% lower carbon than virgin PET resin.'
  },
  'fsc-wood': {
    id: 'fsc-wood',
    name: 'FSC-Certified Solid Timber / Plywood',
    category: 'material',
    co2ePerKg: 0.42,
    waterPerKg: 2.5,
    wasteRatio: 0.05,
    recyclabilityRate: 88,
    landfillRisk: 'Low',
    source: 'USDA Forest Service Carbon Storage in Wood Products',
    sourceUrl: 'https://www.fs.usda.gov',
    geography: 'North America',
    methodology: 'Sustainable forestry harvest and kiln-drying with biogenic storage',
    version: '2022.1',
    uncertaintyPercent: 10,
    confidence: 'High',
    verificationStatus: 'VERIFIED',
    applicability: 'Rustic wayfinding frames and reusable directional stanchions',
    notes: 'Carbon negative when biogenic carbon storage is factored.'
  },
  'steel-metal': {
    id: 'steel-metal',
    name: 'Galvanized Structural Steel',
    category: 'material',
    co2ePerKg: 2.30,
    waterPerKg: 16.0,
    wasteRatio: 0.04,
    recyclabilityRate: 95,
    landfillRisk: 'Low',
    source: 'World Steel Association LCA Study',
    sourceUrl: 'https://worldsteel.org',
    geography: 'Global Average',
    methodology: 'Basic oxygen furnace and electric arc furnace weighted average',
    version: '2023.3',
    uncertaintyPercent: 8,
    confidence: 'High',
    verificationStatus: 'VERIFIED',
    applicability: 'Permanent frames, stanchions, and heavy sign bases',
    notes: 'Infinitely recyclable with highest scrap recovery rate.'
  },
  'generic-plastic': {
    id: 'generic-plastic',
    name: 'Generic Virgin Polymer / Composite',
    category: 'material',
    co2ePerKg: 2.50,
    waterPerKg: 15.0,
    wasteRatio: 0.80,
    recyclabilityRate: 15,
    landfillRisk: 'High',
    source: 'IPCC Guidelines for National GHG Inventories & DEFRA',
    sourceUrl: 'https://www.ipcc.ch',
    geography: 'Global Average',
    methodology: 'Top-down polymer synthesis estimate with conservative default',
    version: '2024.1',
    uncertaintyPercent: 25,
    confidence: 'Medium',
    verificationStatus: 'ASSUMED',
    applicability: 'Default fallback for unclassified commercial plastics',
    notes: 'Applied when exact resin code or composition is not specified.'
  }
};

export const TRANSPORT_FACTORS: Record<string, EnvironmentalFactor> = {
  truck: {
    id: 'freight-diesel-truck',
    name: 'Standard Ground Freight (Class 8 Diesel Truck)',
    category: 'transport',
    co2ePerKg: 0.000105,
    waterPerKg: 0.0002,
    wasteRatio: 0.0,
    recyclabilityRate: 0,
    landfillRisk: 'Low',
    source: 'US EPA SmartWay Freight Emission Factors',
    sourceUrl: 'https://www.epa.gov/smartway',
    geography: 'North America',
    methodology: 'Average load factor for regional dry van haul',
    version: '2024.1',
    uncertaintyPercent: 12,
    confidence: 'High',
    verificationStatus: 'VERIFIED',
    applicability: 'Regional ground shipping up to 1,500 km',
    notes: 'Assumes average highway load factor.'
  },
  rail: {
    id: 'freight-rail',
    name: 'Intermodal Rail Freight',
    category: 'transport',
    co2ePerKg: 0.000028,
    waterPerKg: 0.00005,
    wasteRatio: 0.0,
    recyclabilityRate: 0,
    landfillRisk: 'Low',
    source: 'US EPA SmartWay',
    sourceUrl: 'https://www.epa.gov/smartway',
    geography: 'North America',
    methodology: 'Diesel-electric locomotive average gross ton-miles',
    version: '2024.1',
    uncertaintyPercent: 15,
    confidence: 'High',
    verificationStatus: 'VERIFIED',
    applicability: 'Long-haul freight > 800 km',
    notes: '75% lower emissions than standard truck freight.'
  },
  air: {
    id: 'freight-air',
    name: 'Dedicated Air Cargo',
    category: 'transport',
    co2ePerKg: 0.000602,
    waterPerKg: 0.0008,
    wasteRatio: 0.0,
    recyclabilityRate: 0,
    landfillRisk: 'Low',
    source: 'UK DEFRA GHG Conversion Factors for Air Freight',
    sourceUrl: 'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting',
    geography: 'Global',
    methodology: 'Belly-cargo and dedicated freighter average with radiative forcing',
    version: '2024.1',
    uncertaintyPercent: 20,
    confidence: 'High',
    verificationStatus: 'VERIFIED',
    applicability: 'Expedited international or cross-country courier',
    notes: 'Highest transport emission intensity.'
  },
  electric: {
    id: 'freight-electric',
    name: 'Electric Commercial Delivery Vehicle',
    category: 'transport',
    co2ePerKg: 0.000035,
    waterPerKg: 0.0001,
    wasteRatio: 0.0,
    recyclabilityRate: 0,
    landfillRisk: 'Low',
    source: 'International Council on Clean Transportation (ICCT)',
    sourceUrl: 'https://theicct.org',
    geography: 'North America / EU Grid Mix',
    methodology: 'Grid carbon intensity average per kWh for medium-duty fleet',
    version: '2023.2',
    uncertaintyPercent: 14,
    confidence: 'Medium',
    verificationStatus: 'PARTIALLY VERIFIED',
    applicability: 'Urban final-mile courier delivery',
    notes: 'Depends on local power grid generation mix.'
  }
};

export function findMaterialFactor(materialName?: string): EnvironmentalFactor {
  if (!materialName) {
    return MATERIAL_FACTORS['generic-plastic'];
  }
  const q = materialName.toLowerCase().trim();

  if (q.includes('pvc') || q.includes('vinyl') || q.includes('banner')) {
    return MATERIAL_FACTORS['pvc-banner'];
  }
  if (q.includes('aluminum') || q.includes('composite') || q.includes('acm') || q.includes('dibond')) {
    return MATERIAL_FACTORS['acm-panel'];
  }
  if (q.includes('cardboard') || q.includes('corrugated') || q.includes('fiberboard')) {
    return MATERIAL_FACTORS['recycled-cardboard'];
  }
  if (q.includes('kraft') || q.includes('paper') || q.includes('board')) {
    return MATERIAL_FACTORS['virgin-kraft'];
  }
  if (q.includes('fabric') || q.includes('polyester') || q.includes('textile') || q.includes('canvas')) {
    return MATERIAL_FACTORS['polyester-fabric'];
  }
  if (q.includes('coroplast') || q.includes('polypropylene') || q.includes(' pp ') || q.endsWith('pp')) {
    return MATERIAL_FACTORS['polypropylene'];
  }
  if (q.includes('pcr') || q.includes('recycled plastic') || q.includes('rpet')) {
    return MATERIAL_FACTORS['pcr-pet'];
  }
  if (q.includes('wood') || q.includes('timber') || q.includes('plywood') || q.includes('fsc')) {
    return MATERIAL_FACTORS['fsc-wood'];
  }
  if (q.includes('steel') || q.includes('metal') || q.includes('iron')) {
    return MATERIAL_FACTORS['steel-metal'];
  }

  return MATERIAL_FACTORS['generic-plastic'];
}

export function getTransportFactor(mode?: string): EnvironmentalFactor {
  if (!mode) return TRANSPORT_FACTORS['truck'];
  const m = mode.toLowerCase();
  if (m.includes('rail') || m.includes('train')) return TRANSPORT_FACTORS['rail'];
  if (m.includes('air') || m.includes('flight') || m.includes('express') || m.includes('plane')) return TRANSPORT_FACTORS['air'];
  if (m.includes('electric') || m.includes('ev') || m.includes('local zero')) return TRANSPORT_FACTORS['electric'];
  return TRANSPORT_FACTORS['truck'];
}
