"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { ApiWorkflow, WorkflowDraft } from "@/lib/api";
import { ApiClientError } from "@/lib/api";
import { browserAccountConfiguration } from "@/lib/account/config";
import { browserAuth } from "@/lib/account/supabase";
import { AccountChangedError, AccountStore, type AccountState } from "@/lib/account/store";
import { Modal, number } from "../ui";
import { PreviewWorkflowForm, PreviewWorkspaceForm } from "./ecommerce-forms";
import { FailureNotice } from "./recommendation-view";
import { AccountWorkflowResults } from "./account-workflow-results";
import { AccountDashboard } from "./account-result-presentation";
import styles from "./ecommerce-preview.module.css";

export default function AccountWorkspace() {
  const [store] = useState(() => {
    const configuration = browserAccountConfiguration();
    return new AccountStore(configuration, () => browserAuth(configuration.config!));
  });
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => {
    if (["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "3100") { store.blockOrigin(); return; }
    return store.start();
  }, [store]);
  return <div className={styles.preview}>
    <a href="#account-main" className={styles.skip}>Skip to account workspace</a>
    <aside className={styles.sidebar} aria-label="Account navigation">
      <Link className={styles.brand} href="/ecommerce/account">gainvera.</Link>
      <div className={styles.sidebarLabel}>REAL ACCOUNT STORAGE</div>
      <p>Manage your own store workspaces and workflows.</p>
      <nav className={styles.navigation}><Link href="/ecommerce/account" aria-current="page">Account workspaces</Link><Link href="/ecommerce">Development fixture preview</Link><Link href="/">Agency demo</Link></nav>
      <div className={styles.sidebarNote}><strong>Separate data sources</strong><p>No agency or fixture records are uploaded. Account data comes from the API.</p></div>
    </aside>
    <div className={styles.mainShell}><header className={styles.topbar}><div>E-commerce / Account workspaces</div>{state.phase === "signed_in" && <button className={styles.signIn} disabled={state.authBusy} onClick={() => void store.signOut()}>Sign out</button>}</header>
      <main id="account-main" className={styles.main}>
        <h1 className={styles.accountTitle}>Your store workspace</h1>
        <p className={styles.formNote}>Real account workspaces, reviewed guidance, scenario estimates and self-reported outcomes. Recommendations do not perform store actions. Capacity value is not guaranteed cash savings.</p>
        {state.phase === "restoring" ? <p role="status" className={styles.empty}>Restoring your session…</p>
          : state.phase === "unavailable" ? <section className={styles.error} role="alert"><h2>Account connection unavailable</h2><p>{state.authMessage}</p><ul>{store.configuration.issues.map((item) => <li key={item}>{item}</li>)}</ul>{store.configuration.issues.length > 0 && <p>Configure ignored frontend/.env.local, then restart/rebuild.</p>}<p>No credentials are collected here.</p></section>
          : state.phase === "signed_in" ? <SignedInWorkspace key={state.generation} store={store} state={state} />
          : <SignIn store={store} state={state} />}
      </main>
    </div>
  </div>;
}

function SignIn({ store, state }: { store: AccountStore; state: AccountState }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return <section className={styles.accountCard}>
    <h2>Sign in</h2><p>Use an existing confirmed account. Account creation and password recovery are not part of this screen.</p>
    {state.authMessage && <p role="alert" className={styles.formNote}>{state.authMessage}</p>}
    {state.signOutFailed && <button className={styles.secondary} disabled={state.authBusy} onClick={() => void store.signOut()}>Retry sign-out</button>}
    <form className={styles.form} onSubmit={async (event) => {
      event.preventDefault(); const submittedPassword = password; setPassword(""); await store.signIn(email, submittedPassword);
    }}>
      <label htmlFor="account-email">Email</label><input id="account-email" type="email" autoComplete="username" required value={email} disabled={state.authBusy} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="account-password">Password</label><input id="account-password" type="password" autoComplete="current-password" required value={password} disabled={state.authBusy} onChange={(event) => setPassword(event.target.value)} />
      <button className={styles.primary} disabled={state.authBusy || state.signOutFailed} type="submit">{state.authBusy ? "Please wait…" : "Sign in to account"}</button>
    </form>
  </section>;
}

function SignedInWorkspace({ store, state }: { store: AccountStore; state: AccountState }) {
  const [createWorkspace, setCreateWorkspace] = useState(false);
  const [editor, setEditor] = useState<ApiWorkflow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ApiWorkflow | null>(null);
  const [failure, setFailure] = useState<unknown>(null);
  const [view, setView] = useState<"workflows" | "dashboard">("workflows");
  const workspace = state.workspaces.items.find((item) => item.id === state.workspaceId);
  const error = failure ?? state.error;
  return <>
    <p className={styles.notice}>Signed in · account records are private to your user.</p>
    <div className={styles.accountToolbar}>
      <label>Page size<select aria-label="Records per page" value={state.pageSize} disabled={state.busy} onChange={(event) => { setEditor(null); setDeleting(null); setFailure(null); store.setPageSize(Number(event.target.value)); }}><option value="1">1</option><option value="10">10</option><option value="25">25</option><option value="50">50</option></select></label>
      <button className={styles.secondary} disabled={state.busy || state.workspaces.loading} onClick={() => void store.loadWorkspaces()}>Refresh workspaces</button>
      <button className={styles.primary} disabled={state.busy} onClick={() => setCreateWorkspace(true)}>Create workspace</button>
    </div>
    {state.workspaces.error !== null && <><FailureNotice error={state.workspaces.error} /><button className={styles.secondary} onClick={() => void store.loadWorkspaces()}>Retry workspace read</button></>}
    {state.workspaces.loading && <p role="status">Loading account workspaces…</p>}
    {state.workspaces.loaded && !state.workspaces.loading && !state.workspaces.error && state.workspaces.items.length === 0 && <p className={styles.empty}>No account workspaces yet. Create your first store workspace.</p>}
    {state.workspaces.items.length > 0 && <div className={styles.accountToolbar}><label htmlFor="account-workspace">Selected account workspace</label><select id="account-workspace" value={state.workspaceId ?? ""} disabled={state.busy} onChange={(event) => { setEditor(null); setDeleting(null); setFailure(null); store.selectWorkspace(event.target.value); }}><option value="" disabled>Select a workspace</option>{state.workspaces.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
    {state.workspaces.cursor && <button className={styles.secondary} disabled={state.workspaces.loading || state.busy} onClick={() => void store.loadWorkspaces(true)}>Load more workspaces</button>}
    {error !== null && <FailureNotice error={error} />}
    <p role="status" className={styles.liveStatus}>{state.notice}</p>
    {workspace && <div className={styles.accountToolbar} aria-label="Account workspace views"><button className={view === "workflows" ? styles.primary : styles.secondary} onClick={() => setView("workflows")}>Workflow inventory</button><button className={view === "dashboard" ? styles.primary : styles.secondary} onClick={() => setView("dashboard")}>Dashboard & report</button></div>}
    {workspace && view === "dashboard" && <AccountDashboard key={`${workspace.id}:${state.dataRevision}`} parent={store} onOpen={(id) => void store.openWorkflow(id)} />}
    {workspace && view === "workflows" && <section className={styles.inventory}>
      <div className={styles.inventoryHeading}><div><h2>{workspace.name}</h2><p>USD · Saved account workflows · {state.workflows.items.length} loaded</p></div><button className={styles.primary} disabled={state.busy} onClick={() => setEditor("new")}>Add workflow</button></div>
      <div className={styles.accountToolbar}><button className={styles.secondary} disabled={state.workflows.loading || state.busy} onClick={() => void store.loadWorkflows()}>Refresh workflows</button></div>
      {state.workflows.error !== null && <div className={styles.detail}><FailureNotice error={state.workflows.error} /><button className={styles.secondary} onClick={() => void store.loadWorkflows()}>Retry workflow read</button></div>}
      {state.workflows.loading && <p role="status" className={styles.empty}>Loading saved workflows…</p>}
      {state.workflows.loaded && !state.workflows.loading && !state.workflows.error && !state.workflows.items.length && <p className={styles.empty}>No saved workflows in this workspace.</p>}
      <ul className={styles.accountRows} aria-label="Saved account workflows">{state.workflows.items.map((item) => <li key={item.id}>
        <div><h3><button disabled={state.busy} onClick={() => void store.openWorkflow(item.id)}>{item.name}</button></h3><p>Baseline v{item.baseline_version} · {item.analysis_status.replaceAll("_", " ")} · {number(item.hours_per_occurrence * item.occurrences_per_month)} hrs/month{item.is_sample ? " · Fictional sample input" : ""}</p></div>
        <div className={styles.heroActions}><button className={styles.secondary} disabled={state.busy} onClick={async () => { try { const record = await store.readWorkflow(item.id); setEditor(record); setFailure(null); } catch (error) { if (!(error instanceof AccountChangedError)) setFailure(error); } }}>Edit {item.name}</button><button className={styles.secondary} disabled={state.busy} onClick={() => setDeleting(item)}>Delete {item.name}</button></div>
      </li>)}</ul>
      {state.workflows.cursor && <div className={styles.detail}><button className={styles.secondary} disabled={state.workflows.loading || state.busy} onClick={() => void store.loadWorkflows(true)}>Load more workflows</button></div>}
    </section>}
    {createWorkspace && <PreviewWorkspaceForm mode="account" onClose={() => setCreateWorkspace(false)} onSave={async (name) => { await store.createWorkspace(name); setCreateWorkspace(false); }} />}
    {editor && state.workspaceId && <AccountWorkflowEditor key={editor === "new" ? `new:${state.workspaceId}` : editor.id} store={store} record={editor === "new" ? undefined : editor} workspaceId={state.workspaceId} onClose={() => setEditor(null)} />}
    {state.detail && <Modal title={state.detail.name} subtitle={`Saved account results · baseline v${state.detail.baseline_version}`} onClose={() => store.closeDetail()} wide>
      <AccountWorkflowResults key={`${state.generation}:${state.workspaceId}:${state.detail.id}`} parent={store} workflow={state.detail} onEdit={(record) => { store.closeDetail(); setEditor(record); }} />
    </Modal>}
    {deleting && <Modal title="Delete saved workflow?" subtitle={deleting.name} onClose={() => setDeleting(null)}><div className={styles.detail}><p>This permanently deletes this account workflow and its baseline history, analysis, scenarios and measurements.</p>{failure !== null && <FailureNotice error={failure} />}<div className={styles.formFooter}><button className={styles.secondary} disabled={state.busy} onClick={() => setDeleting(null)}>Keep workflow</button><button className={styles.danger} disabled={state.busy} onClick={async () => { try { await store.deleteWorkflow(deleting.id); setDeleting(null); setFailure(null); } catch (error) { if (!(error instanceof AccountChangedError)) setFailure(error); } }}>{state.busy ? "Deleting…" : "Delete account workflow"}</button></div></div></Modal>}
  </>;
}

function AccountWorkflowEditor({ store, record, workspaceId, onClose }: { store: AccountStore; record?: ApiWorkflow; workspaceId: string; onClose(): void }) {
  const [base, setBase] = useState(record);
  const [stale, setStale] = useState(false);
  const [latest, setLatest] = useState<ApiWorkflow | null>(null);
  const [readError, setReadError] = useState<unknown>(null);
  const [reading, setReading] = useState(false);
  async function readLatest() {
    if (!record) return;
    setReading(true);
    try { setLatest(await store.readWorkflow(record.id)); setReadError(null); }
    catch (error) { if (!(error instanceof AccountChangedError)) setReadError(error); }
    finally { setReading(false); }
  }
  async function save(draft: WorkflowDraft) {
    try { await store.saveWorkflow(draft, base); onClose(); }
    catch (error) {
      if (error instanceof ApiClientError && error.status === 409) { setStale(true); setLatest(null); await readLatest(); }
      throw error;
    }
  }
  const reconciliation = stale && <section className={styles.formNote} aria-label="Stale edit reconciliation"><h3>Review the latest baseline before saving</h3><p>Your draft below is retained. No write will be retried automatically. Review every difference, then explicitly choose whether to keep your draft against the new version or discard it.</p>
    {readError !== null && <FailureNotice error={readError} />}
    <button type="button" className={styles.secondary} disabled={reading} onClick={() => void readLatest()}>{reading ? "Loading baseline…" : "Refetch latest baseline"}</button>
    {latest && <><p>Latest saved baseline: v{latest.baseline_version}</p><dl>{([["name", "Name"], ["description", "Description"], ["hours_per_occurrence", "Hours per occurrence"], ["occurrences_per_month", "Occurrences per month"], ["hourly_cost", "Hourly cost (USD)"], ["current_tools", "Current tools"], ["pain_points", "Pain points"], ["risk", "Risk"], ["data_availability", "Data availability"], ["is_sample", "Fictional sample input"]] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{String(latest[key])}</dd></div>)}</dl><button type="button" className={styles.secondary} onClick={() => { setBase(latest); setStale(false); }}>Use latest version; keep my draft for review</button></>}
    <button type="button" className={styles.secondary} onClick={onClose}>Discard draft</button>
  </section>;
  return <PreviewWorkflowForm mode="account" record={base} workspaceId={workspaceId} onSave={save} onClose={onClose} notice={reconciliation} saveDisabled={stale || reading} />;
}
