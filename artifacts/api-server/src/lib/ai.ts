import { z } from 'zod';

export const aiProcurementSchema = z.object({
  title: z.string().default('Procurement Item'),
  organization: z.string().default('Procurement Department'),
  item: z.string().default('Wayfinding Signage'),
  material: z.string().default('PVC banner vinyl'),
  materialComposition: z.string().optional(),
  quantity: z.number().int().positive().default(86),
  unit: z.string().default('units'),
  unitCost: z.number().nonnegative().optional(),
  totalCost: z.number().nonnegative().default(1290),
  currency: z.string().default('USD'),
  location: z.string().default('Event Campus'),
  useCase: z.string().default('Outdoor signage across three-day event'),
  currentOption: z.string().default('Single-use printed vinyl'),
  reuseCycles: z.number().int().positive().default(1),
  transportDistanceKm: z.number().nonnegative().default(412),
  transportMode: z.string().default('Class 8 Diesel Truck'),
  packaging: z.string().optional(),
  disposalRoute: z.string().optional(),
  supplierClaims: z.array(z.string()).default([]),
  riskFactors: z.array(z.string()).default([]),
  dataQuality: z.object({
    knownFacts: z.array(z.string()).default([]),
    inferred: z.array(z.string()).default([]),
    assumptions: z.array(z.string()).default([]),
    missing: z.array(z.string()).default([]),
  }).default({
    knownFacts: [],
    inferred: [],
    assumptions: [],
    missing: [],
  }),
  missingInformation: z.array(z.object({
    field: z.string(),
    severity: z.enum(['REQUIRED', 'RECOMMENDED', 'OPTIONAL']),
    description: z.string(),
  })).default([]),
});

export type AiProcurementAnalysis = z.infer<typeof aiProcurementSchema>;

