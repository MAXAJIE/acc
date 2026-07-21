# Build Plan — Car Dealer Cash Flow, Inventory & Agent App

Source spec: `car_dealer_app_spec_zh_v0.2.md` (single-dealer internal tool, Malaysia). Domain rules and guardrails this plan depends on live in `SKILL.md` — read that first, it explains the *why* behind several constraints below; this file is the *what and in what order*.

## Before writing code: confirm assumptions with the user

The spec deliberately doesn't fix a tech stack, and neither does this plan by default. Pick one with the user at kickoff rather than assuming — the choice below is a reasonable default, not a decision that's already been made:

- **Frontend:** responsive PWA (one codebase for desktop + iOS + Android), e.g. React + Vite or Next.js
- **Backend:** a typed API layer with server-side role checks (see `SKILL.md` §1) — Next.js API routes or a separate Node/Express service both work
- **Database:** Postgres — relational fits this data model well, and encryption-at-rest for `ic_number`/`bank_account` (`SKILL.md` §6) is straightforward with column-level encryption or a KMS-backed field
- **Auth:** simple session/JWT auth with a `role` claim (`dealer_admin` | `agent`) plus `agent_id` for scoping — no need for anything heavier at single-tenant scale

If the user already has a stack preference (existing repo, house conventions, hosting target), use that instead and update this section.

## Working agreement for whoever (human or agent) executes this plan

- Before touching permissions, financial formulas, PII fields, or the chatbot, re-read the relevant `SKILL.md` section — don't reimplement from memory of this file alone.
- Every list/detail endpoint that returns `Vehicle`, `Transaction`, or `Agent` data needs an explicit note on which role(s) can call it and which fields are stripped for which role. Add this to the PR/commit description, not just the code.
- If a task seems to require something in the "Explicitly not in this build" list (`SKILL.md` §9), stop and ask rather than building a partial version of it.
- Treat `dealer_confirmed = false` as the default and only path for new transactions — see `SKILL.md` §2 before writing the transaction-creation flow.

---

## Milestones (Phase 1 / MVP)

Build roughly in this order — later milestones depend on the data model and auth from M1.

### M0 — Project scaffolding
- Repo setup, chosen frontend + backend + DB wired together, deployed to a staging environment early (even before features exist) so every later milestone ships incrementally.
- CI: lint + typecheck + test on push, at minimum.
- **Done when:** a "hello world" page renders through the full stack (frontend → API → DB → back) in staging.

### M1 — Data model, auth, and role-based access
- Implement the schema from `SKILL.md` §8 (`Vehicle`, `Agent`, `Transaction`, `CommissionLedger`, `CustomerView`), including the single-row `dealer_id` placeholder.
- Implement auth with two roles: dealer/admin and agent. No customer accounts — customers never authenticate.
- Implement the server-side permission-checking layer described in `SKILL.md` §1 as a single reusable module — every subsequent milestone's endpoints should call through it, not reimplement filtering ad hoc.
- Encrypt `ic_number` and `bank_account` at rest.
- **Done when:** you can create a dealer/admin and an agent account, log in as each, and confirm via API tests that an agent's token cannot read another agent's `Transaction`/`CommissionLedger` rows or any `purchase_cost`/`amount_financed`/`rate` field.

### M2 — Vehicle inventory CRUD + search
- List view, search bar, "add inventory" flow with the full field set from `SKILL.md` §8.
- `financing_type` set per vehicle (cash vs. financed), not global.
- Implement `days_in_stock` as a single derived-value function reused everywhere it's needed (aging buckets, interest accrual) — don't let two code paths compute it differently.
- **Done when:** dealer/admin can add/edit/search vehicles; agents can view the shared list (specs only, no cost/financing fields) per the role matrix in `SKILL.md` §1.

### M3 — Floating profit calculation + dashboard
- Implement the formula from `SKILL.md` §3 exactly, including the daily-accrual interest calc. Write a unit test with a known vehicle/financing example and a hand-computed expected value — this number needs to be trustworthy, not just "looks reasonable."
- Dashboard: summary cards (net cash position, total financing interest exposure, count of vehicles past the aging threshold) + three drill-down views (net cash time series, per-vehicle financing exposure sorted descending, aging buckets 0–30/31–60/61–90/90+).
- Dealer/admin only — agents don't see this page at all.
- **Done when:** the three drill-down views render from real inventory data and the summary cards match a manual spot-check.

