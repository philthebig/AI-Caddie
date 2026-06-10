# AI Caddie — Product Roadmap

Track implementation phases for the golf logic layer and smarter AI coaching.

## Status legend

- ✅ Done
- 🚧 In progress
- ⬜ Not started

---

## Product north star

**The app is an AI caddie/coach, not a scorecard.** Logging rounds is the data layer; coaching is the product.

### Coaching today (gaps)

| What exists | Limitation |
|-------------|------------|
| One button on round detail: “Get AI Coach Feedback” | User must remember to click; easy to miss after play |
| Single streaming paragraph, max ~4 sentences | Feels generic; no structure, no “why this hole” |
| One weakness + one drill | Ignores second-order issues (e.g. OTT fine but APP short-sided every time) |
| Single round only | No “you’ve missed right OTT in 4 of last 5 rounds” |
| Raw miss counts in prompt | No segmentation by par, yardage, or proximity bands |
| Stored once in `Round.aiFeedback` | No regenerate, no follow-up questions |
| SG computed but hidden from user | Golfer never sees OTT/APP/ARG/PUTT breakdown — only the AI does |
| On-course play (Phase 6) complete | **Zero coaching during or right after the round** — biggest missed moment |

### Coaching vision (target experience)

1. **Before the round** — “Your focus this week: lag putting. Last 3 rounds: 2.1 three-putts per round on GIR.”
2. **On the course** — After a blow-up hole or at the turn: one-line caddie note tied to live stats (“Third right miss OTT — club down, aim left edge today”).
3. **Right after finish** — Auto-run coach; structured card (headline, strokes lost, evidence holes, drill, optional “ask a follow-up”).
4. **Between rounds** — Dashboard “Practice focus” from last N rounds; trends + SG chips, not only score.
5. **Conversation** — “Why did I struggle on the back nine?” / “What should I work on at the range Tuesday?”

**Recommended build order:** Phases 2 → 4 → 5 (smarter data + UI) in parallel with **Phase 7a** (auto-coach on finish). Phase 3 (multi-round) unlocks the biggest “this knows me” jump. Phase 8 (chat) comes once payload is structured.

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

## Phase 2 — Miss patterns (single round) ⬜ **Next priority**

**Goal:** Segmented tendencies the AI (and UI) can cite with evidence — not raw left/right totals.

| Task | Status | Notes |
|------|--------|-------|
| `lib/golf-logic/miss-patterns.ts` | ⬜ | Direction × par × yardage buckets |
| Short-sided APP flag | ⬜ | SHORT miss + high proximity → “short-sided” segment |
| ARG save rate by proximity band | ⬜ | e.g. &lt;15 ft vs 15–30 ft vs 30+ ft |
| Three-putt rate on GIR vs non-GIR | ⬜ | Separate putting leak from scrambling noise |
| Blow-up hole detector | ⬜ | Holes ≥ +2 vs par with category attribution (OTT penalty vs APP vs PUTT) |
| Export `MissPatternSummary` for coach + UI | ⬜ | Typed object, not only prose in `formatRoundForAI` |

**Why first:** Cheap to build, immediately makes single-round coach prompts specific (“right OTT on 4 of 5 par 4s over 400y”).

---

## Phase 3 — Multi-round insights ⬜ **High impact**

**Goal:** Persistent patterns across last N rounds — the “caddie who remembers you.”

| Task | Status | Notes |
|------|--------|-------|
| `lib/golf-logic/insights.ts` | ⬜ | Rank segments by strokes lost × frequency |
| Fetch recent rounds in `/api/coach` | ⬜ | e.g. last 5–10 completed rounds |
| Structured `CoachInsight` payload | ⬜ | `{ headline, category, strokesLost, evidence[], drillId?, trend }` |
| Prompt: “use computed insights, don’t invent stats” | ⬜ | Hard rule in system prompt |
| `User.coachingFocus` (optional) | ⬜ | Persist top insight between rounds for dashboard |
| Compare round vs personal baseline | ⬜ | “Today APP −1.2 vs your 5-round avg −0.3” |

**Unlocks:** Dashboard “Practice focus this week,” pre-round reminder, coach that references trends not just today.

---

## Phase 4 — Coach engine refactor ⬜

**Goal:** Structured, multi-section coaching — not one paragraph blob.

