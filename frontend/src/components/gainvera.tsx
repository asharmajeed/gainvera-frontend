"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileDown,
  FlaskConical,
  Layers3,
  LayoutDashboard,
  ListChecks,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Pencil,
  Wallet,
  Zap,
} from "lucide-react";
import type { Category, Workflow } from "@/lib/models";
import { categories } from "@/lib/models";
import { analyze } from "@/lib/analysis";
import { exampleWorkflows } from "@/lib/fixtures";
import { calculateROI, compareOutcome } from "@/lib/roi";
import { loadWorkflows, saveWorkflows } from "@/lib/persistence";
import { Badge, Modal, money, number } from "./ui";
import { CategoryChart, WorkloadChart } from "./charts";
import WorkflowForm from "./workflow-form";
import WorkflowDetail from "./workflow-detail";
import AuditReport from "./audit-report";
type View = "dashboard" | "workflows" | "results" | "methodology";
export default function Gainvera() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [filter, setFilter] = useState<Category | "all">("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Workflow | "new" | null>(null);
  const [detail, setDetail] = useState<{ id: string; tab: string } | null>(
    null,
  );
  const [confirmation, setConfirmation] = useState<{
    kind: "reset" | "load" | "delete";
    id?: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = loadWorkflows();
      setWorkflows(saved.workflows);
      if (saved.warning) setNotice(saved.warning);
      setReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      if (!saveWorkflows(workflows))
        setNotice(
          "Browser storage is unavailable. This session works, but changes will not survive a refresh.",
        );
    }, 0);
    return () => clearTimeout(timer);
  }, [workflows, ready]);
  const rows = useMemo(
    () =>
      workflows
        .filter((w) => w.analyzed)
        .map((w) => ({ w, a: analyze(w) }))
        .sort((x, y) => y.a.score - x.a.score),
    [workflows],
  );
  const totals = rows.reduce(
    (s, { w, a }) => {
      const r = calculateROI(w, w.assumptions ?? a.defaultAssumptions);
      return {
        hours: s.hours + r.baseline,
        saved: s.saved + r.saved,
        net: s.net + r.net,
      };
    },
    { hours: 0, saved: 0, net: 0 },
  );
  const pending = workflows.filter((w) => !w.analyzed).length;
  const current = workflows.find((w) => w.id === detail?.id);
  const visible = rows.filter(
    (r) =>
      (filter === "all" || r.a.category === filter) &&
      `${r.w.name} ${r.w.business}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const update = (w: Workflow) =>
    setWorkflows((prev) => prev.map((old) => (old.id === w.id ? w : old)));
  function load() {
    setWorkflows(exampleWorkflows.map((w) => ({ ...w })));
    setFilter("all");
    setSearch("");
    setView("dashboard");
    setNotice(
      "Example agency loaded: 6 illustrative workflows. Click Analyze Workflows to see the opportunities.",
    );
  }
  function analyzeAll() {
    setBusy(true);
    setTimeout(() => {
      setWorkflows((prev) =>
        prev.map((w) => {
          const a = analyze(w);
          return {
            ...w,
            analyzed: true,
            assumptions: w.assumptions ?? a.defaultAssumptions,
          };
        }),
      );
      setBusy(false);
      setNotice(
        "Analysis complete. Rankings use your scenario values, feasibility, data readiness, and risk.",
      );
    }, 350);
  }
  function confirm() {
    if (!confirmation) return;
    if (confirmation.kind === "load") load();
    else if (confirmation.kind === "reset") {
      setWorkflows([]);
      setDetail(null);
      setFilter("all");
      setSearch("");
      setNotice(
        "Demo reset. Add your own workflow or load the example agency.",
      );
    } else {
      setWorkflows((prev) => prev.filter((w) => w.id !== confirmation.id));
      setNotice("Workflow deleted.");
    }
    setConfirmation(null);
  }
  const nav = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "workflows", label: "Workflows", icon: Layers3 },
    { id: "results", label: "Results tracker", icon: BarChart3 },
    { id: "methodology", label: "Analysis methodology", icon: ShieldCheck },
  ] as const;
  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setView("dashboard");
            }}
          >
            <span className="brand-icon">
              <Activity size={24} />
            </span>
            gainvera<span className="brand-period">.</span>
          </a>
          <span className="workspace-label">YOUR WORKSPACE</span>
          <div className="workspace">
            <span>NC</span>
            <div>
              <strong>{workflows[0]?.business ?? "My workspace"}</strong>
              <small>Workflow intelligence</small>
            </div>
            <ChevronDown size={15} />
          </div>
          <nav>
            {nav.map((n) => (
              <button
                key={n.id}
                className={view === n.id ? "selected" : ""}
                onClick={() => setView(n.id)}
              >
                <n.icon size={19} />
                {n.label}
                {n.id === "workflows" && (
                  <span className="nav-count">{workflows.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="offline-card">
              <span className="offline-dot" /> Ready for your next improvement
              <p>Works locally. Your workflow data stays in this browser.</p>
            </div>
            <div className="profile">
              <span>GV</span>
              <div>
                <b>Demo workspace</b>
                <small>Smarter workflows. Proven results.</small>
              </div>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div>
              <span className="breadcrumb">Workspace</span>
              <span className="slash">/</span>
              <b>{nav.find((n) => n.id === view)?.label}</b>
            </div>
            <div className="topbar-right">
              <Link className="button secondary" href="/ecommerce">E-commerce preview</Link>
              <span className="local-mode">
                <span />
                Local Rule-Based Analysis
              </span>
              <span className="avatar">GV</span>
            </div>
          </header>
          <main>
            <div className="page-heading">
              <div>
                <div className="eyebrow">WORKFLOW INTELLIGENCE</div>
                <h1>
                  {view === "dashboard"
                    ? "Make room for better work."
                    : view === "workflows"
                      ? "Know where your time goes."
                      : view === "results"
                        ? "Turn estimates into evidence."
                        : "Every recommendation, explained."}
                </h1>
                <p>
                  {view === "dashboard"
                    ? "Discover the right improvements. See the potential. Measure the impact."
                    : view === "workflows"
                      ? "Build a clear picture of your recurring work and where it can improve."
                      : view === "results"
                        ? "Compare your baseline, scenario estimates, and reported outcomes."
                        : "A transparent decision process built for practical, responsible improvements."}
                </p>
              </div>
              <button
                className="button secondary export"
                disabled={!rows.length}
                onClick={() => setReport(true)}
              >
                <FileDown size={16} />
                Export Audit Report
              </button>
            </div>
            <div className="demo-banner">
              <div className="demo-banner-icon">
                <FlaskConical size={22} />
              </div>
              <div>
                <b>Your next improvement starts with one workflow.</b>
                <p>
                  Try a marketing agency example, or add the work your team does
                  every day.
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() =>
                  workflows.length ? setConfirmation({ kind: "load" }) : load()
                }
              >
                Load Example Agency <ArrowRight size={15} />
              </button>
            </div>
            {notice && (
              <div className="status-notice" role="status">
                {notice}
                <button
                  aria-label="Dismiss notification"
                  onClick={() => setNotice("")}
                >
                  ×
                </button>
              </div>
            )}
            {!ready ? (
              <div className="empty">
                <span className="spinner" />
                <h3>Restoring your workspace…</h3>
              </div>
            ) : (
              <>
                {view === "dashboard" && (
                  <>
                    <div className="metric-grid">
                      <Metric
                        label="Workflows analyzed"
                        value={String(rows.length)}
                        sub={`${pending} awaiting analysis`}
                        icon={<Layers3 size={19} />}
                      />
                      <Metric
                        label="Current monthly workload"
                        value={number(totals.hours)}
                        unit="hrs"
                        sub="Across analyzed workflows"
                        icon={<Clock3 size={19} />}
                      />
                      <Metric
                        label="Potential hours saved"
                        value={number(totals.saved)}
                        unit="hrs"
                        sub="Gross scenario savings / month"
                        accent
                        icon={<Zap size={19} />}
                      />
                      <Metric
                        label="Estimated net monthly value"
                        value={money(totals.net)}
                        sub="Capacity value, after recurring costs"
                        accent
                        icon={<Wallet size={19} />}
                      />
                    </div>
                    <div className="chart-grid">
                      <section className="card">
                        <div className="card-heading">
                          <div>
                            <h3>A lighter workload, by design</h3>
                            <p>Current vs. projected hours per month</p>
                          </div>
                          <div className="chart-legend">
                            <span>
                              <i />
                              Current
                            </span>
                            <span>
                              <i />
                              Projected
                            </span>
                          </div>
                        </div>
                        {rows.length ? (
                          <WorkloadChart rows={rows} />
                        ) : (
                          <div className="chart-empty">
                            <BarChart3 size={32} />
                            <p>
                              Analyze workflows to see the workload comparison.
                            </p>
                          </div>
                        )}
                      </section>
                      <section className="card">
                        <div className="card-heading">
                          <div>
                            <h3>The right approach</h3>
                            <p>
                              {
                                rows.filter(
                                  (r) => r.a.category === "AUTOMATE NOW",
                                ).length
                              }{" "}
                              full automation opportunities
                            </p>
                          </div>
                          <span className="small-icon">
                            <ListChecks size={18} />
                          </span>
                        </div>
                        {rows.length ? (
                          <CategoryChart rows={rows} />
                        ) : (
                          <div className="chart-empty">
                            <ShieldCheck size={30} />
                            <p>
                              Not every workflow needs AI.
                              <br />
                              Find the approach that fits.
                            </p>
                          </div>
                        )}
                      </section>
                    </div>
                  </>
                )}
                {(view === "dashboard" || view === "workflows") && (
                  <section className="card opportunities">
                    <div className="card-heading">
                      <div>
                        <h3>
                          {view === "dashboard"
                            ? "Your improvement opportunities"
                            : "Workflow inventory"}{" "}
                          <span className="count-pill">
                            {view === "dashboard"
                              ? rows.length
                              : workflows.length}
                          </span>
                        </h3>
                        <p>
                          {view === "dashboard"
                            ? "Ranked by value, feasibility, data readiness, and risk."
                            : "Capture the baseline before changing the process."}
                        </p>
                      </div>
                      <div className="actions">
                        <button
                          className="button secondary"
                          onClick={() => setForm("new")}
                        >
                          <Plus size={16} />
                          Add Workflow
                        </button>
                        <button
                          className="button primary"
                          disabled={!workflows.length || busy}
                          onClick={analyzeAll}
                        >
                          {busy ? (
                            <span className="spinner" />
                          ) : (
                            <Sparkles size={15} />
                          )}{" "}
                          {busy ? "Analyzing…" : "Analyze Workflows"}
                        </button>
                      </div>
                    </div>
                    {view === "dashboard" && (
                      <div className="filter-row">
                        <div className="filters">
                          <button
                            className={filter === "all" ? "active" : ""}
                            onClick={() => setFilter("all")}
                          >
                            All workflows
                          </button>
                          {categories.map((c) => (
                            <button
                              key={c}
                              className={filter === c ? "active" : ""}
                              onClick={() => setFilter(c)}
                            >
                              {c === "AUTOMATE NOW"
                                ? "Automate"
                                : c === "AI-ASSISTED"
                                  ? "AI-assisted"
                                  : c === "SIMPLIFY WITHOUT AI"
                                    ? "Simplify"
                                    : "Leave alone"}
                            </button>
                          ))}
                        </div>
                        <label className="search">
                          <Search size={16} />
                          <input
                            aria-label="Search workflows"
                            placeholder="Find a workflow…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </label>
                      </div>
                    )}
                    {workflows.length === 0 ? (
                      <div className="empty">
                        <span className="empty-icon">
                          <Layers3 size={30} />
                        </span>
                        <h3>Small changes. Meaningful potential.</h3>
                        <p>
                          Load the example agency or add your first workflow
                          <br />
                          to discover what is worth improving.
                        </p>
                        <button
                          className="button primary"
                          onClick={() => setForm("new")}
                        >
                          <Plus size={16} />
                          Add your first workflow
                        </button>
                      </div>
                    ) : view === "dashboard" && !rows.length ? (
                      <div className="empty">
                        <Sparkles size={30} />
                        <h3>Your workflows are ready.</h3>
                        <p>
                          Click Analyze Workflows to generate recommendations
                          and explore ROI.
                        </p>
                      </div>
                    ) : view === "dashboard" && !visible.length ? (
                      <div className="empty">
                        <Search size={25} />
                        <h3>No matching workflows</h3>
                        <button
                          className="button secondary"
                          onClick={() => {
                            setFilter("all");
                            setSearch("");
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    ) : (
                      <div className="workflow-list">
                        {(view === "dashboard"
                          ? visible
                          : workflows.map((w) => ({ w, a: analyze(w) }))
                        ).map(({ w, a }, i) => {
                          const r = calculateROI(
                            w,
                            w.assumptions ?? a.defaultAssumptions,
                          );
                          return (
                            <article className="workflow-row" key={w.id}>
                              <div
                                className={`workflow-icon ${w.analyzed ? "analyzed" : ""}`}
                              >
                                {a.playbook.id === "approval" ? (
                                  <ShieldCheck size={21} />
                                ) : a.playbook.id === "files" ? (
                                  <Layers3 size={21} />
                                ) : a.playbook.id === "content" ? (
                                  <Pencil size={21} />
                                ) : (
                                  <ListChecks size={21} />
                                )}
                              </div>
                              <div className="workflow-info">
                                <div>
                                  <h4>{w.name}</h4>
                                  {w.analyzed && (
                                    <Badge category={a.category} />
                                  )}
                                </div>
                                <p>
                                  {w.business} · {number(w.hours * w.frequency)}{" "}
                                  h / month
                                  {w.sample ? " · Illustrative example" : ""}
                                  {!w.analyzed ? " · Awaiting analysis" : ""}
                                </p>
                              </div>
                              {w.analyzed && (
                                <>
                                  <div className="row-value">
                                    <strong>
                                      {money(r.net)}
                                      <small>/mo</small>
                                    </strong>
                                    <span>
                                      {number(r.saved)} h potential savings
                                    </span>
                                  </div>
                                  <div className="score">
                                    <b>{a.score}</b>
                                    <span>score</span>
                                  </div>
                                </>
                              )}
                              <div className="row-actions">
                                {w.analyzed && (
                                  <button
                                    className="button text recommendation"
                                    onClick={() =>
                                      setDetail({ id: w.id, tab: "plan" })
                                    }
                                  >
                                    View Recommendation{" "}
                                    <ArrowUpRight size={16} />
                                  </button>
                                )}
                                {view === "workflows" && (
                                  <>
                                    <button
                                      className="icon-button"
                                      aria-label={`Edit ${w.name}`}
                                      onClick={() => setForm(w)}
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    <button
                                      className="icon-button danger"
                                      aria-label={`Delete ${w.name}`}
                                      onClick={() =>
                                        setConfirmation({
                                          kind: "delete",
                                          id: w.id,
                                        })
                                      }
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                              <span
                                className="rank"
                                aria-label={`Rank ${i + 1}`}
                              >
                                {i + 1}
                              </span>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}
                {view === "results" && (
                  <section className="card">
                    <div className="card-heading">
                      <div>
                        <h3>Measured outcomes</h3>
                        <p>
                          {rows.filter((r) => r.w.outcome).length} of{" "}
                          {rows.length} analyzed workflows have a reported
                          measurement.
                        </p>
                      </div>
                      <CheckCircle2 size={20} />
                    </div>
                    {!rows.length ? (
                      <div className="empty">
                        <BarChart3 size={28} />
                        <h3>No analyzed workflows yet</h3>
                        <p>
                          Load or add workflows, then run the local analysis.
                        </p>
                        <button
                          className="button primary"
                          onClick={() => setView("dashboard")}
                        >
                          Go to overview
                        </button>
                      </div>
                    ) : (
                      <div className="results-list">
                        {rows.map(({ w, a }) => {
                          const c = compareOutcome(
                            w,
                            w.assumptions ?? a.defaultAssumptions,
                            w.outcome,
                          );
                          return (
                            <article key={w.id}>
                              <div>
                                <h4>{w.name}</h4>
                                <p>
                                  {c
                                    ? `${w.outcome?.demo ? "Hypothetical demo" : "Self-reported"} · ${w.outcome?.period}`
                                    : "Not measured yet"}
                                </p>
                              </div>
                              <div className="result-numbers">
                                <span>
                                  Baseline{" "}
                                  <b>{number(w.hours * w.frequency)} h</b>
                                </span>
                                <span>
                                  Estimated after{" "}
                                  <b>
                                    {number(
                                      c?.estimatedHours ??
                                        calculateROI(
                                          w,
                                          w.assumptions ?? a.defaultAssumptions,
                                        ).projected,
                                    )}{" "}
                                    h
                                  </b>
                                </span>
                                <span>
                                  Reported after{" "}
                                  <b>
                                    {c ? `${number(c.actualHours)} h` : "—"}
                                  </b>
                                </span>
                                <span>
                                  Reported savings{" "}
                                  <b>{c ? `${number(c.saved)} h` : "—"}</b>
                                </span>
                              </div>
                              <button
                                className="button secondary"
                                onClick={() =>
                                  setDetail({ id: w.id, tab: "results" })
                                }
                              >
                                Track Results <ArrowRight size={15} />
                              </button>
                            </article>
                          );
                        })}
                      </div>
                    )}
                    <p className="section-footnote">
                      Reported outcomes are user-entered and not independently
                      verified. No actual outcomes are generated by the
                      application.
                    </p>
                  </section>
                )}
                {view === "methodology" && (
                  <section className="card methodology">
                    <div className="eyebrow">LOCAL RULE-BASED ANALYSIS</div>
                    <h2>Useful guidance starts with honest evidence.</h2>
                    <p>
                      Gainvera compares task descriptions with six curated
                      workflow playbooks using TF-IDF and cosine text
                      similarity. It then applies explicit suitability,
                      workload, data, and risk rules. The engine works without a
                      language model, network connection, or API key.
                    </p>
                    <div className="method-grid">
                      <article>
                        <span>01</span>
                        <h3>Find the closest playbook</h3>
                        <p>
                          Similarity must reach 0.16. Unknown tasks receive an
                          evidence-gathering plan with zero assumed reduction. A
                          match is not a probability of success.
                        </p>
                      </article>
                      <article>
                        <span>02</span>
                        <h3>Apply the guardrails</h3>
                        <p>
                          High sensitivity or financial approval keeps human
                          authority. Tasks below 2 hours/month stay unchanged.
                          Full automation requires confirmed digital inputs and
                          low risk.
                        </p>
                      </article>
                      <article>
                        <span>03</span>
                        <h3>Rank transparently</h3>
                        <p>
                          35% scenario net value + 30% feasibility + 15% data
                          readiness + 20% safety. Open any recommendation to
                          inspect each input. Scores update with ROI
                          assumptions.
                        </p>
                      </article>
                      <article>
                        <span>04</span>
                        <h3>Measure the difference</h3>
                        <p>
                          Compare equivalent work volumes and include review,
                          corrections, and upkeep. Follow-up results stay “Not
                          measured yet” until you enter them.
                        </p>
                      </article>
                    </div>
                    <div className="notice">
                      This release implements intake, local classification,
                      curated planning, deterministic ROI, dashboard charts,
                      browser persistence, outcome tracking, and printable
                      audits. LLM extraction, embeddings, integrations, trained
                      predictions, and independent result verification are
                      future plans.
                    </div>
                  </section>
                )}
              </>
            )}
            <footer className="page-footer">
              <span>
                <ShieldCheck size={14} /> Your data stays in this browser · All
                amounts in USD
              </span>
              <button onClick={() => setConfirmation({ kind: "reset" })}>
                <RotateCcw size={13} />
                Reset Demo
              </button>
            </footer>
          </main>
        </div>
      </div>
      {form && (
        <WorkflowForm
          workflow={form === "new" ? undefined : form}
          business={workflows[0]?.business ?? "My agency"}
          onClose={() => setForm(null)}
          onSave={(w) => {
            if (form === "new") setWorkflows((prev) => [...prev, w]);
            else update(w);
            setForm(null);
            setNotice(
              "Workflow saved. Analyze Workflows to refresh the recommendations.",
            );
          }}
        />
      )}
      {current && detail && (
        <WorkflowDetail
          key={current.id}
          workflow={current}
          onChange={update}
          onClose={() => setDetail(null)}
          initialTab={detail.tab}
        />
      )}
      {confirmation && (
        <Modal
          title={
            confirmation.kind === "load"
              ? "Load the example agency?"
              : confirmation.kind === "reset"
                ? "Reset your demo?"
                : "Delete this workflow?"
          }
          onClose={() => setConfirmation(null)}
        >
          <div className="form-body">
            <p>
              {confirmation.kind === "load"
                ? "This replaces this browser’s current workflows and measurements with six illustrative agency examples."
                : confirmation.kind === "reset"
                  ? "This removes the workflows, assumptions, and measurements saved in this browser."
                  : "This removes the workflow and its saved measurements."}
            </p>
            <div className="form-footer">
              <button
                className="button secondary"
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </button>
              <button className="button primary" onClick={confirm}>
                {confirmation.kind === "load"
                  ? "Load examples"
                  : confirmation.kind === "reset"
                    ? "Reset Demo"
                    : "Delete workflow"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {report && (
        <Modal
          title="Your workflow audit"
          subtitle="Review, print, or download a self-contained report."
          onClose={() => setReport(false)}
          wide
        >
          <div className="report-actions">
            <button className="button secondary" onClick={() => window.print()}>
              Print / Save PDF
            </button>
            <button
              className="button primary"
              onClick={() => {
                const html =
                  document.querySelector(".audit-preview")?.innerHTML;
                if (!html) return;
                const blob = new Blob(
                  [
                    `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Gainvera workflow audit</title><style>body{font:14px Arial,sans-serif;color:#233b45;max-width:850px;margin:40px auto;padding:20px}p,li{line-height:1.7}article{border-top:1px solid #ddd;padding:25px 0}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}.badge{font-weight:bold}h1,h2,h3{color:#127d6e}@media print{article{break-before:page}body{margin:0}}</style></head><body>${html}</body></html>`,
                  ],
                  { type: "text/html" },
                );
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "gainvera-workflow-audit.html";
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              Download HTML
            </button>
          </div>
          <AuditReport workflows={workflows} preview />
        </Modal>
      )}
      <AuditReport workflows={workflows} />
    </>
  );
}
function Metric({
  label,
  value,
  unit,
  sub,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section className={`card metric ${accent ? "accent" : ""}`}>
      <div>
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      <p>
        {accent ? <ArrowDownRight size={13} /> : null}
        {sub}
      </p>
    </section>
  );
}
