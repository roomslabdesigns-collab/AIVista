import {
  StepItem,
  ToolActivityItem,
  FindingItem,
  QueryItem,
  CompetitorMetric,
  OpportunityItem,
  KpiMetric,
  NotificationItem
} from './types';

export const INITIAL_STEPS: StepItem[] = [
  { label: 'Website analyzed', short: 'Website', meta: 'relaycrm.com · 142 pages crawled', tool: 0 },
  { label: 'Product category identified', short: 'Category', meta: 'CRM software · mid-market', tool: 0 },
  { label: 'Target customers identified', short: 'Customers', meta: 'Sales leaders & RevOps', tool: 0 },
  { label: 'Generated 24 high-intent customer queries', short: '24 queries', meta: '3 intent classes', tool: 1 },
  { label: 'Tested AI search visibility', short: 'AI responses', meta: '4 assistants · 96 responses', tool: 2 },
  { label: 'Analyzed competitor mentions', short: 'Competitors', meta: '5 competitors detected', tool: 3 },
  { label: 'Investigating citation patterns', short: 'Citations', meta: '12 citation sources', tool: 4 },
  { label: 'Diagnosing visibility gaps', short: 'Diagnosis', meta: '3 gaps ranked by impact', tool: 5 },
  { label: 'Synthesizing recommendation', short: 'Recommendation', meta: '1 experiment drafted', tool: 5 }
];

export const INITIAL_TOOLS: ToolActivityItem[] = [
  {
    glyph: 'lens',
    name: 'Analyzing Website',
    firstStep: 0,
    lastStep: 2,
    summary: 'Crawled relaycrm.com to establish what the brand sells, to whom, and how clearly that is stated for machine readers.',
    bullets: [
      '142 pages read · 9 product pages, 2 pricing pages',
      'Category inferred: CRM software for mid-market sales teams',
      'No comparison or alternatives pages found'
    ]
  },
  {
    glyph: 'bolt',
    name: 'Generating Search Queries',
    firstStep: 3,
    lastStep: 3,
    summary: 'Generated the questions a real buyer asks an AI assistant at each stage of evaluation.',
    bullets: [
      '24 queries across category, comparison and intent-to-buy',
      '12 of them are competitor comparison queries',
      'Weighted by purchase intent, not search volume'
    ]
  },
  {
    glyph: 'globe',
    name: 'Testing AI Responses',
    firstStep: 4,
    lastStep: 4,
    summary: '24 high-intent customer queries analyzed across four AI assistants.',
    bullets: [
      'Relay CRM was mentioned in 15 responses',
      'HubSpot appeared in 21 responses',
      'Relay never appeared first in a recommendation list'
    ],
    hasLink: true,
    linkLabel: 'View analyzed queries',
    drawer: 'queries'
  },
  {
    glyph: 'bars',
    name: 'Comparing Competitors',
    firstStep: 5,
    lastStep: 5,
    summary: 'Mapped which brands assistants recommend instead, and where they earn the recommendation.',
    bullets: [
      '5 competitors detected across 96 responses',
      'HubSpot leads with 74% response share',
      'Gap widens sharply on “alternatives to” phrasing'
    ]
  },
  {
    glyph: 'link',
    name: 'Analyzing Citations',
    firstStep: 6,
    lastStep: 6,
    summary: 'Traced the third-party sources assistants cited when they recommended a competitor.',
    bullets: [
      '12 citation sources analyzed',
      '9 of 12 are review or comparison roundups',
      'Relay CRM is absent from 7 of those 9'
    ]
  },
  {
    glyph: 'brain',
    name: 'Diagnosing Visibility Gaps',
    firstStep: 7,
    lastStep: 8,
    summary: 'Ranked candidate gaps by business intent, size of competitor advantage and strength of evidence.',
    bullets: [
      '3 high-impact opportunities found',
      'Comparison & alternatives content ranked #1',
      'Drafted one experiment for human approval'
    ]
  }
];

export const INITIAL_FINDINGS: FindingItem[] = [
  {
    tag: '01',
    title: 'Comparison query weakness',
    stat: '68%',
    statColor: '#dc2626',
    body: 'Relay CRM is absent from 68% of competitor comparison queries — the queries where buyers are closest to choosing.',
    evidence: [
      { q: 'best CRM for startups', you: 'position #3', top: 'HubSpot, Pipedrive' },
      { q: 'HubSpot alternatives', you: 'absent', top: 'Salesforce, Zoho' },
      { q: 'Relay CRM vs HubSpot for mid-market', you: 'mentioned', top: 'HubSpot' }
    ]
  },
  {
    tag: '02',
    title: 'Competitor advantage',
    stat: '84%',
    statColor: '#dc2626',
    body: 'HubSpot appears in 84% of relevant AI responses, and is recommended first in 61% of them.',
    evidence: [
      { q: 'CRM for RevOps teams', you: 'absent', top: 'HubSpot, Salesforce' },
      { q: 'which CRM integrates with Gmail and Slack', you: 'mentioned', top: 'HubSpot' },
      { q: 'cheapest HubSpot alternative 2026', you: 'absent', top: 'Zoho' }
    ]
  },
  {
    tag: '03',
    title: 'Citation gap',
    stat: '7/9',
    statColor: '#d97706',
    body: 'Competitors are represented more frequently in the third-party sources used to build AI answers. Relay is missing from 7 of the 9 comparison roundups cited.',
    evidence: [
      { q: 'top CRM tools 2026 (roundup cited)', you: 'absent', top: 'Review directory' },
      { q: 'CRM comparison guide (roundup cited)', you: 'absent', top: 'Industry blog' },
      { q: 'best CRM for small sales teams', you: 'mentioned', top: 'Community thread' }
    ]
  }
];