// Deterministic heuristic fallback when no LLM API keys are provided
export function parseProcurementHeuristically(text: string, fileName: string): AiProcurementAnalysis {
  const lower = text.toLowerCase();

  // Try extracting quantity
  let quantity = 86;
  const qtyMatch = text.match(/(?:qty|quantity|count|units|ordered)[:\s]+([0-9]{1,6})/i);
  if (qtyMatch && qtyMatch[1]) {
    quantity = parseInt(qtyMatch[1], 10);
  }

  // Try extracting cost
  let totalCost = 1290;
  const costMatch = text.match(/(?:total|amount|price|cost|quote)[:\s]+(?:\$|USD)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  if (costMatch && costMatch[1]) {
    const parsed = parseFloat(costMatch[1].replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0) totalCost = parsed;
  }

  // Material detection
  let material = 'PVC banner vinyl';
  if (lower.includes('aluminum') || lower.includes('dibond') || lower.includes('acm')) {
    material = 'Aluminum composite';
  } else if (lower.includes('cardboard') || lower.includes('corrugated')) {
    material = 'Recycled corrugated cardboard';
  } else if (lower.includes('fabric') || lower.includes('polyester')) {
    material = 'Dye-sublimated polyester fabric';
  } else if (lower.includes('coroplast') || lower.includes('polypropylene')) {
    material = 'Fluted polypropylene';
  } else if (lower.includes('wood') || lower.includes('plywood')) {
    material = 'FSC-certified timber';
  }

  // Title extraction
  const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const title = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  // Distance
  let transportDistanceKm = 412;
  const distMatch = text.match(/([0-9]{1,5})\s*(?:km|miles|mi)/i);
  if (distMatch && distMatch[1]) {
    const val = parseInt(distMatch[1], 10);
    transportDistanceKm = lower.includes('mile') ? Math.round(val * 1.609) : val;
  }

  return {
    title,
    organization: 'Procurement Review Group',
    item: 'Wayfinding signs',
    material,
    quantity,
    unit: 'units',
    totalCost,
    currency: 'USD',
    location: 'Event Venue',
    useCase: 'Outdoor wayfinding signage',
    currentOption: `Standard ${material}`,
    reuseCycles: 1,
    transportDistanceKm,
    transportMode: 'Ground Freight',
    supplierClaims: [
      'Supplier standard ground delivery scheduled',
      'Weather-resistant digital printing',
    ],
    riskFactors: [
      'Single-use vinyl film has limited local post-consumer recycling facilities',
      'Potential landfill destination after event conclusion',
    ],
    dataQuality: {
      knownFacts: [
        `Quantity: ${quantity} units parsed from intake document`,
        `Total quote price: $${totalCost.toLocaleString()}`,
      ],
      inferred: [
        `Identified material family: ${material}`,
        `Estimated freight distance: ${transportDistanceKm} km`,
      ],
      assumptions: [
        'Single event use cycle assumed (reuse = 1)',
        'Standard Class 8 diesel freight assumed for regional transit',
      ],
      missing: [
        'Supplier Environmental Product Declaration (EPD) not attached',
        'Post-event circular reclamation program details absent',
      ],
    },
    missingInformation: [
      {
        field: 'reuseCycles',
        severity: 'RECOMMENDED',
        description: 'Specify if signs will be stored and reused for subsequent academic years or sister events.',
      },
      {
        field: 'transportDistance',
        severity: 'OPTIONAL',
        description: 'Provide precise supplier warehouse ZIP/postal code for verified freight estimation.',
      },
    ],
  };
}

export async function analyzeProcurementWithAi(
  extractedText: string,
  fileName: string
): Promise<{ analysis: AiProcurementAnalysis; provider: string }> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const prompt = `You are an environmental procurement analyst for TerraFuse Decision Firewall.
Analyze the following procurement document text and extract structured information in JSON.

CRITICAL RULES:
1. Do NOT invent precise environmental measurements (CO2, waste, water). Those are calculated deterministically downstream.
2. Explicitly distinguish KNOWN FACT, INFERRED, ASSUMPTION, and MISSING in dataQuality.
3. If a field is not present, mark it in missingInformation and use a transparent, sensible assumption.
4. Output MUST conform to this exact JSON schema:
{
  "title": string,
  "organization": string,
  "item": string,
  "material": string,
  "materialComposition": string,
  "quantity": number,
  "unit": string,
  "unitCost": number,
  "totalCost": number,
  "currency": string,
  "location": string,
  "useCase": string,
  "currentOption": string,
  "reuseCycles": number,
  "transportDistanceKm": number,
  "transportMode": string,
  "packaging": string,
  "disposalRoute": string,
  "supplierClaims": string[],
  "riskFactors": string[],
  "dataQuality": {
    "knownFacts": string[],
    "inferred": string[],
    "assumptions": string[],
    "missing": string[]
  },
  "missingInformation": [
    { "field": string, "severity": "REQUIRED" | "RECOMMENDED" | "OPTIONAL", "description": string }
  ]
}

Document Content:
${extractedText.slice(0, 14000)}
`;

  // 1. Try Gemini
  if (geminiKey) {
    for (const modelName of ['gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3-flash-preview']) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
            signal: AbortSignal.timeout(25000),
          }
        );

        if (response.ok) {
          const json = (await response.json()) as any;
          const rawContent = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawContent) {
            const parsed = JSON.parse(rawContent);
            const validated = aiProcurementSchema.parse(parsed);
            return { analysis: validated, provider: modelName };
          }
        }
      } catch (err) {
        console.warn(`Gemini (${modelName}) extraction attempt failed:`, err);
      }
    }
  }

  // 2. Try OpenAI
  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an environmental procurement analyst. Return pure JSON only.' },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (response.ok) {
        const json = (await response.json()) as any;
        const rawContent = json?.choices?.[0]?.message?.content;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          const validated = aiProcurementSchema.parse(parsed);
          return { analysis: validated, provider: 'gpt-4o-mini' };
        }
      }
    } catch (err) {
      console.warn('OpenAI extraction failed, falling back...', err);
    }
  }

  // 3. Fallback Heuristic Parser
  const heuristic = parseProcurementHeuristically(extractedText, fileName);
  return { analysis: heuristic, provider: 'deterministic-heuristic-engine' };
}
