# AIVista — AI Search Revenue Agent

> **Google is no longer the only place customers search. AIVista helps companies understand whether AI search recommends them — and what to do when it doesn't.**

AIVista is an **agentic AI search intelligence platform** that investigates how a company's brand appears across AI-powered search, analyzes competitors and citations, identifies visibility gaps, and converts those findings into actionable experiments.

The core product loop is:

```text
Investigate → Diagnose → Recommend → Experiment → Measure
```

The goal is not simply to measure AI visibility.

It is to help teams understand **why their brand is being recommended or overlooked and what they can test next.**

---

# 1. The Original Workflow

Customers increasingly use AI assistants such as ChatGPT, Claude, and Gemini to research products and make purchasing decisions.

This creates a new question for companies:

> **"When customers ask AI about products in our category, does AI actually recommend us?"**

Answering this today can require teams to manually:

* Create customer-intent queries
* Test queries across AI assistants
* Record brand mentions
* Identify competitors
* Inspect citations
* Compare responses
* Interpret visibility patterns
* Determine what actions to take

A typical analysis becomes a spreadsheet containing prompts, AI responses, competitors, citations, and manually interpreted observations.

The problem is not simply **collecting AI responses**.

The real problem is turning those responses into **actionable product, marketing, and revenue opportunities**.

---

# 2. The Friction Points

| Friction                                        | Root Cause                                                  | Impact                                                  |
| ----------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| **AI visibility is difficult to measure**       | Results vary by query, model, and context                   | Companies lack a consistent view of brand visibility    |
| **Manual query research is slow**               | Teams must manually create customer-intent questions        | Important customer journeys can be missed               |
| **Competitor analysis is fragmented**           | Mentions, rankings, and citations must be compared manually | Difficult to understand why competitors are recommended |
| **Citation analysis is time-consuming**         | Teams need to inspect sources referenced by AI systems      | Content and authority gaps remain hidden                |
| **Insights don't automatically become actions** | Many tools stop at reporting visibility                     | Teams know there is a problem but not what to test      |

The core product opportunity is to move from:

> **Visibility reporting → Evidence → Diagnosis → Action**

---

# 3. Prerequisites

A reliable AI-search intelligence system requires several foundations.

### 1. Website investigation

The system needs to understand the company's:

* Products
* Category
* Target customers
* Positioning
* Features
* Pricing
* Important pages

before generating meaningful queries.

### 2. Structured query generation

Queries should represent realistic customer intent rather than random questions.

### 3. Consistent AI-search evaluation

Results need to be captured across multiple AI assistants and analyzed using comparable metrics.

### 4. Reliable competitor and citation extraction

The system needs to distinguish:

* Brand mentions
* Competitor mentions
* Recommendations
* Cited sources
* Visibility signals

from AI responses.

### 5. Connection to business impact

The final output should not simply say:

> **"Your AI visibility is low."**

It should explain:

> **Why the gap exists, what evidence supports it, and what the team can test next.**

---

# 4. The AI-Enabled Redesign

Instead of manually performing the research, AIVista turns the process into an **agentic investigation workflow**.

```text
Company Website
       ↓
Investigate
       ↓
Generate Queries
       ↓
Test AI Search
       ↓
Analyze
       ↓
Diagnose
       ↓
Recommend
       ↓
Experiment
       ↓
Measure
```

---

## Step 1 — Investigate

The investigation agent analyzes the company's website to understand:

* Product
* Category
* Target customers
* Positioning
* Key features
* Pricing
* Important pages

This creates the context required for realistic customer-intent queries.

---

## Step 2 — Generate

The agent generates high-intent queries based on the company's market and customer journey.

For example:

> **"Which CRM integrates with Gmail and Slack?"**

> **"Best CRM for mid-market companies"**

> **"Relay CRM vs HubSpot for mid-market"**

The goal is to simulate the types of questions potential customers might ask AI assistants during product discovery.

---

## Step 3 — Test

The system sends generated queries across multiple AI assistants and captures their responses.

It records signals such as:

* Brand mentions
* Competitor mentions
* Position or ranking
* Recommendation frequency
* Citations

This transforms individual AI responses into structured investigation data.

---

## Step 4 — Analyze

AIVista analyzes the collected responses to identify:

* AI visibility
* Competitor visibility
* Citation patterns
* Missing citations
* Recurring sources
* Visibility gaps

The goal is to identify patterns across multiple queries rather than treating one AI response as definitive.

---

## Step 5 — Diagnose

