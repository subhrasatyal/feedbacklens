# **The Product Lab**

## **Product Requirements Document (v0.3)**

**Product type:** Agentic product management workspace  
**Target audience:** Product managers at early-stage B2B SaaS companies  
**Objective:** Demonstrate how an AI agent can help PMs choose an appropriate thinking framework, investigate a product problem, and produce an evidence-backed recommendation.  
**Visual direction:** A playful, retro-futuristic scientist’s laboratory inspired by the spirit of *The Powerpuff Girls’ Professor’s lab*, reimagined as an original product experience.

---

## **1\. Product vision**

The Product Lab is an AI-powered workspace where product managers investigate uncertain product problems, test assumptions, and make better decisions.

Instead of asking PMs to choose from a long list of frameworks or relying on a generic chatbot, the agent diagnoses the problem, recommends an appropriate framework, identifies missing evidence, and proposes investigations. The PM stays in control, approving meaningful actions and reviewing the evidence behind every recommendation.

The experience is presented as an interactive laboratory. The agent acts as the scientist conducting investigations; the PM remains the head of the lab.

**Product promise:** Turn product uncertainty into structured investigation and evidence-backed decisions.

## **2\. Problem statement**

Product managers struggle to turn fragmented customer feedback and competing assumptions into evidence-backed product decisions without prematurely jumping to solutions.

Even experienced PMs can choose an unsuitable framework, overlook contradictory evidence, or spend time gathering information without knowing which question to investigate next.

Existing AI assistants can generate plausible product advice, but often do not make their reasoning, evidence gaps, and investigation process sufficiently visible.

## **3\. Target user**

**Primary user:** A product manager at an early-stage B2B SaaS company who must make product decisions with incomplete customer research, limited analytical support, and competing stakeholder opinions.

**Example scenario:**

Several customers have requested an AI assistant. Leadership is interested in building one, but the PM does not know whether the request represents a meaningful customer problem, a desired solution, or a vocal minority.

The PM needs to determine what to investigate before committing engineering resources.

## **4\. Goals and non-goals**

### **Goals**

1. Help PMs select an appropriate product thinking framework, either manually or through agent recommendation.  
2. Turn vague product questions into testable hypotheses.  
3. Investigate supplied evidence using supported tools.  
4. Surface supporting evidence, contradictions, assumptions, and remaining uncertainty.  
5. Recommend a concrete next step, with the PM retaining decision authority.  
6. Make the agent’s work understandable through an engaging laboratory interface.

   ### **Non-goals**

* A complete product management platform.  
* An exhaustive framework directory.  
* An autonomous product manager that makes final decisions.  
* Live integrations with every customer research, analytics, or project management tool.  
* A generic chatbot presented inside a themed interface.  
* A fully simulated laboratory in which decorative interactions replace useful work.

  ## **5\. Core user experience**

  ### **Step 1: Introduce the problem**

The PM enters a problem or decision, such as:

“Several customers have requested an AI assistant. Should we build one?”

The PM can optionally provide customer interviews, support tickets, product metrics, or other relevant documents.

**Lab metaphor:** The problem arrives on the lab clipboard; supplied documents enter the specimen tray.

### **Step 2: Choose a thinking approach**

The PM can either:

* Select a framework manually.  
* Ask the agent to diagnose the problem and recommend a framework.

When recommending a framework, the agent explains why it fits the problem and what it will help uncover. It should acknowledge when the available context is insufficient.

**Lab metaphor:** The framework selection area is the experiment-planning station.

### **Step 3: Form a hypothesis**

The agent helps turn the initial question into a testable hypothesis. The PM can edit or reject the proposed hypothesis.

For example:

“Customers requesting an AI assistant primarily need help completing a recurring workflow, rather than a general-purpose conversational interface.”

The hypothesis is treated as a proposition to investigate, not an established fact.

### **Step 4: Investigate the evidence**

The agent identifies what evidence would support or challenge the hypothesis, proposes an investigation, and asks for approval before taking meaningful actions.

With the supplied case data, it can search documents, compare customer statements, summarize patterns, and identify contradictions.

The agent should distinguish between:

* Evidence found in the supplied material.  
* Its interpretation of that evidence.  
* Assumptions that remain unverified.  
* Information that is missing.

**Lab metaphor:** The investigation station becomes active as the agent runs approved experiments. Its activity reflects real tool calls and analysis, not fabricated progress.

### **Step 5: Review the findings**

The agent produces a decision brief that includes:

