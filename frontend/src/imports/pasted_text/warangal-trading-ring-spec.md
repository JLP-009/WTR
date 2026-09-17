# WARANGAL TRADING RING
# AGENT 1 — FRONTEND ENGINEER
# FRONTEND V1 MASTER SPECIFICATION

You are Agent 1 — Frontend Engineer for a new application called:

WARANGAL TRADING RING

You are responsible ONLY for the frontend.

You are NOT responsible for:
- backend
- database
- Redis
- real authentication
- real order execution
- real market data
- WebSocket backend
- API implementation
- deployment infrastructure

The frontend must be designed so that future agents can connect the real API/backend without redesigning the UI.

==================================================
1. PRODUCT VISION
==================================================

Warangal Trading Ring is a competitive real-time trading platform.

The target audience is primarily mobile users.

Target:
- 250–500 concurrent traders
- public Internet
- real-time trading
- immediate order execution
- competitive leaderboard
- financial information must be extremely clear
- premium, trustworthy visual identity

The application should feel like:

- premium financial product
- modern
- minimal
- serious
- calm
- competitive
- sophisticated
- trustworthy
- fast
- information-dense without feeling cluttered

It should NOT feel like:

- a generic banking app
- a generic SaaS dashboard
- a crypto casino
- a gaming dashboard
- a Zerodha clone
- a Robinhood clone
- a neon cyberpunk interface
- a template dashboard
- an over-carded admin panel

The product identity should feel unique.

==================================================
2. DESIGN PRINCIPLE
==================================================

Primary principle:

"Calm interface, high-stakes information."

The UI should create a feeling that the user has entered a professional trading arena.

Use:
- strong typography
- generous spacing
- subtle borders
- restrained shadows
- premium surfaces
- clear hierarchy
- subtle animations
- minimal visual noise

Avoid:
- excessive gradients
- excessive glassmorphism
- glowing elements everywhere
- excessive rounded cards
- excessive shadows
- too many colors
- unnecessary animations

The application must look expensive without looking flashy.

==================================================
3. PLATFORM PRIORITY
==================================================

MOBILE FIRST.

Primary target width:
360px–430px

Secondary:
- 768px tablet
- 1024px+
- desktop

DO NOT design desktop first and shrink it down.

Design the mobile experience first.

Then progressively enhance the desktop layout.

==================================================
4. TECHNOLOGY
==================================================

Use:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui where appropriate
- Lucide icons

Use CSS variables for the design system.

Avoid unnecessary dependencies.

Do not install large UI frameworks when a simple component can be built with Tailwind.

==================================================
5. DESIGN SYSTEM
==================================================

Create a centralized design system.

Do NOT scatter colors throughout components.

Use CSS variables / semantic tokens.

Example semantic tokens:

--background
--surface
--surface-elevated
--surface-muted
--foreground
--foreground-secondary
--foreground-muted
--border
--accent
--accent-hover
--success
--danger
--warning

Components must use semantic tokens rather than hardcoded colors whenever possible.

==================================================
6. LIGHT THEME
==================================================

The light theme must be eye-friendly.

DO NOT use pure white as the entire page background.

Primary background:

#F7F7F4

Main surface:

#FFFFFF

Secondary surface:

#F0F0EC

Elevated surface:

#FFFFFF

Primary text:

#181818

Secondary text:

#6B6B67

Muted text:

#8A8A84

Border:

#E5E5DF

Strong border:

#D9D9D2

Primary accent:

#B58A3A

Accent hover:

#9E762F

Profit:

#2EAD7A

Loss:

#D95F63

Warning:

#C98A35

The light theme should feel:

warm
clean
premium
calm

Do not make it overly beige.

==================================================
7. DARK THEME
==================================================

The dark theme should feel premium.

Do NOT use pure #000000 as the primary background.

Primary background:

#08090B

Main surface:

#101216

Secondary surface:

#17191E

Elevated surface:

