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
| Raw miss counts in prompt | ✅ Phase 2 — segmented by par, yardage, proximity, GIR |
| Stored once in `Round.aiFeedback` | No regenerate; follow-up chat ✅ (Phase 8) but initial summary still one-shot |
| SG on round detail only | Dashboard round cards still lack SG chips (Phase 5) |
| Auto-coach on finish (Phase 7a) ✅ | No turn/hole tips yet; no coaching *during* the round |

### Coaching vision (target experience)

1. **Before the round** — “Your focus this week: lag putting. Last 3 rounds: 2.1 three-putts per round on GIR.”
2. **On the course** — After a blow-up hole or at the turn: one-line caddie note tied to live stats (“Third right miss OTT — club down, aim left edge today”).
3. **Right after finish** — Auto-run coach; structured card (headline, strokes lost, evidence holes, drill, optional “ask a follow-up”).
4. **Between rounds** — Dashboard “Practice focus” from last N rounds; trends + SG chips, not only score.
5. **Conversation** — ✅ Phase 8: follow-up chat on round detail with suggested prompts

**Recommended build order:** Phases **4 → 5 → 3** (structured coach UI, dashboard, multi-round insights) are the highest-impact next steps. Phase 2 ✅, Phase 7a ✅, and Phase 8 ✅ are done.

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

## Phase 2 — Miss patterns (single round) ✅

**Goal:** Segmented tendencies the AI (and UI) can cite with evidence — not raw left/right totals.

| Task | Status | Notes |
|------|--------|-------|
| `lib/golf-logic/miss-patterns.ts` | ✅ | Direction × par × yardage buckets |
| Short-sided APP flag | ✅ | SHORT miss + proximity ≤30 ft → short-sided segment |
| ARG save rate by proximity band | ✅ | &lt;15 ft vs 15–30 ft vs 30+ ft |
| Three-putt rate on GIR vs non-GIR | ✅ | Separate putting leak from scrambling noise |
| Blow-up hole detector | ✅ | Holes ≥ +2 vs par with SG category attribution |
| Export `MissPatternSummary` for coach + UI | ✅ | `computeMissPatterns()` + `formatMissPatterns()` wired into `formatRoundForAI` |

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

## Phase 4 — Coach engine refactor ✅

**Goal:** Structured, multi-section coaching — not one paragraph blob.

| Task | Status | Notes |
|------|--------|-------|
| `buildCoachPayload()` | ✅ | `lib/coach/payload.ts` — JSON context + human summary |
| Consolidate `app/actions/ai.ts` with coach route | ✅ | Phase 8 removed legacy action; `/api/coach` + shared `lib/coach/*` |
| Coach **modes** via query/body | ✅ | `post_round` \| `quick_tip` \| `hole_recap` \| `weekly_focus` |
| Structured AI output (JSON schema) | ✅ | `lib/coach/types.ts` — `generateObject` + Zod schema |
| Drill lookup table | ✅ | `lib/coach/drills.ts` — category → vetted drills |
| Regenerate coach | ✅ | `regenerate: true` replaces `aiFeedback`; UI button on card |
| Richer default prompt | ✅ | Evidence holes + numeric SG required; no 4-sentence cap |

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
| Post-finish coach screen | ✅ | `/rounds/[id]?coach=1` auto-starts post-round stream (Phase 7a) |
| Store handicap / skill index on `User` | ⬜ | Tune baselines + tone (“18 hcp” vs “single digit”) |
| “Ask follow-up” entry point | ✅ | `CoachChat` on round detail (Phase 8) |

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

## Phase 7 — On-course coaching 🚧 **7a done — turn/hole tips next**

**Goal:** Coach feels present *during* the round, not only after you get home.

**Depends on:** Phase 6 ✅; Phase 2 recommended for hole-level tips.

| Sub-phase | Goal | Status | Notes |
|-----------|------|--------|-------|
| 7a | Auto-coach on `finishRound` | ✅ | Redirect to `/rounds/[id]?coach=1`; auto-starts coach stream |
| 7b | Turn summary (holes 9 / 18) | ⬜ | Collapsible “Halfway check-in” — SG so far + one adjustment |
| 7c | Hole micro-coach (optional) | ⬜ | After save on double+ or 3-putt: one-line tip from running patterns |
| 7d | Pre-round game plan | ⬜ | If ≥3 prior rounds at same course: “Last time: missed left APP on 3, 7, 11” |
| 7e | Simplified stat mode | ⬜ | “Quick log” — score + putts + fairway/GIR only; lighter coach still works |

