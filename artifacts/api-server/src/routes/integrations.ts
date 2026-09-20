import { Router, type IRouter, type Request, type Response } from 'express';
import { db, decisionsTable } from '@workspace/db';
import { calculateDeterministicImpact } from '../lib/calc';
import { generateDynamicAlternatives } from '../lib/alternatives';
import { evaluateDecisionFirewall } from '../lib/firewall';
import { logAuditEvent } from '../lib/audit';

const router: IRouter = Router();

/**
 * POST /api/integrations/webhook/po-intake
 * Universal webhook connector for ERPs (SAP Ariba, Coupa, NetSuite, Workday)
 * Evaluates pending purchase orders against the TerraFuse Decision Firewall.
 */
router.post('/integrations/webhook/po-intake', async (req: Request, res: Response) => {
  try {
    const {
      poNumber = 'PO-DRAFT-' + Date.now().toString().slice(-4),
      system = 'ERP-Connector',
      vendor = 'Vendor Unknown',
      lineItems = [],
      deliveryLocation = 'Standard Destination',
    } = req.body;

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      res.status(400).json({
        error: 'Invalid webhook payload: lineItems must be a non-empty array.',
      });
      return;
    }

    // Process primary line item
    const item = lineItems[0];
    const itemName = item.item || item.description || 'Procurement Line Item';
    const material = item.material || 'PVC banner vinyl';
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const price = Number(item.price || item.totalPrice || item.cost) || 1000;
    const currency = item.currency || 'USD';
    const reuseCycles = Math.max(1, Number(item.reuseCycles) || 1);
    const transportDistanceKm = Math.max(0, Number(item.transportDistanceKm || item.distanceKm) || 300);

    const assumptions = {
      quantity,
      reuseCycles,
      transportDistance: transportDistanceKm,
      material,
      transportMode: item.transportMode || 'truck',
      originalValues: { quantity, reuseCycles, transportDistance: transportDistanceKm, material },
      source: `${system} Webhook`,
    };

    // Run deterministic calculation
    const { impact, evidence } = calculateDeterministicImpact(assumptions);

    // Run risk firewall
    const firewallEvaluation = evaluateDecisionFirewall({
      material,
      quantity,
      transportDistance: transportDistanceKm,
      reuseCycles,
      impact,
      missingData: [],
      unverifiedClaimsCount: 0,
    });

    // Generate circular alternatives
    const alternatives = generateDynamicAlternatives({
      item: itemName,
      material,
      quantity,
      price,
      reuseCycles,
      transportDistance: transportDistanceKm,
    });

    const hasCritical = firewallEvaluation.findings.some((f) => f.severity === 'CRITICAL');
    const hasWarning = firewallEvaluation.findings.some((f) => f.severity === 'WARNING');
    const verdict = hasCritical ? 'BLOCKED' : hasWarning ? 'WARNING' : 'APPROVED';

    // Store in DB
    const [inserted] = await db
      .insert(decisionsTable)
      .values({
        title: `${poNumber} · ${itemName}`,
        organization: `${system} (${vendor})`,
        item: itemName,
        material,
        quantity,
        price: String(price),
        currency,
        location: deliveryLocation,
        useCase: `Automated intake from ${system} for ${poNumber}`,
        currentOption: material,
        fileName: `${poNumber}.json`,
        sourceText: JSON.stringify(req.body, null, 2),
        parsedData: req.body,
        analysis: {
          title: itemName,
          material,
          quantity,
          totalCost: price,
          currency,
          system,
          vendor,
        },
        assumptions,
        impact,
        alternatives,
        evidence,
        firewallFlags: firewallEvaluation.findings,
        status: hasCritical ? 'changes_requested' : 'intake',
        ownerId: 'erp-service-account',
      })
      .returning();

    await logAuditEvent({
      decisionId: inserted.id,
      eventType: 'ERP_WEBHOOK_INGESTED',
      actor: `${system}-bot`,
      metadata: { poNumber, verdict, co2eKg: impact.co2eKg },
    });

    const topAlt = alternatives[0];

    res.status(201).json({
      status: 'success',
      decisionId: inserted.id,
      poNumber,
      firewallVerdict: verdict,
      summary: hasCritical
        ? 'High environmental risk detected. Procurement blocked pending circular review.'
        : hasWarning
          ? 'Warnings flagged. Lower-impact circular alternatives available.'
          : 'Low lifecycle risk. Procurement approved for purchase order issuance.',
      impact: {
        co2eKg: Math.round(impact.co2eKg),
        wasteKg: Number(impact.wasteKg.toFixed(2)),
        waterLiters: Math.round(impact.waterLiters),
        landfillRisk: impact.landfillRisk,
      },
      firewallFlags: firewallEvaluation.findings,
      topAlternative: topAlt
        ? {
            name: topAlt.name,
            cost: topAlt.cost,
            co2eKg: topAlt.co2eKg,
            co2eSavingsPercent: topAlt.co2eSavingsPercent,
            summary: topAlt.summary,
          }
        : null,
      verificationUrl: `/api/decisions/${inserted.id}/certificate`,
      portalUrl: `https://terrafuse.vercel.app/?id=${inserted.id}`,
    });
  } catch (err: any) {
    req.log?.error({ err }, 'Error handling ERP webhook');
    res.status(500).json({ error: 'Failed to process ERP intake webhook: ' + (err.message || 'Server error') });
  }
});

export default router;