#1D2026

Primary text:

#F4F4F1

Secondary text:

#A3A5AB

Muted text:

#777A82

Border:

#24262C

Strong border:

#30333A

Primary accent:

#C9A45C

Accent hover:

#D6B56E

Profit:

#36C98F

Loss:

#E36B6B

Warning:

#D39A4A

Dark mode should feel:

deep
premium
professional
focused

Do not make it look like a gaming interface.

==================================================
8. COLOR USAGE RULES
==================================================

IMPORTANT:

Gold is the BRAND accent.

Gold should be used for:
- primary actions
- active navigation
- important highlights
- selected states
- subtle brand details

Do NOT make the entire interface gold.

Green is ONLY for:
- positive P&L
- gains
- successful financial outcomes

Red is ONLY primarily for:
- negative P&L
- losses
- destructive actions

Do NOT make buttons permanently green or red just because they are BUY/SELL.

Neutral colors should dominate the interface.

Color hierarchy:

80–90% neutral surfaces/text
5–10% accent
small amount of green/red for financial states

==================================================
9. TYPOGRAPHY
==================================================

Use a clean modern sans-serif font.

Prefer:
Inter
or another highly readable modern sans-serif.

Typography should have strong hierarchy.

Recommended:

Page title:
28–32px

Section title:
20–24px

Card title:
16–18px

Body:
14–16px

Secondary:
12–14px

Financial primary numbers:
28–40px depending on context

Small labels:
11–12px

Use tabular/monospaced numerals where appropriate for financial numbers if supported.

Financial numbers should align visually.

Avoid excessive bold text.

Use font weight to establish hierarchy.

==================================================
10. SPACING SYSTEM
==================================================

Use a consistent spacing scale.

Prefer:
4
8
12
16
20
24
32
40
48

Mobile page horizontal padding:

16px

Larger mobile sections:

20–24px

Desktop:

24–40px depending on layout.

Avoid cramped screens.

==================================================
11. BORDER RADIUS
==================================================

Use restrained radius.

Small:
8px

Medium:
12px

Large:
16px

Avoid excessive pill-shaped components.

Pills should primarily be used for:
- status
- tags
- market state
- position side

Buttons should generally use 10–12px radius.

==================================================
12. SHADOWS
==================================================

Use extremely subtle shadows.

Light mode:
very subtle neutral shadow.

Dark mode:
prefer borders and surface contrast instead of heavy shadows.

Avoid floating everything.

==================================================
13. LOGIN PAGE
==================================================

The login page must be minimalist.

Mobile layout:

Full viewport.

Centered login area.

Structure:

Temporary club logo

WARANGAL

TRADING RING

"Enter the Ring"

Participant ID input

Password input

ENTER THE RING button

Small footer:

Season 01

Visual structure:

        [ CLUB LOGO ]

          WARANGAL
        TRADING RING

        Enter the Ring

     [ Participant ID ]

     [ Password       ]

     [ ENTER THE RING ]

           Season 01

The login page must have substantial empty space.

Do not add:
- marketing copy
- unnecessary illustrations
- social login
- registration
- password recovery
- admin login
- participant list

Those are outside this phase.

==================================================
14. LOGIN LOGO
==================================================

Create:

components/branding/ClubLogo.tsx

Use a temporary inline SVG logo.

The logo should be simple and premium.

Concept:

A geometric symbol / ring / shield-inspired mark.

It does NOT need to represent the final Warangal logo.

The user will replace it manually later.

CRITICAL:

The logo must exist in ONE reusable component.

Do not duplicate SVG markup.

The same ClubLogo component must be used in:
- login
- authenticated header
- future pages

==================================================
15. LOGIN INTERACTION
==================================================

For now login is MOCKED.

Example:

Participant ID:
WAR001

Password:
anything

Successful mock login navigates to the main dashboard.

Do NOT implement real authentication.

Create an abstraction that can later be replaced by the real API.

Example conceptual:

