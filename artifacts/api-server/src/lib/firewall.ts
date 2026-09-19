import { ImpactMetrics } from './calc';

export type FirewallStatus =
  | 'READY_FOR_REVIEW'
  | 'NEEDS_MORE_DATA'
  | 'EVIDENCE_REQUIRED'
  | 'HIGH_UNCERTAINTY'
  | 'MANUAL_REVIEW_REQUIRED';

export interface FirewallFinding {
  code: string;
  rule: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  suggestedAction: string;
}

export interface FirewallEvaluation {
  status: FirewallStatus;
  statusLabel: string;
  badgeColor: string;
  canApprove: boolean;
  findings: FirewallFinding[];
  riskScore: number; // 0 to 100
}

export function evaluateDecisionFirewall(params: {
  material?: string;
  quantity?: number;
  transportDistance?: number;
  reuseCycles?: number;
  impact: ImpactMetrics;
  missingData?: Array<{ field: string; severity: string }>;
  unverifiedClaimsCount?: number;
}): FirewallEvaluation {
  const findings: FirewallFinding[] = [];
  let riskScore = 15;

  const { material, quantity, transportDistance, reuseCycles, impact, missingData, unverifiedClaimsCount } = params;

  // 1. Missing Critical Data Check
  if (!quantity || quantity <= 0) {
    findings.push({
      code: 'ERR_QTY_MISSING',
      rule: 'Mandatory Order Quantity',
      severity: 'CRITICAL',
      description: 'Procurement order quantity is zero or unspecified.',
      suggestedAction: 'Input a valid positive unit quantity before seeking approval.',
    });
    riskScore += 30;
  }

  if (!material || material.toLowerCase().includes('generic') || material.toLowerCase().includes('unknown')) {
    findings.push({
      code: 'WARN_MATERIAL_GENERIC',
      rule: 'Material Specificity Check',
      severity: 'WARNING',
      description: 'The material could not be identified with certainty. A conservative virgin polymer default was applied.',
      suggestedAction: 'Confirm the specific plastic resin or substrate code with the vendor to refine calculations.',
    });
    riskScore += 20;
  }

  if (transportDistance === undefined || transportDistance <= 0) {
    findings.push({
      code: 'INFO_DISTANCE_DEFAULT',
      rule: 'Freight Proximity Check',
      severity: 'INFO',
      description: 'Supplier freight distance is missing or set to 0 km. Zero transport emissions are assumed.',
      suggestedAction: 'Provide an estimated vendor transit distance for accurate supply chain footprinting.',
    });
    riskScore += 10;
  }

  // 2. High Landfill / Single-use risk
  if (impact.landfillRisk === 'High' && (reuseCycles || 1) <= 1) {
    findings.push({
      code: 'WARN_HIGH_LANDFILL_RISK',
      rule: 'Circular Economy Firewall',
      severity: 'WARNING',
      description: 'This single-use item has high landfill risk and low regional recyclability (< 10%).',
      suggestedAction: 'Consider switching to a reusable or fiber-based alternative prior to purchase authorization.',
    });
    riskScore += 25;
  }

  // 3. High Uncertainty check
  if (impact.uncertaintyPercent > 20) {
    findings.push({
      code: 'WARN_HIGH_UNCERTAINTY',
      rule: 'Lifecycle Confidence Threshold',
      severity: 'WARNING',
      description: `Estimate uncertainty is elevated at ${impact.uncertaintyPercent}%. Primary supplier EPD is missing.`,
      suggestedAction: 'Request a verified manufacturer Environmental Product Declaration (EPD).',
    });
    riskScore += 15;
  }

  // 4. Missing data fields
  if (missingData && missingData.some(m => m.severity === 'REQUIRED')) {
    findings.push({
      code: 'ERR_REQUIRED_DATA_GAPS',
      rule: 'Information Completeness Gate',
      severity: 'CRITICAL',
      description: 'Mandatory procurement specifications are missing from the intake document.',
      suggestedAction: 'Resolve required data gaps before advancing to review.',
    });
    riskScore += 25;
  }

  // 5. Unverified claims
  if (unverifiedClaimsCount && unverifiedClaimsCount > 0) {
    findings.push({
      code: 'WARN_UNVERIFIED_CLAIMS',
      rule: 'Greenwashing Prevention Gate',
      severity: 'WARNING',
      description: `Document contains ${unverifiedClaimsCount} supplier claim(s) lacking third-party certification citations.`,
      suggestedAction: 'Verify supplier sustainability assertions with independent documentation.',
    });
    riskScore += 15;
  }

  riskScore = Math.min(100, riskScore);

  let status: FirewallStatus = 'READY_FOR_REVIEW';
  let statusLabel = 'Ready for Review';
  let badgeColor = 'var(--primary)';
  let canApprove = true;

  if (findings.some(f => f.severity === 'CRITICAL')) {
    status = 'NEEDS_MORE_DATA';
    statusLabel = 'Needs More Data';
    badgeColor = 'hsl(7 57% 46%)';
    canApprove = false;
  } else if (findings.some(f => f.code === 'WARN_HIGH_LANDFILL_RISK')) {
    status = 'MANUAL_REVIEW_REQUIRED';
    statusLabel = 'Manual Review Required';
    badgeColor = 'hsl(35 77% 61%)';
    canApprove = true;
  } else if (findings.some(f => f.code === 'WARN_HIGH_UNCERTAINTY')) {
    status = 'HIGH_UNCERTAINTY';
    statusLabel = 'High Uncertainty';
    badgeColor = 'hsl(35 77% 61%)';
    canApprove = true;
  } else if (findings.some(f => f.code === 'WARN_UNVERIFIED_CLAIMS')) {
    status = 'EVIDENCE_REQUIRED';
    statusLabel = 'Evidence Required';
    badgeColor = 'hsl(35 77% 61%)';
    canApprove = true;
  }

  return {
    status,
    statusLabel,
    badgeColor,
    canApprove,
    findings,
    riskScore,
  };
}
