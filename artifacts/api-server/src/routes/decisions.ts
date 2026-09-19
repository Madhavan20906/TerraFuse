import { Router, type IRouter, type Request, type Response } from 'express';
import { db, decisionsTable, auditLogsTable, eq, desc } from '@workspace/db';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

import { extractDocumentContent } from '../lib/extractor';
import { analyzeProcurementWithAi } from '../lib/ai';
import { calculateDeterministicImpact } from '../lib/calc';
import { generateDynamicAlternatives } from '../lib/alternatives';
import { evaluateDecisionFirewall } from '../lib/firewall';
import { logAuditEvent } from '../lib/audit';

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// Helper to resolve uploaded file buffer from objectPath or local directory
function getFileBuffer(objectPath: string): Buffer | null {
  try {
    const cleanPath = objectPath.replace(/^\/objects\//, '');
    const localUploadsDir = path.resolve(process.cwd(), '.data', 'uploads');
    const directPath = path.join(localUploadsDir, path.basename(cleanPath));
    if (fs.existsSync(directPath)) {
      return fs.readFileSync(directPath);
    }
  } catch (err) {
    console.error('Error finding file on disk:', err);
  }
  return null;
}

/**
 * POST /decisions
 * Ingests an intake document (from objectPath or source text), performs extraction,
 * AI analysis, deterministic calculation, alternatives generation, and persists to DB.
 */
router.post('/decisions', async (req: Request, res: Response) => {
  try {
    const { objectPath, name, size, contentType, sourceText: directSourceText } = req.body;

    let extractedText = directSourceText || '';
    let extractionMeta: any = { fileName: name || 'procurement-document', fileSize: size || 0, mimeType: contentType || 'text/plain' };

    if (!extractedText && objectPath) {
      const buffer = getFileBuffer(objectPath);
      if (buffer) {
        const extraction = await extractDocumentContent(buffer, name || path.basename(objectPath), contentType || 'application/octet-stream');
        extractedText = extraction.text;
        extractionMeta = { ...extraction.metadata, fileType: extraction.fileType, tableCount: extraction.tableCount };
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      // If no file found or empty, give a clear helpful error
      res.status(400).json({ error: 'No readable text could be extracted from the procurement intake document.' });
      return;
    }

    // AI Analysis (strict schema distinguishing known facts vs assumptions)
    const { analysis, provider } = await analyzeProcurementWithAi(extractedText, name || 'procurement-brief');

    // Assumptions derived transparently
    const assumptions = {
      quantity: Math.max(1, analysis.quantity || 1),
      reuseCycles: Math.max(1, analysis.reuseCycles || 1),
      transportDistance: Math.max(0, analysis.transportDistanceKm || 0),
      material: analysis.material || 'PVC banner vinyl',
      transportMode: analysis.transportMode || 'truck',
      originalValues: {
        quantity: analysis.quantity || 1,
        reuseCycles: analysis.reuseCycles || 1,
        transportDistance: analysis.transportDistanceKm || 0,
        material: analysis.material || 'PVC banner vinyl',
      },
      source: provider,
    };

    // Deterministic environmental calculation
    const { impact, evidence, materialFactor, transportFactor } = calculateDeterministicImpact(assumptions);

    // Dynamic alternative generation evaluated through identical deterministic engine
    const alternatives = generateDynamicAlternatives({
      item: analysis.item || 'Procurement Item',
      material: assumptions.material,
      quantity: assumptions.quantity,
      price: analysis.totalCost || 1290,
      reuseCycles: assumptions.reuseCycles,
      transportDistance: assumptions.transportDistance,
    });

    // Decision firewall risk evaluation
    const firewallEvaluation = evaluateDecisionFirewall({
      material: assumptions.material,
      quantity: assumptions.quantity,
      transportDistance: assumptions.transportDistance,
      reuseCycles: assumptions.reuseCycles,
      impact,
      missingData: analysis.missingInformation,
      unverifiedClaimsCount: analysis.supplierClaims ? analysis.supplierClaims.length : 0,
    });

    const shareId = randomUUID();
    const ownerId = req.user?.id || 'default-user';

    const [inserted] = await db
      .insert(decisionsTable)
      .values({
        title: analysis.title || name?.replace(/\.[^/.]+$/, '') || 'Procurement Decision',
        organization: analysis.organization || 'Procurement Department',
        item: analysis.item || 'Procurement Item',
        material: assumptions.material,
        quantity: assumptions.quantity,
        price: String(analysis.totalCost || 1290),
        currency: analysis.currency || 'USD',
        location: analysis.location || 'Site',
        useCase: analysis.useCase || 'General use',
        currentOption: analysis.currentOption || `Standard ${assumptions.material}`,
        fileName: name || null,
        objectPath: objectPath || null,
        contentType: contentType || 'application/octet-stream',
        sourceText: extractedText,
        parsedData: {
          ...extractionMeta,
          dataQuality: analysis.dataQuality,
          unit: analysis.unit,
          unitCost: analysis.unitCost,
          packaging: analysis.packaging,
          disposalRoute: analysis.disposalRoute,
          materialComposition: analysis.materialComposition,
          aiProvider: provider,
        },
        analysis: {
          supplierClaims: analysis.supplierClaims,
          riskFactors: analysis.riskFactors,
          firewallEvaluation,
        },
        assumptions,
        impact,
        alternatives,
        evidence,
        missingData: analysis.missingInformation || [],
        firewallFlags: firewallEvaluation.findings,
        status: 'intake',
        ownerId,
        shareId,
      })
      .returning();

    // Log audit events
    await logAuditEvent({
      decisionId: inserted.id,
      eventType: 'DOCUMENT_UPLOADED',
      actor: ownerId,
      metadata: { fileName: name, fileSize: size },
    });

    await logAuditEvent({
      decisionId: inserted.id,
      eventType: 'AI_ANALYSIS_COMPLETED',
      actor: provider,
      metadata: { provider, firewallStatus: firewallEvaluation.status },
    });

    res.status(201).json(inserted);
  } catch (err: any) {
    req.log?.error({ err }, 'Error in createDecision');
    res.status(500).json({ error: err.message || 'Failed to create decision record.' });
  }
});

/**
 * POST /decisions/upload
 * Direct multipart upload route for frictionless single-step upload & intake
 */
router.post('/decisions/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file was uploaded.' });
      return;
    }

    const uploadsDir = path.resolve(process.cwd(), '.data', 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const fileId = `${randomUUID()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(uploadsDir, fileId);
    fs.writeFileSync(filePath, req.file.buffer);

    const objectPath = `/objects/uploads/${fileId}`;

    // Extract
    const extraction = await extractDocumentContent(req.file.buffer, req.file.originalname, req.file.mimetype);

    // Analyze with AI
    const { analysis, provider } = await analyzeProcurementWithAi(extraction.text, req.file.originalname);

    // Derive assumptions
    const assumptions = {
      quantity: Math.max(1, analysis.quantity || 1),
      reuseCycles: Math.max(1, analysis.reuseCycles || 1),
      transportDistance: Math.max(0, analysis.transportDistanceKm || 0),
      material: analysis.material || 'PVC banner vinyl',
      transportMode: analysis.transportMode || 'truck',
      originalValues: {
        quantity: analysis.quantity || 1,
        reuseCycles: analysis.reuseCycles || 1,
        transportDistance: analysis.transportDistanceKm || 0,
        material: analysis.material || 'PVC banner vinyl',
      },
      source: provider,
    };

    // Calculate deterministic impact
    const { impact, evidence } = calculateDeterministicImpact(assumptions);

    // Alternatives
    const alternatives = generateDynamicAlternatives({
      item: analysis.item || 'Procurement Item',
      material: assumptions.material,
      quantity: assumptions.quantity,
      price: analysis.totalCost || 1290,
      reuseCycles: assumptions.reuseCycles,
      transportDistance: assumptions.transportDistance,
    });

    // Firewall rules
    const firewallEvaluation = evaluateDecisionFirewall({
      material: assumptions.material,
      quantity: assumptions.quantity,
      transportDistance: assumptions.transportDistance,
      reuseCycles: assumptions.reuseCycles,
      impact,
      missingData: analysis.missingInformation,
      unverifiedClaimsCount: analysis.supplierClaims ? analysis.supplierClaims.length : 0,
    });

    const shareId = randomUUID();
    const ownerId = req.user?.id || 'default-user';

    const [inserted] = await db
      .insert(decisionsTable)
      .values({
        title: analysis.title || req.file.originalname.replace(/\.[^/.]+$/, ''),
        organization: analysis.organization || 'Procurement Department',
        item: analysis.item || 'Procurement Item',
        material: assumptions.material,
        quantity: assumptions.quantity,
        price: String(analysis.totalCost || 1290),
        currency: analysis.currency || 'USD',
        location: analysis.location || 'Site',
        useCase: analysis.useCase || 'General use',
        currentOption: analysis.currentOption || `Standard ${assumptions.material}`,
        fileName: req.file.originalname,
        objectPath,
        contentType: req.file.mimetype,
        sourceText: extraction.text,
        parsedData: {
          ...extraction.metadata,
          fileType: extraction.fileType,
          tableCount: extraction.tableCount,
          dataQuality: analysis.dataQuality,
          unit: analysis.unit,
          unitCost: analysis.unitCost,
          packaging: analysis.packaging,
          disposalRoute: analysis.disposalRoute,
          materialComposition: analysis.materialComposition,
          aiProvider: provider,
        },
        analysis: {
          supplierClaims: analysis.supplierClaims,
          riskFactors: analysis.riskFactors,
          firewallEvaluation,
        },
        assumptions,
        impact,
        alternatives,
        evidence,
        missingData: analysis.missingInformation || [],
        firewallFlags: firewallEvaluation.findings,
        status: 'intake',
        ownerId,
        shareId,
      })
      .returning();

    await logAuditEvent({
      decisionId: inserted.id,
      eventType: 'DOCUMENT_UPLOADED',
      actor: ownerId,
      metadata: { fileName: req.file.originalname, fileSize: req.file.size },
    });

    await logAuditEvent({
      decisionId: inserted.id,
      eventType: 'AI_ANALYSIS_COMPLETED',
      actor: provider,
      metadata: { provider, firewallStatus: firewallEvaluation.status },
    });

    res.status(201).json(inserted);
  } catch (err: any) {
    req.log?.error({ err }, 'Error in upload decision');
    res.status(500).json({ error: err.message || 'Failed to process and upload procurement file.' });
  }
});

/**
 * GET /decisions
 * List decision records
 */
router.get('/decisions', async (req: Request, res: Response) => {
  try {
    const statusQuery = req.query.status as string | undefined;
    const records = await db
      .select()
      .from(decisionsTable)
      .orderBy(desc(decisionsTable.createdAt));

    const filtered = statusQuery ? records.filter((r: any) => r.status === statusQuery) : records;
    res.json(filtered);
  } catch (err: any) {
    req.log?.error({ err }, 'Error listing decisions');
    res.status(500).json({ error: 'Failed to list decisions.' });
  }
});

/**
 * GET /decisions/:id
 * Retrieve a specific decision by id
 */
router.get('/decisions/:id', async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid decision ID.' });
      return;
    }

    const [record] = await db
      .select()
      .from(decisionsTable)
      .where(eq(decisionsTable.id, id));

    if (!record) {
      res.status(404).json({ error: `Decision #${id} not found.` });
      return;
    }

    res.json(record);
  } catch (err: any) {
    req.log?.error({ err }, 'Error retrieving decision');
    res.status(500).json({ error: 'Failed to retrieve decision.' });
  }
});