auth.login()

The UI must not know how authentication is actually implemented.

==================================================
16. AUTHENTICATED APPLICATION LAYOUT
==================================================

After login:

------------------------------------------------
TOP HEADER
------------------------------------------------

Left:

Club logo
WARANGAL

Right:

Theme toggle

------------------------------------------------
MAIN CONTENT
------------------------------------------------

Current page

------------------------------------------------
BOTTOM NAVIGATION
------------------------------------------------

Four primary tabs:

1. Positions
2. Chart
3. P&L
4. Balance

The bottom navigation is the primary mobile navigation.

It must remain accessible.

Account for:
- iPhone safe area
- Android navigation areas
- browser bottom bars

Use appropriate bottom padding.

==================================================
17. MOBILE HEADER
==================================================

Header should be compact.

Example:

[Logo] WARANGAL                         [☾]

Do not make the header huge.

Header height approximately:
56–64px

Use subtle bottom border.

==================================================
18. DESKTOP NAVIGATION
==================================================

On desktop:

You may transform the mobile bottom navigation into:

- compact sidebar
OR
- top navigation

Choose whichever creates the cleanest experience.

Do NOT maintain a giant mobile-style bottom bar on desktop.

The same application routes/components should be reused.

==================================================
19. MAIN DASHBOARD
==================================================

After login the user lands on:

Dashboard / Overview.

The first screen should immediately communicate:

1. P&L
2. Current balance
3. Market status
4. Current rank / competition context

Do NOT overwhelm the user.

Suggested structure:

WARANGAL

Good evening, Trader

------------------------

TOTAL P&L

+₹24,560
+12.45%

------------------------

CURRENT BALANCE

₹2,24,560

------------------------

MARKET

● LIVE

------------------------

RANK

#23 / 500

Then a small quick-access section:

Open Positions
View Market

The exact design should be visually refined rather than simply stacking cards.

==================================================
20. P&L HERO
==================================================

The P&L should be the strongest financial visual on the dashboard.

Example:

TOTAL P&L

+₹24,560

+12.45%

Positive P&L:
green

Negative P&L:
red

Neutral:
normal text

Do not use giant green backgrounds.

The number itself should communicate the state.

==================================================
21. BALANCE
==================================================

Current balance should be clearly visible.

Example:

Current Balance

₹2,24,560

Additional optional information:

Available Cash
Invested Value
Portfolio Value

But keep the initial dashboard concise.

==================================================
22. RANK
==================================================

Competition identity is important.

Show:

#23

of 500

Do not make leaderboard the entire dashboard.

Rank should feel like a subtle competitive element.

==================================================
23. POSITIONS TAB
==================================================

Route:

/positions

Title:

Positions

Optional summary:

Open Positions
3

Each position uses a clean mobile card.

Example:

TCS

LONG

50 Qty

Avg. ₹3,380.20

LTP ₹3,412.40

+₹1,620

+0.96%

[CLOSE]

Another example:

INFY

SHORT

25 Qty

Avg. ₹1,560.00

LTP ₹1,542.20

-₹445

-1.14%

[CLOSE]

Position side should be visually distinguishable but not aggressively colored.

==================================================
24. POSITION CARD
==================================================

Information hierarchy:

1. Symbol
2. LONG/SHORT
3. Quantity
4. Average price
5. Current price
6. P&L
7. Close action

The P&L should be visually prominent.

Use responsive layouts.

Do not create huge cards.

==================================================
25. CHART TAB
==================================================

Route:

/chart

This should be the most visually rich screen.

Header:

NIFTY 50

₹24,758.35

+0.52%

Timeframes:

1m
5m
15m
1H
1D

Main chart.

For now use MOCK market data.

Do NOT connect real market data.

The chart should support a future WebSocket/API data source.

Create a clean chart abstraction.

Conceptually:

MarketChart

receives market data.

It should not fetch data itself.

