# Active Campaigns Table — Design & Architecture Reference

> **For AI agents:** This document explains how the Active Campaigns table works inside the Marketing Manager tab of the admin dashboard. Read this before making changes to the campaign system.

---

## 1. What the Active Campaigns Table Is

The Active Campaigns table is the central operational view for fulfilling customer orders. It lives at `/admin?p=marketing-manager` inside the "Active Campaigns" section.

Every row in the table represents **one campaign** — a single song/package pair from a customer's order. A single order can have multiple campaigns if the customer added more than one song during checkout.

**Example:** A customer adds Song A and Song B to their cart, attaches the "Momentum" package to Song A and the "Dominate" package to Song B, then checks out. That one order produces **two** campaigns in this table, each handled independently.

---

## 2. How Campaigns Get Created

Campaigns are auto-imported from orders. The flow:

1. Customer completes checkout → `orders` + `order_items` rows are created in Supabase.
2. Admin opens the Marketing Manager tab → `GET /api/marketing-manager/campaigns` fires.
3. The API runs `autoImportNewOrders()` which finds orders that don't yet have `marketing_campaigns` rows.
4. For each `order_item` in those orders, a `marketing_campaigns` row is inserted with:
   - `order_id`, `order_number` (from the order)
   - `song_name`, `song_link`, `track_id` (from the order item)
   - `artist_name`, `customer_name` (from the order)
   - `package_name`, `package_id` (from the order item)
   - `campaign_status: 'Running'`
   - `playlist_assignments: []` (empty — gets auto-filled next)

**Key table:** `marketing_campaigns` (one row per song/package, FK to `orders.id`)

---

## 3. Campaign Columns & Data

Each row in the Active Campaigns table shows:

| Column | Source | Description |
|--------|--------|-------------|
| **Order Info** | `marketing_campaigns` + `order_items` | Order number, date, song image (from `order_items.track_image_url`), song title, genre tags, Spotify link, song number within the order |
| **Package** | `marketing_campaigns.package_name` | Which pricing tier (Breakthrough, Momentum, Dominate, etc.) |
| **Playlist Assignments** | `marketing_campaigns.playlist_assignments` (JSONB) | Array of assigned playlists — each slot is editable by the admin |
| **Direct Progress** | Calculated from SMM submission | Progress bar for direct Spotify streams (from Followiz) |
| **Playlist Progress** | Calculated from `playlists_added_at` | Estimated streams generated from playlist placements (time-based formula) |
| **Removal Date** | Calculated from `playlists_added_at` | When the song should be removed from playlists |
| **Status** | Derived (see §5) | Action Needed / Running / Removal Needed / Completed |
| **Actions** | Admin buttons | Submit Purchase API, Added to Playlists, De-Playlisted |

---

## 4. Campaign Status Lifecycle

A campaign moves through these statuses:

```
Action Needed → Running → Removal Needed → Completed
```

**Status derivation logic** (computed server-side in the campaigns API):

- **Action Needed** — Either `direct_streams_confirmed` or `playlists_added_confirmed` is false. The admin still needs to take action.
- **Running** — Both `direct_streams_confirmed` and `playlists_added_confirmed` are true. The campaign is actively generating streams.
- **Removal Needed** — Playlist progress has reached the target `playlist_streams` value AND `removed_from_playlists` is false. Time to pull the song off playlists.
- **Completed** — `removed_from_playlists` is true. The campaign is done. The order status is set to `completed` and a completion email is sent.

---

## 5. The Admin Fulfillment Workflow (Per Campaign)

### Step 1: Playlist Assignment (Automatic)

When campaigns are fetched and a campaign has empty `playlist_assignments`, the system **auto-generates** assignments. This is the auto-playlist-assign algorithm (see §6 for full details).

The admin can also:
- **Manually edit** individual playlist slots via the inline dropdown.
- **Change the genre** to regenerate assignments with different genre matching.
- **Add a playlist** to fill an `-Empty-` slot.

### Step 2: Submit Direct Streams (SMM Panel)