The system connects observed evidence to specific visibility problems.

Example:

```text
Low AI Visibility
       ↓
Competitors mentioned more frequently
       ↓
Competitors have stronger cited sources
       ↓
Brand has limited coverage for
high-intent queries
       ↓
Content / Citation Opportunity
```

This creates a transition from **measurement to diagnosis**.

---

## Step 6 — Recommend

AIVista does not stop at identifying the visibility gap.

It converts the finding into a proposed experiment.

```text
Visibility Gap
       ↓
Evidence
       ↓
Recommendation
       ↓
Experiment
       ↓
Measure Impact
```

This makes the product an **action-oriented decision-support system**, rather than only an analytics dashboard.

---

# 5. Human Fallback Triggers

AIVista is designed as a **decision-support system**, not an autonomous system making irreversible business decisions.

### Low-confidence website extraction

If important product information cannot be reliably extracted, it should be surfaced for user confirmation rather than silently guessed.

### Ambiguous AI responses

Responses that cannot reliably identify a brand, competitor, or citation are flagged instead of being treated as facts.

### Unclear recommendation

If the evidence does not support a strong action, AIVista surfaces the evidence without forcing a recommendation.

### Experiment approval

Recommended experiments require human approval before execution.

### Unexpected AI/search failure

Investigation failures are recorded rather than presenting incomplete results as a complete analysis.

---

# 6. Sample AI Prompt

### System Prompt — AI Search Investigation

```text
You are an AI search visibility analyst.

Given:
1. A company website analysis
2. A customer-intent query
3. An AI search response

Extract only information supported by the response.

Identify:

1. Whether the target company is mentioned
2. Which competitors are mentioned
3. Whether the target company is recommended
4. Which sources are cited
5. Which competitors appear more prominently
6. Potential visibility gaps

Do not infer information that is not present.

Return structured JSON:

{
  "brand_mentioned": true | false,
  "brand_recommended": true | false,
  "competitors": [],
  "citations": [],
  "visibility_signal": "positive | neutral | negative",
  "evidence": [],
  "potential_gap": string | null
}
```

---

## Example

### Input

**Query:**

> "Best CRM for mid-market companies"

**AI Response:**

> "HubSpot and Salesforce are commonly recommended... Relay CRM is also mentioned..."

**Citations:**

```text
hubspot.com
salesforce.com
g2.com
```

### Structured Output

```json
{
  "brand_mentioned": true,
  "brand_recommended": false,
  "competitors": [
    "HubSpot",
    "Salesforce"
  ],
  "citations": [
    "hubspot.com",
    "salesforce.com",
    "g2.com"
  ],
  "visibility_signal": "negative",
  "evidence": [
    "Relay CRM was mentioned but was not among the primary recommendations."
  ],
  "potential_gap": "Weak recommendation presence compared with competitors."
}
```

The important design principle is that the model should **extract evidence before generating an interpretation**.

---

# 7. Prompt Testing

AIVista should be tested against different AI-search response conditions.

| Case                     | Input                                 | Expected Output                     | What a Bad Result Reveals                               |
| ------------------------ | ------------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| **Clear**                | Brand clearly recommended             | Brand and recommendation identified | Extraction is missing obvious signals                   |
| **Not mentioned**        | AI response contains only competitors | `brand_mentioned: false`            | Model is hallucinating brand visibility                 |
| **Ambiguous**            | Brand appears but context is unclear  | Flag for review                     | Model is treating ambiguous mentions as recommendations |
| **Multiple competitors** | Several competing brands appear       | All relevant competitors extracted  | Competitor analysis is incomplete                       |
| **Missing citations**    | Response contains no usable citations | Empty citation list                 | Model is inventing sources                              |

The goal is not just to make the system produce structured JSON.

It is to ensure the extracted signals remain **faithful to the underlying AI response**.

---

# 8. Business Impact

The initial prototype is designed to reduce the manual effort required to understand AI-search visibility.

| Area                    | Before                | With AIVista                   | Product Value                                |
| ----------------------- | --------------------- | ------------------------------ | -------------------------------------------- |
| AI visibility analysis  | Manual                | Automated investigation        | Investigation workflow runs systematically   |
| Query generation        | Manually created      | AI-generated                   | Queries reflect website and customer context |
| Competitor analysis     | Manual comparison     | Automated extraction           | Competitors are identified across responses  |
| Citation analysis       | Manual inspection     | Automated analysis             | Sources are extracted systematically         |
| Recommendation creation | Manual interpretation | Evidence-backed recommendation | Findings become proposed experiments         |