==================================================
26. CHART VISUAL STYLE
==================================================

Keep chart background integrated with the page.

Avoid a giant boxed chart.

Gridlines should be extremely subtle.

Price labels should be readable.

Use green/red sparingly.

Gold may be used for selected timeframe or current price indicator.

Chart should feel like a professional trading interface, but simplified for mobile.

==================================================
27. P&L TAB
==================================================

Route:

/pnl

Show:

TOTAL P&L

+₹24,560
+12.45%

Then:

Realized P&L
+₹14,200

Unrealized P&L
+₹10,360

Today's P&L
+₹4,210

Win Rate
62%

Trades
24

Optionally include a clean performance chart using mock data.

Do not make it visually noisy.

==================================================
28. BALANCE TAB
==================================================

Route:

/balance

Show:

Available Cash
₹1,24,560

Invested Value
₹1,00,000

Portfolio Value
₹2,24,560

Total Return
+12.45%

Use clear hierarchy.

==================================================
29. BOTTOM NAVIGATION
==================================================

Four items:

POSITIONS
CHART
P&L
BALANCE

Each:

Icon
Label

Active tab:
Gold accent

Inactive:
Muted neutral

Do NOT use huge icons.

Navigation should feel premium and lightweight.

Touch target:
minimum approximately 44px.

==================================================
30. ICONS
==================================================

Use Lucide icons.

Suggested:

Positions:
Briefcase / Layers

Chart:
CandlestickChart / ChartNoAxesCombined

P&L:
TrendingUp

Balance:
Wallet

Theme:
Sun / Moon

Do not use emoji as UI icons.

==================================================
31. EMPTY STATES
==================================================

Create:

EmptyState

Example:

No open positions

"Your positions will appear here once you enter the market."

Keep it concise.

==================================================
32. LOADING STATES
==================================================

Create:

LoadingState

Use subtle skeletons.

Do not create flashing spinners everywhere.

==================================================
33. ERROR STATES
==================================================

Create:

ErrorState

Example:

Unable to load portfolio

Try again

The component must support future API errors.

==================================================
34. MOCK DATA ARCHITECTURE
==================================================

Do NOT hardcode mock data inside visual components.

Create:

mocks/
├── auth.ts
├── portfolio.ts
├── positions.ts
├── market.ts
└── leaderboard.ts

The UI should consume mock services.

Example conceptual:

getPortfolioSummary()

getPositions()

getMarketData()

getLeaderboard()

submitOrder()

The functions should be easy to replace with real API calls later.

==================================================
35. API ABSTRACTION
==================================================

Create:

lib/api/

Example:

lib/api/client.ts

lib/api/auth.ts

lib/api/portfolio.ts

lib/api/market.ts

lib/api/orders.ts

The frontend should depend on these abstractions.

For now they return mock data.

Future API Agent will replace implementation.

The visual components must not directly call fetch() everywhere.

==================================================
36. FRONTEND CONTRACTS
==================================================

Create:

contracts/

At minimum:

contracts/README.md

contracts/v1/

contracts/v1/auth.ts
contracts/v1/portfolio.ts
contracts/v1/positions.ts
contracts/v1/market.ts
contracts/v1/orders.ts
contracts/v1/leaderboard.ts

These are initial frontend-facing types.

Clearly mark them as:

FRONTEND/API CONTRACT DRAFT

The API Agent will later review and formalize them.

Do NOT invent database schemas.

==================================================
37. IMPORTANT DATA OWNERSHIP RULE
==================================================

The frontend is NEVER authoritative for:

- cash
- balance
- position quantity
- P&L
- order execution
- market price
- trade state
- leaderboard ranking

The frontend only displays values supplied by the future backend/API.

Frontend calculations are presentation-only.

==================================================
38. ORDER UI
==================================================

Do not build the complete order execution backend.

However, you may create a future-ready UI component for an order form if needed for the design.

Example:

BUY / SELL

Symbol

Quantity

Order value

