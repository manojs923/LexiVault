# FENCO 2.0 — Live Hackathon Pitch & Demo Script

> **Time Target:** 3 Minutes Total
> **Focus:** The 3 Core Verbs of the Official Challenge: **Understand**, **Compare**, and **Navigate**.

---

## 0:00 - 0:45 | The Hook & Technical Differentiation (Slide / Intro)

**Speaker:**
> "Every day, millions of freelancers, gig workers, and tenants sign contracts without having a lawyer on retainer. And big companies know this — they bury unilateral indemnification, perpetual non-competes, and arbitrary payment withholding deep inside 20 pages of legalese.
>
> Most AI contract tools try to solve this by stuffing entire 40-page agreements into an expensive LLM. That creates high latency, high API bills, and hallucinated legal advice.
>
> Meet **FENCO 2.0**. We take an architecture-first approach: **Two-Stage Risk Scoring**.
>
> When a contract is uploaded, our engine decomposes it into discrete clauses and compares each against our vector benchmark corpus using pgvector HNSW indexing. Over **62% of standard clauses** resolve right here at Stage 1 for near-zero cost and sub-second latency. Only anomalous, suspicious clauses are escalated to our Gemini 3.8 Flash semantic reasoning layer. We spend AI tokens where the risk actually lives."

---

## 0:45 - 1:30 | Demo Beat 1: Understand (Single Document Audit & Counter-Drafting)

**Action:** Open FENCO dashboard. Click **"Load Risky Freelance Contract"** demo button and click **"Analyze Contract"**.

**Speaker:**
> "Let's look at this real-world freelance agreement. Within two seconds, FENCO has extracted 8 clauses and generated our 'Before You Sign' Gotchas panel.
>
> Look at Clause 4: **Unlimited Indemnification**.
>
> The contract drafter slipped in: *'Contractor indemnifies Client regardless of whether caused by Client's own negligence.'* That means if the client causes a security breach, the freelancer could be sued for millions.
>
> FENCO flags this immediately in **Red (Unfavorable)** with a 94% confidence score. Notice that our UI doesn't just show a generic color badge; it explicitly displays our confidence rating and transparently confirms whether primary models were used.
>
> Best of all, look right here: **Counter-Draft Clause**. FENCO automatically drafts a balanced, mutual indemnification clause that's commercially reasonable for both sides. The freelancer can literally click 'Copy Counter-Draft' and paste it directly into an email back to the client."

---

## 1:30 - 2:10 | Demo Beat 2: Navigate (Grounded Document Q&A §7B)

**Action:** Scroll to the embedded **"Document Q&A"** panel on the analysis page.
Type Question 1: *"What happens if the client doesn't pay my invoice on time?"*

**Speaker:**
> "Now let's navigate the contract. Unlike generic chatbots that hallucinate outside laws, FENCO's Q&A is strictly grounded in the uploaded document's own clause vectors.
>
> Look at the answer:
> *'According to Clause 2 (Payment Terms), the client requires 90 business days to pay and reserves the right to withhold payment indefinitely if they are subjectively unsatisfied.'*
> Notice the clickable citation pill linking straight to Clause 2!
>
> Now watch what happens when I ask an out-of-scope question:
> Type Question 2: *"Does this contract give me stock options or health insurance?"*
>
> The AI responds honestly:
> *'This document does not appear to address stock options or health insurance benefits. You may want to request an addendum or consult an attorney.'*
> Zero hallucinations. Strict document grounding."

---

## 2:10 - 2:40 | Demo Beat 3: Compare (Side-by-Side Document Comparison §7A)

**Action:** Navigate to **"Compare Contracts"**. Select `freelance-sample-risky.txt` as Document A and `freelance-sample-fair.txt` as Document B. Click **"Run Side-by-Side Comparison"**.

**Speaker:**
> "The official challenge specifically asked for comparing two documents against each other — like two competing vendor offers, or an existing lease versus a renewal.
>
> Here FENCO aligns the two agreements clause by clause.
> In the matched rows, you see the difference explanation and a clear 'More favorable to' pill.
>
> But look at this section below: **'Clauses Only in Document A'**.
> FENCO caught that Document A contains a **Perpetual Non-Compete** that prevents the contractor from working anywhere else in the industry forever — a clause that is completely absent in the standard fair agreement. A human skimming both contracts would have easily missed what was *missing*."

---

## 2:40 - 3:00 | Demo Beat 4: Prepare ("Prep for Your Lawyer" Checklist §7C & Close)

**Action:** Click **"View Attorney Prep Checklist"**.

**Speaker:**
> "Finally, we believe AI should assist legal professionals, not pretend to replace them.
>
> FENCO generates this **Attorney Consultation Prep Sheet**. It lists the exact high-risk clauses, generates 3 specific, clause-grounded questions to ask your attorney during a paid 30-minute consultation, and tells you what documents to bring.
>
> With FENCO, users walk into a lawyer's office prepared, spend less money on discovery, and never sign a predatory contract in the dark again.
>
> Thank you!"