### M4 — Transactions, dealer confirmation, leaderboard, commission ledger
- Transaction creation flow, defaulting to `dealer_confirmed = false`.
- A dealer/admin-only confirmation action that flips the flag.
- Leaderboard reads **only** confirmed transactions (`SKILL.md` §2 — this is the core anti-fraud check, test it explicitly).
- Commission ledger: one row per transaction per agent, dated — this is the data CP58/Section 107D will read in Phase 2, so don't skip fields to save time now.
- **Done when:** an unconfirmed sale does not appear on the leaderboard or affect any commission total; confirming it does, immediately and correctly.

### M5 — Customer-facing vehicle page
- Public route keyed on `public_link_id`, no auth.
- Allow-list the response fields per `SKILL.md` §4 — implement this as an explicit allow-list function, not a "hide these fields" block-list, so it fails safe if `Vehicle` gains new sensitive fields later.
- Show `condition_summary` (dealer-written), never `puspakom_status`/`puspakom_date`/any raw report file.
- Dealer/admin can generate and revoke the public link per vehicle.
- **Done when:** hitting the public URL as a logged-out user returns photos, specs, `condition_summary`, and price — and a field-by-field diff confirms nothing else leaks.

### M6 — Agent onboarding via invite codes
- Invite code generation/management by dealer/admin: expiry, single-use vs. multi-use, revocable.
- Registration flow requires dealer/admin approval before the new agent gets access to inventory or commission data — the invite code itself grants nothing on its own.
- Onboarding must display the PDPA consent notice (draft in the spec's Section 8) and record `consent_ack_date` on acceptance; block account activation without it.
- **Done when:** a new agent can register with a valid code, is invisible to the rest of the app until dealer/admin approves them, and has a `consent_ack_date` set before they can see any data.

### M7 — In-app chatbot widget
- Build per `SKILL.md` §5: embedded widget (not a separate page), tool-calling/retrieval architecture, tools scoped by the same permission layer from M1.
- Minimum tool set: "my sales this month," "my commission total," "vehicles over N days in stock" (dealer/admin only), plus whatever else naturally maps to existing queries — don't add a generic "run arbitrary query" tool.
- **Done when:** an agent asking about another agent's data gets a graceful refusal (because the tool call is scoped, not because a prompt told the model to refuse) — test this explicitly, it's the one place a subtle bug becomes a real data leak.

### M8 — Data-breach logging (lightweight)
- A simple internal form/log for dealer/admin: "what happened, what data, when noticed," plus a short internal runbook doc (not code) for who to notify and how, per `SKILL.md` §6.
- No automation required for v1 — this satisfies "have a documented process," not "have a SOC."
- **Done when:** the log exists and the runbook doc is written and linked from it.

---

## Explicit non-goals for this build

Do not build, even partially — see `SKILL.md` §9 for the reasoning:
- Any customer financing/lending feature
- Multi-dealer / multi-tenant support or tenant-switching UI
- Raw Puspakom report display to customers
- LLM-generated vehicle description/marketing copy
- CP58 report generation, Section 107D withholding calculation
- MyInvois/LHDN integration

## Phase 2 backlog (not now — listed so nothing gets lost)

- CP58 threshold tracking and slip generation, using the commission ledger data captured since M4
- Section 107D 2% withholding calculation for eligible agents
- MyInvois e-invoice integration — will require a new PDPA consent flow for buyer identity data (name/IC/TIN), separate from the agent consent flow built in M6
- If the PWA proves insufficient, wrap the same codebase with Capacitor/React Native for native distribution
- (Not committed) LLM vehicle-description generation — if revisited, needs its own field-grounding mechanism before shipping, per `SKILL.md` §5

## Final legal check before go-live

The regulatory content in the spec and in `SKILL.md` is informational, current as of July 2026, and not legal advice. Before launch, get the dealer's lawyer/accountant to review: the PDPA consent notice wording (spec Section 8), the Malay-language translation requirement for that notice, whether the dealer's agent/customer data volumes trigger the mandatory DPO appointment threshold (unlikely at this scale, but worth confirming), and the Puspakom summary-only display decision.