Current price

Submit

For now it should use mock submitOrder().

Clearly isolate this functionality.

==================================================
39. LEADERBOARD PREVIEW
==================================================

The bottom navigation does NOT include leaderboard.

Leaderboard should be accessible from:
- dashboard
- rank element
- future menu

Create a simple future-ready leaderboard page/component if appropriate.

Mobile example:

LEADERBOARD

#1   Trader A       ₹3,42,500
#2   Trader B       ₹3,21,400
#3   Trader C       ₹3,15,800

YOU

#23  You            ₹2,24,560

Do not overbuild this phase.

==================================================
40. RESPONSIVE BEHAVIOR
==================================================

At 360px:

Everything must fit without horizontal scrolling.

At 390px:
comfortable mobile layout.

At 430px:
use additional spacing where appropriate.

Tablet:
expand content width.

Desktop:
use a more spacious layout.

Never simply stretch mobile cards across huge desktop widths.

Use max-width containers.

==================================================
41. MOBILE SAFE AREA
==================================================

Bottom navigation must account for mobile safe areas.

Use:

env(safe-area-inset-bottom)

where appropriate.

Do not let navigation overlap content.

==================================================
42. ACCESSIBILITY
==================================================

Implement:

- semantic HTML
- accessible labels
- keyboard navigation
- visible focus states
- sufficient contrast
- touch targets >= 44px
- aria labels where needed
- color should not be the only indication of profit/loss
- form error messages
- accessible theme toggle

==================================================
43. ANIMATIONS
==================================================

Use subtle motion.

Allowed:

- page transition
- tab transition
- card entrance
- number update
- button press
- theme transition

Avoid:

- bouncing UI
- excessive parallax
- constant pulsing
- distracting animations

This is a financial application.

==================================================
44. PERFORMANCE
==================================================

The application must be optimized for mobile.

Avoid:
- unnecessary client components
- huge JavaScript bundles
- unnecessary dependencies
- expensive rerenders

Use server components where appropriate.

Interactive components can be client components.

Do not make the entire app a client component unnecessarily.

==================================================
45. DARK/LIGHT THEME
==================================================

Theme must be implemented globally.

Support:

System
Light
Dark

Default:

System preference.

User selection:

Persist locally.

Theme switching must feel instantaneous and polished.

Prevent flash of incorrect theme.

==================================================
46. BRANDING
==================================================

Primary brand name:

WARANGAL

Secondary:

TRADING RING

Do not add:
- "WARANGAL TRADING PLATFORM"
- "WARANGAL STOCKS"
- "WARANGAL BROKER"
- invented slogans

Use the exact brand.

==================================================
47. DESIGN DETAILS
==================================================

Use subtle details that create premium quality:

- 1px borders
- careful whitespace
- aligned financial numbers
- restrained gold accent
- small status indicators
- subtle surface hierarchy
- clean typography
- consistent icon sizing
- consistent button height
- consistent spacing

Avoid decorative elements that don't communicate anything.

==================================================
48. COMPONENT ARCHITECTURE
==================================================

Create reusable components.

Example:

components/
├── branding/
│   └── ClubLogo.tsx
│
├── layout/
│   ├── AppShell.tsx
│   ├── Header.tsx
│   └── PageContainer.tsx
│
├── navigation/
│   ├── BottomNavigation.tsx
│   └── ThemeToggle.tsx
│
├── login/
│   ├── LoginForm.tsx
│   └── LoginPage.tsx
│
├── dashboard/
│   ├── PnlHero.tsx
│   ├── BalanceSummary.tsx
│   └── RankSummary.tsx
│
├── positions/
│   ├── PositionCard.tsx
│   └── PositionsList.tsx
│
├── chart/
│   ├── MarketHeader.tsx
│   ├── TimeframeSelector.tsx
│   └── MarketChart.tsx
│
├── pnl/
│   └── PnlSummary.tsx
│
├── balance/
│   └── BalanceSummary.tsx
│
└── common/
    ├── MetricCard.tsx
    ├── LoadingState.tsx
    ├── EmptyState.tsx
    └── ErrorState.tsx