The admin clicks "Submit Purchase API" which:
1. Opens a modal showing a receipt preview (order sets from `smm_order_sets` for this package).
2. On confirm, calls `POST /api/marketing-manager/smm-panel/submit-purchase`.
3. The API fetches `smm_order_sets` for the campaign's `package_name` and submits each to Followiz (`POST https://followiz.com/api/v2`).
4. On full success, `direct_streams_confirmed` is set to `true`.
5. If any order set fails, the admin can retry just the failed ones.

### Step 3: Confirm Playlists Added

After physically adding the song to the assigned playlists on Spotify, the admin clicks "Added to Playlists" which:
1. Calls `POST /api/marketing-manager/confirm-action` with `action: 'playlists-added'`.
2. Sets `playlists_added_confirmed = true` and `playlists_added_at = now()`.
3. The removal date is calculated from `playlists_added_at`.

### Step 4: De-Playlist (When Removal Needed)

When the playlist progress reaches the target, the status flips to "Removal Needed". The admin removes the song from playlists on Spotify, then clicks "De-Playlisted" which:
1. Calls `POST /api/marketing-manager/confirm-action` with `action: 'de-playlisted'`.
2. Sets `removed_from_playlists = true`.
3. Updates the parent `orders.status` to `completed`.
4. Triggers the order completion email to the customer.

---

## 6. Auto-Playlist Assignment Algorithm (Weighted Score System)

This is the core algorithm that decides which playlists from the `playlist_network` table get assigned to each campaign. It runs automatically when a campaign has empty `playlist_assignments`.

### Trigger Points

- **Auto on fetch:** `GET /api/marketing-manager/campaigns` — any campaign with empty `playlist_assignments` gets assignments generated before the response is returned.
- **Manual regenerate:** `POST /api/marketing-manager/generate-playlist-assignments` — regenerates for a single campaign (e.g., after genre change).

### Algorithm Steps

**Entry point:** `getAvailablePlaylistsWithProtection()` in `src/utils/playlist-assignment-protection.ts`

**Inputs:**
- `userGenre` — from `orders.billing_info.musicGenre` (e.g., `"R&B, Chill, Love"`)
- `playlistsNeeded` — from `campaign_totals.playlist_assignments_needed` for the package (e.g., Momentum = 25)
- `trackId` — Spotify track ID (for duplicate protection)
- `excludeCampaignId` — current campaign's ID (excluded from duplicate check during regeneration)

### Weighted Genre Scoring

The algorithm uses the three-tier genre system from `GENRE_GROUPS` in `src/constants/genres.ts`:

| Tier | Category | Weight (per match) | Examples |
|------|----------|-------------------|----------|
| **Core Genres** | `Genres` group | **10 points** | Hip-Hop, R&B, Pop, Rock, Indie, Electronic, Latin, etc. |
| **Vibes** | `Vibes` group | **3 points** | Party, Chill, Sad, Dark, Hype, Love, Happy, etc. |
| **Sounds** | `Sounds` group | **2 points** | Guitar, Piano, Acoustic, Melodic, Orchestral, Synth |

**How scoring works:**
1. The customer's selected vibes/genres are parsed into a map of `genre → tier`.
2. Each playlist in `playlist_network` is scored by summing the weights of every overlapping genre.
3. A playlist tagged `"Hip-Hop, Chill, Piano"` matching a request for `"Hip-Hop, Chill, Love"` gets: 10 (Hip-Hop) + 3 (Chill) = **13 points**.

### Immutable Rules (Always Enforced)

These rules can **never** be bypassed by the recommendation layer:

1. **`health_status = 'removed'` (or `'error' / 'unknown' / 'private'`) is never auto-assigned.** Enforced by the SQL filter AND a defensive in-app filter (belt-and-suspenders). If the SQL guard ever drifts, the in-app filter still blocks the playlist and logs a warning.
2. **`is_active = false` is never auto-assigned.**
3. **A playlist already running for the same `track_id` is never duplicated** — see *Duplicate Protection* below.
4. **Domain guardrail:** Music orders never receive Podcast-only playlists, and Podcast orders never receive music playlists. A playlist tagged with `Podcast` *and* a music genre (e.g., `"Hip-Hop, Podcast"`) counts as music-domain and is fair game for music orders.

