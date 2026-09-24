# FENCO 2.0 — Hackathon Judge Evaluation & Walkthrough Checklist

> **Purpose:** A structured, timed 10-to-15 minute evaluation walkthrough to verify all 7 challenge use cases, technical differentiators, and security safeguards with zero friction.

---

## ⏱️ Evaluation Overview (12 Minutes Total)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. Pre-Flight   │ ──▶ │ 2. Audit & Risk │ ──▶ │ 3. Grounded Q&A │ ──▶ │ 4. Compare &    │
│    Trust Check  │     │    Gotchas      │     │    Navigation   │     │    Attorney Prep│
│    (1 min)      │     │    (3 min)      │     │    (3 min)      │     │    (5 min)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Step 1: Pre-Flight & Trust Safeguards (1 Minute)

1. Open the application landing page.
2. **Observe Legal Trust Framing:**
   - Look at the top banner: Notice the explicit disclaimer:  
     *"Informational Only — Not Legal Advice: FENCO helps you spot risks and prepare for negotiations, but cannot replace a licensed attorney..."*
   - Verify that disclaimers are present on all screens and returned in every API JSON payload.
3. **Verify Zero Hallucination Framing:**
   - Note the transparent statement on AI model usage (`PROVIDERS.md` and `BENCHMARK_PROVENANCE.md`).

---

## Step 2: Use Cases 1, 3, 5, 6 — Understand, Audit, & Counter-Draft (3 Minutes)

1. On the landing page, click the **"Load Risky Freelance Demo"** button (or upload `demo-contracts/freelance-sample-risky.txt`).
2. Within 4 seconds, observe the full audit result:
   - **Quantitative Metrics Bar:** Verify total clauses (8), Standard (1), Caution (2), Unfavorable (5), and **Stage 1 Savings Metric** (shows real percentage of clauses resolved without LLM tokens).
   - **"Before You Sign" Gotchas Panel:** Read the plain-English summary alerts (e.g., *"You Pay For Their Mistakes"*, *"90-Day Payment + Subjective Hold"*, *"Perpetual Career Ban"*).
3. **Clause-Level Audit & Confidence Scores:**
   - Inspect **Clause 3 (Unlimited Indemnification)**: flagged in **Red (Unfavorable)** with a 96% confidence score.
   - Observe the plain-English explanation of why unilateral indemnity is commercially unreasonable.
4. **Counter-Drafting (Use Case 5):**
   - In Clause 3, view the **"Suggested Counter-Draft"** box.
   - Click the **"Copy"** button to verify it copies the ready-to-negotiate mutual indemnification language to your clipboard.

---

## Step 3: Use Case 4 — Grounded Document Q&A (§7B - *Navigate*) (3 Minutes)

1. Locate the sticky **"Document Q&A"** chat panel on the right side of the analysis view.
2. **Test In-Scope Question:**
   - Type: `"What is the payment timeline and can they withhold money?"`
   - Hit **Enter**.
   - **Verify Result:** Assistant states that Clause 2 specifies a 90 business day payment cycle with subjective withholding rights.
   - **Check Citation:** Look below the response for the `📌 Grounded in Clause 2` badge linking back to the exact contract section.
3. **Test Anti-Hallucination Guardrail (Out-of-Scope Question):**
   - Type: `"Does this agreement provide health insurance or 401(k) matching?"`
   - Hit **Enter**.
   - **Verify Result:** Assistant responds truthfully:  
     *"This document does not appear to address health insurance or 401(k) matching. You may want to request a written clarification..."*
   - Zero hallucination of outside laws or fictional benefits.

---

## Step 4: Use Case 2 — Document-to-Document Comparison (§7A - *Compare*) (3 Minutes)

1. Click **"Compare Mode (§7A)"** in the top navigation bar (or click *"Compare Another Doc"* from the audit page).
2. Click **"Load Compare Demo (Risky vs Fair)"**.
3. **Inspect the Two-Column Side-by-Side View:**
   - Read the **Executive Comparison Summary** card explaining why Offer B is superior.
   - Scroll through **Matched Clause Differences**:
     - See Offer A's 90-day payment contrasted directly against Offer B's Net-30 payment.
     - Observe the **"Favors: Doc B"** badge.
4. **Verify One-Sided Clause Detection (§7A Key Innovation):**
   - Scroll to the bottom two cards:
     - **Only Present in Document A:** Observe that FENCO caught the **Perpetual Worldwide Non-Compete** that is completely absent in Offer B.
     - **Only Present in Document B:** Observe the **Dispute Mediation First** clause.
   - This proves the system catches critical terms that human skimming routinely misses.

---

## Step 5: Use Case 7 — "Prep for Your Lawyer" Checklist (§7C - *Prepare*) (2 Minutes)

1. Click **"Prep for Your Lawyer"** in the top-right corner.
2. **Review the Structured Consultation Brief:**
   - **Executive Summary:** High-level summary of the contract's risk profile.
   - **Flagged Items:** Each flagged clause with a 1-sentence "why this matters practically" explanation.
   - **Questions to Ask:** Concrete, clause-grounded questions (e.g., *"Is the unilateral indemnification in Clause 3 enforceable in our state if the client causes the breach?"*).
   - **Documents to Gather:** Specific evidence to bring (e.g., *"Original scope of work", "Proof of E&O insurance"*).
3. **Test Print View:**
   - Click the **"Print"** button to view the clean, distraction-free print preview.

---

## 🔍 Technical & Architecture Validation (Optional: 1 Minute)

- Open **DevTools → Network tab**.
- Filter by `Fetch/XHR`.
- Submit a Q&A question or run an analysis.
- Verify:
  - Clean RESTful endpoints (`/api/documents/:id/ask`, `/api/documents/:id/analysis`).
  - No sensitive raw contract text dumped into URLs.
  - Every payload includes the mandatory `disclaimer` field.
  - Fast response times under 4 seconds.