---

## The Product Loop

```text
Website
   ↓
Investigate
   ↓
Diagnose
   ↓
Recommend
   ↓
Experiment
   ↓
Measure
   ↓
Repeat
```

The key product change is that AIVista does not stop at:

> **"Here is your AI visibility."**

It attempts to answer:

> **"Why is your visibility changing, what evidence explains it, and what should the team test next?"**

---

# 9. Product Thinking — Risks & Tradeoffs

## Risk 1 — AI Search Results Are Not Deterministic

The same query can produce different responses depending on the model, context, and time.

**Mitigation:** Evaluate multiple queries and AI assistants rather than treating a single response as the definitive measurement.

---

## Risk 2 — AI-Generated Recommendations May Be Weak

A recommendation without supporting evidence can lead teams toward the wrong action.

**Mitigation:** Connect recommendations to the underlying findings, competitors, queries, and citations.

---

## Risk 3 — Query Coverage Can Bias the Results

If the generated queries do not represent important customer journeys, the resulting visibility analysis may be incomplete.

**Mitigation:** Expand query-generation coverage across customer segments, use cases, product categories, and buying stages.

---

## Design Choice — What Stays Human

AIVista automates **investigation and synthesis**, but the product decision remains with the user.

```text
AI Investigation
       ↓
    Evidence
       ↓
 Recommendation
       ↓
 Human Approval
       ↓
   Experiment
```

This creates a clear boundary between **AI-generated decision support and human business accountability**.

---

## Key Dependency

AIVista's insights depend heavily on the quality and coverage of the queries and AI responses being analyzed.

Poor query coverage can produce incomplete visibility measurements.

Therefore, improving **query coverage, evaluation consistency, and evidence quality** is as important as improving the underlying AI reasoning.

---

# 10. Current State & What's Next

## Live Today

The current product includes:

* Website investigation
* Website crawling
* Product/category understanding
* Customer query generation
* AI-search investigation workflow
* Competitor analysis
* Citation analysis
* Visibility-gap diagnosis
* Recommendation generation
* Investigation dashboard
* Evidence and findings interface
* Human approval flow

---

## Prototype / Demo Layer

The current prototype uses **staged or mock data in some areas** while the agent workflow and UI are being developed. This allows the complete product experience to be demonstrated before every external provider is connected.

This distinction is important: the product demonstrates the intended end-to-end workflow, while some external AI-search integrations remain part of the next build.

---

## Next Build

1. Connect production AI-search providers
2. Expand query-generation coverage
3. Add persistent investigation history
4. Add authentication and workspace management
5. Schedule recurring AI-visibility tests
6. Add experiment tracking
7. Connect visibility changes to business/revenue metrics
8. Add reporting and export

---

# AIVista — Complete Product Flow

```text
┌──────────────────────────┐
│     Company Website      │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Website Investigation    │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Customer Query Generation│
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│    AI Search Testing     │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Competitor + Citation    │
│        Analysis          │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│ Visibility Gap Diagnosis │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│    AI Recommendation     │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│       Experiment         │
└────────────┬─────────────┘
             ↓
┌──────────────────────────┐
│     Measure Impact       │
└──────────────────────────┘
```

## Product Principle

**AIVista is not designed to simply tell companies whether they appear in AI search.**

It is designed to connect:

**AI Search → Evidence → Diagnosis → Recommendation → Experiment → Measurement**

so teams can turn changes in AI visibility into a repeatable product and growth workflow.


<img width="1899" height="860" alt="5" src="https://github.com/user-attachments/assets/7b336289-5737-456b-8ad2-d7cb5924688c" />
<img width="1898" height="860" alt="4" src="https://github.com/user-attachments/assets/ed16a6fd-fd4f-4fa2-b3db-5afa9023b5bf" />
<img width="1899" height="860" alt="3" src="https://github.com/user-attachments/assets/84b01e9e-19c1-464d-a470-56a6d523f62d" />
<img width="1901" height="864" alt="2" src="https://github.com/user-attachments/assets/90a9f5d8-920f-4559-8450-787e35014514" />
<img width="1900" height="862" alt="1" src="https://github.com/user-attachments/assets/4f9cdabf-e35e-4fa8-9626-bb59a8e29126" />
<img width="1894" height="884" alt="6" src="https://github.com/user-attachments/assets/3c4685b4-8570-4cac-9dfe-3b0aa5adf8f5" />
