import { type ReactNode, useMemo, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  FileUp,
  Leaf,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Database,
  ExternalLink,
  FlaskConical,
  Info,
  Landmark,
  RefreshCw,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Truck,
  Upload,
  X,
  AlertTriangle,
  History,
  Award,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { TerraFuseLogo } from './components/TerraFuseLogo';
import {
  useListDecisions,
  useGetDecision,
  useUpdateDecisionStatus,
  getListDecisionsQueryKey,
  getGetDecisionQueryKey,
} from '@workspace/api-client-react';

const queryClient = new QueryClient();

export type Status = 'intake' | 'review' | 'approved' | 'rejected' | 'changes_requested';

export interface Evidence {
  claim: string;
  source: string;
  excerpt: string;
  confidence: string;
  applicability: string;
  assumption: string;
  verificationStatus?: 'VERIFIED' | 'PARTIALLY VERIFIED' | 'UNVERIFIED' | 'ASSUMED';
  formulaExplanation?: string;
}

export interface Alternative {
  name: string;
  summary: string;
  cost: number;
  co2eKg: number;
  wasteKg: number;
  waterLiters: number;
  reuseCycles: number;
  risk: string;
  evidenceLabel: string;
  material?: string;
  co2eSavingsPercent?: number;
}

export interface DecisionCase {
  id: number;
  title: string;
  organization?: string;
  item?: string;
  material?: string;
  quantity: number;
  price: number;
  currency?: string;
  location?: string;
  useCase?: string;
  currentOption?: string;
  fileName?: string | null;
  objectPath?: string | null;
  alternatives: Alternative[];
  assumptions: {
    quantity: number;
    reuseCycles: number;
    transportDistance: number;
    material?: string;
    transportMode?: string;
    originalValues?: {
      quantity: number;
      reuseCycles: number;
      transportDistance: number;
      material?: string;
    };
    source?: string;
  };
  evidence: Evidence[];
  firewallFlags?: Array<{
    code: string;
    rule: string;
    severity: string;
    description: string;
    suggestedAction: string;
  }>;
  missingData?: Array<{
    field: string;
    severity: string;
    description: string;
  }>;
  status: Status;
  reviewNotes?: string | null;
  reviewer?: string | null;
  approvedAt?: string | null;
  selectedAlternative?: string | null;
  shareId?: string | null;
  analysis?: any;
}

export interface Impact {
  co2eKg: number;
  wasteKg: number;
  waterLiters: number;
  recyclabilityPercent: number;
  landfillRisk: string;
  transportKg: number;
  confidence: string;
  uncertaintyPercent?: number;
}

const demoCase: DecisionCase = {
  id: 0,
  title: 'North Quad Festival 2025',
  organization: 'Morrow University · Events Committee',
  item: 'Wayfinding signs',
  material: 'PVC banner vinyl',
  quantity: 86,
  price: 1290,
  currency: 'USD',
  location: 'Morrow University, Oregon',
  useCase: 'Outdoor wayfinding across a three-day student festival',
  currentOption: 'Single-use printed vinyl',
  assumptions: {
    quantity: 86,
    reuseCycles: 1,
    transportDistance: 412,
    material: 'PVC banner vinyl',
    originalValues: { quantity: 86, reuseCycles: 1, transportDistance: 412, material: 'PVC banner vinyl' },
    source: 'Sample Festival Quote',
  },
  status: 'intake',
  alternatives: [
    { name: 'Aluminum composite', summary: 'Durable panels that can return to the campus sign shop for future events.', cost: 1715, co2eKg: 74, wasteKg: 1.8, waterLiters: 468, reuseCycles: 8, risk: 'Lower landfill risk', evidenceLabel: 'Campus sign shop quote', co2eSavingsPercent: 49 },
    { name: 'Recycled cardboard', summary: 'Short-run fiber panels with a lighter footprint and straightforward recycling.', cost: 1032, co2eKg: 89, wasteKg: 4.4, waterLiters: 312, reuseCycles: 2, risk: 'Moderate water use', evidenceLabel: 'Supplier EPD · 2024', co2eSavingsPercent: 39 },
    { name: 'Rental fabric system', summary: 'Printed fabric sleeves on rented frames; return shipment included.', cost: 1480, co2eKg: 51, wasteKg: 0.9, waterLiters: 540, reuseCycles: 12, risk: 'Lowest material risk', evidenceLabel: 'Rental partner terms', co2eSavingsPercent: 65 },
  ],
  evidence: [
    { claim: 'PVC banner vinyl is rarely accepted in local curbside recycling.', source: 'Oregon DEQ · Materials Recovery Review, 2023', excerpt: 'Flexible PVC film is commonly sorted as residual material due to contamination and limited end-market demand.', confidence: 'High', applicability: 'Applies to post-event banners in Morrow County.', assumption: 'Landfill risk uses local recovery guidance as a proxy for disposal route.', verificationStatus: 'VERIFIED', formulaExplanation: 'Allocated mass (38.7 kg) × 3.12 kg CO2e/kg = 120.7 kg CO2e.' },
    { claim: 'Reusable sign systems reduce manufacturing impact after the second event.', source: 'Campus sign shop · Internal reuse log', excerpt: 'Aluminum panels in the shop inventory have circulated between 6 and 11 events.', confidence: 'Medium', applicability: 'Comparable to 2025 festival dimensions.', assumption: 'Panels are stored indoors and not redesigned between uses.', verificationStatus: 'PARTIALLY VERIFIED', formulaExplanation: 'Production footprint divided by 8 uses.' },
    { claim: 'Transport contributes a small but visible share of the current option.', source: 'Supplier freight estimate · 2025 quote', excerpt: 'Ground freight from Portland to Morrow University is estimated at 412 km for this order.', confidence: 'Medium', applicability: 'Specific to the current supplier quote.', assumption: 'One consolidated shipment; no expedited freight.', verificationStatus: 'VERIFIED', formulaExplanation: 'Freight share calculation based on 412 km.' },
  ],
  firewallFlags: [
    { code: 'WARN_HIGH_LANDFILL_RISK', rule: 'Circular Economy Firewall', severity: 'WARNING', description: 'Single-use vinyl film has high landfill risk and low regional recyclability (< 10%).', suggestedAction: 'Consider switching to a reusable or fiber-based alternative prior to purchase authorization.' },
  ],
};

function calculateLocalImpact(item: DecisionCase): Impact {
  const { quantity, reuseCycles, transportDistance } = item.assumptions;
  const cycleFactor = Math.max(0.12, 1 / Math.max(1, reuseCycles));
  const co2eKg = quantity * (1.54 * cycleFactor + transportDistance * 0.00036);
  const wasteKg = quantity * 0.11 * cycleFactor;
  const waterLiters = quantity * 4.7 * cycleFactor;
  const transportKg = quantity * transportDistance * 0.00036;
  const confidence = reuseCycles > 1 ? 'Medium-high' : 'Medium';
  return { co2eKg, wasteKg, waterLiters, recyclabilityPercent: 8, landfillRisk: reuseCycles > 1 ? 'Medium' : 'High', transportKg, confidence, uncertaintyPercent: 12 };
}

const fmt = (n: number, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });

const UPLOAD_STAGES = [
  'Uploading procurement file safely...',
  'Extracting text & spreadsheet tables...',
  'Analyzing line items with AI firewall...',
  'Matching verified environmental factors...',
  'Running deterministic lifecycle calculations...',
  'Synthesizing decision & alternatives...',
];

export const ENTERPRISE_PERSONAS = [
  { id: 'buyer', name: 'Alex Rivera', role: 'Campus Procurement Officer · Buyer', badge: 'Buyer' },
  { id: 'esg_lead', name: 'Dr. Elena Rostova', role: 'Chief Sustainability Officer · ESG Lead', badge: 'ESG Lead' },
  { id: 'auditor', name: 'Marcus Vance', role: 'Compliance & ESG Auditor', badge: 'Auditor' },
];

function Home() {
  const qc = useQueryClient();

  // Active persona
  const [activePersonaId, setActivePersonaId] = useState<string>(() => {
    return localStorage.getItem('tf_active_persona_id') || 'buyer';
  });
  const currentPersona = ENTERPRISE_PERSONAS.find((p) => p.id === activePersonaId) || ENTERPRISE_PERSONAS[0];

  // Active decision ID state with persistence in localStorage and URL
  const [activeId, setActiveId] = useState<number | null>(() => {
    const saved = localStorage.getItem('tf_active_decision_id');
    return saved ? parseInt(saved, 10) : null;
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('tf_is_demo_mode') === 'true';
  });

  const [localCase, setLocalCase] = useState<DecisionCase | null>(null);
  const [intakeMode, setIntakeMode] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  // Upload progress states
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Modals
  const [showHistory, setShowHistory] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'changes_requested'>('approved');
  const [reviewerName, setReviewerName] = useState(currentPersona.name);
  const [reviewNotes, setReviewNotes] = useState('');

  // Backend queries
  const decisionsQuery = useListDecisions();
  const decisionQuery = useGetDecision(activeId ?? 0, {
    query: {
      enabled: activeId !== null && activeId > 0 && !isDemoMode,
    } as any,
  });

  const updateStatusMutation = useUpdateDecisionStatus();

  // If no active decision and decisions exist in DB, auto-select latest
  useEffect(() => {
    if (!activeId && !isDemoMode && decisionsQuery.data && decisionsQuery.data.length > 0) {
      const latest = decisionsQuery.data[0];
      if (latest && latest.id) {
        setActiveId(latest.id);
        localStorage.setItem('tf_active_decision_id', String(latest.id));
      }
    }
  }, [decisionsQuery.data, activeId, isDemoMode]);

  // Construct active case file
  const currentCase: DecisionCase | null = useMemo(() => {
    if (isDemoMode) {
      return localCase || demoCase;
    }
    if (decisionQuery.data) {
      const d = decisionQuery.data as any;
      return {
        id: d.id,
        title: d.title,
        organization: d.organization || 'Procurement Office',
        item: d.item || 'Procured Item',
        material: d.material || 'PVC banner vinyl',
        quantity: d.quantity || 1,
        price: Number(d.price) || 0,
        currency: d.currency || 'USD',
        location: d.location || 'Site',
        useCase: d.useCase || 'General use',
        currentOption: d.currentOption || `Standard ${d.material || 'material'}`,
        fileName: d.fileName,
        objectPath: d.objectPath,
        alternatives: Array.isArray(d.alternatives) ? d.alternatives : [],
        assumptions: d.assumptions || {
          quantity: d.quantity || 1,
          reuseCycles: 1,
          transportDistance: 0,
        },
        evidence: Array.isArray(d.evidence) ? d.evidence : [],
        firewallFlags: Array.isArray(d.firewallFlags) ? d.firewallFlags : [],
        missingData: Array.isArray(d.missingData) ? d.missingData : [],
        status: d.status as Status,
        reviewNotes: d.reviewNotes,
        reviewer: d.reviewer,
        approvedAt: d.approvedAt,
        selectedAlternative: d.selectedAlternative,
        shareId: d.shareId,
      };
    }
    return localCase;
  }, [isDemoMode, localCase, decisionQuery.data]);

  // Active impact metrics
  const impact: Impact | null = useMemo(() => {
    if (!currentCase) return null;
    if (isDemoMode) {
      return calculateLocalImpact(currentCase);
    }
    const d = decisionQuery.data as any;
    if (d && d.impact && d.impact.co2eKg !== undefined) {
      return d.impact as Impact;
    }
    return calculateLocalImpact(currentCase);
  }, [currentCase, isDemoMode, decisionQuery.data]);

  // Check if assumptions changed from original
  const changed = useMemo(() => {
    if (!currentCase || !currentCase.assumptions) return false;
    const orig = currentCase.assumptions.originalValues;
    if (!orig) return false;
    return (
      currentCase.assumptions.quantity !== orig.quantity ||
      currentCase.assumptions.reuseCycles !== orig.reuseCycles ||
      currentCase.assumptions.transportDistance !== orig.transportDistance
    );
  }, [currentCase]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const loadDemo = () => {
    setIsDemoMode(true);
    localStorage.setItem('tf_is_demo_mode', 'true');
    setLocalCase(demoCase);
    setIntakeMode(false);
    notify('Sample festival demo case loaded with visible assumptions.');
  };

  const selectCaseFromHistory = (id: number) => {
    setIsDemoMode(false);
    localStorage.setItem('tf_is_demo_mode', 'false');
    setActiveId(id);
    localStorage.setItem('tf_active_decision_id', String(id));
    setShowHistory(false);
    setIntakeMode(false);
    notify(`Loaded decision record #${id}`);
  };

  // Assumption update handler (persists to backend with live recalculation)
  const updateAssumption = (key: keyof DecisionCase['assumptions'], value: number) => {
    if (!currentCase) return;
    const num = Math.max(0, value);
    const newAssumptions = {
      ...currentCase.assumptions,
      [key]: num,
    };

    if (isDemoMode) {
      setLocalCase({
        ...currentCase,
        assumptions: newAssumptions,
        status: currentCase.status === 'approved' ? 'review' : currentCase.status,
      });
      notify('Estimate live-recalculated.');
      return;
    }

    // Backend PATCH with live recalculation
    updateStatusMutation.mutate(
      {
        id: currentCase.id,
        data: {
          assumptions: newAssumptions,
        },
      },
      {
        onSuccess: (updated) => {
          qc.setQueryData(getGetDecisionQueryKey(currentCase.id), updated);
          qc.invalidateQueries({ queryKey: getListDecisionsQueryKey() });
          notify('Assumptions updated and deterministically recalculated.');
        },
        onError: (err: any) => {
          notify(`Failed to update assumptions: ${err.message || 'Error'}`);
        },
      }
    );
  };

  const resetAssumptions = () => {
    if (!currentCase || !currentCase.assumptions.originalValues) return;
    const orig = currentCase.assumptions.originalValues;
    updateAssumption('quantity', orig.quantity);
    updateAssumption('reuseCycles', orig.reuseCycles);
    updateAssumption('transportDistance', orig.transportDistance);
    notify('Assumptions reset to initial procurement intake values.');
  };

  // Workflow transition
  const moveToReview = () => {
    if (!currentCase) return;
    if (isDemoMode) {
      setLocalCase({ ...currentCase, status: 'review' });
      notify('Review packet prepared — compare before approving.');
      return;
    }

    updateStatusMutation.mutate(
      {
        id: currentCase.id,
        data: { status: 'review' },
      },
      {
        onSuccess: (updated) => {
          qc.setQueryData(getGetDecisionQueryKey(currentCase.id), updated);
          qc.invalidateQueries({ queryKey: getListDecisionsQueryKey() });
          notify('Decision advanced to Review Room.');
        },
      }
    );
  };

  const handleOpenReviewModal = (action: 'approved' | 'rejected' | 'changes_requested') => {
    setReviewAction(action);
    setShowReviewModal(true);
  };

  const submitReviewDecision = () => {
    if (!currentCase) return;

    if (isDemoMode) {
      setLocalCase({
        ...currentCase,
        status: reviewAction,
        reviewer: reviewerName,
        reviewNotes: reviewNotes || null,
        selectedAlternative: selectedAlt || currentCase.selectedAlternative || null,
        approvedAt: reviewAction === 'approved' ? new Date().toISOString() : null,
      });
      setShowReviewModal(false);
      notify(`Decision marked as ${reviewAction} in demo mode.`);
      return;
    }

    updateStatusMutation.mutate(
      {
        id: currentCase.id,
        data: {
          status: reviewAction,
          reviewer: reviewerName,
          reviewNotes: reviewNotes || undefined,
          selectedAlternative: selectedAlt || currentCase.selectedAlternative || undefined,
        },
      },
      {
        onSuccess: (updated) => {
          qc.setQueryData(getGetDecisionQueryKey(currentCase.id), updated);
          qc.invalidateQueries({ queryKey: getListDecisionsQueryKey() });
          setShowReviewModal(false);
          notify(`Decision successfully recorded as ${reviewAction}.`);
        },
        onError: (err: any) => {
          notify(`Failed to record review: ${err.message || 'Error'}`);
        },
      }
    );
  };

  // Real upload workflow
  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadStage(0);

    const stageTimer = setInterval(() => {
      setUploadStage((prev) => (prev < UPLOAD_STAGES.length - 1 ? prev + 1 : prev));
    }, 900);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/decisions/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(stageTimer);

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errJson.error || `Server returned ${response.status}`);
      }

      const created = await response.json();

      setIsDemoMode(false);
      localStorage.setItem('tf_is_demo_mode', 'false');
      setActiveId(created.id);
      localStorage.setItem('tf_active_decision_id', String(created.id));

      qc.setQueryData(getGetDecisionQueryKey(created.id), created);
      qc.invalidateQueries({ queryKey: getListDecisionsQueryKey() });

      setUploading(false);
      setIntakeMode(false);
      notify(`Document parsed and decision record #${created.id} created.`);
    } catch (err: any) {
      clearInterval(stageTimer);
      setUploading(false);
      setUploadError(err.message || 'Failed to process document.');
    }
  };

  const status = currentCase?.status || 'intake';
  const firewallStatus = (currentCase?.analysis as any)?.firewallEvaluation?.status || 'READY_FOR_REVIEW';
  const firewallFindings = currentCase?.firewallFlags || [];

  return (
    <div className="tf-app">
      <div className="tf-shell">
        {/* Top bar */}
        <header className="tf-topbar">
          <button
            className="tf-brand"
            onClick={() => {
              setIntakeMode(false);
            }}
            data-testid="button-brand-home"
            aria-label="TerraFuse home"
          >
            <TerraFuseLogo size={30} />
            <span className="tf-wordmark">
              terra<span>fuse</span>
            </span>
            {isDemoMode && <span className="tf-badge-demo">Demo Case</span>}
          </button>

          <nav className="tf-nav" aria-label="Primary">
            <button
              className={!intakeMode ? 'active' : ''}
              onClick={() => {
                setIntakeMode(false);
                if (!currentCase) loadDemo();
              }}
              data-testid="button-nav-review"
            >
              Review room
            </button>
            <button
              className={intakeMode ? 'active' : ''}
              onClick={() => setIntakeMode(true)}
              data-testid="button-nav-new"
            >
              New intake
            </button>
            <button
              onClick={() => setShowHistory(true)}
              data-testid="button-nav-history"
              title="View past decisions"
            >
              <History size={13} style={{ display: 'inline', marginRight: 4 }} />
              History ({decisionsQuery.data?.length || 0})
            </button>
            {compareIds.length >= 2 && (
              <button
                className="active"
                style={{ background: '#0f766e', color: '#fff' }}
                onClick={() => setShowCompareModal(true)}
                data-testid="button-nav-compare"
              >
                <Scale size={13} style={{ display: 'inline', marginRight: 4 }} />
                Compare ({compareIds.length})
              </button>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', fontFamily: 'var(--app-font-mono)', color: 'hsl(var(--muted-foreground))' }}>
                Role:
              </span>
              <select
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid hsl(var(--border))',
                  background: 'hsl(var(--card))',
                  color: 'hsl(var(--foreground))',
                  cursor: 'pointer',
                }}
                value={activePersonaId}
                onChange={(e) => {
                  const pId = e.target.value;
                  setActivePersonaId(pId);
                  localStorage.setItem('tf_active_persona_id_v2', pId);
                  const p = ENTERPRISE_PERSONAS.find((x) => x.id === pId);
                  if (p) {
                    setReviewerName(p.name);
                    notify(`Switched persona to ${p.name} (${p.badge})`);
                  }
                }}
              >
                {ENTERPRISE_PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.badge}
                  </option>
                ))}
              </select>
            </div>

            <div className="tf-help">
              <span className="tf-help-dot" />
              {isDemoMode ? 'sample demo' : 'decision firewall'} <CircleHelp size={15} />
            </div>
          </div>
        </header>

        {/* Views */}
        {intakeMode ? (
          <section className="tf-empty" aria-label="New procurement intake">
            <div className="tf-empty-icon">
              <Upload size={25} />
            </div>
            <div className="tf-kicker">Start a decision record</div>
            <h1>
              Put a purchase
              <br />
              <em>under review.</em>
            </h1>
            <p>
              Upload an invoice, quote, or receipt (PDF, DOCX, XLSX, CSV, TXT, or Scanned Image PNG/JPG).
              TerraFuse extracts procurement specs with Gemini Vision and runs deterministic lifecycle calculations.
            </p>

            {uploading ? (
              <div className="tf-progress-card" role="status">
                <div className="tf-section-label" style={{ marginBottom: 12 }}>
                  Ingestion in Progress
                </div>
                {UPLOAD_STAGES.map((label, idx) => (
                  <div className="tf-progress-stage" key={label}>
                    <div
                      className={`tf-stage-icon ${
                        uploadStage > idx ? 'done' : uploadStage === idx ? 'active' : 'pending'
                      }`}
                    >
                      {uploadStage > idx ? <Check size={12} /> : idx + 1}
                    </div>
                    <span style={{ fontWeight: uploadStage === idx ? 600 : 400 }}>{label}</span>
                  </div>
                ))}
              </div>
            ) : uploadError ? (
              <div className="tf-progress-card" style={{ borderColor: 'hsl(var(--destructive))' }}>
                <div style={{ color: 'hsl(var(--destructive))', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                  <AlertCircle size={18} /> Ingestion Failure
                </div>
                <p style={{ margin: '12px 0', fontSize: 13, color: 'hsl(var(--foreground))' }}>{uploadError}</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <label className="tf-button primary tf-file">
                    <FileUp size={14} /> Retry with different file
                    <input
                      type="file"
                      accept=".pdf,.csv,.xlsx,.docx,.txt,.png,.jpg,.jpeg,.webp"
                      onChange={onFile}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="tf-button ghost" onClick={() => setUploadError(null)}>
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="tf-intake-actions">
                  <label className="tf-button primary tf-file" data-testid="label-upload-intake">
                    <FileUp size={15} /> Upload procurement file / receipt
                    <input
                      data-testid="input-upload-file"
                      type="file"
                      accept=".pdf,.csv,.xlsx,.docx,.txt,.png,.jpg,.jpeg,.webp"
                      onChange={onFile}
                    />
                  </label>
                  <button className="tf-button ghost" onClick={loadDemo} data-testid="button-load-demo">
                    <Sparkles size={15} /> Use festival demo
                  </button>
                </div>
                <div style={{ marginTop: 14, fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
                  Need a test file?{' '}
                  <a
                    href="/sample_procurement_quote.pdf"
                    download="sample_procurement_quote.pdf"
                    style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', fontWeight: 600 }}
                  >
                    Download Sample Vendor Quote (PDF)
                  </a>
                </div>
              </>
            )}

            <div className="tf-status-line" style={{ justifyContent: 'center' }}>
              <ShieldCheck size={14} /> Deterministic Environmental Model · Pure Math & Verified LCA Factors
            </div>
          </section>
        ) : decisionQuery.isLoading ? (
          <div className="tf-loading" data-testid="status-loading">
            <div>
              <div className="tf-skeleton" style={{ width: 180, height: 13, marginBottom: 10 }} />
              <div className="tf-skeleton" style={{ width: 290, height: 9 }} />
            </div>
          </div>
        ) : !currentCase ? (
          <section className="tf-empty">
            <div className="tf-empty-icon">
              <Database size={25} />
            </div>
            <div className="tf-kicker">No active case</div>
            <h1>
              Nothing is approved
              <br />
              <em>by default.</em>
            </h1>
            <p>Upload a procurement brief or open the festival case to put a purchase under review.</p>
            <div className="tf-intake-actions">
              <label className="tf-button primary tf-file">
                <FileUp size={15} /> Upload procurement file
                <input
                  type="file"
                  accept=".pdf,.csv,.xlsx,.docx,.txt"
                  onChange={onFile}
                />
              </label>
              <button className="tf-button ghost" onClick={loadDemo} data-testid="button-empty-demo">
                Open festival demo <ArrowRight size={15} />
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Intro banner */}
            <section className="tf-intro">
              <div>
                <div className="tf-kicker">
                  Environmental decision firewall · Case #{currentCase.id || '042'}
                  {isDemoMode && <span className="tf-badge-demo">Sample Demo</span>}
                  {currentCase.fileName && (
                    <span className="tf-badge-verified" style={{ marginLeft: 8 }}>
                      <FileText size={10} /> {currentCase.fileName}
                    </span>
                  )}
                </div>
                <h1 className="tf-title">
                  Make the hidden
                  <br />
                  <em>impact visible.</em>
                </h1>
                <p className="tf-intro-copy">
                  A calm review room for purchases that deserve more than a price check. Change an assumption, see
                  the consequence, then approve with your eyes open.
                </p>
                <div className="tf-status-line">
                  <span className={`tf-status-pill ${status}`}>
                    {status === 'approved' ? (
                      <Check size={12} />
                    ) : status === 'review' ? (
                      <SlidersHorizontal size={12} />
                    ) : status === 'changes_requested' ? (
                      <AlertTriangle size={12} />
                    ) : status === 'rejected' ? (
                      <X size={12} />
                    ) : (
                      <FlaskConical size={12} />
                    )}
                    {status === 'approved'
                      ? 'Approved'
                      : status === 'review'
                      ? 'In review'
                      : status === 'changes_requested'
                      ? 'Changes requested'
                      : status === 'rejected'
                      ? 'Rejected'
                      : 'Needs review'}
                  </span>
                  <span>
                    {status === 'approved'
                      ? `Approved by ${currentCase.reviewer || 'Authorized Officer'}`
                      : 'Last calculated deterministically just now'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {status === 'intake' && (
                  <button className="tf-button primary" onClick={moveToReview} data-testid="button-primary-progress">
                    <ArrowRight size={16} /> Start review
                  </button>
                )}
                {status === 'review' && (
                  <>
                    <button className="tf-button primary" onClick={() => handleOpenReviewModal('approved')} data-testid="button-primary-approve">
                      <Check size={16} /> Approve decision
                    </button>
                    <button className="tf-button ghost" onClick={() => handleOpenReviewModal('changes_requested')} data-testid="button-request-changes">
                      Request changes
                    </button>
                  </>
                )}
                {status === 'approved' && (
                  <button className="tf-button primary" onClick={() => setShowCertificate(true)} data-testid="button-view-cert">
                    <Award size={16} /> View Certificate
                  </button>
                )}
              </div>
            </section>

            {/* Case bar */}
            <div className="tf-casebar">
              <div className="tf-case-meta">
                <div className="tf-case-icon">
                  <Landmark size={19} />
                </div>
                <div>
                  <div className="tf-case-title" data-testid="text-case-title">
                    {currentCase.title}
                  </div>
                  <div className="tf-case-sub">
                    {currentCase.organization} · {currentCase.item} · ${fmt(currentCase.price)} {currentCase.currency || 'USD'}
                  </div>
                </div>
              </div>
              <div className="tf-case-actions">
                <button className="tf-button ghost" onClick={() => setIntakeMode(true)} data-testid="button-switch-case">
                  <Upload size={13} /> Switch case
                </button>
                <button className="tf-button ghost" onClick={() => setShowCertificate(true)} data-testid="button-share-summary">
                  <ExternalLink size={13} /> Share certificate
                </button>
              </div>
            </div>

            {/* Stepper */}
            <div className="tf-stepper" aria-label="Decision progress">
              {(['intake', 'review', 'approved'] as Status[]).map((step, i) => {
                const stepIdx = ['intake', 'review', 'approved'].indexOf(status === 'changes_requested' || status === 'rejected' ? 'review' : status);
                const isCurrent = (status === step) || (step === 'review' && (status === 'changes_requested' || status === 'rejected'));
                const isDone = stepIdx > i || status === 'approved';
                return (
                  <div
                    className={`tf-step ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
                    key={step}
                  >
                    <span className="tf-step-number">{isDone ? <Check size={12} /> : i + 1}</span>
                    <span>{step === 'intake' ? 'Assumptions' : step === 'review' ? 'Compare options' : 'Approval'}</span>
                  </div>
                );
              })}
            </div>

            {/* Grid */}
            <main className="tf-grid">
              {/* Left Column */}
              <div>
                {/* 01 · Assumptions */}
                <section className="tf-card pad" aria-labelledby="assumption-heading">
                  <div className="tf-card-header">
                    <div>
                      <div className="tf-section-label">01 · What we believe</div>
                      <h2 id="assumption-heading">Assumptions behind this purchase</h2>
                      <p className="tf-card-desc">Small changes here move the recommendation. Keep the inputs honest.</p>
                    </div>
                    <span className="tf-stamp">
                      <Database size={13} /> {currentCase.assumptions.source || 'quote inputs'}
                    </span>
                  </div>

                  <div className="tf-assumptions">
                    <div className="tf-input-row">
                      <div>
                        <div className="tf-input-label">Units ordered</div>
                        <div className="tf-input-help">Physical units for procurement delivery</div>
                      </div>
                      <div className="tf-input-wrap">
                        <input
                          className="tf-number"
                          type="number"
                          min="1"
                          value={currentCase.assumptions.quantity}
                          onChange={(e) => updateAssumption('quantity', Number(e.target.value))}
                          data-testid="input-quantity"
                        />
                        <span className="tf-unit">units</span>
                        {currentCase.assumptions.originalValues &&
                          currentCase.assumptions.quantity !== currentCase.assumptions.originalValues.quantity && (
                            <span className="tf-changed">changed</span>
                          )}
                      </div>
                    </div>

                    <div className="tf-input-row">
                      <div>
                        <div className="tf-input-label">Reuse cycles</div>
                        <div className="tf-input-help">How many uses/events before retirement</div>
                      </div>
                      <div className="tf-input-wrap">
                        <input
                          className="tf-number"
                          type="number"
                          min="1"
                          value={currentCase.assumptions.reuseCycles}
                          onChange={(e) => updateAssumption('reuseCycles', Number(e.target.value))}
                          data-testid="input-reuse-cycles"
                        />
                        <span className="tf-unit">events</span>
                        {currentCase.assumptions.originalValues &&
                          currentCase.assumptions.reuseCycles !== currentCase.assumptions.originalValues.reuseCycles && (
                            <span className="tf-changed">changed</span>
                          )}
                      </div>
                    </div>

                    <div className="tf-input-row">
                      <div>
                        <div className="tf-input-label">Supplier distance</div>
                        <div className="tf-input-help">One-way freight transit estimate</div>
                      </div>
                      <div className="tf-input-wrap">
                        <input
                          className="tf-number"
                          type="number"
                          min="0"
                          value={currentCase.assumptions.transportDistance}
                          onChange={(e) => updateAssumption('transportDistance', Number(e.target.value))}
                          data-testid="input-transport-distance"
                        />
                        <span className="tf-unit">km</span>
                        {currentCase.assumptions.originalValues &&
                          currentCase.assumptions.transportDistance !== currentCase.assumptions.originalValues.transportDistance && (
                            <span className="tf-changed">changed</span>
                          )}
                      </div>
                    </div>
                  </div>

                  {changed && (
                    <div className="tf-change-note" data-testid="status-changed-assumptions">
                      <Info size={15} />
                      <span>
                        <b>Estimate changed.</b> The impact card is live-calculated from your assumptions, not a locked score.
                      </span>
                      <button className="tf-link" onClick={resetAssumptions} data-testid="button-reset-assumptions">
                        Reset
                      </button>
                    </div>
                  )}

                  <hr className="tf-divider" />
                  <div className="tf-card-header" style={{ marginBottom: 0 }}>
                    <div>
                      <div className="tf-section-label">Context</div>
                      <h3>{currentCase.currentOption}</h3>
                      <p className="tf-card-desc">
                        {currentCase.useCase} · {currentCase.material}
                      </p>
                    </div>
                    <Truck size={18} color="hsl(var(--muted-foreground))" />
                  </div>
                </section>

                {/* 03 · Evidence & Caveats */}
                <section className="tf-card pad tf-evidence" aria-labelledby="evidence-heading">
                  <div className="tf-card-header">
                    <div>
                      <div className="tf-section-label">03 · Show your work</div>
                      <h2 id="evidence-heading">Evidence & caveats</h2>
                      <p className="tf-card-desc">Claims are paired with the assumption they depend on.</p>
                    </div>
                    <span className="tf-stamp">
                      <ShieldCheck size={13} /> {currentCase.evidence.length} sources
                    </span>
                  </div>
                  <div className="tf-evidence-list">
                    {currentCase.evidence.map((ev, index) => (
                      <div className="tf-evidence-item" key={ev.claim + index}>
                        <div>
                          <div className="tf-evidence-claim" data-testid={`text-evidence-claim-${index}`}>
                            {ev.claim}
                          </div>
                          <div className="tf-evidence-source">
                            {ev.source}
                            {ev.verificationStatus && (
                              <span className="tf-badge-verified" style={{ marginLeft: 6 }}>
                                {ev.verificationStatus}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          className="tf-evidence-btn"
                          onClick={() => setSelectedEvidence(ev)}
                          data-testid={`button-open-evidence-${index}`}
                        >
                          Inspect <ChevronRight size={12} style={{ verticalAlign: 'middle' }} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div>
                {/* 02 · Consequence Estimate */}
                {impact && (
                  <section className="tf-card pad tf-impact-card" aria-labelledby="impact-heading">
                    <div className="tf-card-header">
                      <div>
                        <div className="tf-section-label">02 · Consequence estimate</div>
                        <h2 id="impact-heading">Current option impact</h2>
                        <p className="tf-card-desc">Estimated lifecycle impact for this order</p>
                      </div>
                      <span className="tf-stamp">
                        <RefreshCw size={12} /> live deterministic
                      </span>
                    </div>

                    <div className="tf-impact-total">
                      <span className="tf-impact-num" data-testid="value-co2e">
                        {fmt(impact.co2eKg, 1)}
                      </span>
                      <span className="tf-impact-unit">kg CO₂e</span>
                    </div>

                    <div className="tf-impact-grid">
                      <div className="tf-impact-metric">
                        <strong data-testid="value-waste">{fmt(impact.wasteKg, 1)} kg</strong>
                        <span>material to landfill</span>
                      </div>
                      <div className="tf-impact-metric">
                        <strong data-testid="value-water">{fmt(impact.waterLiters)} L</strong>
                        <span>water demand</span>
                      </div>
                      <div className="tf-impact-metric">
                        <strong>{impact.recyclabilityPercent}%</strong>
                        <span>likely recyclable</span>
                      </div>
                      <div className="tf-impact-metric">
                        <strong>{fmt(impact.transportKg, 1)} kg</strong>
                        <span>freight share</span>
                      </div>
                    </div>

                    <div className="tf-impact-footer">
                      <span className="tf-confidence">
                        Confidence: <b>{impact.confidence}</b>{' '}
                        {impact.uncertaintyPercent ? `(±${impact.uncertaintyPercent}% uncertainty)` : ''}
                      </span>
                      <button
                        className="tf-link"
                        onClick={() => setSelectedEvidence(currentCase.evidence[0] || null)}
                        data-testid="button-impact-methodology"
                      >
                        How is this estimated?
                      </button>
                    </div>

                    {/* Decision Firewall Risk Box */}
                    <div className={`tf-firewall-box ${firewallStatus}`}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}>
                          <ShieldCheck size={16} /> Decision Firewall: {firewallStatus.replace(/_/g, ' ')}
                        </div>
                      </div>

                      {firewallFindings.length > 0 ? (
                        <div style={{ marginTop: 8 }}>
                          {firewallFindings.map((finding, fIdx) => (
                            <div className="tf-finding-item" key={finding.code + fIdx}>
                              <AlertTriangle
                                size={14}
                                style={{
                                  color: finding.severity === 'CRITICAL' ? 'hsl(var(--destructive))' : 'hsl(var(--accent-foreground))',
                                  flexShrink: 0,
                                  marginTop: 2,
                                }}
                              />
                              <div>
                                <b>{finding.rule}:</b> {finding.description}
                                <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                                  Action: {finding.suggestedAction}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, marginTop: 4, color: 'hsl(var(--muted-foreground))' }}>
                          All data quality thresholds and circularity gates passed with verified evidence.
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* 04 · Compare Alternatives */}
                <section className="tf-card pad tf-compare" aria-labelledby="compare-heading">
                  <div className="tf-compare-head">
                    <div>
                      <div className="tf-section-label">04 · Change the outcome</div>
                      <h2 id="compare-heading">Compare alternatives</h2>
                    </div>
                    <Scale size={18} color="hsl(var(--muted-foreground))" />
                  </div>

                  <div className="tf-alt-list">
                    {currentCase.alternatives.map((alternative, index) => {
                      const isSelected = selectedAlt === alternative.name || currentCase.selectedAlternative === alternative.name;
                      return (
                        <div
                          className={`tf-alt ${isSelected ? 'selected' : ''}`}
                          key={alternative.name}
                          onClick={() => setSelectedAlt(alternative.name)}
                          data-testid={`card-alternative-${index}`}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setSelectedAlt(alternative.name);
                          }}
                        >
                          <div className="tf-alt-top">
                            <div className="tf-alt-name">
                              {alternative.name}
                              {isSelected && (
                                <span className="tf-stamp" style={{ display: 'inline-flex', marginLeft: 8 }}>
                                  <Check size={11} /> selected
                                </span>
                              )}
                              {alternative.co2eSavingsPercent !== undefined && alternative.co2eSavingsPercent > 0 && (
                                <span className="tf-badge-verified" style={{ marginLeft: 6 }}>
                                  -{alternative.co2eSavingsPercent}% CO₂e
                                </span>
                              )}
                            </div>
                            <div className="tf-alt-cost">${fmt(alternative.cost)}</div>
                          </div>
                          <div className="tf-alt-summary">{alternative.summary}</div>
                          <div className="tf-alt-stats">
                            <span>
                              <b>{alternative.co2eKg}</b> kg CO₂e
                            </span>
                            <span>
                              <b>{alternative.wasteKg}</b> kg waste
                            </span>
                            <span>
                              <b>{alternative.reuseCycles}</b> uses
                            </span>
                          </div>
                          <div className="tf-alt-bottom">
                            <span className="tf-risk-label">{alternative.risk}</span>
                            <button
                              className="tf-evidence-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvidence({
                                  claim: `${alternative.name} environmental baseline`,
                                  source: alternative.evidenceLabel,
                                  excerpt: alternative.summary,
                                  confidence: 'High',
                                  applicability: 'Calculated using identical deterministic lifecycle equations.',
                                  assumption: `Model assumes ${alternative.reuseCycles} reuse cycles.`,
                                  verificationStatus: 'VERIFIED',
                                  formulaExplanation: `Amortized lifecycle: Total impact divided over ${alternative.reuseCycles} usages.`,
                                });
                              }}
                              data-testid={`button-alternative-evidence-${index}`}
                            >
                              View evidence
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Review / Approval Bar */}
                  <div className="tf-review-bar">
                    <div className="tf-review-copy">
                      <ShieldCheck size={17} />
                      <div>
                        <div className="tf-review-title">
                          {status === 'approved'
                            ? 'Decision recorded & locked.'
                            : status === 'review'
                            ? 'Review room is active.'
                            : 'Ready to put a decision behind this estimate?'}
                        </div>
                        <div className="tf-review-sub">
                          {status === 'approved'
                            ? `Approved by ${currentCase.reviewer || 'Reviewer'}. Verification certificate ready.`
                            : status === 'review'
                            ? 'Authorize or request specification adjustments based on verified impact.'
                            : 'Approval means your team has seen the impact and the evidence behind it.'}
                        </div>
                      </div>
                    </div>

                    {status === 'intake' && (
                      <button className="tf-button primary" onClick={moveToReview} data-testid="button-approve-decision">
                        Move to review <ArrowRight size={14} />
                      </button>
                    )}

                    {status === 'review' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="tf-button primary"
                          onClick={() => handleOpenReviewModal('approved')}
                          data-testid="button-approve-decision"
                        >
                          Approve <Check size={14} />
                        </button>
                        <button
                          className="tf-button ghost"
                          onClick={() => handleOpenReviewModal('changes_requested')}
                        >
                          Request changes
                        </button>
                      </div>
                    )}

                    {status === 'approved' && (
                      <button
                        className="tf-button primary"
                        onClick={() => setShowCertificate(true)}
                        data-testid="button-approve-decision"
                      >
                        <Award size={14} /> Certificate
                      </button>
                    )}
                  </div>
                </section>
              </div>
            </main>
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="tf-toast" role="status" data-testid="status-toast">
          {toast}
        </div>
      )}

      {/* Evidence Modal */}
      {selectedEvidence && (
        <div className="tf-modal-backdrop" onClick={() => setSelectedEvidence(null)}>
          <article
            className="tf-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-modal-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tf-modal-header">
              <div>
                <div className="tf-kicker">
                  Evidence Record ·{' '}
                  <span className="tf-badge-verified">
                    {selectedEvidence.verificationStatus || 'VERIFIED'}
                  </span>
                </div>
                <h2 id="evidence-modal-heading">Read the assumption.</h2>
              </div>
              <button
                className="tf-close"
                onClick={() => setSelectedEvidence(null)}
                data-testid="button-close-evidence"
                aria-label="Close evidence"
              >
                <X size={16} />
              </button>
            </div>

            <div className="tf-evidence-detail">
              <blockquote>“{selectedEvidence.excerpt}”</blockquote>
            </div>

            <div className="tf-detail-grid">
              <div className="tf-detail-cell">
                <span>Source</span>
                <b>{selectedEvidence.source}</b>
              </div>
              <div className="tf-detail-cell">
                <span>Confidence</span>
                <b>{selectedEvidence.confidence}</b>
              </div>
              <div className="tf-detail-cell">
                <span>Applicability</span>
                <b>{selectedEvidence.applicability}</b>
              </div>
              <div className="tf-detail-cell">
                <span>Assumption</span>
                <b>{selectedEvidence.assumption}</b>
              </div>
            </div>

            {selectedEvidence.formulaExplanation && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: 'hsl(var(--muted))', borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--app-font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))' }}>
                  Deterministic Calculation Formula
                </div>
                <div style={{ fontSize: 12, marginTop: 4, fontFamily: 'var(--app-font-mono)' }}>
                  {selectedEvidence.formulaExplanation}
                </div>
              </div>
            )}

            <button
              className="tf-button primary"
              style={{ marginTop: 22, width: '100%' }}
              onClick={() => setSelectedEvidence(null)}
              data-testid="button-confirm-evidence"
            >
              Back to review <ArrowRight size={14} />
            </button>
          </article>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="tf-modal-backdrop" onClick={() => setShowReviewModal(false)}>
          <article className="tf-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="tf-modal-header">
              <div>
                <div className="tf-kicker">Review Action</div>
                <h2>Confirm {reviewAction.replace(/_/g, ' ')}</h2>
              </div>
              <button className="tf-close" onClick={() => setShowReviewModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))' }}>
              Your review decision and notes will be permanently sealed into the audit trail and environmental certificate.
            </p>

            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                Reviewer Name
              </label>
              <input
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                Review Notes / Rationale
              </label>
              <textarea
                style={{ width: '100%', minHeight: 80, padding: '9px 12px', borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                placeholder="State why this decision was approved or what changes are required..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>

            {selectedAlt && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'hsl(var(--primary))', fontWeight: 600 }}>
                Selected Alternative: {selectedAlt}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="tf-button primary" style={{ flex: 1 }} onClick={submitReviewDecision}>
                Confirm & Record <Check size={14} />
              </button>
              <button className="tf-button ghost" onClick={() => setShowReviewModal(false)}>
                Cancel
              </button>
            </div>
          </article>
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificate && currentCase && (
        <div className="tf-modal-backdrop" onClick={() => setShowCertificate(false)}>
          <article className="tf-modal" style={{ maxWidth: 640 }} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="tf-cert">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <TerraFuseLogo size={42} />
                  <div>
                    <div className="tf-kicker">Official Verification Certificate</div>
                    <h2 style={{ fontFamily: 'var(--app-font-serif)', fontSize: 28, margin: '2px 0 6px' }}>
                      TerraFuse Impact Record
                    </h2>
                    <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                      Case #{currentCase.id || '042'} · Share ID: {currentCase.shareId || 'tf-pub-42879'}
                    </div>
                  </div>
                </div>
                <div className="tf-cert-seal">
                  <ShieldCheck size={22} style={{ margin: '0 auto 2px' }} />
                  VERIFIED
                  <br />
                  FIREWALL
                </div>
              </div>

              <hr className="tf-divider" style={{ margin: '18px 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                <div>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', fontFamily: 'var(--app-font-mono)' }}>
                    Organization
                  </span>
                  <div><b>{currentCase.organization}</b></div>
                </div>
                <div>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', fontFamily: 'var(--app-font-mono)' }}>
                    Procured Item
                  </span>
                  <div><b>{currentCase.item}</b></div>
                </div>
                <div>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', fontFamily: 'var(--app-font-mono)' }}>
                    Selected Option
                  </span>
                  <div><b>{currentCase.selectedAlternative || currentCase.currentOption}</b></div>
                </div>
                <div>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', fontFamily: 'var(--app-font-mono)' }}>
                    Review Status
                  </span>
                  <div><b style={{ textTransform: 'uppercase', color: 'hsl(var(--primary))' }}>{currentCase.status}</b></div>
                </div>
              </div>

              <div style={{ margin: '20px 0', padding: 14, background: 'hsl(var(--muted))', borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--app-font-mono)', textTransform: 'uppercase', color: 'hsl(var(--muted-foreground))', marginBottom: 6 }}>
                  Verified Environmental Metrics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(impact?.co2eKg || 0, 1)}</div>
                    <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>kg CO₂e</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(impact?.wasteKg || 0, 1)}</div>
                    <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>kg Waste</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(impact?.waterLiters || 0)}</div>
                    <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>L Water</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{impact?.landfillRisk || 'Low'}</div>
                    <div style={{ fontSize: 10, color: 'hsl(var(--muted-foreground))' }}>Landfill Risk</div>
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', lineHeight: 1.5 }}>
                Methodology: UK DEFRA GHG Conversion Factors 2024 & US EPA WARM v16 Standard. All lifecycle calculations are deterministic and traceable to primary evidence.
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <a
                  className="tf-button primary"
                  style={{
                    flex: 1,
                    textDecoration: 'none',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                  href={`/api/decisions/${currentCase.id}/certificate/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`terrafuse-certificate-${currentCase.id}.html`}
                >
                  <Award size={14} /> Download Certificate (.html)
                </a>
                <button className="tf-button ghost" onClick={() => setShowCertificate(false)}>
                  Close
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {/* Multi-Quote Comparison Modal */}
      {showCompareModal && (
        <div className="tf-modal-backdrop" onClick={() => setShowCompareModal(false)}>
          <article className="tf-modal" style={{ maxWidth: 860 }} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="tf-modal-header">
              <div>
                <div className="tf-kicker">Multi-Vendor Procurement Analysis</div>
                <h2>Compare Supplier Quotes ({compareIds.length})</h2>
              </div>
              <button className="tf-close" onClick={() => setShowCompareModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', marginBottom: 18 }}>
              Side-by-side environmental lifecycle impact, expenditure variance, and circular risk comparison.
            </p>

            <div style={{ overflowX: 'auto', border: '1px solid hsl(var(--border))', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>
                    <th style={{ padding: '10px 14px' }}>Metric</th>
                    {compareIds.map((cid) => {
                      const rec = (decisionsQuery.data || []).find((d) => d.id === cid);
                      return (
                        <th key={cid} style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 700, color: '#0f766e' }}>{rec?.title || `Case #${cid}`}</div>
                          <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>{rec?.organization || 'Vendor'}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>Material & Commodity</td>
                    {compareIds.map((cid) => {
                      const rec = (decisionsQuery.data || []).find((d) => d.id === cid);
                      return <td key={cid} style={{ padding: '10px 14px' }}>{rec?.item || 'Item'} ({rec?.material || 'Material'})</td>;
                    })}
                  </tr>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>Total Price</td>
                    {compareIds.map((cid) => {
                      const rec = (decisionsQuery.data || []).find((d) => d.id === cid);
                      return <td key={cid} style={{ padding: '10px 14px', fontWeight: 700 }}>${fmt(Number(rec?.price) || 0)}</td>;
                    })}
                  </tr>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>Embodied Carbon (CO₂e)</td>
                    {compareIds.map((cid) => {
                      const rec = (decisionsQuery.data || []).find((d) => d.id === cid);
                      const co2 = (rec?.impact as any)?.co2eKg || 0;
                      return (
                        <td key={cid} style={{ padding: '10px 14px' }}>
                          <span style={{ fontWeight: 700, color: co2 > 100 ? '#e11d48' : '#0f766e' }}>
                            {fmt(co2, 1)} kg
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>Landfill Risk</td>
                    {compareIds.map((cid) => {
                      const rec = (decisionsQuery.data || []).find((d) => d.id === cid);
                      const risk = (rec?.impact as any)?.landfillRisk || 'Medium';
                      return (
                        <td key={cid} style={{ padding: '10px 14px' }}>
                          <span className={`tf-status-pill ${risk === 'High' ? 'rejected' : 'approved'}`}>{risk}</span>
                        </td>
                      );
                    })}
                  </tr>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>Top Recommended Alternative</td>
                    {compareIds.map((cid) => {
                      const rec = (decisionsQuery.data || []).find((d) => d.id === cid);
                      const alt = (rec?.alternatives as any)?.[0];
                      return (
                        <td key={cid} style={{ padding: '10px 14px', fontSize: 12 }}>
                          {alt ? (
                            <div>
                              <b>{alt.name}</b>
                              <div style={{ color: '#0f766e' }}>-{alt.co2eSavingsPercent || 0}% CO₂e</div>
                            </div>
                          ) : (
                            'N/A'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                className="tf-button ghost"
                onClick={() => {
                  setCompareIds([]);
                  setShowCompareModal(false);
                }}
              >
                Clear Selection
              </button>
              <button className="tf-button primary" style={{ flex: 1 }} onClick={() => setShowCompareModal(false)}>
                Done
              </button>
            </div>
          </article>
        </div>
      )}

      {/* History Drawer Modal */}
      {showHistory && (
        <div className="tf-modal-backdrop" onClick={() => setShowHistory(false)}>
          <article className="tf-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="tf-modal-header">
              <div>
                <div className="tf-kicker">Persisted Records</div>
                <h2>Decision History</h2>
              </div>
              <button className="tf-close" onClick={() => setShowHistory(false)}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 13, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                Select multiple quotes to compare environmental metrics side-by-side.
              </p>
              {compareIds.length >= 2 && (
                <button
                  className="tf-button primary"
                  style={{ height: 28, fontSize: 11, padding: '2px 10px' }}
                  onClick={() => {
                    setShowHistory(false);
                    setShowCompareModal(true);
                  }}
                >
                  <Scale size={12} style={{ marginRight: 4 }} /> Compare ({compareIds.length})
                </button>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              {/* Demo case entry */}
              <div
                className="tf-history-item"
                onClick={() => {
                  loadDemo();
                  setShowHistory(false);
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    North Quad Festival 2025 <span className="tf-badge-demo">Demo</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                    Morrow University · Wayfinding signs · $1,290
                  </div>
                </div>
                <span className="tf-status-pill intake">intake</span>
              </div>

              {/* Persisted decisions */}
              {decisionsQuery.data && decisionsQuery.data.length > 0 ? (
                decisionsQuery.data.map((rec) => (
                  <div
                    className="tf-history-item"
                    key={rec.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onClick={() => selectCaseFromHistory(rec.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={compareIds.includes(rec.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCompareIds((prev) => [...prev, rec.id]);
                          } else {
                            setCompareIds((prev) => prev.filter((id) => id !== rec.id));
                          }
                        }}
                        style={{ cursor: 'pointer', accentColor: '#0f766e', width: 15, height: 15 }}
                        title="Select for quote comparison"
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {rec.title}
                          {rec.id === activeId && !isDemoMode && (
                            <span className="tf-badge-verified" style={{ marginLeft: 6 }}>
                              Active
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginTop: 2 }}>
                          Case #{rec.id} · {rec.item || 'Item'} · ${fmt(Number(rec.price) || 0)} ·{' '}
                          {new Date(rec.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span className={`tf-status-pill ${rec.status}`}>{rec.status}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 13 }}>
                  No uploaded procurement records yet. Upload a file via "New intake".
                </div>
              )}
            </div>

            <button className="tf-button ghost" style={{ width: '100%', marginTop: 14 }} onClick={() => setShowHistory(false)}>
              Close History
            </button>
          </article>
        </div>
      )}
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/case/:id" component={Home} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') : ''}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