* Problem framing.  
* Selected framework and rationale.  
* Current hypothesis.  
* Supporting and contradictory evidence.  
* Key assumptions and evidence gaps.  
* Recommendation and confidence level.  
* Proposed next experiment and success metric.

The PM can challenge the interpretation, revise the hypothesis, or ask the agent to investigate another question.

**Lab metaphor:** Findings are assembled on the results board for the PM to review.

## **6\. Framework library for the MVP**

The MVP will support five curated frameworks:

1. **Steelman vs Strawman:** Strengthen the best opposing argument before committing to a position.  
2. **Jobs to Be Done:** Understand the underlying customer progress or need behind a request.  
3. **Five Whys:** Investigate potential root causes rather than treating symptoms as the problem.  
4. **Assumption Mapping:** Identify and prioritize assumptions by importance and uncertainty.  
5. **Riskiest Assumption Test:** Design a focused experiment to test the assumption most likely to invalidate the proposed direction.

Each framework definition should include:

* When to use it.  
* When not to use it.  
* The questions it helps answer.  
* Required inputs.  
* A structured procedure.  
* Expected outputs.  
* Common failure modes.

The agent should recommend a framework based on the problem and available evidence, not simply select the most popular option.

## **7\. Agent behavior and control**

The agent follows an observable investigation loop:

**Diagnose → Recommend → Form hypothesis → Identify evidence gaps → Propose investigation → Request approval → Execute tools → Reassess → Recommend next step**

### **Agent requirements**

* Explain the rationale behind framework selection.  
* Use structured outputs for hypotheses, findings, and recommendations.  
* Ground claims in supplied evidence wherever possible.  
* Show source references for material findings.  
* Identify contradictory evidence rather than cherry-picking support.  
* Request PM approval before meaningful actions.  
* Maintain investigation state so findings can inform subsequent steps.  
* Admit when evidence is insufficient to make a reliable recommendation.  
* Never claim to have searched, measured, or verified something without actually doing so.

The agent can recommend a decision, but the PM owns the final call.

## **8\. Visual and interaction design**

### **Design concept**

The interface evokes an eccentric, retro-futuristic research laboratory: playful scientific curiosity, oversized apparatus, distinctive silhouettes, glass vessels, connected tubes, and restrained mint, pink, cream, and deep-purple accents.

The aesthetic should feel polished and intentional rather than childish. Avoid copying recognizable characters, exact sets, logos, or proprietary artwork from the original show.

### **Lab components and their product functions**

**The lab clipboard**

* Problem statement and investigation brief.  
* Entry point for starting or resuming work.

**The specimen tray**

* Uploaded customer interviews, support tickets, metrics, and documents.  
* Clear indicators of which sources are available to the agent.

**The experiment-planning station**

* Manual framework selection.  
* Agent-recommended framework, rationale, and hypothesis.  
* PM controls for accepting or changing the approach.

**The investigation apparatus**

* Visible agent steps and actual tool activity.  
* Evidence being examined and questions still unanswered.  
* Approval controls for proposed actions.

**The hypothesis board**

* Current and previous hypotheses.  
* Supporting evidence, contradictory evidence, and open assumptions.  
* Updates made as the investigation progresses.

**The results chamber**

* Final decision brief.  
* Recommended next experiment.  
* Evidence traceability and remaining uncertainty.

  ### **Interaction principles**

* The laboratory should help users understand the investigation, not merely decorate it.  
* Every interactive object must lead to a meaningful action or reveal useful information.  
* Motion and animation should communicate genuine state changes.  
* The agent’s activity should be visible without overwhelming the PM.  
* The primary workflow must remain easy to follow even if the user ignores decorative details.  
* A conventional, readable decision brief must remain available independently of the themed interface.

  ## **9\. MVP scope**

The MVP will include:

* One problem-input workflow.  
* Manual framework selection and agent-recommended selection.  
* Five curated frameworks.  
* Editable hypotheses.  
* One prepared case study with sample evidence.  
* Document search and basic evidence analysis.  
* One agent investigation loop with visible steps and approval controls.  
* A decision brief with source-linked findings.  
* A minimal interactive laboratory interface.  
* A clear way to compare manual framework selection with agent-recommended selection.

  ### **Explicitly out of scope**

* Live integrations with external customer systems.  
* Arbitrary multi-agent orchestration.  
* A comprehensive framework marketplace.  
* Production-grade collaboration and permissions.  
* A fully explorable 3D laboratory.  
* Complex animations that do not communicate meaningful state.

  ## **10\. Demonstration plan**

Use the same problem for two contrasting investigations:

