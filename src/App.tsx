import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  INITIAL_STEPS,
  INITIAL_TOOLS,
  INITIAL_FINDINGS,
  INITIAL_QUERIES,
  INITIAL_COMPETITORS,
  INITIAL_OPPORTUNITIES,
  INITIAL_KPIS,
  INITIAL_NOTIFICATIONS,
  BRAND_TREND,
  COMP_TREND
} from './data';
import { LayoutMode, Project, AnalysisRun, RunResults, StepItem, ToolActivityItem } from './types';
import { VistaIcon, AIVistaLogo } from './components/VistaIcon';
import { updateExperimentApproval } from './lib/firestoreService';
import { NewAnalysisModal } from './components/NewAnalysisModal';
import { fetchRunResults } from './lib/projectApiClient';
import { AISearchDrawerContent } from './components/AISearchDrawerContent';

function smooth(vals: number[], x0: number, dx: number, y0: number, scale: number) {
  const pts = vals.map((v, n) => [x0 + n * dx, y0 - v * scale]);
  let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (let n = 0; n < pts.length - 1; n++) {
    const p = pts[n];
    const q = pts[n + 1];
    const mx = (p[0] + q[0]) / 2;
    d += ' C' + mx.toFixed(1) + ' ' + p[1].toFixed(1) + ' ' + mx.toFixed(1) + ' ' + q[1].toFixed(1) + ' ' + q[0].toFixed(1) + ' ' + q[0].toFixed(1);
  }
  return { d, pts };
}