### Guardrail: Core Genre Required

A playlist MUST match at least one **core genre** to be eligible for the primary pass. This prevents a Pop playlist from being assigned to a Hip-Hop song just because they both share the "Happy" vibe.

Exception: playlists tagged `"General"` bypass this rule and are used as the fallback pass (see below).

### Tie-Break Order (Deterministic)

When two playlists have the same `score`, ties are broken in this exact order:

1. **`score`** (desc) — total weighted-tier points.
2. **`overlapCount`** (desc) — total number of overlapping tags.
3. **`cached_saves`** (desc) — popularity prefers the more-saved playlist when everything else is equal.
4. **`playlist_name`** (asc, locale-aware) — final deterministic tiebreaker so the same inputs always produce the same output.

### Step-by-Step

**Step 1: Normalize and Tier-Classify Requested Genres**
- Parse `userGenre` into individual genres.
- Apply a local rename map for legacy order data (e.g., `"Hip-Hop/Rap"` → `"Hip-Hop"`, `"R&B/Soul"` → `"R&B"`). The `"General"` sentinel is preserved as-is so legacy "General" orders still flow into the General fallback bucket.
- Map each to its tier (Core Genre / Vibe / Sound) using `GENRE_GROUPS`.
- Detect the user's *domain* — `podcast` if any requested genre is `Podcast`, otherwise `music`.

**Step 2: Get Excluded Playlists (Duplicate Protection)**
- Queries `marketing_campaigns` for other Running campaigns with the **same `track_id`**.
- Collects all playlist IDs from their `playlist_assignments` (skipping `"empty"` placeholders).
- These playlists are excluded so the same song doesn't get placed on the same playlist twice across multiple orders.

**Step 3: Query Eligible Playlists**
- From `playlist_network` where:
  - `is_active = true`
  - `health_status IN ('active', 'public')` — only healthy playlists
  - NOT in the excluded playlist IDs from Step 2
- Selects `cached_saves` so it can be used as a popularity tiebreaker.
- A defensive in-app filter then drops anything where `health_status` is in `{removed, error, unknown, private}` or `is_active = false`, even though the SQL already filtered them — and logs a warning if any slipped through.
- **No Spotify API calls** — health status is read from the database as-is (health is refreshed separately when the admin opens the Playlist Network tab).
- **No capacity/slot check** — human editors manage playlist fullness.

**Step 4: Score Every Playlist**
- For each eligible playlist, compute `{ score, overlapCount, hasCoreGenreMatch, cached_saves, domain }` by comparing its genres to the requested genre map.

**Step 5: Pass 1 — Core-Genre Matches (Domain-Compatible)**
- Filter to playlists where `hasCoreGenreMatch = true` AND `domain === userDomain`.
- Sort using the deterministic tie-break order (score → overlap → cached_saves → name).
- Take the top `playlistsNeeded` playlists.
- The top 3 picks are written to the server log with their score breakdowns for audit visibility.

**Step 6: Pass 2 — Scored General Fallback (Domain-Compatible)**
- If Pass 1 didn't fill all slots, score the playlists tagged `"General"` (still domain-compatible) using the same weighted system rather than picking arbitrarily.
- Sort using the same deterministic tie-break order.
- Take the top remaining slots. The top 3 General picks are also logged for audit visibility.

**Step 7: Fill Remaining with Empty Slots**
- If there still aren't enough playlists available, adds `{ id: 'empty', name: '-Empty-', genre: 'empty' }` placeholder objects.
- The admin can manually assign playlists to these empty slots later.

### What Changed from the Previous Algorithm

