Fix the mobile accessibility of the Leaderboard/Rank page WITHOUT redesigning the navigation.

IMPORTANT:
I inspected the current frontend and the project specification.

The mobile bottom navigation MUST remain exactly:

Positions
Chart
P&L
Balance

DO NOT add Leaderboard/Rank to the mobile bottom navigation.

The specification explicitly says:

"The bottom navigation does NOT include leaderboard."

Leaderboard should be accessible from:
- Dashboard
- Rank element
- future menu

Desktop navigation must remain:

Dashboard
Positions
Chart
P&L
Balance
Leaderboard

==================================================
CURRENT PROBLEM
==================================================

The project already contains:

src/components/leaderboard/LeaderboardPage.tsx

and App.tsx already supports:

route === 'leaderboard'

and desktop sidebar already contains:

Leaderboard

DashboardPage.tsx also already has a Rank element that navigates to:

onNavigate('leaderboard')

However, on mobile the Dashboard is not part of the bottom navigation.

Therefore, on a mobile device the user currently has no obvious direct way to reach the Leaderboard/Rank page.

Fix the accessibility problem while preserving the approved navigation design.

==================================================
1. DO NOT CHANGE BOTTOM NAVIGATION
==================================================

Keep:

Positions
Chart
P&L
Balance

Do NOT add:

Rank
Leaderboard
Dashboard

to the mobile bottom navigation.

Do not change the existing four-tab mobile design.

==================================================
2. MAKE RANK ACCESSIBLE ON MOBILE
==================================================

Provide a clean way for a mobile user to reach the Leaderboard.

Preferred solution:

Add a compact Rank/competition element to the mobile-accessible interface, preferably in the existing Header or another existing global UI element.

For example:

[ WARANGAL ]                         [Rank/Trophy]

Tapping the Rank element should navigate to:

route = 'leaderboard'

Use the existing:

LeaderboardPage.tsx

Do NOT create another leaderboard page.

Do NOT duplicate leaderboard functionality.

==================================================
3. PRESERVE THE EXISTING DASHBOARD RANK
==================================================

DashboardPage already contains a Rank element.

Keep it.

It should continue navigating to:

onNavigate('leaderboard')

Do not remove or replace it.

==================================================
4. LEADERBOARD PAGE
==================================================

Keep:

src/components/leaderboard/LeaderboardPage.tsx

as the single leaderboard page.

Its current visual design is acceptable.

Do not turn it into a completely different page.

Keep:

- rank number
- participant name
- portfolio value
- P&L percentage
- current-user highlighting
- "you" divider
- season information
- loading state
- error state

==================================================
5. MOBILE DESIGN
==================================================

The mobile Rank entry should feel like part of the existing WARANGAL TRADING RING design.

Use the existing:

- typography
- spacing
- gold accent
- border system
- dark/light theme
- icon style

Use a Trophy icon from lucide-react if appropriate.

Keep it compact.

Do not add a large leaderboard card to every page.

==================================================
6. HEADER CONSTRAINT
==================================================

If you put Rank in Header:

- keep the existing header height
- do not make the header larger
- do not disturb the WARANGAL branding
- do not interfere with the existing theme toggle
- keep the layout responsive
- ensure both Rank and theme controls fit on small phones

If the existing Header already has an appropriate action area, reuse it rather than creating another header.

==================================================
7. ROUTING
==================================================

Use the existing Route type:

'dashboard'
'positions'
'chart'
'pnl'
'balance'
'leaderboard'

Do not introduce a new route called:

'rank'

unless there is a strong existing architectural reason.

Prefer keeping:

leaderboard

as the internal route while the UI can call it:

Rank

or:

Leaderboard

==================================================
8. ACTIVE NAVIGATION
==================================================

Do not change the existing mobile active tab behavior.

If the user is on:

leaderboard

the four-tab bottom navigation should remain visually neutral rather than incorrectly marking one of:

Positions
Chart
P&L
Balance

as active.

Desktop should continue correctly highlighting:

Leaderboard

when the leaderboard page is open.

==================================================
9. BACK NAVIGATION
==================================================

Because Leaderboard is not a mobile bottom-nav tab, make it easy to leave the page.

Add an appropriate compact back/navigation affordance if the existing page structure does not already provide one.

It should return to the previous/main dashboard context without breaking the current route system.

Do not introduce a complex router.

==================================================
10. MOCK DATA
==================================================

Keep the current mock leaderboard implementation for now.

Do NOT connect it to the backend in this task.

Do NOT modify the backend.

Do NOT modify API contracts.

This task is ONLY about frontend accessibility/navigation to the existing leaderboard.

==================================================
11. FILES TO INSPECT
==================================================

Inspect these files first:

src/App.tsx
src/components/navigation/BottomNavigation.tsx
src/components/layout/Header.tsx
src/components/dashboard/DashboardPage.tsx
src/components/leaderboard/LeaderboardPage.tsx
src/mocks/leaderboard.ts
src/contracts/v1/leaderboard.ts

Also inspect:

src/imports/pasted_text/warangal-trading-ring-spec.md
src/imports/pasted_text/frontend-ui-refinement.md

The specifications are authoritative for navigation behavior.

==================================================
12. DO NOT CHANGE
==================================================

Do NOT change:

- chart implementation
- Lightweight Charts
- chart timeframes
- symbol selector
- order controls
- LONG/SHORT logic
- positions
- P&L
- balance
- backend
- API contracts
- mobile bottom-nav structure

This is a focused Rank/Leaderboard accessibility fix.

==================================================
13. VALIDATION
==================================================

After implementation verify:

Desktop:
Dashboard
Positions
Chart
P&L
Balance
Leaderboard

all remain accessible.

Mobile:
Positions
Chart
P&L
Balance

remain the only bottom navigation tabs.

Verify that a mobile user can still reach Leaderboard through the new Rank access point.

Verify:

- dark theme
- light theme
- small phone width
- no horizontal overflow
- no header overlap
- no bottom-nav overlap
- Leaderboard opens correctly
- returning from Leaderboard works

Run the TypeScript/build checks.

==================================================
14. FINAL REPORT
==================================================

Report:

- files changed
- how Rank is now accessed on mobile
- confirmation that mobile bottom nav remains four tabs
- confirmation that desktop Leaderboard remains
- build/test result
- any remaining issue