export default function App() {
  const TOTAL = 9;
  const brandName = 'Relay CRM';

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [openTool, setOpenTool] = useState<number | null>(0);
  const [manualTool, setManualTool] = useState<boolean>(false);
  const [openFinding, setOpenFinding] = useState<number | null>(0);
  const [drawer, setDrawer] = useState<'queries' | 'evidence' | null>(null);
  const [approved, setApproved] = useState<boolean>(false);
  const [modifyOpen, setModifyOpen] = useState<boolean>(false);
  const [scope, setScope] = useState<number[]>([0, 1]);
  const [newAnalysisModalOpen, setNewAnalysisModalOpen] = useState<boolean>(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeRun, setActiveRun] = useState<AnalysisRun | null>(null);
  const [runResults, setRunResults] = useState<RunResults | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [layout, setLayout] = useState<LayoutMode>('Command rail');
  const [nav, setNav] = useState<string>('sec-analysis');
  const [railCollapsed, setRailCollapsed] = useState<boolean>(false);
  const [bellOpen, setBellOpen] = useState<boolean>(false);
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [unread, setUnread] = useState<string[]>(['n1', 'n2']);
  const [vw, setVw] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1440);

  const timerRef = useRef<any>(null);

  // Dynamic steps based on real website crawl & queries or default demo
  const effectiveSteps = useMemo<StepItem[]>(() => {
    if (!activeProject || !runResults?.analysis) {
      return INITIAL_STEPS;
    }
    const pagesCount = runResults.pages?.length || 1;
    const queriesCount = runResults.queries?.length || 24;
    const domain = activeProject.websiteUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const category = runResults.analysis.industryCategory || activeProject.industry || 'B2B Software';
    const target = runResults.analysis.targetCustomers?.[0] || activeProject.targetAudience || 'Target buyers';

    const searchResults = runResults.searchResults || [];
    const mentionCount = searchResults.filter((r) => r.brandMentioned).length;
    const recCount = searchResults.filter((r) => r.brandRecommended).length;
    const isAiEvaluating = activeRun?.progressStage === 'evaluating_ai_search';
    const completedCount = activeRun?.completedSearchQueriesCount || searchResults.length;
    const totalCount = activeRun?.totalSearchQueriesCount || queriesCount;

    return [
      { label: 'Website analyzed', short: 'Website', meta: `${domain} · ${pagesCount} pages crawled`, tool: 0 },
      { label: 'Product category identified', short: 'Category', meta: `${category}`, tool: 0 },
      { label: 'Target customers identified', short: 'Customers', meta: `${target}`, tool: 0 },
      { label: `Generated ${queriesCount} high-intent customer queries`, short: `${queriesCount} queries`, meta: `${new Set(runResults.queries?.map((q) => q.intent)).size || 4} intent classes`, tool: 1 },
      {
        label: isAiEvaluating
          ? `Evaluating AI search (${completedCount}/${totalCount})`
          : searchResults.length > 0
          ? `Tested ${searchResults.length} queries across AI search`
          : 'Testing AI search visibility',
        short: isAiEvaluating ? `${completedCount}/${totalCount} analyzed` : 'AI responses',
        meta: searchResults.length > 0
          ? `${mentionCount}/${searchResults.length} mentioned · ${recCount} recommended`
          : 'Gemini AI Search Analysis',
        tool: 2
      },
      INITIAL_STEPS[5],
      INITIAL_STEPS[6],
      INITIAL_STEPS[7],
      INITIAL_STEPS[8]
    ];
  }, [activeProject, runResults, activeRun]);

  // Dynamic tool activities based on real website crawl, queries & AI search results
  const effectiveTools = useMemo<ToolActivityItem[]>(() => {
    if (!activeProject || !runResults?.analysis) {
      return INITIAL_TOOLS;
    }
    const pages = runResults.pages || [];
    const analysis = runResults.analysis;
    const queries = runResults.queries || [];
    const searchResults = runResults.searchResults || [];
    const mentionCount = searchResults.filter((r) => r.brandMentioned).length;
    const recCount = searchResults.filter((r) => r.brandRecommended).length;
    const groundedCount = searchResults.filter((r) => r.isSearchGrounded).length;
    const allDetectedComps = Array.from(
      new Set(searchResults.flatMap((r) => r.competitorsMentioned || []))
    );
    const totalCitations = searchResults.reduce((acc, r) => acc + (r.citations?.length || 0), 0);

    const isAiEvaluating = activeRun?.progressStage === 'evaluating_ai_search';
    const completedCount = activeRun?.completedSearchQueriesCount || searchResults.length;
    const totalCount = activeRun?.totalSearchQueriesCount || queries.length || 24;

    const tool0: ToolActivityItem = {
      glyph: 'lens',
      name: 'Analyzing Website',
      firstStep: 0,
      lastStep: 2,
      summary: `Crawled ${activeProject.websiteUrl} to establish what ${activeProject.companyName} sells, target buyers, and key offerings.`,
      bullets: [
        `${pages.length} pages extracted: ${pages.map((p) => p.title.slice(0, 24)).filter(Boolean).join(', ') || 'Homepage & navigation'}`,
        `Category: ${analysis.industryCategory}`,
        `Description: ${analysis.companyDescription.slice(0, 115)}...`,
        analysis.competitorsMentioned.length > 0 ? `Competitors identified: ${analysis.competitorsMentioned.slice(0, 4).join(', ')}` : 'No direct competitor comparison pages found'
      ]
    };

    const tool1: ToolActivityItem = {
      glyph: 'bolt',
      name: 'Generating Search Queries',
      firstStep: 3,
      lastStep: 3,
      summary: `Generated ${queries.length} realistic buyer questions that prospective customers ask AI engines about ${activeProject.companyName}.`,
      bullets: [
        `${queries.length} queries across category, comparison, evaluative, and intent-to-buy`,
        `Primary target buyer: ${analysis.targetCustomers.slice(0, 2).join(', ') || 'Decision makers'}`,
        `Weighted by purchase intent and buyer evaluation criteria`
      ]
    };

    const tool2: ToolActivityItem = {
      glyph: 'globe',
      name: 'Testing AI Responses',
      firstStep: 4,
      lastStep: 4,
      summary: searchResults.length > 0
        ? `${searchResults.length} high-intent queries analyzed across AI models for ${activeProject.companyName}.`
        : isAiEvaluating
        ? `Evaluating AI search visibility (${completedCount}/${totalCount} queries analyzed)...`
        : `${queries.length || 24} high-intent customer queries queued for AI search visibility analysis.`,
      bullets: searchResults.length > 0
        ? [
            `${activeProject.companyName} was mentioned in ${mentionCount} of ${searchResults.length} queries (${Math.round((mentionCount / searchResults.length) * 100)}% mention rate)`,
            recCount > 0
              ? `${activeProject.companyName} was recommended in ${recCount} queries (${Math.round((recCount / searchResults.length) * 100)}% recommendation rate)`
              : `${activeProject.companyName} was not recommended as the primary pick in evaluated queries`,
            allDetectedComps.length > 0
              ? `${allDetectedComps.length} competitors detected in AI answers: ${allDetectedComps.slice(0, 4).join(', ')}`
              : 'No major competitors detected in answers',
            groundedCount > 0
              ? `Search grounding: ${groundedCount} queries search-backed (${totalCitations} real citations)`
              : 'Direct model response (unbiased AI evaluation, zero fabricated citations)'
          ]
        : [
            isAiEvaluating
              ? `Running server-side Gemini evaluations (${completedCount}/${totalCount})`
              : 'Queries prepared for multi-provider testing',
            'Evaluating brand mention, recommendation context, and competitor presence',
            'Tracking genuine citations returned by search providers'
          ],
      hasLink: searchResults.length > 0,
      linkLabel: `View all ${searchResults.length} evaluated queries & AI answers`,
      drawer: 'queries'
    };

    return [tool0, tool1, tool2, INITIAL_TOOLS[3], INITIAL_TOOLS[4], INITIAL_TOOLS[5]];
  }, [activeProject, runResults, activeRun]);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      const el = document.getElementById('agent-workspace');
      const w = el ? el.getBoundingClientRect().width : window.innerWidth;
      if (w > 0) setVw(w);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-hdr-menu]')) {
        setBellOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('click', handleDocClick, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleDocClick, true);
    };
  }, []);

  // Investigation progression simulation (runs only when no active run is being tracked)
  useEffect(() => {
    if (activeRun) {
      clearInterval(timerRef.current);
      return;
    }

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= TOTAL) {
          clearInterval(timerRef.current);
          return prev;
        }
        const next = prev + 1;
        if (!manualTool) {
          setOpenTool(next >= TOTAL ? 5 : effectiveSteps[next].tool);
        }
        return next;
      });
    }, 1650);

    return () => clearInterval(timerRef.current);
  }, [manualTool, activeRun, effectiveSteps]);

  // Real Analysis Run Polling
  useEffect(() => {
    if (!activeRun) return;

    let isMounted = true;
    let pollTimeout: any = null;

    const poll = async () => {
      try {
        const data = await fetchRunResults(activeRun.id);
        if (!isMounted) return;

        setActiveRun(data.run);
        setRunResults(data);

        if (data.run.status === 'queued') {
          setStepIndex(0);
          setOpenTool(0);
        } else if (data.run.status === 'running') {
          setRunError(null);
          if (data.run.progressStage === 'crawling') {
            setStepIndex(0);
            setOpenTool(0);
          } else if (data.run.progressStage === 'analyzing') {
            setStepIndex(2);
            setOpenTool(0);
          } else if (data.run.progressStage === 'generating_queries') {
            setStepIndex(3);
            setOpenTool(1);
          } else if (data.run.progressStage === 'evaluating_ai_search') {
            setStepIndex(4);
            setOpenTool(2);
          }
        } else if (data.run.status === 'completed') {
          setRunError(null);
          setStepIndex(5);
          setOpenTool(2);
          const resCount = data.searchResults?.length || 0;
          setStatusMessage(`AI Search Analysis completed! Evaluated ${resCount} high-intent queries across AI models.`);
          setTimeout(() => setStatusMessage(null), 8000);
          return; // terminal state
        } else if (data.run.status === 'failed') {
          setRunError(data.run.error || 'Website crawl and analysis failed');
          return; // terminal state
        }

        // Keep polling if queued or running
        if (data.run.status === 'queued' || data.run.status === 'running') {
          pollTimeout = setTimeout(poll, 1500);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Error polling run:', err);
        pollTimeout = setTimeout(poll, 2500);
      }
    };

    poll();

    return () => {
      isMounted = false;
      clearTimeout(pollTimeout);
    };
  }, [activeRun?.id]);

  const replay = () => {
    clearInterval(timerRef.current);
    setStepIndex(0);
    setOpenTool(0);
    setManualTool(false);
    setOpenFinding(0);
    setApproved(false);
    setModifyOpen(false);
    setDrawer(null);
  };

  const handleNewAnalysisSuccess = (project: Project, run: AnalysisRun) => {
    setActiveProject(project);
    setActiveRun(run);
    setRunResults(null);
    setRunError(null);
    setStatusMessage(`Project "${project.companyName}" created (Run ID: ${run.id.slice(0, 14)}…). Starting crawler and AI investigation…`);
    setTimeout(() => setStatusMessage(null), 6000);
    replay();
  };

  const handleApprove = () => {
    setApproved(true);
    setModifyOpen(false);
    updateExperimentApproval('current_run', true, scope);
  };

  const handleUndoApprove = () => {
    setApproved(false);
    updateExperimentApproval('current_run', false, scope);
  };

  const scrollTo = (id: string, offset = 100) => {
    const el = document.getElementById(id);
    if (!el) return;
    const de = document.documentElement;
    const start = window.scrollY || de.scrollTop || 0;
    const max = Math.max(0, de.scrollHeight - de.clientHeight);
    const target = Math.max(0, Math.min(max, start + el.getBoundingClientRect().top - offset));
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  const goTo = (id: string) => {
    if (id === 'sec-queries-open') {
      setNav(id);
      setDrawer('queries');
      return;
    }
    const complete = stepIndex >= TOTAL;
    const locked = !complete && (id === 'sec-diagnosis' || id === 'sec-complete' || id === 'agent-recommendation');
    const dest = locked ? 'sec-locked' : id;
    setNav(id);
    scrollTo(dest, 100);
  };

  const isComplete = stepIndex >= TOTAL;
  const activeTool = isComplete ? 5 : effectiveSteps[Math.min(stepIndex, TOTAL - 1)].tool;
  const effectiveLayout: LayoutMode = vw < 1100 && layout === 'Command rail' ? 'Stream' : layout;

  const NAV_GROUPS = [
    {
      title: 'Main',
      items: [
        { label: 'Overview', icon: 'home', id: 'sec-overview' },
        { label: 'AI Search Analysis', icon: 'lens', id: 'sec-analysis' },
        { label: 'Competitors', icon: 'rivals', id: 'sec-competitors' },
        { label: 'Opportunities', icon: 'spark', id: 'sec-opportunities' },
        { label: 'Queries', icon: 'list', id: 'sec-queries-open' },
        { label: 'Experiments', icon: 'bars', id: 'agent-recommendation' }
      ]
    },
    {
      title: 'Intelligence',
      items: [
        { label: 'Visibility Insights', icon: 'bulb', id: 'sec-trend' },
        { label: 'Citation Intelligence', icon: 'link', id: 'sec-citations' },
        { label: 'Content Gaps', icon: 'gap', id: 'sec-diagnosis' },
        { label: 'Reports', icon: 'doc', id: 'sec-complete' }
      ]
    }
  ];

  // Visual trend chart calculations
  const brandCurve = smooth(BRAND_TREND, 62, 74, 250, 2.1);
  const compCurve = smooth(COMP_TREND, 62, 74, 250, 2.1);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const markerMidX = (62 + 6 * 74).toFixed(1);
  const markerBrandY = (250 - BRAND_TREND[6] * 2.1).toFixed(1);
  const markerCompY = (250 - COMP_TREND[6] * 2.1).toFixed(1);
  const tipX = (62 + 6 * 74 - 78).toFixed(1);
  const tipTextX = markerMidX;
  const brandLabelY = (250 - BRAND_TREND[11] * 2.1 - 12).toFixed(1);
  const brandTextY = (250 - BRAND_TREND[11] * 2.1 + 4.5).toFixed(1);
  const compLabelY = (250 - COMP_TREND[11] * 2.1 - 12).toFixed(1);
  const compTextY = (250 - COMP_TREND[11] * 2.1 + 4.5).toFixed(1);

  const unlockedFindings = Math.max(0, Math.min(3, stepIndex - 5));
  const visibleFindings = INITIAL_FINDINGS.slice(0, isComplete ? 3 : unlockedFindings);

  const scopeOptions = ['Comparison page', 'Alternatives page', 'Third-party roundups', 'Pricing clarity'];

  return (
    <div style={{ minHeight: '100vh', background: '#f4f7fb', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>

        {/* Collapsible Sidebar */}
        <div
          id="aivista-sidebar"
          style={{
            flex: 'none',
            width: railCollapsed ? '74px' : '232px',
            height: '100vh',
            position: 'sticky',
            top: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            transition: 'width .26s cubic-bezier(.2,.7,.2,1)',
            backgroundColor: '#0a1533',
            backgroundImage: 'linear-gradient(176deg, rgba(8,17,42,.9) 0%, rgba(8,17,42,.72) 45%, rgba(8,17,42,.9) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
            padding: '22px 14px 26px',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            zIndex: 40
          }}
        >
          {/* Logo & Toggle Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: railCollapsed ? 'center' : 'flex-start', gap: '11px', padding: '0 4px' }}>
            {!railCollapsed && (
              <>
                <AIVistaLogo size={32} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ font: '700 17px/1.1 Inter,sans-serif', letterSpacing: '-.02em', color: '#fff', whiteSpace: 'nowrap' }}>AIVista</div>
                  <div style={{ marginTop: '4px', font: '400 10px/1.1 Inter,sans-serif', color: 'rgba(255,255,255,.45)' }}>AI Search Revenue Agent</div>
                </div>
              </>
            )}
            <button
              type="button"
              id="sidebar-toggle-btn"
              onClick={() => setRailCollapsed(!railCollapsed)}
              title={railCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '7px',
                border: 0,
                background: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,.62)',
                font: '400 13px/1 Inter,sans-serif',
                cursor: 'pointer',
                flex: 'none',
                transform: railCollapsed ? 'rotate(180deg)' : 'none',
                transition: 'transform .26s ease'
              }}
            >
              ‹
            </button>
          </div>

          {/* Navigation Groups */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {NAV_GROUPS.map((g, gIdx) => (
              <div key={gIdx}>
                {!railCollapsed && (
                  <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', padding: '0 11px 8px' }}>
                    {g.title}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {g.items.map((it, itIdx) => {
                    const active = nav === it.id;
                    const locked = !isComplete && (it.id === 'sec-diagnosis' || it.id === 'sec-complete' || it.id === 'agent-recommendation');
                    return (
                      <div
                        key={itIdx}
                        id={`nav-${it.id}`}
                        onClick={() => goTo(it.id)}
                        title={it.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: railCollapsed ? 'center' : 'flex-start',
                          gap: '13px',
                          padding: '10px 11px',
                          borderRadius: '9px',
                          background: active ? 'rgba(59,130,246,.18)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                      >
                        <VistaIcon
                          name={it.icon}
                          color={active ? '#bfdbfe' : locked ? 'rgba(255,255,255,.28)' : 'rgba(255,255,255,.5)'}
                          size={16}
                        />
                        {!railCollapsed && (
                          <span
                            style={{
                              font: active ? '600 12.5px/1 Inter,sans-serif' : '500 12.5px/1 Inter,sans-serif',
                              color: active ? '#fff' : locked ? 'rgba(255,255,255,.34)' : 'rgba(255,255,255,.62)',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {it.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1 }} />
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Sticky Top Header */}
          <div
            id="aivista-topbar"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              background: 'linear-gradient(180deg,#fbfcff,#f7f9fe)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid #e4eaf4',
              overflowX: 'auto',
              overflowY: 'hidden'
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: '18px', height: '82px', minWidth: '720px', padding: '0 26px' }}>
              <div style={{ flex: '1 1 330px', minWidth: '300px', display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 14px', borderRadius: '12px', border: '1px solid #e4eaf4', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
                <VistaIcon name="lens" color="#64748b" size={17} />
                <span style={{ flex: '1', minWidth: 0, font: '400 13px/1 Inter,sans-serif', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Search queries, competitors, insights…
                </span>
                <span style={{ display: 'flex', gap: '4px', flex: 'none' }}>
                  <span style={{ minWidth: '22px', padding: '5px 0', borderRadius: '6px', border: '1px solid #e4eaf4', background: '#f8fafc', font: '600 11px/1 Inter,sans-serif', color: '#64748b', textAlign: 'center' }}>⌘</span>
                  <span style={{ minWidth: '22px', padding: '5px 0', borderRadius: '6px', border: '1px solid #e4eaf4', background: '#f8fafc', font: '600 11px/1 Inter,sans-serif', color: '#64748b', textAlign: 'center' }}>K</span>
                </span>
              </div>

              <button
                type="button"
                id="btn-new-analysis"
                onClick={() => setNewAnalysisModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  padding: '13px 20px',
                  borderRadius: '11px',
                  border: 0,
                  background: '#1d5cf0',
                  color: '#fff',
                  font: '600 13.5px/1 Inter,sans-serif',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(29,92,240,.32)',
                  flex: 'none'
                }}
              >
                <VistaIcon name="plus" color="#fff" size={15} />
                New Analysis
              </button>

              <div style={{ width: '1px', height: '34px', background: '#e4eaf4', flex: 'none' }} />

              {/* Notification Flyout */}
              <div data-hdr-menu="bell" style={{ position: 'relative', flex: 'none' }}>
                <button
                  type="button"
                  id="btn-notifications"
                  onClick={() => { setBellOpen(!bellOpen); setProfileOpen(false); }}
                  style={{
                    position: 'relative',
                    width: '40px',
                    height: '40px',
                    borderRadius: '11px',
                    border: 0,
                    background: bellOpen ? '#eef4ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <VistaIcon name="bell" color="#334155" size={19} />
                  {unread.length > 0 && (
                    <span style={{ position: 'absolute', top: '6px', right: '7px', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', border: '1.5px solid #fff' }} />
                  )}
                </button>
              </div>

              {/* Profile Dropdown */}
              <div data-hdr-menu="profile" style={{ position: 'relative', flex: 'none' }}>
                <button
                  type="button"
                  id="btn-profile"
                  onClick={() => { setProfileOpen(!profileOpen); setBellOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    padding: '5px 9px 5px 5px',
                    borderRadius: '12px',
                    border: 0,
                    background: profileOpen ? '#eef4ff' : 'transparent',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0b1530', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 13px/1 Inter,sans-serif', flex: 'none' }}>
                    SP
                  </span>
                  <span style={{ minWidth: 0, textAlign: 'left' }}>
                    <span style={{ display: 'block', font: '600 13.5px/1.2 Inter,sans-serif', color: '#0f172a', whiteSpace: 'nowrap' }}>Sneha</span>
                    <span style={{ display: 'block', marginTop: '3px', font: '400 11.5px/1.2 Inter,sans-serif', color: '#64748b', whiteSpace: 'nowrap' }}>Product Manager</span>
                  </span>
                  <span style={{ font: '400 11px/1 Inter,sans-serif', color: '#94a3b8', flex: 'none', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }}>▾</span>
                </button>
              </div>
            </div>
          </div>

          {/* Page Body Workspace */}
          <div style={{ padding: '24px' }}>
            <div id="agent-workspace" style={{ maxWidth: effectiveLayout === 'Stream' ? '880px' : '1440px', margin: '0 auto' }}>

              {/* Title & Layout Controls */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '16px', marginBottom: '20px' }}>
                <div style={{ flex: '1 1 380px', minWidth: '260px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                    <h1 style={{ margin: 0, font: '700 25px/1.2 Inter,sans-serif', letterSpacing: '-.025em' }}>AI Agent Investigation</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 12px', borderRadius: '999px', background: isComplete ? '#ecfdf5' : '#eff4fe', border: `1px solid ${isComplete ? '#a7f3d0' : '#cddcfa'}` }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isComplete ? '#059669' : '#2563eb' }} />
                      <span style={{ font: '600 11.5px/1 Inter,sans-serif', color: isComplete ? '#059669' : '#2563eb', whiteSpace: 'nowrap' }}>
                        {isComplete ? 'Investigation complete' : 'Agent investigating'}
                      </span>
                    </div>
                  </div>
                  <p style={{ margin: '9px 0 0', font: '400 14px/1.5 Inter,sans-serif', color: '#64748b', maxWidth: '64ch' }}>
                    Watching the agent work: what it looked at, what it found, why it prioritised one gap over the others — and the single action it wants you to approve.
                  </p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '3px', borderRadius: '10px', background: '#eef2f7', border: '1px solid #e2e8f0' }}>
                    {(['Command rail', 'Case file', 'Stream'] as LayoutMode[]).map((label) => {
                      const on = layout === label;
                      return (
                        <button
                          key={label}
                          type="button"
                          id={`layout-btn-${label.toLowerCase().replace(' ', '-')}`}
                          onClick={() => setLayout(label)}
                          style={{
                            padding: '8px 12px',
                            border: 0,
                            borderRadius: '7px',
                            background: on ? '#fff' : 'transparent',
                            color: on ? '#0f172a' : '#64748b',
                            font: '600 11.5px/1 Inter,sans-serif',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            boxShadow: on ? '0 1px 2px rgba(15,23,42,.1)' : 'none'
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    id="btn-replay-run"
                    onClick={replay}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '9px',
                      border: '1px solid #e2e8f0',
                      background: '#fff',
                      color: '#475569',
                      font: '600 12px/1 Inter,sans-serif',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Replay run
                  </button>
                </div>
              </div>

              {/* Case File Header Rail if selected */}
              {effectiveLayout === 'Case file' && (
                <div style={{ marginBottom: '18px', borderRadius: '14px', background: 'linear-gradient(150deg,#0a1533,#0c1c42)', border: '1px solid rgba(147,197,253,.14)', padding: '20px 22px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: '18px' }}>
                    <div style={{ flex: '1 1 340px', minWidth: '260px' }}>
                      <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.16em', textTransform: 'uppercase', color: '#93c5fd' }}>Current goal</div>
                      <p style={{ margin: '9px 0 0', font: '500 15px/1.45 Inter,sans-serif', color: 'rgba(255,255,255,.94)', maxWidth: '62ch' }}>
                        Investigate why {brandName} is underperforming in AI search recommendations — and why competitors are recommended instead.
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                      <div style={{ position: 'relative', width: '36px', height: '36px', borderRadius: '50%', background: `conic-gradient(#60a5fa ${Math.round((stepIndex / TOTAL) * 360)}deg, rgba(255,255,255,.12) 0)`, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0b1938', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 10px/1 Inter,sans-serif', color: '#93c5fd' }}>
                          {Math.round((stepIndex / TOTAL) * 100)}%
                        </div>
                      </div>
                      <div style={{ font: '500 12px/1.35 Inter,sans-serif', color: 'rgba(255,255,255,.6)', maxWidth: '200px' }}>
                        {isComplete ? '9 of 9 steps · all tools returned' : `Step ${Math.min(stepIndex + 1, TOTAL)} of 9 · ${effectiveSteps[Math.min(stepIndex, TOTAL - 1)].label.toLowerCase()}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '18px' }}>
                    {effectiveSteps.map((step, sIdx) => {
                      const isDone = sIdx < stepIndex;
                      const isActive = sIdx === stepIndex && !isComplete;
                      return (
                        <div
                          key={sIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 11px',
                            borderRadius: '999px',
                            background: isActive ? 'rgba(37,99,235,.2)' : 'rgba(255,255,255,.05)',
                            border: `1px solid ${isActive ? 'rgba(147,197,253,.4)' : 'rgba(255,255,255,.09)'}`,
                            opacity: sIdx > stepIndex ? 0.4 : 1
                          }}
                        >
                          {isDone && <span style={{ color: '#34d399', fontSize: '10px' }}>✓</span>}
                          {isActive && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60a5fa' }} />}
                          <span style={{ font: '500 11.5px/1 Inter,sans-serif', color: isActive ? '#bfdbfe' : '#fff' }}>{step.short}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Two Column Layout (Column A = Operations, Column B = Insights) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>

                {/* Column A: Agent Workspace / Timeline */}
                <div
                  id="col-agent-operations"
                  style={{
                    flex: effectiveLayout === 'Command rail' ? '1 1 320px' : '1 1 100%',
                    maxWidth: effectiveLayout === 'Command rail' ? '380px' : '100%',
                    minWidth: '280px',
                    position: effectiveLayout === 'Command rail' ? 'sticky' : 'static',
                    top: '100px'
                  }}
                >
                  <div style={{ borderRadius: '14px', background: 'linear-gradient(160deg,#0a1533,#0c1c42)', border: '1px solid rgba(147,197,253,.14)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,.07)', border: '1px solid rgba(147,197,253,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                        <AIVistaLogo size={24} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ font: '600 14px/1.2 Inter,sans-serif', color: '#fff' }}>Vista Revenue Agent</div>
                        <div style={{ marginTop: '3px', font: '500 11.5px/1.3 Inter,sans-serif', color: 'rgba(255,255,255,.5)' }}>
                          {isComplete ? 'Investigation closed · awaiting your approval' : 'Autonomous · human approval required'}
                        </div>
                      </div>
                    </div>

                    {effectiveLayout !== 'Case file' && (
                      <>
                        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                          <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.16em', textTransform: 'uppercase', color: '#93c5fd' }}>Current goal</div>
                          <p style={{ margin: '10px 0 0', font: '500 14px/1.45 Inter,sans-serif', color: 'rgba(255,255,255,.92)' }}>
                            Investigate why {activeProject ? activeProject.companyName : brandName} is underperforming in AI search recommendations — and why competitors are recommended instead.
                          </p>
                          {runError && (
                            <div style={{ marginTop: '12px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,.18)', border: '1px solid rgba(239,68,68,.38)', color: '#fca5a5', font: '500 12px/1.4 Inter,sans-serif' }}>
                              <div style={{ fontWeight: 600 }}>Investigation error:</div>
                              <div>{runError}</div>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginTop: '16px' }}>
                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `conic-gradient(#60a5fa ${Math.round((stepIndex / TOTAL) * 360)}deg, rgba(255,255,255,.12) 0)`, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#0b1938', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 9.5px/1 Inter,sans-serif', color: '#93c5fd' }}>
                                {Math.round((stepIndex / TOTAL) * 100)}%
                              </div>
                            </div>
                            <div style={{ font: '500 11.5px/1.35 Inter,sans-serif', color: 'rgba(255,255,255,.6)' }}>
                              {isComplete ? '9 of 9 steps · all tools returned' : `Step ${Math.min(stepIndex + 1, TOTAL)} of 9 · ${effectiveSteps[Math.min(stepIndex, TOTAL - 1)].label.toLowerCase()}`}
                            </div>
                          </div>
                        </div>

                        {/* Investigation Timeline */}
                        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                          <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)' }}>Investigation timeline</div>
                          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
                            {effectiveSteps.map((step, sIdx) => {
                              const isDone = sIdx < stepIndex;
                              const isActive = sIdx === stepIndex && !isComplete;
                              const isPending = sIdx > stepIndex;
                              return (
                                <div key={sIdx} style={{ display: 'flex', gap: '11px', alignItems: 'flex-start', padding: '6px 0', opacity: isPending ? 0.4 : 1, transition: 'opacity .4s ease' }}>
                                  <div style={{ width: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none', alignSelf: 'stretch' }}>
                                    {isDone && (
                                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(16,185,129,.16)', border: '1px solid rgba(52,211,153,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.2 3.9 7.5 8.5 2.5" stroke="#34d399" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                      </div>
                                    )}
                                    {isActive && (
                                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1.5px solid rgba(96,165,250,.32)', borderTopColor: '#60a5fa', flex: 'none' }} />
                                    )}
                                    {isPending && (
                                      <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,.22)' }} />
                                      </div>
                                    )}
                                    <div style={{ flex: 1, width: '1px', background: 'rgba(255,255,255,.1)', margin: '4px 0 -6px' }} />
                                  </div>
                                  <div style={{ minWidth: 0, paddingBottom: '2px' }}>
                                    <div style={{ font: isActive ? '600 13px/1.35 Inter,sans-serif' : '500 13px/1.35 Inter,sans-serif', color: isActive ? '#bfdbfe' : isDone ? 'rgba(255,255,255,.88)' : 'rgba(255,255,255,.6)' }}>
                                      {step.label}
                                    </div>
                                    {(isDone || isActive) && (
                                      <div style={{ marginTop: '3px', font: '500 11px/1.35 Inter,sans-serif', color: 'rgba(255,255,255,.38)' }}>
                                        {step.meta}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Agent Activity Tools List */}
                    <div style={{ padding: '18px 20px 20px' }}>
                      <div id="sec-citations" style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', scrollMarginTop: '110px' }}>
                        Agent activity
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                        {effectiveTools.map((tool, tIdx) => {
                          const started = stepIndex >= tool.firstStep;
                          const running = !isComplete && started && tIdx === activeTool;
                          const done = isComplete || stepIndex > tool.lastStep;
                          const open = openTool === tIdx && started;
                          return (
                            <div
                              key={tIdx}
                              id={`tool-card-${tIdx}`}
                              style={{
                                flex: '1 1 100%',
                                minWidth: 0,
                                borderRadius: '11px',
                                border: `1px solid ${running ? 'rgba(147,197,253,.4)' : 'rgba(255,255,255,.08)'}`,
                                background: running ? 'rgba(37,99,235,.16)' : open ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.03)',
                                opacity: started ? 1 : 0.42,
                                transition: 'all .35s ease',
                                overflow: 'hidden'
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  if (started) {
                                    setOpenTool(open ? null : tIdx);
                                    setManualTool(true);
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  width: '100%',
                                  padding: '10px 11px',
                                  background: 'none',
                                  border: 0,
                                  cursor: 'pointer',
                                  textAlign: 'left'
                                }}
                              >
                                <span style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                                  <VistaIcon name={tool.glyph} color={started ? (running ? '#bfdbfe' : 'rgba(255,255,255,.72)') : 'rgba(255,255,255,.4)'} size={15} />
                                </span>
                                <span style={{ flex: 1, minWidth: 0, font: '600 12.5px/1.3 Inter,sans-serif', color: started ? '#fff' : 'rgba(255,255,255,.55)' }}>{tool.name}</span>
                                <span style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.1em', textTransform: 'uppercase', color: running ? '#93c5fd' : done ? '#34d399' : 'rgba(255,255,255,.32)', flex: 'none', whiteSpace: 'nowrap' }}>
                                  {running ? 'running' : done ? 'done' : 'queued'}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,.45)', fontSize: '10px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>▾</span>
                              </button>
                              {open && (
                                <div style={{ padding: '2px 13px 14px 45px' }}>
                                  <p style={{ margin: 0, font: '500 12px/1.5 Inter,sans-serif', color: 'rgba(255,255,255,.62)' }}>{tool.summary}</p>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                                    {tool.bullets.map((b, bIdx) => (
                                      <div key={bIdx} style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(147,197,253,.85)', flex: 'none', marginTop: '6px' }} />
                                        <span style={{ font: '500 12px/1.45 Inter,sans-serif', color: 'rgba(255,255,255,.82)' }}>{b}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {tool.hasLink && done && (
                                    <button
                                      type="button"
                                      onClick={() => setDrawer(tool.drawer || 'queries')}
                                      style={{ marginTop: '12px', padding: 0, background: 'none', border: 0, cursor: 'pointer', font: '600 12px/1 Inter,sans-serif', color: '#93c5fd' }}
                                    >
                                      {tool.linkLabel} →
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column B: Analytical Feed & Findings */}
                <div id="col-analytical-feed" style={{ flex: '1 1 420px', minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                  {/* Investigation Complete Banner */}
                  {isComplete && (
                    <div style={{ borderRadius: '14px', background: '#fff', border: '1px solid #e2e8f0', padding: '22px 24px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.2 3.9 7.5 8.5 2.5" stroke="#059669" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <div id="sec-complete" style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.16em', textTransform: 'uppercase', color: '#059669', scrollMarginTop: '130px' }}>
                          Investigation complete
                        </div>
                        <div style={{ flex: 1 }} />
                        <div style={{ font: '500 11.5px/1 Inter,sans-serif', color: '#94a3b8' }}>4m 12s · 13 Sep 2026</div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '18px' }}>
                        {[
                          { value: '24', label: 'Queries analyzed' },
                          { value: '5', label: 'Competitors detected' },
                          { value: '12', label: 'Citation sources analyzed' },
                          { value: '3', label: 'High-impact opportunities' }
                        ].map((s, idx) => (
                          <div key={idx} style={{ flex: '1 1 130px', minWidth: '120px', padding: '14px 15px', borderRadius: '11px', background: '#f8fafc', border: '1px solid #e9eef5' }}>
                            <div style={{ font: '700 24px/1 Inter,sans-serif', color: '#0f172a', letterSpacing: '-.025em' }}>{s.value}</div>
                            <div style={{ marginTop: '6px', font: '500 11.5px/1.35 Inter,sans-serif', color: '#64748b' }}>{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginTop: '16px', padding: '16px 18px', borderRadius: '12px', background: 'linear-gradient(150deg,#0a1533,#0c1c42)' }}>
                        <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
                          <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <VistaIcon name="bolt" color="#93c5fd" size={13} />
                            Top opportunity
                          </div>
                          <div style={{ marginTop: '9px', font: '600 15px/1.4 Inter,sans-serif', color: '#fff' }}>
                            Create competitor comparison content targeting high-intent AI search queries.
                          </div>
                          <div style={{ marginTop: '8px', font: '500 12.5px/1 Inter,sans-serif', color: 'rgba(255,255,255,.6)' }}>
                            Potential visibility impact <span style={{ color: '#34d399', fontWeight: 600 }}>+18%</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          id="btn-view-full-investigation"
                          onClick={() => scrollTo('agent-recommendation', 96)}
                          style={{ padding: '11px 16px', borderRadius: '9px', border: 0, background: '#fff', color: '#0f172a', font: '600 12.5px/1 Inter,sans-serif', cursor: 'pointer', flex: 'none' }}
                        >
                          View full investigation →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* KPI Metrics Grid (Unlocked at Step 5) */}
                  {stepIndex >= 5 && (
                    <>
                      <div id="sec-overview" style={{ display: 'grid', gridTemplateColumns: vw < 780 ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: '14px', scrollMarginTop: '100px' }}>
                        {INITIAL_KPIS.map((k, kIdx) => {
                          const lo = Math.min(...k.series);
                          const hi = Math.max(...k.series);
                          const span = hi - lo || 1;
                          const norm = k.series.map((v) => ((v - lo) / span) * 26);
                          const s = smooth(norm, 5, 190 / 11, 40, 1);
                          return (
                            <div key={kIdx} style={{ minWidth: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px 18px 12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                <span style={{ font: '600 12.5px/1 Inter,sans-serif', color: '#0f172a', whiteSpace: 'nowrap' }}>{k.label}</span>
                                <span style={{ width: '13px', height: '13px', borderRadius: '50%', border: '1.2px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 8.5px/1 Inter,sans-serif', color: '#94a3b8', flex: 'none' }}>i</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', marginTop: '12px' }}>
                                <span style={{ font: '700 30px/1 Inter,sans-serif', letterSpacing: '-.03em', color: '#0f172a' }}>{k.value}</span>
                                <span style={{ font: '600 12.5px/1 Inter,sans-serif', color: '#059669', whiteSpace: 'nowrap' }}>{k.delta}</span>
                              </div>
                              <svg viewBox="0 0 200 48" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '44px', marginTop: '10px' }}>
                                <path d={`${s.d} L195 46 L5 46 Z`} fill={k.fill} />
                                <path d={s.d} fill="none" stroke={k.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <div style={{ marginTop: '6px', font: '400 11px/1 Inter,sans-serif', color: '#94a3b8', whiteSpace: 'nowrap' }}>vs. last month</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* AI Visibility Trend Chart */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px 24px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '14px' }}>
                          <div style={{ flex: '1 1 280px', minWidth: '240px' }}>
                            <h2 id="sec-trend" style={{ margin: 0, font: '600 17px/1.2 Inter,sans-serif', letterSpacing: '-.015em', scrollMarginTop: '130px' }}>AI Visibility Trend</h2>
                            <p style={{ margin: '7px 0 0', font: '400 13px/1.45 Inter,sans-serif', color: '#64748b' }}>How often your brand appears in AI search recommendations</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 13px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', font: '600 12px/1 Inter,sans-serif', color: '#475569', whiteSpace: 'nowrap' }}>
                            Last 6 months <span style={{ color: '#94a3b8' }}>▾</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', marginTop: '14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#2563eb' }} /><span style={{ font: '500 12px/1 Inter,sans-serif', color: '#475569', whiteSpace: 'nowrap' }}>Your Brand</span></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444' }} /><span style={{ font: '500 12px/1 Inter,sans-serif', color: '#475569', whiteSpace: 'nowrap' }}>Competitor Average</span></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><span style={{ width: '9px', height: '9px', borderRadius: '2px', background: '#dbe6f8' }} /><span style={{ font: '500 12px/1 Inter,sans-serif', color: '#475569', whiteSpace: 'nowrap' }}>Gap widened</span></div>
                        </div>
                        <svg viewBox="0 0 900 320" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: 'auto', marginTop: '8px' }}>
                          <g stroke="#eef2f7" strokeWidth="1">
                            <line x1="62" y1="40" x2="876" y2="40" />
                            <line x1="62" y1="82" x2="876" y2="82" />
                            <line x1="62" y1="124" x2="876" y2="124" />
                            <line x1="62" y1="166" x2="876" y2="166" />
                            <line x1="62" y1="208" x2="876" y2="208" />
                            <line x1="62" y1="250" x2="876" y2="250" />
                          </g>
                          <g fontFamily="Inter,sans-serif" fontSize="12" fill="#94a3b8" textAnchor="end">
                            <text x="48" y="44">100</text><text x="48" y="86">80</text><text x="48" y="128">60</text><text x="48" y="170">40</text><text x="48" y="212">20</text><text x="48" y="254">0</text>
                          </g>
                          <rect x={Number(markerMidX) - 13} y="40" width="26" height="210" fill="#dbe6f8" opacity="0.5" />
                          <line x1={markerMidX} y1="14" x2={markerMidX} y2="250" stroke="#93b4e6" strokeWidth="1" strokeDasharray="4 4" />
                          <path d={compCurve.d} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d={brandCurve.d} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx={markerMidX} cy={markerCompY} r="5.5" fill="#ef4444" stroke="#fff" strokeWidth="2" />
                          <circle cx={markerMidX} cy={markerBrandY} r="5.5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
                          <g fontFamily="Inter,sans-serif" fontSize="12" fontWeight="600">
                            <rect x={tipX} y="0" width="156" height="27" rx="7" fill="#0f172a" />
                            <text x={tipTextX} y="18" fill="#fff" textAnchor="middle">Action Implemented</text>
                            <rect x="824" y={compLabelY} width="52" height="24" rx="6" fill="#ef4444" />
                            <text x="850" y={compTextY} fill="#fff" textAnchor="middle">78%</text>
                            <rect x="824" y={brandLabelY} width="52" height="24" rx="6" fill="#2563eb" />
                            <text x="850" y={brandTextY} fill="#fff" textAnchor="middle">62%</text>
                          </g>
                          <g fontFamily="Inter,sans-serif" fontSize="12" fill="#94a3b8" textAnchor="middle">
                            {months.map((m, idx) => (
                              <text key={idx} x={(62 + idx * 74).toFixed(1)} y="278">{m}</text>
                            ))}
                          </g>
                        </svg>
                      </div>

                      {/* Competitive Intelligence Table */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px 24px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '14px' }}>
                          <div style={{ flex: '1 1 280px', minWidth: '240px' }}>
                            <h2 id="sec-competitors" style={{ margin: 0, font: '600 17px/1.2 Inter,sans-serif', letterSpacing: '-.015em', scrollMarginTop: '130px' }}>Competitive Intelligence</h2>
                            <p style={{ margin: '7px 0 0', font: '400 13px/1.45 Inter,sans-serif', color: '#64748b' }}>How you compare against top competitors in AI search</p>
                          </div>
                          <button
                            type="button"
                            id="btn-detailed-evidence"
                            onClick={() => setDrawer('evidence')}
                            style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', color: '#2563eb', font: '600 12px/1 Inter,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            View detailed analysis
                          </button>
                        </div>
                        <div style={{ marginTop: '16px', overflowX: 'auto' }}>
                          <div style={{ minWidth: '700px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 10px 10px', borderBottom: '1px solid #eef2f7' }}>
                              <span style={{ flex: '0 0 200px', font: '600 11.5px/1 Inter,sans-serif', color: '#64748b', whiteSpace: 'nowrap' }}>Competitor</span>
                              <span style={{ flex: '0 0 96px', font: '600 11.5px/1 Inter,sans-serif', color: '#64748b', whiteSpace: 'nowrap' }}>Mention Rate</span>
                              <span style={{ flex: '0 0 96px', font: '600 11.5px/1 Inter,sans-serif', color: '#64748b', whiteSpace: 'nowrap' }}>Citation Rate</span>
                              <span style={{ flex: '0 0 150px', font: '600 11.5px/1 Inter,sans-serif', color: '#64748b', whiteSpace: 'nowrap' }}>Recommendation Rate</span>
                              <span style={{ flex: '0 0 96px', font: '600 11.5px/1 Inter,sans-serif', color: '#64748b', whiteSpace: 'nowrap' }}>Avg. Position</span>
                              <span style={{ flex: '0 0 64px', font: '600 11.5px/1 Inter,sans-serif', color: '#64748b', whiteSpace: 'nowrap', textAlign: 'right' }}>Gap</span>
                            </div>
                            {INITIAL_COMPETITORS.map((c, cIdx) => (
                              <div
                                key={cIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '13px 10px',
                                  borderBottom: '1px solid #f3f6fa',
                                  background: c.you ? '#f5f8ff' : 'transparent',
                                  borderRadius: '8px'
                                }}
                              >
                                <span style={{ flex: '0 0 200px', display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                  <span style={{ font: c.you ? '600 13px/1 Inter,sans-serif' : '500 13px/1 Inter,sans-serif', color: '#0f172a', whiteSpace: 'nowrap' }}>{c.name}</span>
                                </span>
                                <span style={{ flex: '0 0 96px', font: '500 13px/1 Inter,sans-serif', color: '#334155' }}>{c.mention}</span>
                                <span style={{ flex: '0 0 96px', font: '500 13px/1 Inter,sans-serif', color: '#334155' }}>{c.citation}</span>
                                <span style={{ flex: '0 0 150px', font: '500 13px/1 Inter,sans-serif', color: '#334155' }}>{c.rec}</span>
                                <span style={{ flex: '0 0 96px', font: '500 13px/1 Inter,sans-serif', color: '#334155' }}>{c.pos}</span>
                                <span style={{ flex: '0 0 64px', font: '600 13px/1 Inter,sans-serif', color: c.you ? '#94a3b8' : c.up ? '#dc2626' : '#059669', textAlign: 'right', whiteSpace: 'nowrap' }}>{c.gap}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Key Opportunities */}
                      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px 24px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                          <h2 id="sec-opportunities" style={{ flex: '1 1 240px', margin: 0, font: '600 17px/1.2 Inter,sans-serif', letterSpacing: '-.015em', scrollMarginTop: '130px' }}>Key Opportunities</h2>
                          <button
                            type="button"
                            onClick={() => scrollTo('agent-recommendation', 96)}
                            style={{ padding: 0, background: 'none', border: 0, cursor: 'pointer', font: '600 12px/1 Inter,sans-serif', color: '#2563eb', whiteSpace: 'nowrap' }}
                          >
                            View all opportunities
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: vw < 760 ? 'minmax(0,1fr)' : 'repeat(3,minmax(0,1fr))', gap: '14px', marginTop: '16px' }}>
                          {INITIAL_OPPORTUNITIES.map((o, oIdx) => (
                            <div key={oIdx} style={{ minWidth: 0, border: '1px solid #e6ecf4', borderRadius: '12px', background: '#fbfcfe', padding: '16px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eef4ff', border: '1px solid #cddcfa', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 12px/1 Inter,sans-serif', color: '#2563eb', flex: 'none' }}>{o.n}</span>
                                <span style={{ flex: 1, minWidth: 0, font: '600 13.5px/1.35 Inter,sans-serif', color: '#0f172a' }}>{o.title}</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                <span style={{ padding: '6px 10px', borderRadius: '999px', background: o.impact === 'High impact' ? '#fef2f2' : '#fffbeb', border: `1px solid ${o.impact === 'High impact' ? '#fecdd3' : '#fde68a'}`, font: '600 11px/1 Inter,sans-serif', color: o.impact === 'High impact' ? '#dc2626' : '#b45309', whiteSpace: 'nowrap' }}>{o.impact}</span>
                                <span style={{ padding: '6px 10px', borderRadius: '999px', background: '#eff4fe', border: '1px solid #cddcfa', font: '600 11px/1 Inter,sans-serif', color: '#2563eb', whiteSpace: 'nowrap' }}>{o.conf}</span>
                              </div>
                              <p style={{ margin: '12px 0 0', font: '400 12.5px/1.55 Inter,sans-serif', color: '#64748b' }}>{o.body}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Findings Section */}
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '22px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <h2 id="sec-analysis" style={{ margin: 0, font: '600 17px/1.2 Inter,sans-serif', letterSpacing: '-.015em', scrollMarginTop: '130px' }}>What the agent found</h2>
                      <span style={{ font: '500 11.5px/1 Inter,sans-serif', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {isComplete ? '3 findings' : `${visibleFindings.length} of 3 so far`}
                      </span>
                    </div>
                    <p style={{ margin: '8px 0 0', font: '400 13px/1.5 Inter,sans-serif', color: '#64748b', maxWidth: '64ch' }}>
                      Findings derived from the agent's own tool runs. Each one opens the evidence it came from.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '18px' }}>
                      {visibleFindings.map((f, fIdx) => (
                        <div key={fIdx} style={{ border: '1px solid #e6ecf4', borderRadius: '12px', background: '#fbfcfe', overflow: 'hidden' }}>
                          <button
                            type="button"
                            onClick={() => setOpenFinding(openFinding === fIdx ? null : fIdx)}
                            style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', width: '100%', padding: '15px 16px', background: 'none', border: 0, cursor: 'pointer', textAlign: 'left' }}
                          >
                            <span style={{ font: '600 10.5px/1 Inter,sans-serif', color: '#2563eb', background: '#e8effd', borderRadius: '7px', padding: '7px 8px', flex: 'none' }}>{f.tag}</span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: 'block', font: '600 14px/1.35 Inter,sans-serif', color: '#0f172a' }}>{f.title}</span>
                              <span style={{ display: 'block', marginTop: '5px', font: '400 13px/1.5 Inter,sans-serif', color: '#475569' }}>{f.body}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 'none' }}>
                              <span style={{ font: '700 18px/1 Inter,sans-serif', color: f.statColor, letterSpacing: '-.02em' }}>{f.stat}</span>
                              <span style={{ color: '#94a3b8', fontSize: '11px', transform: openFinding === fIdx ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }}>▾</span>
                            </span>
                          </button>
                          {openFinding === fIdx && (
                            <div style={{ padding: '0 16px 16px' }}>
                              <div style={{ borderTop: '1px solid #e6ecf4', paddingTop: '14px' }}>
                                <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', whiteSpace: 'nowrap' }}>Evidence</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '11px' }}>
                                  {f.evidence.map((e, eIdx) => (
                                    <div key={eIdx} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '9px', background: '#fff', border: '1px solid #e9eef5' }}>
                                      <span style={{ flex: '1 1 200px', minWidth: '160px', font: '500 12.5px/1.4 Inter,sans-serif', color: '#0f172a' }}>“{e.q}”</span>
                                      <span style={{ font: '600 10.5px/1 Inter,sans-serif', color: e.you === 'absent' ? '#dc2626' : '#059669', background: e.you === 'absent' ? '#fef2f2' : '#ecfdf5', padding: '5px 8px', borderRadius: '6px', flex: 'none', whiteSpace: 'nowrap' }}>{e.you}</span>
                                      <span style={{ font: '500 11.5px/1 Inter,sans-serif', color: '#94a3b8', flex: 'none', whiteSpace: 'nowrap' }}>{e.top}</span>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setDrawer('evidence')}
                                  style={{ marginTop: '12px', padding: 0, background: 'none', border: 0, cursor: 'pointer', font: '600 12.5px/1 Inter,sans-serif', color: '#2563eb', whiteSpace: 'nowrap' }}
                                >
                                  Open full evidence →
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {!isComplete && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '16px', border: '1px dashed #d6e0ee', borderRadius: '12px', background: '#fbfcfe' }}>
                          <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1.5px solid #2563eb', borderTopColor: 'transparent', display: 'inline-block' }} />
                          <span style={{ font: '500 13px/1.4 Inter,sans-serif', color: '#64748b' }}>
                            {stepIndex < 6 ? 'Gathering evidence — findings appear as tools return.' : `Deriving finding ${visibleFindings.length + 1} of 3…`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agent Decision */}
                  {stepIndex >= 7 && (
                    <div style={{ border: '1px solid #cddcfa', borderRadius: '14px', background: '#f7faff', padding: '20px 22px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
                        <span style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: '#2563eb', border: '1px solid #c3d5f8', borderRadius: '7px', padding: '6px 8px', background: '#fff', whiteSpace: 'nowrap' }}>Agent decision</span>
                        <span style={{ font: '500 11.5px/1 Inter,sans-serif', color: '#94a3b8', whiteSpace: 'nowrap' }}>step 7 · 02:41</span>
                      </div>
                      <p style={{ margin: '14px 0 0', font: '500 15px/1.5 Inter,sans-serif', color: '#0f172a', maxWidth: '70ch' }}>
                        The agent deprioritised broad category queries and chose to investigate <strong style={{ fontWeight: 600 }}>competitor comparison content</strong>, because the largest visibility gap appeared in high-intent comparison queries.
                      </p>
                      <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginTop: '18px' }}>Why this was prioritised</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '11px' }}>
                        {[
                          { title: 'High business intent', body: 'Comparison queries sit closest to a purchase decision.' },
                          { title: 'Large competitor gap', body: '43-point spread between Relay CRM and HubSpot.' },
                          { title: 'Strong evidence', body: 'Consistent across 4 assistants and 12 cited sources.' }
                        ].map((r, rIdx) => (
                          <div key={rIdx} style={{ flex: '1 1 180px', minWidth: '165px', padding: '12px 14px', borderRadius: '11px', background: '#fff', border: '1px solid #e4ebf6' }}>
                            <div style={{ font: '600 12.5px/1.3 Inter,sans-serif', color: '#0f172a' }}>{r.title}</div>
                            <div style={{ marginTop: '5px', font: '400 12px/1.45 Inter,sans-serif', color: '#64748b' }}>{r.body}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Primary Diagnosis & Agent Recommendation (Unlocked when Complete) */}
                  {isComplete ? (
                    <>
                      <div style={{ borderRadius: '14px', background: 'linear-gradient(160deg,#0a1533,#0c1c42)', border: '1px solid rgba(147,197,253,.14)', padding: '24px 26px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                          <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.16em', textTransform: 'uppercase', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <VistaIcon name="bolt" color="#93c5fd" size={13} />
                            Primary visibility gap
                          </div>
                          <div style={{ padding: '6px 9px', borderRadius: '7px', background: 'rgba(248,113,113,.14)', border: '1px solid rgba(248,113,113,.3)', font: '600 10px/1 Inter,sans-serif', letterSpacing: '.1em', textTransform: 'uppercase', color: '#fca5a5', whiteSpace: 'nowrap' }}>
                            Priority: high
                          </div>
                        </div>
                        <h2 id="sec-diagnosis" style={{ margin: '13px 0 0', font: '700 26px/1.2 Inter,sans-serif', color: '#fff', letterSpacing: '-.03em', scrollMarginTop: '130px' }}>
                          Comparison &amp; alternatives content
                        </h2>
                        <p style={{ margin: '12px 0 0', font: '400 14.5px/1.55 Inter,sans-serif', color: 'rgba(255,255,255,.68)', maxWidth: '68ch' }}>
                          Competitors are recommended more frequently because they hold stronger representation in comparison-related content, and in the third-party sources AI assistants cite when answering “best CRM” and “alternatives to” questions.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '22px' }}>
                          {[
                            { label: 'Your brand · comparison queries', value: '31%', width: '31%', color: '#60a5fa' },
                            { label: 'Top competitor · HubSpot', value: '74%', width: '74%', color: '#34d399' },
                            { label: 'Visibility gap', value: '43%', width: '43%', color: '#fbbf24' },
                            { label: 'Affected queries', value: '12 of 24', width: '50%', color: '#93c5fd' }
                          ].map((m, mIdx) => (
                            <div key={mIdx}>
                              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ font: '500 12.5px/1 Inter,sans-serif', color: 'rgba(255,255,255,.62)' }}>{m.label}</span>
                                <span style={{ font: '600 14px/1 Inter,sans-serif', color: m.color }}>{m.value}</span>
                              </div>
                              <div style={{ height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,.09)', marginTop: '7px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: '3px', width: m.width, background: m.color }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Agent Recommendation & Experiment Approval */}
                      <div id="agent-recommendation" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', scrollMarginTop: '96px' }}>
                        <div style={{ padding: '24px 26px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'linear-gradient(150deg,#3b82f6,#1e3a8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                              <VistaIcon name="bot" color="#fff" size={15} />
                            </span>
                            <span style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>Agent recommendation</span>
                          </div>
                          <h2 style={{ margin: '14px 0 0', font: '700 23px/1.25 Inter,sans-serif', letterSpacing: '-.025em' }}>Create a competitor alternatives page</h2>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
                            {[
                              { label: 'Expected impact', value: 'High', color: '#059669' },
                              { label: 'Confidence', value: '82%', color: '#2563eb' },
                              { label: 'Effort', value: 'Medium', color: '#d97706' }
                            ].map((r, rIdx) => (
                              <div key={rIdx} style={{ flex: '1 1 150px', minWidth: '135px', padding: '13px 15px', borderRadius: '11px', background: '#f8fafc', border: '1px solid #e9eef5' }}>
                                <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>{r.label}</div>
                                <div style={{ marginTop: '8px', font: '700 18px/1 Inter,sans-serif', color: r.color, letterSpacing: '-.015em' }}>{r.value}</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '22px' }}>
                            <div style={{ flex: '1 1 250px', minWidth: '220px' }}>
                              <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>Why the agent recommends this</div>
                              <p style={{ margin: '10px 0 0', font: '400 13.5px/1.55 Inter,sans-serif', color: '#475569' }}>
                                Your largest AI-search visibility gap sits in competitor comparison queries with high purchase intent — 12 of the 24 tested queries, none of which currently surface {brandName}.
                              </p>
                            </div>
                            <div style={{ flex: '1 1 250px', minWidth: '220px' }}>
                              <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>Expected outcome</div>
                              <p style={{ margin: '10px 0 0', font: '400 13.5px/1.55 Inter,sans-serif', color: '#475569' }}>
                                Improve visibility across 12 high-value AI search queries, closing an estimated 18 points of the 43-point gap within two crawl cycles.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Approval Bar */}
                        <div style={{ marginTop: '22px', padding: '18px 26px', borderTop: '1px solid #e9eef5', background: '#fbfcfe' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '9px' }}>
                            {['Investigated', 'Diagnosed', 'Recommended', 'You review', 'You approve'].map((label, n) => {
                              const reached = approved ? n <= 4 : n <= 2;
                              const current = !approved && n === 3;
                              return (
                                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 11px', borderRadius: '999px', background: current ? '#eff4fe' : reached ? '#ecfdf5' : '#fff', border: `1px solid ${current ? '#cddcfa' : reached ? '#a7f3d0' : '#e2e8f0'}` }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: current ? '#2563eb' : reached ? '#059669' : '#cbd5e1' }} />
                                    <span style={{ font: '600 11px/1 Inter,sans-serif', color: current ? '#2563eb' : reached ? '#065f46' : '#94a3b8', whiteSpace: 'nowrap' }}>{label}</span>
                                  </div>
                                  {n < 4 && <span style={{ font: '400 11px/1 Inter,sans-serif', color: '#cbd5e1' }}>→</span>}
                                </div>
                              );
                            })}
                          </div>

                          {!approved ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginTop: '18px' }}>
                              <button
                                type="button"
                                id="btn-approve-experiment"
                                onClick={handleApprove}
                                style={{ padding: '12px 18px', borderRadius: '10px', border: 0, background: '#2563eb', color: '#fff', font: '600 13px/1 Inter,sans-serif', cursor: 'pointer', boxShadow: '0 1px 2px rgba(37,99,235,.35)' }}
                              >
                                Approve experiment
                              </button>
                              <button
                                type="button"
                                id="btn-review-evidence"
                                onClick={() => setDrawer('evidence')}
                                style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a', font: '600 13px/1 Inter,sans-serif', cursor: 'pointer' }}
                              >
                                Review evidence
                              </button>
                              <button
                                type="button"
                                id="btn-modify-recommendation"
                                onClick={() => setModifyOpen(!modifyOpen)}
                                style={{ padding: '12px 14px', borderRadius: '10px', border: 0, background: 'none', color: '#475569', font: '600 13px/1 Inter,sans-serif', cursor: 'pointer' }}
                              >
                                Modify recommendation
                              </button>
                              <span style={{ flex: 1 }} />
                              <span style={{ font: '500 11.5px/1.4 Inter,sans-serif', color: '#94a3b8' }}>Nothing ships without your approval.</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '13px', marginTop: '18px', padding: '15px 16px', borderRadius: '12px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.2 3.9 7.5 8.5 2.5" stroke="#059669" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </div>
                              <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
                                <div style={{ font: '600 13.5px/1.35 Inter,sans-serif', color: '#065f46' }}>Experiment approved — agent will track impact</div>
                                <div style={{ marginTop: '4px', font: '400 12.5px/1.45 Inter,sans-serif', color: '#3f7a63' }}>Owner: you · Baseline locked at 31% · First re-test in 14 days</div>
                              </div>
                              <button
                                type="button"
                                id="btn-undo-approval"
                                onClick={handleUndoApprove}
                                style={{ padding: '9px 14px', borderRadius: '9px', border: '1px solid #a7f3d0', background: '#fff', color: '#065f46', font: '600 12px/1 Inter,sans-serif', cursor: 'pointer', flex: 'none' }}
                              >
                                Undo
                              </button>
                            </div>
                          )}

                          {modifyOpen && !approved && (
                            <div style={{ marginTop: '14px', padding: '16px', borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }}>
                              <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>Adjust scope before approving</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                {scopeOptions.map((label, idx) => {
                                  const on = scope.includes(idx);
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        setScope((prev) => (prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx]));
                                      }}
                                      style={{
                                        padding: '9px 13px',
                                        borderRadius: '999px',
                                        border: `1px solid ${on ? '#cddcfa' : '#e2e8f0'}`,
                                        background: on ? '#eff4fe' : '#fff',
                                        color: on ? '#2563eb' : '#64748b',
                                        font: '600 12px/1 Inter,sans-serif',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                              <div style={{ marginTop: '14px', font: '400 12.5px/1.5 Inter,sans-serif', color: '#64748b' }}>
                                {scope.length === 0
                                  ? 'No scope selected — the agent cannot estimate impact.'
                                  : `Agent re-estimate: +${scope.length * 6}% visibility across ${Math.min(24, scope.length * 6)} queries.`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div id="sec-locked" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '18px 20px', borderRadius: '14px', border: '1px dashed #d6e0ee', background: '#fff', scrollMarginTop: '110px' }}>
                      <span style={{ width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid #2563eb', borderTopColor: 'transparent', display: 'inline-block' }} />
                      <div style={{ font: '500 13px/1.45 Inter,sans-serif', color: '#64748b' }}>
                        Diagnosis and recommendation unlock when the investigation completes. You'll be asked to approve before anything is actioned.
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Flyout Panel */}
        {bellOpen && (
          <div
            id="panel-notifications"
            style={{
              position: 'fixed',
              top: '90px',
              right: '26px',
              zIndex: 90,
              width: '330px',
              background: '#fff',
              border: '1px solid #e4eaf4',
              borderRadius: '13px',
              boxShadow: '0 12px 32px rgba(11,21,48,.16)',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid #eef2f8' }}>
              <span style={{ flex: 1, font: '600 13.5px/1 Inter,sans-serif', color: '#0f172a' }}>Notifications</span>
              <button
                type="button"
                onClick={() => setUnread([])}
                style={{ padding: 0, background: 'none', border: 0, cursor: 'pointer', font: '600 11.5px/1 Inter,sans-serif', color: '#1d5cf0', whiteSpace: 'nowrap' }}
              >
                Mark all read
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '300px', overflowY: 'auto' }}>
              {INITIAL_NOTIFICATIONS.map((nt) => {
                const isUnread = unread.includes(nt.id);
                return (
                  <button
                    key={nt.id}
                    type="button"
                    onClick={() => {
                      setBellOpen(false);
                      setUnread(unread.filter((x) => x !== nt.id));
                      goTo(nt.go);
                    }}
                    style={{
                      display: 'flex',
                      gap: '11px',
                      alignItems: 'flex-start',
                      padding: '13px 16px',
                      background: isUnread ? '#fbfdff' : '#fff',
                      border: 0,
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ width: '28px', height: '28px', borderRadius: '9px', background: '#eef4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <VistaIcon name={nt.glyph} color="#1d5cf0" size={15} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', font: '600 12.5px/1.35 Inter,sans-serif', color: '#0f172a' }}>{nt.title}</span>
                      <span style={{ display: 'block', marginTop: '4px', font: '400 12px/1.45 Inter,sans-serif', color: '#64748b' }}>{nt.body}</span>
                      <span style={{ display: 'block', marginTop: '5px', font: '500 10.5px/1 Inter,sans-serif', color: '#94a3b8' }}>{nt.time}</span>
                    </span>
                    {isUnread && (
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#1d5cf0', flex: 'none', marginTop: '4px' }} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Profile Dropdown Panel */}
        {profileOpen && (
          <div
            id="panel-profile"
            style={{
              position: 'fixed',
              top: '90px',
              right: '26px',
              zIndex: 90,
              width: '262px',
              background: '#fff',
              border: '1px solid #e4eaf4',
              borderRadius: '13px',
              boxShadow: '0 12px 32px rgba(11,21,48,.16)',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '15px 16px', borderBottom: '1px solid #eef2f8', background: '#f7faff' }}>
              <span style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0b1530', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 13px/1 Inter,sans-serif', flex: 'none' }}>
                SP
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', font: '600 13.5px/1.2 Inter,sans-serif', color: '#0f172a' }}>Sneha Patel</span>
                <span style={{ display: 'block', marginTop: '4px', font: '400 11.5px/1.3 Inter,sans-serif', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  sneha@relaycrm.com
                </span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '7px' }}>
              {[
                { label: 'View profile', glyph: 'team' },
                { label: 'Workspace settings', glyph: 'gear' },
                { label: 'Saved reports', glyph: 'doc', badge: '3' },
                { label: 'Upgrade to Pro', glyph: 'spark', accent: true },
                { label: 'Sign out', glyph: 'plug' }
              ].map((pm, pmIdx) => (
                <button
                  key={pmIdx}
                  type="button"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    padding: '10px 11px',
                    border: 0,
                    borderRadius: '9px',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    font: '500 13px/1 Inter,sans-serif',
                    color: pm.accent ? '#1d5cf0' : '#334155'
                  }}
                >
                  <VistaIcon name={pm.glyph} color={pm.accent ? '#1d5cf0' : '#94a3b8'} size={15} />
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap' }}>{pm.label}</span>
                  {pm.badge && (
                    <span style={{ padding: '4px 8px', borderRadius: '999px', background: '#eef4ff', font: '600 10px/1 Inter,sans-serif', color: '#1d5cf0', flex: 'none' }}>
                      {pm.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Slide-Over Evidence Drawer */}
        {drawer && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end', background: 'rgba(10,21,51,.35)', backdropFilter: 'blur(2px)' }}>
            <div onClick={() => setDrawer(null)} style={{ flex: 1 }} />
            <div
              id="slide-over-drawer"
              style={{
                width: 'min(560px, 94vw)',
                height: '100%',
                background: '#fff',
                borderLeft: '1px solid #e2e8f0',
                boxShadow: '-8px 0 32px rgba(10,21,51,.16)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '20px 22px', borderBottom: '1px solid #e9eef5' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    Evidence
                  </div>
                  <h3 style={{ margin: '9px 0 0', font: '600 17px/1.25 Inter,sans-serif', letterSpacing: '-.015em' }}>
                    {drawer === 'evidence' ? 'Comparison & alternatives gap' : 'Analyzed customer queries'}
                  </h3>
                  <p style={{ margin: '7px 0 0', font: '400 12.5px/1.45 Inter,sans-serif', color: '#64748b' }}>
                    {drawer === 'evidence'
                      ? 'The queries and cited sources behind the primary diagnosis.'
                      : 'Every query the agent generated, tested and scored across four AI assistants.'}
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-close-drawer"
                  onClick={() => setDrawer(null)}
                  style={{ width: '30px', height: '30px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', font: '400 15px/1 Inter,sans-serif', cursor: 'pointer', flex: 'none' }}
                >
                  ×
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 26px' }}>
                {drawer === 'queries' && runResults?.queries && runResults.queries.length > 0 ? (
                  <AISearchDrawerContent
                    searchResults={runResults.searchResults || []}
                    queries={runResults.queries}
                    brandName={activeProject?.companyName || brandName}
                    analysis={runResults.analysis}
                    isEvaluating={activeRun?.progressStage === 'evaluating_ai_search'}
                    completedCount={activeRun?.completedSearchQueriesCount || runResults.searchResults?.length || 0}
                    totalCount={activeRun?.totalSearchQueriesCount || runResults.queries.length}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {INITIAL_QUERIES.map((d, dIdx) => (
                      <div key={dIdx} style={{ border: '1px solid #e6ecf4', borderRadius: '12px', padding: '15px 16px', background: '#fbfcfe' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '9px' }}>
                          <span
                            style={{
                              font: '600 10.5px/1 Inter,sans-serif',
                              color: d.intent === 'high intent' ? '#dc2626' : d.intent === 'comparison' ? '#2563eb' : '#475569',
                              background: d.intent === 'high intent' ? '#fef2f2' : d.intent === 'comparison' ? '#eff4fe' : '#f1f5f9',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {d.intent}
                          </span>
                          <span style={{ flex: 1, minWidth: '180px', font: '600 13.5px/1.4 Inter,sans-serif', color: '#0f172a' }}>“{d.q}”</span>
                        </div>
                        <p style={{ margin: '12px 0 0', padding: '12px 13px', borderRadius: '9px', background: '#fff', border: '1px solid #e9eef5', font: '400 12.5px/1.55 Inter,sans-serif', color: '#475569' }}>
                          {d.answer}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '7px', marginTop: '12px' }}>
                          <span style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.12em', textTransform: 'uppercase', color: '#94a3b8', marginRight: '2px' }}>Brands</span>
                          {d.brands.map((name, bIdx) => (
                            <span
                              key={bIdx}
                              style={{
                                font: '600 11.5px/1 Inter,sans-serif',
                                color: name === (activeProject ? activeProject.companyName : brandName) ? '#2563eb' : '#475569',
                                background: name === (activeProject ? activeProject.companyName : brandName) ? '#eff4fe' : '#fff',
                                border: `1px solid ${name === (activeProject ? activeProject.companyName : brandName) ? '#cddcfa' : '#e2e8f0'}`,
                                padding: '6px 10px',
                                borderRadius: '999px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '7px', marginTop: '9px' }}>
                          <span style={{ font: '600 9.5px/1 Inter,sans-serif', letterSpacing: '.12em', textTransform: 'uppercase', color: '#94a3b8', marginRight: '2px' }}>Cited</span>
                          {d.cites.map((cName, cIdx) => (
                            <span key={cIdx} style={{ font: '500 11.5px/1 Inter,sans-serif', color: '#475569', background: '#f1f5f9', padding: '6px 10px', borderRadius: '7px' }}>
                              {cName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 22px', borderTop: '1px solid #e9eef5', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', background: '#fbfcfe' }}>
                <span style={{ flex: 1, font: '400 12px/1.45 Inter,sans-serif', color: '#94a3b8' }}>
                  {drawer === 'queries' && runResults?.queries?.length
                    ? `Showing all ${runResults.queries.length} generated customer queries (${runResults.searchResults?.length || 0} evaluated across AI models)`
                    : 'Showing 4 of 24 analyzed queries'}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawer(null)}
                  style={{ padding: '10px 15px', borderRadius: '9px', border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a', font: '600 12.5px/1 Inter,sans-serif', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: New Analysis (Creates Real Firestore Project & Run) */}
        <NewAnalysisModal
          isOpen={newAnalysisModalOpen}
          onClose={() => setNewAnalysisModalOpen(false)}
          onSuccess={handleNewAnalysisSuccess}
        />

        {/* Success toast / status message */}
        {statusMessage && (
          <div
            id="status-toast"
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 90,
              background: '#0a1533',
              color: '#fff',
              padding: '12px 18px',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(10,21,51,0.24)',
              border: '1px solid rgba(255,255,255,0.12)',
              font: '500 13px/1.4 Inter, sans-serif',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <VistaIcon name="check" color="#10b981" size={16} />
            <span>{statusMessage}</span>
          </div>
        )}

      </div>
    </div>
  );
}