| Aspect | Old Algorithm | New Algorithm |
|--------|--------------|---------------|
| **Genre matching** | Binary — any overlap = match | Weighted scoring — core genres matter more than vibes/sounds |
| **Selection order** | First N matching playlists (alphabetical) | Top N by **score → overlap → cached_saves → name** (fully deterministic) |
| **Spotify API health check** | Called during assignment (slow, unreliable after Spotify API changes) | Removed — reads existing `health_status` from DB |
| **Capacity/slot check** | `cached_song_count < max_songs` filtered out full playlists | Removed — human editors manage this |
| **Core genre guard** | None — a Pop playlist could match Hip-Hop via shared "Happy" vibe | Required — at least one core genre must match |
| **General fallback** | Sliced arbitrarily from any General-tagged playlist | **Scored** General playlists (same weighting), domain-aware |
| **Domain guardrail** | None — a Podcast playlist tagged "General" could land on a Hip-Hop campaign | Music ↔ Podcast domains are kept separate in both passes |
| **`removed` playlist guard** | SQL filter only | SQL filter + defensive in-app filter (logs if anything slipped through) |
| **Legacy genre data** | `"Hip-Hop/Rap"` from old orders failed to match anything | Locally renamed to current canonical values; `"General"` preserved as the fallback sentinel |
| **Popularity tiebreaker** | None — alphabetical for ties | `cached_saves` desc — when score and overlap tie, the more-saved playlist wins |

### Output Format

The `playlist_assignments` JSONB field stores an array of objects:

```json
[
  { "id": "uuid-1", "name": "Chill Vibes", "genre": "R&B, Chill" },
  { "id": "uuid-2", "name": "Late Night R&B", "genre": "R&B, Love" },
  { "id": "empty", "name": "-Empty-", "genre": "empty" }
]
```

---

## 7. Playlist Progress Calculation

Once `playlists_added_confirmed = true` and `playlists_added_at` is set:

- **Rate:** 500 streams per playlist per 24 hours.
- **Formula:** `streamsPerHour = (playlistCount * 500) / 24`, then `progress = min(hoursElapsed * streamsPerHour, targetPlaylistStreams)`.
- **Target:** `playlist_streams` from `campaign_totals` for the package.

---

## 8. Polling & Real-Time Updates

- **Campaign data:** Polled every 60 seconds via `setInterval` → `fetchCampaigns(true)`.
- **SMM status:** Fetched on initial load for campaigns where `direct_streams_confirmed = false`. Batched in groups of 50.
- **Custom events:** `window.addEventListener('campaignActionConfirmed', ...)` syncs state across sub-tabs.

---

## 9. Key Files

| File | Purpose |
|------|---------|
| `src/components/marketing-manager/ActiveCampaigns.tsx` | Frontend table component |
| `src/pages/api/marketing-manager/campaigns.ts` | Campaign fetch API (includes auto-import and auto-assign) |
| `src/pages/api/marketing-manager/generate-playlist-assignments.ts` | Manual playlist regeneration for one campaign |
| `src/utils/playlist-assignment-protection.ts` | Core assignment algorithm + duplicate protection |
| `src/utils/playlist-genres.ts` | Genre parsing, matching, and formatting utilities |
| `src/pages/api/marketing-manager/confirm-action.ts` | Confirm direct-streams / playlists-added / de-playlisted |
| `src/pages/api/marketing-manager/update-genre.ts` | Change campaign genre (clears assignments) |
| `src/pages/api/marketing-manager/update-playlist-assignment.ts` | Edit a single playlist slot |
| `src/pages/api/marketing-manager/smm-panel/submit-purchase.ts` | Submit Followiz SMM orders |

---

## 10. Database Tables Involved

| Table | Role |
|-------|------|
| `marketing_campaigns` | One row per campaign (song/package). Stores `playlist_assignments`, status flags, stream values. |
| `orders` | Parent order. Contains `billing_info.musicGenre` used for genre matching. |
| `order_items` | One row per song in the order. Source of `track_id`, `track_image_url`, package info. |
| `playlist_network` | Admin-managed playlist pool. Each row = one Spotify playlist with genres, capacity, health status. |
| `campaign_totals` | Maps package names to `playlist_assignments_needed`, `min_streams`, `max_streams`. |
| `smm_order_sets` | Maps package names to Followiz service IDs and quantities for direct stream purchases. |

---

*Last updated: 2026-03-14. Update this document when the campaign system changes.*