**7a is the quick win:** Users who play live never miss coaching — matches how real caddies work (debrief on 18 green).

**Agent prompt (7a):** *Implement Phase 7a: after `finishRound`, call coach API and show structured coach on round detail. Read `docs/ROADMAP.md` Phase 7.*

---

## Phase 8 — Conversational caddie ✅

**Goal:** Follow-up questions and practice planning — coach as ongoing relationship.

| Task | Status | Notes |
|------|--------|-------|
| `POST /api/coach/chat` | ✅ | Per-round thread; `useChat` + `toUIMessageStreamResponse` |
| `CoachMessage` model | ✅ | `CoachMessage` + migration; Q&A persisted per round |
| Context injection | ✅ | `lib/coach/context.ts` — round SG/stats, last 5 rounds trend, prior `aiFeedback` |
| Suggested prompts | ✅ | Four chips in `CoachChat` (“back nine”, range plan, costly holes, 30-min drill) |
| Rate limits / token budget | ✅ | `lib/coach/rate-limit.ts` — 30 user msgs/day, 15/round; 600 max output tokens |
| Deprecate duplicate `generateFeedback` | ✅ | Removed `app/actions/ai.ts`; `/api/coach` is sole post-round entry |
| Chat UI on round detail | ✅ | `CoachChat` below AI Coach on completed rounds with hole data |
| Model split | ✅ | Chat: `gpt-4o-mini` (reliable text stream); post-round: `gpt-5-mini` via `/api/coach` |

**Scope guard:** Chat references **computed** stats only; system prompt forbids inventing shot data the user didn’t log.

**Implementation note:** `gpt-5-mini` (Responses API) did not surface text parts in the UI message stream — chat uses `openai.chat('gpt-4o-mini')` instead. Assistant replies persist via `streamText` `onFinish` `{ text }`.

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
| — | **7a** Auto-coach on finish | Small | ✅ Done |
| — | **8** Conversational caddie | Large | ✅ Done |
| — | **2** Miss patterns | Medium | ✅ Done |
| 2 | **4** Structured coach output + card UI | Medium | ✅ Done |
| 3 | **5** Dashboard SG + practice focus | Medium | Value between rounds |
| 4 | **3** Multi-round insights | Medium–Large | “It knows my game” moment |
| 5 | **7b–7c** Turn / hole tips | Medium | True on-course caddie |
| 6 | **9** Quick log + onboarding | Medium | More people complete first coach loop |

---

## Key files

| Path | Role |
|------|------|
| `lib/golf-logic/baselines.ts` | Expected-strokes tables |
| `lib/golf-logic/strokes-gained.ts` | SG computation |
| `lib/golf-logic/aggregate.ts` | Aggregates + `formatRoundForAI` |
| `lib/coach/payload.ts` | Phase 4 — `buildCoachPayload()` |
| `lib/coach/prompt.ts` | Phase 4 — mode-specific coach prompts |
| `lib/coach/drills.ts` | Phase 4 — vetted drill catalog |
| `lib/coach/types.ts` | Phase 4 — `CoachAnalysis` schema + modes |
| `lib/coach/analysis.ts` | Phase 4 — parse/serialize stored feedback |
| `lib/golf-logic/miss-patterns.ts` | Phase 2 — segmented tendencies |
| `lib/golf-logic/insights.ts` | Phase 3 — multi-round ranking |
| `lib/auth.ts` | Clerk → DB user resolution |
| `app/api/coach/route.ts` | Post-round structured coach (`gpt-5-mini`, JSON `aiFeedback`) |
| `app/api/coach/chat/route.ts` | Phase 8 — follow-up chat (`gpt-4o-mini`, persists `CoachMessage`) |
| `lib/coach/context.ts` | Shared system rules + round/recent-round context for chat |
| `lib/coach/rate-limit.ts` | Daily and per-round message caps |
| `lib/coach/messages.ts` | `CoachMessage` → `UIMessage` + suggested prompts |
| `components/AICoachButton.tsx` | Post-round coach trigger + auto-start (`?coach=1`) |
| `components/CoachChat.tsx` | Phase 8 — follow-up chat UI on round detail |
| `components/CoachAnalysisCard.tsx` | Phase 4/5 — structured coach sections |
| `app/actions/play.ts` | `finishRound` — hook for Phase 7a auto-coach |
| `components/PlayRoundClient.tsx` | Phase 7b–7c — on-course coach surfaces |
| `components/AddRoundForm.tsx` | Post-round + hole-by-hole entry |
| `docs/ON_COURSE_PLAY.md` | On-course play spec (Phase 6) |
| `docs/ROADMAP.md` | This file |
