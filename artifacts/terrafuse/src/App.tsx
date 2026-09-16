import { type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FileUp, Leaf, ArrowRight, Check, ChevronRight, CircleHelp, Database, ExternalLink, FlaskConical, Info, Landmark, RefreshCw, Scale, ShieldCheck, SlidersHorizontal, Sparkles, Truck, Upload, X, AlertTriangle } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Status = 'intake' | 'review' | 'approved';
type Evidence = { claim: string; source: string; excerpt: string; confidence: string; applicability: string; assumption: string };
type Alternative = { name: string; summary: string; cost: number; co2eKg: number; wasteKg: number; waterLiters: number; reuseCycles: number; risk: string; evidenceLabel: string };
type DecisionCase = {
  id: string; title: string; organization: string; item: string; material: string; quantity: number;
  price: number; location: string; useCase: string; currentOption: string; alternatives: Alternative[];
  assumptions: { quantity: number; reuseCycles: number; transportDistance: number };
  evidence: Evidence[]; status: Status;
};
type Impact = { co2eKg: number; wasteKg: number; waterLiters: number; recyclabilityPercent: number; landfillRisk: string; transportKg: number; confidence: string };

const demoCase: DecisionCase = {
  id: 'tf-042', title: 'North Quad Festival 2025', organization: 'Morrow University · Events Committee',
  item: 'Wayfinding signs', material: 'PVC banner vinyl', quantity: 86, price: 1290, location: 'Morrow University, Oregon',
  useCase: 'Outdoor wayfinding across a three-day student festival', currentOption: 'Single-use printed vinyl',
  assumptions: { quantity: 86, reuseCycles: 1, transportDistance: 412 }, status: 'intake',
  alternatives: [
    { name: 'Aluminum composite', summary: 'Durable panels that can return to the campus sign shop for future events.', cost: 1715, co2eKg: 74, wasteKg: 1.8, waterLiters: 468, reuseCycles: 8, risk: 'Lower landfill risk', evidenceLabel: 'Campus sign shop quote' },
    { name: 'Recycled cardboard', summary: 'Short-run fiber panels with a lighter footprint and straightforward recycling.', cost: 1032, co2eKg: 89, wasteKg: 4.4, waterLiters: 312, reuseCycles: 2, risk: 'Moderate water use', evidenceLabel: 'Supplier EPD · 2024' },
    { name: 'Rental fabric system', summary: 'Printed fabric sleeves on rented frames; return shipment included.', cost: 1480, co2eKg: 51, wasteKg: 0.9, waterLiters: 540, reuseCycles: 12, risk: 'Lowest material risk', evidenceLabel: 'Rental partner terms' },
  ],
  evidence: [
    { claim: 'PVC banner vinyl is rarely accepted in local curbside recycling.', source: 'Oregon DEQ · Materials Recovery Review, 2023', excerpt: 'Flexible PVC film is commonly sorted as residual material due to contamination and limited end-market demand.', confidence: 'High', applicability: 'Applies to post-event banners in Morrow County.', assumption: 'Landfill risk uses local recovery guidance as a proxy for disposal route.' },
    { claim: 'Reusable sign systems reduce manufacturing impact after the second event.', source: 'Campus sign shop · Internal reuse log', excerpt: 'Aluminum panels in the shop inventory have circulated between 6 and 11 events.', confidence: 'Medium', applicability: 'Comparable to 2025 festival dimensions.', assumption: 'Panels are stored indoors and not redesigned between uses.' },
    { claim: 'Transport contributes a small but visible share of the current option.', source: 'Supplier freight estimate · 2025 quote', excerpt: 'Ground freight from Portland to Morrow University is estimated at 412 km for this order.', confidence: 'Medium', applicability: 'Specific to the current supplier quote.', assumption: 'One consolidated shipment; no expedited freight.' },
  ],
};

function calculateImpact(item: DecisionCase): Impact {
  const { quantity, reuseCycles, transportDistance } = item.assumptions;
  const cycleFactor = Math.max(0.22, 1 / Math.max(1, reuseCycles));
  const co2eKg = quantity * (1.54 * cycleFactor + transportDistance * 0.00036);
  const wasteKg = quantity * 0.11 * cycleFactor;
  const waterLiters = quantity * 4.7 * cycleFactor;
  const transportKg = quantity * transportDistance * 0.00036;
  const confidence = reuseCycles > 1 ? 'Medium-high' : 'Medium';
  return { co2eKg, wasteKg, waterLiters, recyclabilityPercent: 8, landfillRisk: reuseCycles > 1 ? 'Medium' : 'High', transportKg, confidence };
}