export const INITIAL_QUERIES: QueryItem[] = [
  {
    q: 'best CRM for startups',
    intent: 'high intent',
    answer: "For early-stage teams, HubSpot's free tier is the most commonly recommended starting point, with Pipedrive suggested for pipeline-first sales teams…",
    brands: ['HubSpot', 'Pipedrive', 'Relay CRM'],
    cites: ['review directory', 'industry roundup', 'vendor docs']
  },
  {
    q: 'HubSpot alternatives',
    intent: 'high intent',
    answer: 'Frequently suggested alternatives include Salesforce for larger teams, Zoho for cost-sensitive buyers, and Pipedrive for simplicity…',
    brands: ['Salesforce', 'Zoho', 'Pipedrive'],
    cites: ['comparison blog', 'review directory']
  },
  {
    q: 'Relay CRM vs HubSpot for mid-market',
    intent: 'comparison',
    answer: 'Relay CRM is positioned for mid-market sales teams, while HubSpot offers a broader suite; most published comparisons favour HubSpot on ecosystem breadth…',
    brands: ['Relay CRM', 'HubSpot'],
    cites: ['vendor site', 'community thread']
  },
  {
    q: 'which CRM integrates with Gmail and Slack',
    intent: 'medium intent',
    answer: 'HubSpot and Salesforce are the integrations most often cited, with Relay CRM mentioned as a lighter-weight option…',
    brands: ['HubSpot', 'Salesforce', 'Relay CRM'],
    cites: ['marketplace listing', 'review site']
  }
];

export const INITIAL_COMPETITORS: CompetitorMetric[] = [
  { name: 'HubSpot', mention: '84%', citation: '76%', rec: '79%', pos: '1.8', gap: '+22%', up: true },
  { name: 'Salesforce', mention: '71%', citation: '65%', rec: '68%', pos: '2.4', gap: '+9%', up: true },
  { name: 'Relay CRM', mention: '62%', citation: '43%', rec: '51%', pos: '3.1', gap: '—', you: true },
  { name: 'Pipedrive', mention: '58%', citation: '49%', rec: '52%', pos: '3.4', gap: '-4%', up: false },
  { name: 'Zoho', mention: '46%', citation: '38%', rec: '41%', pos: '4.1', gap: '-16%', up: false }
];

export const INITIAL_OPPORTUNITIES: OpportunityItem[] = [
  {
    n: '1',
    title: 'Create HubSpot Alternatives Page',
    impact: 'High impact',
    conf: '82% confidence',
    body: 'Could improve visibility for 12 high-value queries and increase AI referral traffic by roughly 25%.'
  },
  {
    n: '2',
    title: 'Improve Product Documentation',
    impact: 'Medium impact',
    conf: '74% confidence',
    body: 'Your key features are not well represented in the sources AI systems commonly cite.'
  },
  {
    n: '3',
    title: 'Earn Third-Party Citations',
    impact: 'High impact',
    conf: '69% confidence',
    body: 'Competitors hold 3x more citations from industry publications and review sites.'
  }
];

export const INITIAL_KPIS: KpiMetric[] = [
  { label: 'AI Visibility', value: '62%', delta: '↑ 14%', stroke: '#2563eb', fill: 'rgba(37,99,235,.10)', series: [41, 44, 42, 47, 45, 50, 48, 53, 51, 56, 58, 62] },
  { label: 'Mention Rate', value: '71%', delta: '↑ 9%', stroke: '#7c3aed', fill: 'rgba(124,58,237,.10)', series: [58, 60, 59, 63, 61, 65, 64, 66, 65, 68, 69, 71] },
  { label: 'Citation Coverage', value: '43%', delta: '↑ 12%', stroke: '#10b981', fill: 'rgba(16,185,129,.10)', series: [26, 29, 27, 31, 30, 34, 33, 36, 35, 39, 41, 43] },
  { label: 'Recommendation Rate', value: '51%', delta: '↑ 7%', stroke: '#f59e0b', fill: 'rgba(245,158,11,.12)', series: [37, 40, 38, 42, 41, 44, 43, 46, 45, 47, 49, 51] }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', glyph: 'spark', title: 'New opportunity detected', body: 'Comparison & alternatives gap ranked high impact.', time: '2 min ago', go: 'sec-opportunities' },
  { id: 'n2', glyph: 'rivals', title: 'HubSpot gained visibility', body: 'Now appears in 84% of relevant AI responses.', time: '1 hr ago', go: 'sec-competitors' },
  { id: 'n3', glyph: 'bars', title: 'Visibility up 14% this month', body: 'Your AI visibility reached 62%.', time: 'Yesterday', go: 'sec-trend' }
];

export const BRAND_TREND = [35, 27, 38, 32, 35, 34, 42, 47, 41, 52, 54, 62];
export const COMP_TREND = [46, 55, 60, 56, 58, 62, 64, 66, 60, 67, 72, 78];