**Scenario:** “Several customers have requested an AI assistant. Should we build one?”

**Run A: PM-selected framework**

1. The PM selects Jobs to Be Done.  
2. The agent applies the framework to the available customer evidence.  
3. The PM sees the findings and resulting recommendation.

**Run B: Agent-recommended framework**

1. The PM submits the same problem but delegates framework selection.  
2. The agent explains its recommendation based on the problem and available context.  
3. It investigates the evidence and surfaces a meaningful contradiction or missing piece of information.  
4. It proposes a focused next experiment and asks for approval.  
5. The PM reviews the resulting decision brief.

The frameworks need not differ in every case. If the agent recommends the same framework, it should explain why. The demo should show that the value comes from appropriate reasoning and evidence-based investigation, not simply from choosing a different framework.

## **11\. Success metrics**

### **Primary metric**

**Framework recommendation appropriateness:** The proportion of evaluated test cases in which PM reviewers judge the agent’s recommended framework appropriate for the stated problem and available context.

### **Secondary metrics**

* Hypothesis quality and testability.  
* Percentage of material findings traceable to evidence.  
* Ability to surface contradictory evidence.  
* Quality and specificity of the proposed next experiment.  
* Reviewer assessment of recommendation usefulness.  
* Time required to reach a usable decision brief.

  ### **Qualitative design evaluation**

* Can users explain what the agent is doing and why?  
* Does the lab environment make the investigation easier to follow?  
* Does the interface improve the experience without slowing down the decision-making process?

The visual theme itself is not the primary success metric. The product must demonstrate useful agent behavior even if the laboratory styling is removed.

## **12\. Technical approach**

**Frontend:** React or Next.js, with a responsive, component-based laboratory interface.

**Backend:** Python with FastAPI.

**LLM orchestration:** An LLM supporting structured outputs and tool calling.

**Evidence:** Prepared documents and sample product data for a repeatable hackathon demonstration.

**Framework engine:** Curated framework definitions represented as structured data and reusable application procedures.

**Tools:** Document search, basic evidence analysis, and experiment proposal generation.

**Investigation state:** Persist the current problem, framework, hypotheses, evidence references, approved actions, findings, and decision brief.

### **Architectural principle**

Separate the agent’s reasoning and investigation state from the visual laboratory interface. The same investigation should remain usable through a conventional interface and produce the same evidence-backed output.

This makes the product easier to evaluate, debug, and extend beyond the hackathon.

## **13\. Key risks and mitigations**

**Risk: The agent recommends generic frameworks.**  
Mitigation: Evaluate recommendations against diverse test cases and require problem-specific rationale.

**Risk: The agent invents findings.**  
Mitigation: Use prepared evidence, source-linked claims, structured outputs, and explicit uncertainty handling.

**Risk: Framework application becomes mechanical.**  
Mitigation: Let the agent identify when a framework is unsuitable, insufficient, or needs to be combined with another approach.

**Risk: The lab becomes a gimmick.**  
Mitigation: Tie every major visual component to a real workflow or meaningful state.

**Risk: The product becomes a framework directory.**  
Mitigation: Prioritize investigation, tool use, evidence quality, and the resulting decision brief over framework browsing.

**Risk: Animation obscures useful work.**  
Mitigation: Keep the investigation timeline and decision brief accessible and readable at all times.

**Risk: The demo makes the agent look more capable than it is.**  
Mitigation: Use real tool calls against a prepared evidence set, clearly distinguish sample data from live integrations, and show the actual approval and execution flow.

## **14\. Open questions for testing**

* When does agent-selected framework choice outperform manual selection?  
* Does the framework recommendation materially improve hypothesis or experiment quality?  
* Which frameworks are most useful for the initial target audience?  
* Does the lab metaphor improve comprehension and engagement, or distract from the work?  
* How much autonomy do PMs want before requiring approval?  
* What minimum evidence quality is necessary before the agent should make a recommendation?

  ## **15\. Definition of done**

The hackathon MVP is complete when a PM can:

1. Enter a product problem and provide supporting evidence.  
2. Choose a framework or request a recommendation.  
3. Review and edit a testable hypothesis.  
4. Observe the agent propose and execute an approved investigation.  
5. Inspect supporting and contradictory evidence.  
6. Receive a decision brief with a concrete next step.  
7. Understand what the agent did, what it found, and what remains uncertain.

The final demo should prove one central idea: **The Product Lab does not merely tell PMs which framework to use. It helps them use structured thinking and evidence to decide what to do next.**