const fmt = (n: number, digits = 0) => n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });

function Home() {
  const [caseFile, setCaseFile] = useState<DecisionCase | null>(demoCase);
  const [status, setStatus] = useState<Status>('intake');
  const [intakeMode, setIntakeMode] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [selectedAlt, setSelectedAlt] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(false);

  const impact = useMemo(() => caseFile ? calculateImpact(caseFile) : null, [caseFile]);
  const changed = Boolean(caseFile && (caseFile.assumptions.quantity !== demoCase.assumptions.quantity || caseFile.assumptions.reuseCycles !== demoCase.assumptions.reuseCycles || caseFile.assumptions.transportDistance !== demoCase.assumptions.transportDistance));

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800); };
  const loadDemo = () => { setLoading(true); window.setTimeout(() => { setCaseFile(demoCase); setStatus('intake'); setIntakeMode(false); setLoading(false); notify('Demo case loaded — assumptions are ready to inspect.'); }, 360); };
  const updateAssumption = (key: keyof DecisionCase['assumptions'], value: number) => {
    if (!caseFile) return;
    setCaseFile({ ...caseFile, assumptions: { ...caseFile.assumptions, [key]: Math.max(0, value) } });
    if (status === 'approved') setStatus('review');
  };
  const resetAssumptions = () => { if (caseFile) setCaseFile({ ...caseFile, assumptions: { ...demoCase.assumptions } }); notify('Assumptions reset to supplier quote.'); };
  const moveToReview = () => { setStatus('review'); notify('Review packet prepared — compare before approving.'); };
  const approve = () => { setStatus('approved'); notify('Decision approved with assumptions recorded.'); };
  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.[0]) return;
    setLoading(true);
    window.setTimeout(() => { setLoading(false); setIntakeMode(false); setCaseFile({ ...demoCase, title: event.target.files![0].name.replace(/\.[^/.]+$/, ''), status: 'intake' }); notify('Intake staged. Review the extracted assumptions below.'); }, 550);
  };

  return (
    <div className="tf-app">
      <div className="tf-shell">
        <header className="tf-topbar">
          <button className="tf-brand" onClick={() => { setIntakeMode(false); setCaseFile(demoCase); }} data-testid="button-brand-home" aria-label="TerraFuse home">
            <span className="tf-mark" aria-hidden="true"><Leaf size={15} /></span><span className="tf-wordmark">terra<span>fuse</span></span>
          </button>
          <nav className="tf-nav" aria-label="Primary">
            <button className={!intakeMode ? 'active' : ''} onClick={() => { setIntakeMode(false); if (!caseFile) loadDemo(); }} data-testid="button-nav-review">Review room</button>
            <button className={intakeMode ? 'active' : ''} onClick={() => setIntakeMode(true)} data-testid="button-nav-new">New intake</button>
          </nav>
          <div className="tf-help"><span className="tf-help-dot" /> local review mode <CircleHelp size={15} /></div>
        </header>

        {intakeMode ? (
          <section className="tf-empty" aria-label="New procurement intake">
            <div className="tf-empty-icon"><Upload size={25} /></div>
            <div className="tf-kicker">Start a decision record</div>
            <h1>Put a purchase<br /><em>under review.</em></h1>
            <p>Upload a quote, brief, or product sheet. TerraFuse turns the assumptions inside it into a reviewable environmental consequence.</p>
            <div className="tf-intake-actions">
              <label className="tf-button primary tf-file" data-testid="label-upload-intake"><FileUp size={15} /> Upload procurement file<input data-testid="input-upload-file" type="file" accept=".pdf,.csv,.xlsx,.docx,.txt" onChange={onFile} /></label>
              <button className="tf-button ghost" onClick={loadDemo} data-testid="button-load-demo"><Sparkles size={15} /> Use festival demo</button>
            </div>
            <div className="tf-status-line" style={{ justifyContent: 'center' }}><ShieldCheck size={14} /> Nothing leaves this browser in demo mode</div>
          </section>
        ) : loading ? (
          <div className="tf-loading" data-testid="status-loading"><div><div className="tf-skeleton" style={{ width: 180, height: 13, marginBottom: 10 }} /><div className="tf-skeleton" style={{ width: 290, height: 9 }} /></div></div>
        ) : !caseFile ? (
          <section className="tf-empty"><div className="tf-empty-icon"><Database size={25} /></div><div className="tf-kicker">No active case</div><h1>Nothing is approved<br /><em>by default.</em></h1><p>Bring in a procurement brief or open the festival case to see the review room in action.</p><div className="tf-intake-actions"><button className="tf-button primary" onClick={loadDemo} data-testid="button-empty-demo">Open festival case <ArrowRight size={15} /></button></div></section>
        ) : (
          <>
            <section className="tf-intro">
              <div><div className="tf-kicker">Environmental decision firewall · Case {caseFile.id}</div><h1 className="tf-title">Make the hidden<br /><em>impact visible.</em></h1><p className="tf-intro-copy">A calm review room for purchases that deserve more than a price check. Change an assumption, see the consequence, then approve with your eyes open.</p><div className="tf-status-line"><span className={`tf-status-pill ${status}`}>{status === 'approved' ? <Check size={12} /> : status === 'review' ? <SlidersHorizontal size={12} /> : <FlaskConical size={12} />}{status === 'approved' ? 'Approved' : status === 'review' ? 'In review' : 'Needs review'}</span><span>{status === 'approved' ? 'Decision record is complete' : 'Last recalculated just now'}</span></div></div>
              <button className="tf-button primary" onClick={() => status === 'intake' ? moveToReview() : approve()} data-testid="button-primary-progress">{status === 'approved' ? <Check size={16} /> : <ArrowRight size={16} />}{status === 'intake' ? 'Start review' : status === 'review' ? 'Approve decision' : 'Approved'}</button>
            </section>

            <div className="tf-casebar">
              <div className="tf-case-meta"><div className="tf-case-icon"><Landmark size={19} /></div><div><div className="tf-case-title" data-testid="text-case-title">{caseFile.title}</div><div className="tf-case-sub">{caseFile.organization} · {caseFile.item} · ${fmt(caseFile.price)}</div></div></div>
              <div className="tf-case-actions"><button className="tf-button ghost" onClick={() => setIntakeMode(true)} data-testid="button-switch-case"><Upload size={13} /> Switch case</button><button className="tf-button ghost" onClick={() => notify('A local decision summary is ready to share.')} data-testid="button-share-summary"><ExternalLink size={13} /> Share summary</button></div>
            </div>

            <div className="tf-stepper" aria-label="Decision progress">
              {(['intake', 'review', 'approved'] as Status[]).map((step, i) => <div className={`tf-step ${status === step ? 'active' : ''} ${(['intake', 'review', 'approved'].indexOf(status) > i) ? 'done' : ''}`} key={step}><span className="tf-step-number">{(['intake', 'review', 'approved'].indexOf(status) > i) ? <Check size={12} /> : i + 1}</span><span>{step === 'intake' ? 'Assumptions' : step === 'review' ? 'Compare options' : 'Approval'}</span></div>)}
            </div>

            <main className="tf-grid">
              <div>
                <section className="tf-card pad" aria-labelledby="assumption-heading">
                  <div className="tf-card-header"><div><div className="tf-section-label">01 · What we believe</div><h2 id="assumption-heading">Assumptions behind this purchase</h2><p className="tf-card-desc">Small changes here can move the recommendation. Keep the inputs honest.</p></div><span className="tf-stamp"><Database size={13} /> quote inputs</span></div>
                  <div className="tf-assumptions">
                    <div className="tf-input-row"><div><div className="tf-input-label">Units ordered</div><div className="tf-input-help">Printed sign panels for event sites</div></div><div className="tf-input-wrap"><input className="tf-number" type="number" min="1" value={caseFile.assumptions.quantity} onChange={(e) => updateAssumption('quantity', Number(e.target.value))} data-testid="input-quantity" /><span className="tf-unit">units</span>{caseFile.assumptions.quantity !== demoCase.assumptions.quantity && <span className="tf-changed">changed</span>}</div></div>
                    <div className="tf-input-row"><div><div className="tf-input-label">Reuse cycles</div><div className="tf-input-help">How many events before replacement</div></div><div className="tf-input-wrap"><input className="tf-number" type="number" min="1" value={caseFile.assumptions.reuseCycles} onChange={(e) => updateAssumption('reuseCycles', Number(e.target.value))} data-testid="input-reuse-cycles" /><span className="tf-unit">events</span>{caseFile.assumptions.reuseCycles !== demoCase.assumptions.reuseCycles && <span className="tf-changed">changed</span>}</div></div>
                    <div className="tf-input-row"><div><div className="tf-input-label">Supplier distance</div><div className="tf-input-help">One-way ground freight estimate</div></div><div className="tf-input-wrap"><input className="tf-number" type="number" min="0" value={caseFile.assumptions.transportDistance} onChange={(e) => updateAssumption('transportDistance', Number(e.target.value))} data-testid="input-transport-distance" /><span className="tf-unit">km</span>{caseFile.assumptions.transportDistance !== demoCase.assumptions.transportDistance && <span className="tf-changed">changed</span>}</div></div>
                  </div>
                  {changed && <div className="tf-change-note" data-testid="status-changed-assumptions"><Info size={15} /><span><b>Estimate changed.</b> The impact card is live-calculated from your assumptions, not a locked score.</span><button className="tf-link" onClick={resetAssumptions} data-testid="button-reset-assumptions">Reset</button></div>}
                  <hr className="tf-divider" />
                  <div className="tf-card-header" style={{ marginBottom: 0 }}><div><div className="tf-section-label">Context</div><h3>{caseFile.currentOption}</h3><p className="tf-card-desc">{caseFile.useCase} · {caseFile.material}</p></div><Truck size={18} color="hsl(var(--muted-foreground))" /></div>
                </section>

                <section className="tf-card pad tf-evidence" aria-labelledby="evidence-heading">
                  <div className="tf-card-header"><div><div className="tf-section-label">03 · Show your work</div><h2 id="evidence-heading">Evidence & caveats</h2><p className="tf-card-desc">Claims are paired with the assumption they depend on.</p></div><span className="tf-stamp"><ShieldCheck size={13} /> {caseFile.evidence.length} sources</span></div>
                  <div className="tf-evidence-list">{caseFile.evidence.map((evidence, index) => <div className="tf-evidence-item" key={evidence.claim}><div><div className="tf-evidence-claim" data-testid={`text-evidence-claim-${index}`}>{evidence.claim}</div><div className="tf-evidence-source">{evidence.source}</div></div><button className="tf-evidence-btn" onClick={() => setSelectedEvidence(evidence)} data-testid={`button-open-evidence-${index}`}>Inspect <ChevronRight size={12} style={{ verticalAlign: 'middle' }} /></button></div>)}</div>
                </section>
              </div>

              <div>
                {impact && <section className="tf-card pad tf-impact-card" aria-labelledby="impact-heading">
                  <div className="tf-card-header"><div><div className="tf-section-label">02 · Consequence estimate</div><h2 id="impact-heading">Current option impact</h2><p className="tf-card-desc">Estimated lifecycle impact for this order</p></div><span className="tf-stamp"><RefreshCw size={12} /> live</span></div>
                  <div className="tf-impact-total"><span className="tf-impact-num" data-testid="value-co2e">{fmt(impact.co2eKg, 1)}</span><span className="tf-impact-unit">kg CO₂e</span></div>
                  <div className="tf-impact-grid"><div className="tf-impact-metric"><strong data-testid="value-waste">{fmt(impact.wasteKg, 1)} kg</strong><span>material to landfill</span></div><div className="tf-impact-metric"><strong data-testid="value-water">{fmt(impact.waterLiters)} L</strong><span>water demand</span></div><div className="tf-impact-metric"><strong>{impact.recyclabilityPercent}%</strong><span>likely recyclable</span></div><div className="tf-impact-metric"><strong>{fmt(impact.transportKg, 1)} kg</strong><span>freight share</span></div></div>
                  <div className="tf-impact-footer"><span className="tf-confidence">Confidence: <b>{impact.confidence}</b></span><button className="tf-link" onClick={() => setSelectedEvidence(caseFile.evidence[0])} data-testid="button-impact-methodology">How is this estimated?</button></div>
                  <div className="tf-risk"><AlertTriangle className="tf-risk-icon" size={18} /><div><div className="tf-risk-title">{impact.landfillRisk} landfill risk</div><div className="tf-risk-copy">PVC film has a limited end market in the destination county.</div></div></div>
                </section>}

                <section className="tf-card pad tf-compare" aria-labelledby="compare-heading">
                  <div className="tf-compare-head"><div><div className="tf-section-label">04 · Change the outcome</div><h2 id="compare-heading">Compare alternatives</h2></div><Scale size={18} color="hsl(var(--muted-foreground))" /></div>
                  <div className="tf-alt-list">{caseFile.alternatives.map((alternative, index) => <div className={`tf-alt ${selectedAlt === alternative.name ? 'selected' : ''}`} key={alternative.name} onClick={() => setSelectedAlt(alternative.name)} data-testid={`card-alternative-${index}`} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setSelectedAlt(alternative.name); }}><div className="tf-alt-top"><div className="tf-alt-name">{alternative.name}{selectedAlt === alternative.name && <span className="tf-stamp" style={{ display: 'inline-flex', marginLeft: 8 }}><Check size={11} /> selected</span>}</div><div className="tf-alt-cost">${fmt(alternative.cost)}</div></div><div className="tf-alt-summary">{alternative.summary}</div><div className="tf-alt-stats"><span><b>{alternative.co2eKg}</b> kg CO₂e</span><span><b>{alternative.wasteKg}</b> kg waste</span><span><b>{alternative.reuseCycles}</b> uses</span></div><div className="tf-alt-bottom"><span className="tf-risk-label">{alternative.risk}</span><button className="tf-evidence-btn" onClick={(e) => { e.stopPropagation(); setSelectedEvidence({ claim: `${alternative.name} evidence`, source: alternative.evidenceLabel, excerpt: alternative.summary, confidence: 'Medium', applicability: 'Comparable to the current event brief.', assumption: `Estimate assumes ${alternative.reuseCycles} reuse cycles.` }); }} data-testid={`button-alternative-evidence-${index}`}>View evidence</button></div></div>)}</div>
                  <div className="tf-review-bar"><div className="tf-review-copy"><ShieldCheck size={17} /><div><div className="tf-review-title">{status === 'approved' ? 'Decision recorded.' : 'Ready to put a decision behind this estimate?'}</div><div className="tf-review-sub">{status === 'approved' ? 'The assumptions and selected option are preserved in this local review.' : 'Approval means your team has seen the impact and the evidence behind it.'}</div></div></div><button className="tf-button primary" onClick={status === 'intake' ? moveToReview : approve} disabled={status === 'approved'} data-testid="button-approve-decision">{status === 'approved' ? <><Check size={14} /> Approved</> : <>{status === 'intake' ? 'Move to review' : 'Approve with assumptions'} <ArrowRight size={14} /></>}</button></div>
                </section>
              </div>
            </main>
          </>
        )}
      </div>
      {toast && <div className="tf-toast" role="status" data-testid="status-toast">{toast}</div>}
      {selectedEvidence && <div className="tf-modal-backdrop" onClick={() => setSelectedEvidence(null)}><article className="tf-modal" role="dialog" aria-modal="true" aria-labelledby="evidence-modal-heading" onClick={(e) => e.stopPropagation()}><div className="tf-modal-header"><div><div className="tf-kicker">Evidence record</div><h2 id="evidence-modal-heading">Read the assumption.</h2></div><button className="tf-close" onClick={() => setSelectedEvidence(null)} data-testid="button-close-evidence" aria-label="Close evidence"><X size={16} /></button></div><div className="tf-evidence-detail"><blockquote>“{selectedEvidence.excerpt}”</blockquote></div><div className="tf-detail-grid"><div className="tf-detail-cell"><span>Source</span><b>{selectedEvidence.source}</b></div><div className="tf-detail-cell"><span>Confidence</span><b>{selectedEvidence.confidence}</b></div><div className="tf-detail-cell"><span>Applicability</span><b>{selectedEvidence.applicability}</b></div><div className="tf-detail-cell"><span>Assumption</span><b>{selectedEvidence.assumption}</b></div></div><button className="tf-button primary" style={{ marginTop: 22, width: '100%' }} onClick={() => setSelectedEvidence(null)} data-testid="button-confirm-evidence">Back to review <ArrowRight size={14} /></button></article></div>}
    </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