| Task | Status | Notes |
|------|--------|-------|
| `buildCoachPayload()` | ⬜ | Replaces/extends `formatRoundForAI`; JSON + human summary |
| Consolidate `app/actions/ai.ts` with coach route | ⬜ | Single prompt builder + shared types |
| Coach **modes** via query/body | ⬜ | `post_round` \| `quick_tip` \| `hole_recap` \| `weekly_focus` |
| Structured AI output (JSON schema) | ⬜ | `summary`, `primaryFocus`, `secondaryFocus?`, `strokesCost`, `evidenceHoles[]`, `drill`, `encouragement` |
| Drill lookup table | ⬜ | Category → 2–3 vetted drills (reduces hallucinated drills) |
| Regenerate coach | ⬜ | Allow new analysis; version or replace `aiFeedback` |
| Richer default prompt | ⬜ | Drop “max 4 sentences”; require evidence holes + numeric SG |

**Example post-round card (UI target):**

```
Primary focus: Approach play (−2.4 SG APP)
Evidence: H4, H7, H12 — short-sided misses inside 20 ft
Cost: ~2 strokes vs expected today
Drill: Clock wedge — 40/50/60 yd to 3 ft circle
Also watch: 3 right OTT misses on par 4s > 400y
```

---

## Phase 5 — Coach UX & dashboard ⬜

**Goal:** Show SG and patterns to the golfer — coach visible beyond one round detail page.

| Task | Status | Notes |
|------|--------|-------|
| `CoachAnalysisCard` component | ⬜ | Structured sections from Phase 4 JSON |
| SG chips on dashboard round cards | ⬜ | OTT / APP / ARG / PUTT color-coded |
| **Practice focus** banner on dashboard | ⬜ | Top insight from Phase 3 when ≥3 rounds |
| Miss-pattern preview on review step | ⬜ | Before save / finish round |
| Post-finish coach screen | ⬜ | `/rounds/[id]?coach=1` or dedicated step after `finishRound` |
| Store handicap / skill index on `User` | ⬜ | Tune baselines + tone (“18 hcp” vs “single digit”) |
| “Ask follow-up” entry point | ⬜ | Links to Phase 8; disabled until chat exists |

---

## Phase 6 — On-course play ✅

**Goal:** Play hole-by-hole on the course with live scoring, map view, and distance.

**Full spec:** [`docs/ON_COURSE_PLAY.md`](./ON_COURSE_PLAY.md)

| Sub-phase | Goal | Status | Notes |
|-----------|------|--------|-------|
| 6a | Live play mode | ✅ | `IN_PROGRESS` rounds, `/play/[id]`, `saveHole` per hole |
| 6b | Play UI polish | ✅ | Running totals, full-screen layout, auto-advance |
| 6c | GPS + distance | ✅ | `useGeolocation`, yardage + rough GPS readout |
| 6d | Map view | ✅ | Leaflet + OpenStreetMap on play screen |
| 6e | Offline sync | ✅ | IndexedDB queue for spotty cell |
| 6f | Hole-level GPS | ✅ | OSM + manual calibration; paid provider stub |

---

## Phase 7 — On-course coaching ⬜ **New — use the play screen**

**Goal:** Coach feels present *during* the round, not only after you get home.

**Depends on:** Phase 6 ✅; Phase 2 recommended for hole-level tips.

| Sub-phase | Goal | Status | Notes |
|-----------|------|--------|-------|
| 7a | Auto-coach on `finishRound` | ⬜ | Trigger `/api/coach` after finish; land on coach card |
| 7b | Turn summary (holes 9 / 18) | ⬜ | Collapsible “Halfway check-in” — SG so far + one adjustment |
| 7c | Hole micro-coach (optional) | ⬜ | After save on double+ or 3-putt: one-line tip from running patterns |
| 7d | Pre-round game plan | ⬜ | If ≥3 prior rounds at same course: “Last time: missed left APP on 3, 7, 11” |
| 7e | Simplified stat mode | ⬜ | “Quick log” — score + putts + fairway/GIR only; lighter coach still works |

**7a is the quick win:** Users who play live never miss coaching — matches how real caddies work (debrief on 18 green).

**Agent prompt (7a):** *Implement Phase 7a: after `finishRound`, call coach API and show structured coach on round detail. Read `docs/ROADMAP.md` Phase 7.*

