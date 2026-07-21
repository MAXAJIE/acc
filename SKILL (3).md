---
name: car-dealer-app-domain-rules
description: Domain rules, regulatory constraints, and data-model contracts for the single-dealer car dealership cash-flow, inventory, and agent-commission app (Malaysia market). Consult this whenever writing, reviewing, or planning code that touches vehicle inventory, financing/profit calculations, agent commissions, the leaderboard, customer-facing vehicle pages, agent onboarding, personal data (IC numbers, bank accounts, phone numbers), or the in-app data Q&A chatbot. Also consult before deciding what NOT to build — customer lending, multi-tenant support, raw Puspakom report display, and LLM vehicle-description generation are intentionally out of scope for this build. Source of truth: car_dealer_app_spec_zh_v0.2.md and PLAN.md in this project.
---

# Car Dealer App — Domain Rules

This is a single-tenant internal tool for one car dealership in Malaysia. It replaces the dealer's Excel + WhatsApp workflow. It is **not** a lending product and must never become one — do not add any feature that extends credit or financing to customers.

Read this before touching: permissions/auth, financial calculations, the data model, anything storing IC numbers or bank details, or the chatbot. The reasoning matters more than the rules — Malaysian regulatory exposure here is real (PDPA fines, Consumer Protection Act fines, tax withholding obligations), so bend these rules only with a clear reason, not out of convenience.

## 1. The three roles and why they're isolated this way

| Role | Sees | Never sees | Why |
|---|---|---|---|
| **Dealer / Admin** | Everything: cash flow, inventory cost, all agents' commissions, all financing terms | — | Owns the business risk |
| **Agent** | Own sales, own commission ledger, shared inventory list (specs only) | Purchase cost, financing exposure, other agents' commissions, full cash-flow dashboard | Agents mix formal employees and informal commission sellers — purchase cost and financing terms are commercially sensitive even from trusted staff |
| **Customer (no login)** | One vehicle's photos, specs, dealer-written condition summary, price | Purchase cost, financing details, margin, raw Puspakom report | Public link, zero auth — anything shown here is effectively public forever |

Whenever you write a query, an API endpoint, or a chatbot tool, ask "which of these three roles is calling this?" and filter server-side accordingly. Never rely on the frontend to hide a field — a curious agent opening devtools should not be able to see purchase cost.

## 2. The anti-fraud gate: `dealer_confirmed`

Sales only count toward the leaderboard and the commission ledger once the dealer/admin has confirmed the transaction. Never let an agent-reported sale flow into either of those views before confirmation. This exists because agents include informal commission sellers with a direct incentive to over-report sales — it is the single most important write-path check in the app. If you're building the transaction-creation flow, the default state must be unconfirmed, and confirming it must be a dealer/admin-only action.

## 3. Floating-profit formula (finalized — conventional interest)

```
floating_profit = sale_price − purchase_cost − accrued_financing_cost − reconditioning_cost

accrued_financing_cost = amount_financed × (annual_rate / 365) × days_in_stock
```

- This is simple daily-accrual interest, decided for v1. It assumes every financing source the dealer uses is conventional interest, not an Islamic/Tawarruq profit-rate structure. Don't generalize this into a "rate" abstraction that silently supports other interest conventions (reducing balance, minimum holding period) — that would misrepresent the number without anyone noticing. If the dealer later adds an Islamic financing source, this formula and the UI wording ("interest rate" vs. "profit rate") both need to change together — flag it rather than quietly patching one.
- `financing_type` (cash vs. financed) is set **per vehicle**, never globally — this dealer mixes both funding sources.
- `days_in_stock` is derived, and it drives both the aging alert buckets (0–30 / 31–60 / 61–90 / 90+) and this formula. Compute it once and reuse it — don't recompute with slightly different date-diff logic in two places.

## 4. What the customer-facing vehicle page can show

Customer pages are public (`public_link_id`, no login). They may show: photos, spec fields, price, and the **`condition_summary`** field only.

They must never show: `purchase_cost`, `amount_financed`, `rate`, `drawdown_date`, `puspakom_status`, `puspakom_date`, or any raw Puspakom B5 report file. The dealer decided to show only their own written condition summary, not the official inspection report as-is — treat `condition_summary` and the internal Puspakom fields as separate, non-overlapping fields, not a public/private view of the same field. If you're building the public API/route for a vehicle page, allow-list the fields it returns rather than block-listing what to hide — an allow-list fails safe if someone adds a new sensitive field to `Vehicle` later and forgets to hide it.

## 5. The chatbot (in-app widget, not a separate page)

Scope for this build: **one** feature — an account-scoped data Q&A widget embedded in the site chrome, available to logged-in dealer/admin and agent users. It answers questions like "how many cars did I sell this month" or "which cars have been in stock over 60 days" using the user's own data.