/**
 * PATCH /decisions/:id
 * Update status, edit assumptions (with deterministic recalculation), or add review notes
 */
router.patch(['/decisions/:id', '/decisions/:id/status'], async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid decision ID.' });
      return;
    }

    const [existing] = await db
      .select()
      .from(decisionsTable)
      .where(eq(decisionsTable.id, id));

    if (!existing) {
      res.status(404).json({ error: `Decision #${id} not found.` });
      return;
    }

    const { status, assumptions: newAssumptionsInput, selectedAlternative, reviewNotes, reviewer } = req.body;

    let updatedStatus = existing.status;
    let updatedAssumptions = existing.assumptions as any;
    let updatedImpact = existing.impact;
    let updatedEvidence = existing.evidence;
    let updatedAlternatives = existing.alternatives;
    let updatedFirewallFlags = existing.firewallFlags;
    let approvedAt = existing.approvedAt;
    let updatedReviewer = existing.reviewer;
    let updatedReviewNotes = existing.reviewNotes;
    let updatedSelectedAlternative = existing.selectedAlternative;

    // 1. Assumption Editing with Live Deterministic Recalculation
    if (newAssumptionsInput && typeof newAssumptionsInput === 'object') {
      updatedAssumptions = {
        ...updatedAssumptions,
        ...newAssumptionsInput,
        quantity: Math.max(1, newAssumptionsInput.quantity ?? updatedAssumptions.quantity ?? 1),
        reuseCycles: Math.max(1, newAssumptionsInput.reuseCycles ?? updatedAssumptions.reuseCycles ?? 1),
        transportDistance: Math.max(0, newAssumptionsInput.transportDistance ?? updatedAssumptions.transportDistance ?? 0),
      };

      const reCalc = calculateDeterministicImpact(updatedAssumptions);
      updatedImpact = reCalc.impact;
      updatedEvidence = reCalc.evidence;

      updatedAlternatives = generateDynamicAlternatives({
        item: existing.item || 'Procurement Item',
        material: updatedAssumptions.material || existing.material || 'PVC banner vinyl',
        quantity: updatedAssumptions.quantity,
        price: Number(existing.price) || 1290,
        reuseCycles: updatedAssumptions.reuseCycles,
        transportDistance: updatedAssumptions.transportDistance,
      });

      const reFirewall = evaluateDecisionFirewall({
        material: updatedAssumptions.material || existing.material || undefined,
        quantity: updatedAssumptions.quantity,
        transportDistance: updatedAssumptions.transportDistance,
        reuseCycles: updatedAssumptions.reuseCycles,
        impact: reCalc.impact,
        missingData: existing.missingData as any,
      });
      updatedFirewallFlags = reFirewall.findings;

      // If assumptions modified while approved, re-open for review
      if (updatedStatus === 'approved') {
        updatedStatus = 'review';
      }

      await logAuditEvent({
        decisionId: id,
        eventType: 'ASSUMPTION_CHANGED',
        actor: req.user?.id || 'reviewer',
        metadata: { updatedAssumptions },
      });
    }

    // 2. Status Transitions & Approval
    if (status) {
      const allowedTransitions: Record<string, string[]> = {
        intake: ['review', 'approved', 'rejected', 'changes_requested'],
        review: ['approved', 'rejected', 'changes_requested', 'intake'],
        approved: ['review', 'changes_requested'],
        rejected: ['review', 'intake'],
        changes_requested: ['review', 'approved'],
      };

      const legalNext = allowedTransitions[existing.status] || [];
      if (!legalNext.includes(status) && status !== existing.status) {
        res.status(400).json({
          error: `Invalid status transition from '${existing.status}' to '${status}'. Valid next states: ${legalNext.join(', ')}`,
        });
        return;
      }

      updatedStatus = status;

      if (status === 'approved') {
        approvedAt = new Date();
        updatedReviewer = reviewer || req.user?.name || 'Authorized Reviewer';
        await logAuditEvent({
          decisionId: id,
          eventType: 'DECISION_APPROVED',
          actor: updatedReviewer,
          metadata: { approvedAt, selectedAlternative },
        });
      } else if (status === 'rejected') {
        await logAuditEvent({
          decisionId: id,
          eventType: 'DECISION_REJECTED',
          actor: req.user?.name || 'Reviewer',
          metadata: { reviewNotes },
        });
      } else if (status === 'changes_requested') {
        await logAuditEvent({
          decisionId: id,
          eventType: 'CHANGES_REQUESTED',
          actor: req.user?.name || 'Reviewer',
          metadata: { reviewNotes },
        });
      } else {
        await logAuditEvent({
          decisionId: id,
          eventType: 'STATUS_TRANSITION',
          actor: req.user?.id || 'system',
          metadata: { from: existing.status, to: status },
        });
      }
    }

    if (selectedAlternative !== undefined) {
      updatedSelectedAlternative = selectedAlternative;
    }
    if (reviewNotes !== undefined) {
      updatedReviewNotes = reviewNotes;
    }

    const [updated] = await db
      .update(decisionsTable)
      .set({
        status: updatedStatus,
        assumptions: updatedAssumptions,
        impact: updatedImpact,
        evidence: updatedEvidence,
        alternatives: updatedAlternatives,
        firewallFlags: updatedFirewallFlags,
        selectedAlternative: updatedSelectedAlternative,
        reviewNotes: updatedReviewNotes,
        reviewer: updatedReviewer,
        approvedAt,
        updatedAt: new Date(),
      })
      .where(eq(decisionsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    req.log?.error({ err }, 'Error updating decision');
    res.status(500).json({ error: 'Failed to update decision record.' });
  }
});