---

## Phase 8 — Conversational caddie ⬜ **New**

**Goal:** Follow-up questions and practice planning — coach as ongoing relationship.

| Task | Status | Notes |
|------|--------|-------|
| `POST /api/coach/chat` | ⬜ | Thread per round or per user; stream responses |
| `CoachMessage` model (optional) | ⬜ | Persist Q&A; or ephemeral with round context |
| Context injection | ⬜ | Last round payload + Phase 3 insights + user handicap |
| Suggested prompts | ⬜ | “Why the back nine?” “One range session plan?” “Club off tee on 7?” |
| Rate limits / token budget | ⬜ | Cap messages per round/day |
| Deprecate duplicate `generateFeedback` | ⬜ | Single coach entry point |

**Scope guard:** Chat references **computed** stats only; system prompt forbids inventing shot data the user didn’t log.

---

## Phase 9 — Reach & retention ⬜ **New — help more golfers**

**Goal:** Lower friction and give value before someone logs 10 perfect rounds.

| Task | Status | Notes |
|------|--------|-------|
| Quick-round mode | ⬜ | Totals only (score, FIR, GIR, putts) — coach uses limited SG proxies |
| First-round onboarding coach | ⬜ | Extra-encouraging template; explain what to track next time |
| Demo / sample round (logged out or new user) | ⬜ | Show coach output on example data |
| Email or push: “Round ready for review” | ⬜ | Optional; nudge to open coach after incomplete round |
| Shareable coach summary (image/link) | ⬜ | Viral loop — “My caddie said work on lag putts” |
| i18n-ready coach prompts | ⬜ | FR for QC courses (Algonquin, etc.) |

---

## Future — Shot-level data ⬜

**Goal:** Tour-grade strokes gained when capture supports it.

| Task | Status | Notes |
|------|--------|-------|
| `Shot` model (lie, distance, club) | ⬜ | Prisma migration |
| Full expected-strokes lookup table | ⬜ | Distance + lie |
| True category SG decomposition | ⬜ | |
| Club recommendation on course | ⬜ | Needs shot history + GPS distance |

---

## Implementation priority (suggested)

| Order | Phase | Effort | User-visible payoff |
|-------|-------|--------|---------------------|
| 1 | **7a** Auto-coach on finish | Small | Every live round gets coaching automatically |
| 2 | **2** Miss patterns | Medium | Specific, credible single-round advice |
| 3 | **4** Structured coach output + card UI | Medium | Coach feels like a product, not a paragraph |
| 4 | **5** Dashboard SG + practice focus | Medium | Value between rounds |
| 5 | **3** Multi-round insights | Medium–Large | “It knows my game” moment |
| 6 | **7b–7c** Turn / hole tips | Medium | True on-course caddie |
| 7 | **8** Chat | Large | Depth for engaged users |
| 8 | **9** Quick log + onboarding | Medium | More people complete first coach loop |

---

## Key files

| Path | Role |
|------|------|
| `lib/golf-logic/baselines.ts` | Expected-strokes tables |
| `lib/golf-logic/strokes-gained.ts` | SG computation |
| `lib/golf-logic/aggregate.ts` | Aggregates + `formatRoundForAI` (→ `buildCoachPayload`) |
| `lib/golf-logic/miss-patterns.ts` | Phase 2 — segmented tendencies |
| `lib/golf-logic/insights.ts` | Phase 3 — multi-round ranking |
| `lib/auth.ts` | Clerk → DB user resolution |
| `app/api/coach/route.ts` | Streaming AI coach (→ modes + structured output) |
| `app/api/coach/chat/route.ts` | Phase 8 — conversational coach |
| `components/AICoachButton.tsx` | Round detail trigger (→ `CoachAnalysisCard`) |
| `components/CoachAnalysisCard.tsx` | Phase 5 — structured coach UI |
| `app/actions/play.ts` | `finishRound` — hook for Phase 7a auto-coach |
| `components/PlayRoundClient.tsx` | Phase 7b–7c — on-course coach surfaces |
| `components/AddRoundForm.tsx` | Post-round + hole-by-hole entry |
| `docs/ON_COURSE_PLAY.md` | On-course play spec (Phase 6) |
| `docs/ROADMAP.md` | This file |