Two hard rules:
1. **It calls the same permission-checked data layer the rest of the app uses.** Do not give it a separate, unfiltered query path "for convenience." If an agent asks a question, the chatbot must be structurally unable to return another agent's commission or the dealer's cash flow — not "instructed" not to via a system prompt, but actually incapable of it because the underlying tool call is scoped to that agent's `agent_id`.
2. **It never invents numbers.** Implement it as tool-calling/retrieval: the model calls a function that hits the real, permission-scoped data query, and only narrates the result. It should not generate financial figures from its own reasoning.

Out of scope for this build: automatic marketing/description text generation for vehicles. That's a different feature with its own Consumer Protection Act exposure (Section 10(1) — false or misleading statements about a good's condition, first offense up to RM250,000) and was deliberately cut from this round. Don't build it opportunistically because "the LLM is already there" — if it comes back in scope later, it needs its own grounding mechanism (generated text must be traceable to verified vehicle fields) before it ships.

## 6. Personal data — treat IC numbers and bank accounts as high-sensitivity even though they aren't legally "sensitive personal data"

Under Malaysia's PDPA, "sensitive personal data" is a specific defined category (health, political opinion, religious belief, commission of an offense, and — since the 2024 amendment — biometric data). IC numbers and bank account numbers are **not** in that legal category, but they carry real identity-theft and financial risk, so this app handles them at the same bar as if they were:

- Encrypt `ic_number` and `bank_account` at rest.
- Enforce the same role-based access as everything else — an agent sees their own IC/bank fields, never another agent's.
- Record `consent_ack_date` on the `Agent` record when they accept the onboarding consent notice — this is the PDPA compliance evidence trail, not just a UX nicety. Don't let it be optional or backdated.
- Customers are out of scope for PII in this phase — the app doesn't collect buyer name/IC/bank details yet. That changes in Phase 2 when MyInvois integration requires buyer identity data for e-invoices; that'll need its own consent flow, don't retrofit the agent one.

There's a placeholder PDPA consent notice in the spec (Section 8 of `car_dealer_app_spec_zh_v0.2.md`) — it's explicitly marked as needing legal review before going live. Wire the onboarding flow to display *some* version of that notice and capture acceptance, but don't treat the placeholder wording as final copy.

Also build a lightweight breach-handling path even in v1: it doesn't need automation, but there should be a way for the dealer/admin to log "we think X data was exposed" and a documented internal process to notify affected people — this is a live legal obligation as of June 2025 under the PDPA amendment, not a nice-to-have.

## 7. Regulatory constraints quick-reference

| Trigger in code | Constraint |
|---|---|
| Any endpoint/table storing agent PII | PDPA notice-and-choice: consent must be captured and timestamped before storing (see §6) |
| Commission ledger writes | Must be per-transaction, dated, and tied to `agent_id` from day one — this is the same data CP58 (Income Tax Act s.83A) and Section 107D withholding will need in Phase 2. Don't lose granularity now to save a migration later; retroactively reconstructing per-transaction commission history is much harder than storing it correctly from the start |
| Vehicle sale price ≥ RM10,000 | MyInvois e-invoicing applies to almost every sale here, but actual LHDN integration is Phase 2. For now, just make sure the fields MyInvois will need (price, date, vehicle, eventually buyer identity) are captured cleanly, not scattered |
| Any vehicle-condition text shown to customers | Must trace to verified fields — no LLM-generated marketing copy in this build (see §5) |
| Puspakom data | Internal `puspakom_status`/`puspakom_date` only; never surface the raw report to customers (see §4) |

## 8. Data model reference

```
Vehicle: vehicle_id, make, model, year, variant, vin, engine_no,
         purchase_cost, financing_type, amount_financed, rate, drawdown_date,
         condition_grade, puspakom_status, puspakom_date,   # internal only
         condition_summary,                                  # customer-facing
         sale_price, sale_date, status, public_link_id, days_in_stock (derived)

Agent: agent_id, name, phone, ic_number (encrypted), bank_account,
       employment_type, join_code_used, joined_date, status, consent_ack_date

Transaction: transaction_id, vehicle_id, agent_id, sale_price, sale_date,
             dealer_confirmed (bool), commission_amount

CommissionLedger: entry_id, agent_id, transaction_id, amount, date

CustomerView: public_link_id, vehicle_id, active (bool)
              # exposes only an allow-listed subset — see §4
```

`dealer_id` exists on the core tables as a single-row placeholder for a possible future multi-tenant version. Don't build multi-tenant logic now — just don't actively make the field harder to use later (e.g., don't hardcode assumptions that there's exactly one dealer in ways that would require a rewrite, but also don't build out tenant-switching UI or per-tenant auth scoping — that's explicitly out of scope).

## 9. Explicitly not in this build

Do not implement, even partially: customer-facing financing/lending, multi-dealer/multi-tenant support, raw Puspakom report display, LLM vehicle-description generation, CP58/Section 107D report generation, or MyInvois/LHDN integration. All of these are either permanently excluded or deferred to Phase 2 in `PLAN.md` — if a task seems to require one of them, stop and flag it rather than building a partial version.