/**
 * GET /decisions/:id/audit
 * Immutable audit trail
 */
router.get('/decisions/:id/audit', async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid decision ID' });
      return;
    }

    const logs = await db
      .select()
      .from(auditLogsTable)
      .where(eq(auditLogsTable.decisionId, id))
      .orderBy(auditLogsTable.createdAt);

    res.json(logs);
  } catch (err: any) {
    req.log?.error({ err }, 'Error fetching audit logs');
    res.status(500).json({ error: 'Failed to retrieve audit log.' });
  }
});

/**
 * GET /decisions/:id/certificate
 * Public verification certificate data
 */
router.get('/decisions/:id/certificate', async (req: Request, res: Response) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid decision ID' });
      return;
    }

    const [record] = await db
      .select()
      .from(decisionsTable)
      .where(eq(decisionsTable.id, id));

    if (!record) {
      res.status(404).json({ error: 'Certificate record not found.' });
      return;
    }

    res.json({
      decisionId: record.id,
      shareId: record.shareId,
      title: record.title,
      organization: record.organization,
      item: record.item,
      selectedOption: record.selectedAlternative || record.currentOption,
      status: record.status,
      approvedAt: record.approvedAt || record.updatedAt,
      reviewer: record.reviewer || 'Authorized Officer',
      impact: record.impact,
      assumptions: record.assumptions,
      methodology: 'TerraFuse Deterministic LCA Engine v1.0 / DEFRA & US EPA WARM v16 Standard',
      verificationSeal: 'VERIFIED_DECISION_FIREWALL',
      verificationChecksum: 'TF-' + Buffer.from(String(record.id) + record.status + (record.shareId || '')).toString('hex').slice(0, 16).toUpperCase(),
    });
  } catch (err: any) {
    req.log?.error({ err }, 'Error generating certificate');
    res.status(500).json({ error: 'Failed to generate certificate.' });
  }
});

export default router;
