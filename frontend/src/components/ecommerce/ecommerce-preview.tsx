"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowLeft, ArrowRight, Check, ChevronRight, Clock3, Database,
  FlaskConical, Layers3, LockKeyhole, LogIn, Plus, Search, ShieldCheck, Store, Trash2, Pencil,
} from "lucide-react";
import type { ApiAnalysisStatus, ApiWorkflow, WorkflowDraft } from "@/lib/api";
import {
  addPreviewWorkflow, addPreviewWorkspace, createPreviewState,
  deletePreviewWorkflow, editPreviewWorkflow, loadPreviewExamples, selectPreviewWorkspace,
} from "@/lib/ecommerce/preview";
import type { PreviewState } from "@/lib/ecommerce/preview";
import { addLocalMeasurement, saveLocalScenario } from "@/lib/ecommerce/results";
import { Modal, number } from "../ui";
import { PreviewWorkflowForm, PreviewWorkspaceForm } from "./ecommerce-forms";
import { WorkflowResults } from "./workflow-results";
import { FixtureReportView, ResultsOverview } from "./results-overview";
import styles from "./ecommerce-preview.module.css";

const statusLabels: Record<ApiAnalysisStatus, string> = {
  not_analyzed: "Not analyzed", analyzed: "Analysis recorded", needs_reanalysis: "Needs reanalysis",
};
export default function EcommercePreview() {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ApiAnalysisStatus | "all">("all");
  const [editor, setEditor] = useState<ApiWorkflow | "new" | null>(null);
  const [workspaceForm, setWorkspaceForm] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ApiWorkflow | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [view, setView] = useState<"workflows" | "overview">("workflows");
  const [report, setReport] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      try { setPreview(createPreviewState()); }
      catch { setLoadError("The development fixtures could not be initialized. Try loading the preview again."); }
    }, 0);
    return () => clearTimeout(timer);
  }, [attempt]);

  function apply(update: (state: PreviewState) => PreviewState, message: string) {
    if (!preview) return;
    setPreview(update(preview));
    setNotice(message);
    setActionError("");
  }
  function perform(update: (state: PreviewState) => PreviewState, message: string) {
    try { apply(update, message); }
    catch { setActionError("The preview could not complete that change. Select a workspace and try again."); }
  }
  const workspace = preview?.workspaces.find((item) => item.id === preview.selectedWorkspaceId);
  const workflows = preview?.workflows.filter((item) => item.workspace_id === workspace?.id) ?? [];
  const visible = workflows.filter((item) =>
    (filter === "all" || filter === item.analysis_status) &&
    `${item.name} ${item.description} ${item.current_tools} ${item.pain_points}`.toLowerCase().includes(search.toLowerCase()));
  const baseline = workflows.reduce((total, item) => total + item.hours_per_occurrence * item.occurrences_per_month, 0);
  const current = workflows.find((item) => item.id === detail);
  const examplesLoaded = !!preview?.exampleWorkspaceIds.includes(preview.selectedWorkspaceId);
  const switchWorkspace = (id: string) => {
    perform((state) => selectPreviewWorkspace(state, id), "Preview workspace selected.");
    setSearch(""); setFilter("all"); setDetail(null); setEditor(null); setDeleting(null);
  };

  return <div className={styles.preview}>
    <a href="#store-main" className={styles.skip}>Skip to store workflows</a>
    <aside className={styles.sidebar} aria-label="Preview workspace navigation">
      <Link className={styles.brand} href="/ecommerce" aria-label="Gainvera e-commerce preview"><Activity aria-hidden="true" />gainvera<span>.</span></Link>
      <div className={styles.sidebarLabel}>STORE WORKSPACE</div>
      <div className={styles.workspacePicker}>
        <Store size={19} aria-hidden="true" />
        <div><label htmlFor="store-workspace">Selected preview workspace</label>
          <select id="store-workspace" value={workspace?.id ?? ""} disabled={!preview} onChange={(e) => switchWorkspace(e.target.value)}>
            {!preview && <option value="">Loading workspace…</option>}
            {preview?.workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select><small>Fixture workspace · USD</small>
        </div>
      </div>
      <button className={styles.addWorkspace} disabled={!preview} onClick={() => setWorkspaceForm(true)}><Plus size={16} aria-hidden="true" />Create preview workspace</button>
      <nav className={styles.navigation} aria-label="Preview navigation">
        <Link href="/ecommerce/account"><LogIn size={18} aria-hidden="true" />Real account workspace</Link>
        <button className={view === "workflows" ? styles.activeNav : undefined} aria-current={view === "workflows" ? "page" : undefined} onClick={() => setView("workflows")}><Layers3 size={18} aria-hidden="true" />Workflows<span>{workflows.length}</span></button>
        <button className={view === "overview" ? styles.activeNav : undefined} aria-current={view === "overview" ? "page" : undefined} onClick={() => setView("overview")}><Clock3 size={18} aria-hidden="true" />Scenario & result overview</button>
        <button onClick={() => setSignIn(true)}><LogIn size={18} aria-hidden="true" />Sign-in & session</button>
        <Link href="/"><ArrowLeft size={18} aria-hidden="true" />Agency demo</Link>
      </nav>
      <div className={styles.sidebarNote}><FlaskConical size={21} aria-hidden="true" /><strong>A place to try the flow.</strong>
        <p>All records are development fixtures. Edits stay in memory; leaving or reloading this preview discards them.</p>
      </div>
      <div className={styles.session}><span className={styles.sessionDot} /><div><strong>Not signed in</strong><small>No authenticated session</small></div></div>
    </aside>
    <div className={styles.mainShell}>
      <header className={styles.topbar}><div><span>E-commerce preview</span><ChevronRight size={14} aria-hidden="true" /><strong>{view === "workflows" ? "Workflows" : "Overview"}</strong></div>
        <button className={styles.signIn} onClick={() => setSignIn(true)}><LogIn size={16} aria-hidden="true" />Sign in</button>
      </header>
      <main id="store-main" className={styles.main}>
        <div className={styles.fixtureBanner}><FlaskConical size={18} aria-hidden="true" /><div><strong>DEVELOPMENT FIXTURES</strong><span>Fictional data · no cloud saves · no ML or AI results</span></div><span className={styles.unsaved}>Session only</span></div>
        <div className={styles.hero}><div><div className={styles.eyebrow}>A LITTLE CLARITY GOES A LONG WAY</div><h1>Make sense of your<br className={styles.desktopBreak} /> store’s everyday work.</h1><p>Start with what repeats. Capture the facts before choosing an improvement.</p></div>
          <div className={styles.heroActions}><button className={styles.secondary} disabled={!preview} onClick={() => setReport(true)}>Preview report</button><button className={styles.primary} disabled={!preview} onClick={() => setEditor("new")}><Plus size={18} aria-hidden="true" />Add workflow</button></div>
        </div>
        <div role="status" aria-live="polite" className={notice ? styles.notice : styles.liveRegion}>{notice}</div>
        {actionError && <div role="alert" className={styles.error}>{actionError}</div>}
        {!preview ? <section aria-busy={!loadError} className={styles.empty}>
          {loadError ? <><h2>Preview unavailable</h2><p role="alert">{loadError}</p><button className={styles.primary} onClick={() => { setLoadError(""); setAttempt((value) => value + 1); }}>Try again</button></> : <><span className={styles.skeleton} /><h2>Loading development fixtures…</h2><p>No account or database connection is being created.</p></>}
        </section> : <>
          {view === "overview" ? <ResultsOverview state={preview} onOpen={setDetail} /> : <>
          <section className={styles.metrics} aria-label="Workflow input overview">
            <article><div><Layers3 size={18} aria-hidden="true" /><span>Workflows</span></div><strong>{workflows.length}</strong><p>In this preview workspace</p></article>
            <article><div><Clock3 size={18} aria-hidden="true" /><span>Baseline hours / month</span></div><strong>{number(baseline)}<small> hrs</small></strong><p>Input workload, including review</p></article>
            <article><div><ShieldCheck size={18} aria-hidden="true" /><span>Awaiting analysis</span></div><strong>{workflows.filter((item) => item.analysis_status !== "analyzed").length}</strong><p>No live recommendations generated</p></article>
          </section>
          <section id="store-workflows" className={styles.inventory} aria-labelledby="inventory-title">
            <div className={styles.inventoryHeading}><div><h2 id="inventory-title">Your workflow inventory <span>{workflows.length}</span></h2><p>{workspace?.name} <span>·</span> Fictional preview records</p></div>
              <button className={styles.secondary} disabled={examplesLoaded} onClick={() => perform(loadPreviewExamples, "Six fictional e-commerce inputs added. No classification or analysis was run.")}><FlaskConical size={16} aria-hidden="true" />{examplesLoaded ? "Six examples loaded" : "Load six examples"}</button>
            </div>
            <div className={styles.filters}><div className={styles.search}><Search size={17} aria-hidden="true" /><input aria-label="Search workflows" type="search" placeholder="Search your workflows…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              <label className={styles.statusFilter}>Analysis status<select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="all">All statuses</option><option value="not_analyzed">Not analyzed</option><option value="needs_reanalysis">Needs reanalysis</option><option value="analyzed">Analysis recorded</option></select></label>
            </div>
            {workflows.length === 0 ? <div className={styles.empty}><Store size={31} aria-hidden="true" /><h3>A fresh workspace.</h3><p>Add a workflow or load six fictional inputs to explore the flow.</p><button className={styles.primary} onClick={() => setEditor("new")}><Plus size={16} aria-hidden="true" />Add your first workflow</button></div> : visible.length === 0 ? <div className={styles.empty}><Search size={28} aria-hidden="true" /><h3>No matching workflows</h3><p>Try a different search or analysis status.</p><button className={styles.secondary} onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</button></div> : <>
              <div className={styles.listHeading} aria-hidden="true"><span>WORKFLOW</span><span>MONTHLY BASELINE</span><span>ANALYSIS</span><span>ACTIONS</span></div>
              <ul className={styles.workflowList} aria-label="Store workflows">{visible.map((item, index) => <li key={item.id}>
                <article className={styles.workflowRow}>
                  <div className={styles.workflowInfo}><span className={styles.rowNumber}>{String(index + 1).padStart(2, "0")}</span><div><h3><button onClick={() => setDetail(item.id)}>{item.name}</button></h3><p>{item.current_tools || "Tools not specified"}<span>·</span>Baseline v{item.baseline_version}</p>{item.risk === "high" && <small className={styles.humanReview}>Human approval required</small>}</div></div>
                  <div className={styles.workload}><span>Monthly baseline</span><strong>{number(item.hours_per_occurrence * item.occurrences_per_month)} hrs</strong><small>{item.hours_per_occurrence} hrs × {item.occurrences_per_month}/month</small></div>
                  <div className={styles.analysisCell}><span className={item.analysis_status === "needs_reanalysis" ? styles.reanalysis : styles.pending}>{statusLabels[item.analysis_status]}</span><small>Development fixture</small></div>
                  <div className={styles.rowActions}><button aria-label={`Edit ${item.name}`} title="Edit workflow" onClick={() => setEditor(item)}><Pencil size={16} aria-hidden="true" /></button><button aria-label={`Delete ${item.name}`} title="Delete workflow" onClick={() => setDeleting(item)}><Trash2 size={16} aria-hidden="true" /></button></div>
                </article>
              </li>)}</ul>
            </>}
            <div className={styles.inventoryFoot}><ShieldCheck size={14} aria-hidden="true" />Open a workflow for simulated response states, local scenario arithmetic and measurement entry. No cloud saves.</div>
          </section>
          </>}
          <section className={styles.nextStep}><div className={styles.nextIcon}><LockKeyhole size={22} aria-hidden="true" /></div><div><span>WHAT COMES NEXT</span><h2>Good inputs come before good advice.</h2><p>Analysis, ROI and measurement services are not connected. Refund and dispute approvals stay with people.</p></div><button className={styles.secondary} onClick={() => setSignIn(true)}>Connection details<ArrowRight size={16} aria-hidden="true" /></button></section>
          <footer className={styles.footer}><span><Check size={14} aria-hidden="true" />Your agency demo’s saved records stay intact.</span><Link href="/">Open agency demo<ArrowRight size={14} aria-hidden="true" /></Link></footer>
        </>}
      </main>
    </div>
    {preview && workspaceForm && <PreviewWorkspaceForm onClose={() => setWorkspaceForm(false)} onSave={(name) => {
      apply((state) => addPreviewWorkspace(state, name), "Preview workspace created locally. Nothing was saved to a database.");
      setWorkspaceForm(false); setSearch(""); setFilter("all"); setDetail(null);
    }} />}
    {preview && editor && <PreviewWorkflowForm key={editor === "new" ? "new" : editor.id} record={editor === "new" ? undefined : editor}
      workspaceId={preview.selectedWorkspaceId} onClose={() => setEditor(null)} onSave={(draft: WorkflowDraft) => {
        apply((state) => editor === "new" ? addPreviewWorkflow(state, draft) : editPreviewWorkflow(state, editor.id, editor.baseline_version, draft),
          editor === "new" ? "Workflow added to this preview session." : "Preview edits saved. Changed inputs require reanalysis; historical baselines are retained.");
        setEditor(null);
      }} />}
    {preview && current && <Modal title={current.name} subtitle={`Development fixture · baseline v${current.baseline_version}`} onClose={() => setDetail(null)} wide>
      <WorkflowResults key={`${current.id}:${current.baseline_version}`} state={preview} workflow={current}
        onScenario={(input, source) => apply((state) => saveLocalScenario(state, current.id, input, source), "Local scenario kept. No backend calculation or priority update occurred.")}
        onMeasurement={(input) => apply((state) => addLocalMeasurement(state, current.id, input), "Local measurement kept on its original baseline. No server submission occurred.")}
        onSignIn={() => { setDetail(null); setSignIn(true); }} onEdit={() => { setDetail(null); setEditor(current); }} onClose={() => setDetail(null)} />
    </Modal>}
    {preview && report && <Modal title="Development fixture report" subtitle="Local presentation · no report API is called" onClose={() => setReport(false)} wide><FixtureReportView state={preview} /></Modal>}
    {deleting && <Modal title="Delete this preview workflow?" subtitle={deleting.name} onClose={() => setDeleting(null)}><div className={styles.detail}><p>This removes the workflow and its local baseline history, scenarios and measurements from this preview session.</p><div className={styles.formFooter}><button className={styles.secondary} onClick={() => setDeleting(null)}>Keep workflow</button><button className={styles.danger} onClick={() => {
      perform((state) => deletePreviewWorkflow(state, deleting.id), "Workflow and its local history removed from this preview.");
      if (detail === deleting.id) setDetail(null); setDeleting(null);
    }}>Delete preview workflow</button></div></div></Modal>}
    {signIn && <Modal title="Sign-in & connection status" subtitle="No authenticated session in this development preview" onClose={() => setSignIn(false)}><div className={styles.detail}>
      <div className={styles.authIcon}><LockKeyhole size={25} aria-hidden="true" /></div><h3>This fixture preview has no account session.</h3><p>Use the separate real account workspace for Supabase sign-in and saved workflows. Fixture records are never uploaded.</p><Link className={styles.primary} href="/ecommerce/account">Open real account workspace</Link>
      <dl><div><dt>Current session</dt><dd>Not signed in</dd></div><div><dt>Data source</dt><dd>Local development fixtures</dd></div><div><dt>Cloud persistence</dt><dd>Not connected to this preview</dd></div><div><dt>Analysis, ROI & results</dt><dd>Services pending</dd></div></dl>
      <p className={styles.formNote}><Database size={16} aria-hidden="true" />A running backend alone does not connect these screens or verify a user session.</p>
      <div className={styles.formFooter}><button className={styles.secondary} onClick={() => setSignIn(false)}>Back to preview</button><button className={styles.primary} disabled>Sign-in unavailable</button></div>
    </div></Modal>}
  </div>;
}
