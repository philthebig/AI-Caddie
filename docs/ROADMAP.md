# AI Caddie — Product Roadmap

Track implementation phases for the golf logic layer and smarter AI coaching.

## Status legend

- ✅ Done
- 🚧 In progress
- ⬜ Not started

---

## Phase 0 — Security & form UX ✅

**Goal:** Close quick gaps before building smarter coaching.

| Task | Status | Notes |
|------|--------|-------|
| Verify round ownership on `/api/coach` | ✅ | `getDbUser()` + `round.userId` check |
| Same check on `generateFeedback` (legacy action) | ✅ | Kept in sync with coach route |
| Surface Zod validation errors in `AddRoundForm` | ✅ | List errors; jump to offending hole |
| Try/catch on round save (friendly DB error) | ✅ | `createRound` server action |

---

## Phase 1 — Strokes Gained baselines ✅

**Goal:** Deterministic SG estimates from hole-level data; feed into AI prompt.

| Task | Status | Notes |
|------|--------|-------|
| `lib/golf-logic/baselines.ts` | ✅ | Expected strokes, OTT/APP/ARG/PUTT proxies |
| `lib/golf-logic/strokes-gained.ts` | ✅ | Per-hole + round totals |
| Wire SG into `formatRoundForAI` | ✅ | Coach prompt uses computed numbers |
| Types in `lib/types/golf.ts` | ✅ | `StrokesGainedBreakdown`, `StrokesGainedHole` |
| Persist SG on `Round` (optional) | ⬜ | Deferred — recompute on demand for now |

---

## Phase 2 — Miss patterns (single round) ⬜

**Goal:** Segmented tendencies, not just raw left/right counts.

| Task | Status | Notes |
|------|--------|-------|
| `lib/golf-logic/miss-patterns.ts` | ⬜ | Direction × par × yardage buckets |
| Short-sided APP flag | ⬜ | SHORT miss + high proximity |
| ARG save rate by proximity band | ⬜ | |
| Three-putt rate on GIR vs non-GIR | ⬜ | |

---

## Phase 3 — Multi-round insights ⬜

**Goal:** Persistent patterns across last N rounds.

| Task | Status | Notes |
|------|--------|-------|
| `lib/golf-logic/insights.ts` | ⬜ | Rank segments by strokes lost × frequency |
| Fetch recent rounds in `/api/coach` | ⬜ | e.g. last 5–10 rounds |
| Structured `CoachInsight` payload | ⬜ | Headline + evidence + drill slot |
| Prompt: “use computed insights, don’t invent stats” | ⬜ | |

---

## Phase 4 — Coach payload refactor ⬜

**Goal:** Replace freeform blob with ranked insights + round summary.

| Task | Status | Notes |
|------|--------|-------|
| `buildCoachPayload()` | ⬜ | Replaces/extends `formatRoundForAI` |
| Consolidate `app/actions/ai.ts` with coach route | ⬜ | Single prompt builder |
| Drill lookup table (optional) | ⬜ | Category → drill mapping |

---

## Phase 5 — Dashboard & review UX ⬜

**Goal:** Show SG and patterns to the golfer, not only the AI.

| Task | Status | Notes |
|------|--------|-------|
| SG chips on dashboard round cards | ⬜ | OTT / APP / ARG / PUTT |
| Miss-pattern preview on review step | ⬜ | Before save |
| Store handicap / skill index | ⬜ | Tune baselines per player |

---

## Phase 6 — On-course play ⬜

**Goal:** Play hole-by-hole on the course with live scoring, map view, and distance.

**Full spec:** [`docs/ON_COURSE_PLAY.md`](./ON_COURSE_PLAY.md) — implementation details, file plan, acceptance criteria, and agent handoff prompts. **Implement one sub-phase at a time.**

| Sub-phase | Goal | Status | Notes |
|-----------|------|--------|-------|
| 6a | Live play mode | ✅ | `IN_PROGRESS` rounds, `/play/[id]`, `saveHole` per hole |
| 6b | Play UI polish | ✅ | Running totals, full-screen layout, auto-advance |
| 6c | GPS + distance | ✅ | `useGeolocation`, yardage + rough GPS readout |
| 6d | Map view | ✅ | Leaflet + OpenStreetMap on play screen |
| 6e | Offline sync | ✅ | IndexedDB queue for spotty cell |
| 6f | Hole-level GPS | ⬜ | Paid provider (iGolf, etc.) for true green distance |

**Agent prompt (6a):** *Read `docs/ON_COURSE_PLAY.md` and implement Phase 6a only.*

---

## Future — Shot-level data ⬜

**Goal:** Tour-grade strokes gained when capture supports it.

| Task | Status | Notes |
|------|--------|-------|
| `Shot` model (lie, distance, club) | ⬜ | Prisma migration |
| Full expected-strokes lookup table | ⬜ | Distance + lie |
| True category SG decomposition | ⬜ | |

---

## Key files

| Path | Role |
|------|------|
| `lib/golf-logic/baselines.ts` | Expected-strokes tables |
| `lib/golf-logic/strokes-gained.ts` | SG computation |
| `lib/golf-logic/aggregate.ts` | Aggregates + AI text formatting |
| `lib/auth.ts` | Clerk → DB user resolution |
| `app/api/coach/route.ts` | Streaming AI coach |
| `components/AddRoundForm.tsx` | Post-round + hole-by-hole entry (reuse for play UI) |
| `components/HoleNavBar.tsx` | On-course hole navigation |
| `docs/ON_COURSE_PLAY.md` | On-course play implementation plan (Phase 6) |
| `docs/ROADMAP.md` | This file |