You may improve this structure if there is a strong reason.

Avoid giant files.

==================================================
49. ROUTING
==================================================

Create routes conceptually:

/login
/dashboard
/positions
/chart
/pnl
/balance
/leaderboard

Authenticated routes should use a common application shell.

Do not implement real authentication guards yet.

Mock authentication is sufficient.

==================================================
50. STATE MANAGEMENT
==================================================

Do not introduce a large state-management library unless necessary.

Use:
- React state
- context where appropriate
- hooks
- server data abstraction

Keep global state minimal.

Theme state can be global.

Mock authentication state can be simple.

==================================================
51. FILE NAMING
==================================================

Use consistent naming.

React components:

PascalCase

Example:

PositionCard.tsx

Hooks:

useSomething.ts

Utility:

camelCase.ts

==================================================
52. CODE QUALITY
==================================================

Use strict TypeScript.

Avoid:

any

unless absolutely unavoidable and documented.

Do not suppress TypeScript errors just to make the build pass.

Do not use @ts-ignore unless there is a documented reason.

Keep components readable.

==================================================
53. DOCUMENTATION
==================================================

Create:

docs/frontend-architecture.md

Document:

- component architecture
- routing
- theme system
- mock data
- API abstraction
- contracts
- responsive strategy
- design system

Create:

contracts/README.md

Explain:

Frontend is Agent 1.

Backend/API/Database are separate agents.

Frontend does not directly communicate with database.

Frontend communicates through API contracts.

==================================================
54. FUTURE AGENT COMPATIBILITY
==================================================

Future agents:

Agent 2:
Backend

Agent 3:
API Design

Agent 4:
Database

All agents must use:

contracts/

as the shared communication boundary.

Do not make frontend assumptions about:
- SQL tables
- Redis keys
- backend class names
- backend framework internals
- database implementation

==================================================
55. DEVELOPMENT PROCESS
==================================================

IMPORTANT:

Before implementation:

1. Inspect the repository.
2. Explain the planned frontend structure.
3. Identify dependencies.
4. Identify any ambiguity.
5. Then implement.

Do not ask unnecessary questions.

If a decision is clearly defined in this specification, follow it.

==================================================
56. STRICT SCOPE
==================================================

DO NOT IMPLEMENT:

- PostgreSQL
- Redis
- WebSocket server
- backend
- real authentication
- real order execution
- real market data
- real trading engine
- production leaderboard calculations
- Kubernetes
- Docker backend infrastructure
- production deployment

This phase is FRONTEND ONLY.

==================================================
57. VALIDATION
==================================================

Before completion run:

- npm install if required
- lint
- TypeScript check
- production build

Also manually verify:

1. Login page light theme
2. Login page dark theme
3. Dashboard light
4. Dashboard dark
5. Positions
6. Chart
7. P&L
8. Balance
9. Bottom navigation
10. Theme switching
11. Mobile 360px
12. Mobile 390px
13. Mobile 430px
14. Tablet
15. Desktop
16. No horizontal scrolling
17. Safe-area bottom navigation
18. Keyboard accessibility
19. Loading state
20. Empty state
21. Error state

==================================================
58. FINAL REPORT
==================================================

When finished, DO NOT start another phase.

Return:

1. Project structure
2. Files created
3. Files modified
4. Design system
5. Light theme colors
6. Dark theme colors
7. Components created
8. Routes created
9. Mock API functions
10. Contracts created
11. Responsive strategy
12. Accessibility work
13. Commands executed
14. Lint result
15. TypeScript result
16. Build result
17. Known limitations
18. Anything that the future API Agent needs to know

IMPORTANT:

Stop after completing FRONTEND V1.

Do not begin backend, API, database, Redis, or WebSocket implementation.