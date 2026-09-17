# WARANGAL TRADING RING
# FRONTEND UI REFINEMENT — LONG + SHORT + MULTI-SYMBOL CHART

You are working on the Warangal Trading Ring frontend.

You have been given the existing Figma/frontend project.

The existing visual design is APPROVED.

Do NOT redesign the application.

Preserve the existing:
- WARANGAL TRADING RING branding
- visual identity
- typography
- spacing language
- light/dark theme
- card style
- overall layout
- mobile-first approach
- desktop sidebar
- mobile bottom navigation

The goal of this task is to refine the existing UI so it correctly supports the FROZEN API contract and both LONG + SHORT positions.

============================================================
1. IMPORTANT — API IS FROZEN
============================================================

The API contract supplied with the project is frozen.

Do NOT modify the API contract.

Do NOT invent new API behavior.

Frontend must adapt to the frozen API.

The backend will be implemented separately.

============================================================
2. LONG + SHORT UI MODEL
============================================================

Order side:

BUY
SELL

Position side:

LONG
SHORT

Do NOT treat:

BUY = LONG
SELL = SHORT

These are different concepts.

Examples:

BUY while flat
→ opens LONG

SELL while flat
→ opens SHORT

SELL against LONG
→ reduces LONG

BUY against SHORT
→ reduces SHORT

============================================================
3. POSITION CARD
============================================================

Update PositionCard to clearly display:

symbol
position side
quantity
average price
current price
unrealized P&L

Example:

TATA MOTORS

LONG
100 shares

Avg Price       ₹245.50
Current Price   ₹251.20
Unrealized P&L  +₹570

For SHORT:

TATA MOTORS

SHORT
100 shares

Avg Price       ₹251.20
Current Price   ₹245.50
Unrealized P&L  +₹570

Never display:

SHORT -100

Quantity remains positive.

============================================================
4. ORDER CONTROLS
============================================================

Use:

BUY
SELL
CLOSE

Do NOT use:

LONG
SHORT

as order buttons.

When there is no position:

[ BUY ] [ SELL ]

CLOSE should not be shown as an active action.

When there is a position:

[ BUY ] [ SELL ] [ CLOSE ]

============================================================
5. CLOSE
============================================================

For LONG:

CLOSE means:

MARKET SELL entire LONG position.

For SHORT:

CLOSE means:

MARKET BUY entire SHORT position.

The UI should make this clear where useful.

============================================================
6. POSITION FLIP WARNING
============================================================

If the user submits an order larger than the current opposite position:

LONG 100
SELL 150

show a confirmation/warning:

POSITION FLIP

Current:
LONG 100

Order:
SELL 150

Result:
SHORT 50

Confirm:

[ CANCEL ] [ CONFIRM SELL ]

Similarly:

SHORT 100
BUY 150

Result:

LONG 50

Do not make this overly intrusive.

Keep it consistent with the existing visual language.

============================================================
7. P&L UI
============================================================

The UI must support both LONG and SHORT.

Do not calculate authoritative P&L in the frontend.

Display server/API values.

Examples:

LONG:
Entry ₹100
Current ₹110
P&L +₹10

SHORT:
Entry ₹110
Current ₹100
P&L +₹10

The UI must not assume price increase always means profit.

============================================================
8. MARKET CLOSED
============================================================

Market CLOSED must NOT disable participant MARKET orders.

The UI may display:

MARKET CLOSED

as informational status.

But BUY/SELL/CLOSE controls must remain usable according to the current position/order rules.

Do NOT show:

"Trading unavailable"

merely because market status is CLOSED.

============================================================
9. CHART — MAJOR CHANGE
============================================================

The current ChartPage uses a Recharts AreaChart and is hard-coded to:

"NIFTY 50"

Replace the chart implementation with TradingView Lightweight Charts.

Use a real candlestick chart.

Do NOT use an area/line chart as the primary trading chart.

============================================================
10. MULTI-SYMBOL SUPPORT
============================================================

The competition will have approximately 10–12 tradable symbols.

The chart must support all of them.

Do NOT render 10–12 charts simultaneously.

Instead:

ONE active chart
+
symbol selector

Example:

NIFTY 50
RELIANCE
TCS
INFY
HDFC BANK
ICICI BANK
SBIN
ITC
...
approximately 10–12 symbols

The user selects one symbol and the chart displays that symbol.

============================================================
11. SYMBOL SELECTOR
============================================================

Add a compact symbol selector above the chart.

Mobile should support horizontal scrolling or a compact dropdown/search interface.

Preferred UX:

┌─────────────────────────────┐
│ NIFTY 50             ▼      │
└─────────────────────────────┘

Opening it allows selection of all 10–12 symbols.

If horizontal chips fit naturally within the existing design, they may be used, but do not make the screen cluttered.

The active symbol must be visually obvious.

============================================================
12. CHART DATA
============================================================

Each candle should support:

time
open
high
low
close
volume

Display:

Candlesticks
Volume
Crosshair
Price scale
Time scale
Zoom
Horizontal scrolling

Use the existing theme system for light/dark mode.

Do not introduce a visually unrelated chart theme.

============================================================
13. TIMEFRAMES
============================================================

Preserve the existing timeframe options:

1m
5m
15m
1H
1D

The selected timeframe should reload the selected symbol's candles.

Example:

Symbol:
RELIANCE

Timeframe:
5m

→ fetch/display RELIANCE 5m candles.

============================================================
14. CHART HEADER
============================================================

The chart header should display:

Symbol
Current/LTP
Absolute change
Percentage change

Example:

RELIANCE

₹1,420.50

+₹17.40
+1.24%

For negative movement use the existing danger/loss styling.

Do not hard-code symbol names or prices.

============================================================
15. CHART + TRADING CONTEXT
============================================================

The selected chart symbol should be the symbol used by the trading controls.

Example:

User selects:

RELIANCE

Then order panel operates on:

RELIANCE

Do not accidentally place an order for the previously selected symbol.

============================================================
16. MOCK DATA
============================================================

Update mock data so the UI can be tested with at least:

10–12 symbols.

Include both:

LONG position examples
SHORT position examples

Include:

profitable LONG
losing LONG
profitable SHORT
losing SHORT
flat/no position

Chart mocks should contain OHLCV candle data.

Do not use only NIFTY 50.

============================================================
17. API CLIENTS
============================================================

Update frontend API abstractions only as required to consume the frozen API.

Relevant files include:

src/lib/api/market.ts
src/lib/api/orders.ts
src/lib/api/positions.ts
src/lib/api/portfolio.ts

Do not change the public API contract.

Do not invent endpoints.

============================================================
18. CONTRACT TYPES
============================================================

Ensure frontend types distinguish:

OrderSide:
BUY | SELL

PositionSide:
LONG | SHORT

Do not encode SHORT using negative quantity.

Financial values follow the frozen API contract.

============================================================
19. NAVIGATION
============================================================

IMPORTANT:

DO NOT redesign the navigation.

Mobile bottom navigation remains:

Positions
Chart
P&L
Balance

Desktop sidebar remains:

Dashboard
Positions
Chart
P&L
Balance
Leaderboard

Do NOT add:

LONG
SHORT

as navigation tabs.

LONG/SHORT belong inside positions/trading UI.

Keep the existing active-state behavior.

Keep safe-area handling on mobile.

============================================================
20. RESPONSIVE DESIGN
============================================================

Preserve the existing mobile-first design.

Test:

small mobile
large mobile
tablet
desktop

The chart must remain usable on mobile.

Avoid horizontal page overflow.

The symbol selector may horizontally scroll internally, but the entire page must not overflow.

============================================================
21. ACCESSIBILITY
============================================================

Maintain:

aria-label
aria-selected
keyboard navigation where appropriate
visible focus states
semantic buttons

The symbol selector and timeframe selector must be accessible.

============================================================
22. FILES TO INSPECT FIRST
============================================================

Inspect:

src/App.tsx

src/components/navigation/BottomNavigation.tsx
src/components/layout/Header.tsx
src/components/layout/PageContainer.tsx

src/components/chart/ChartPage.tsx

src/components/positions/PositionCard.tsx
src/components/positions/PositionsPage.tsx

src/components/pnl/PnlPage.tsx
src/components/dashboard/DashboardPage.tsx

src/lib/api/market.ts
src/lib/api/orders.ts
src/lib/api/positions.ts
src/lib/api/portfolio.ts

src/contracts/v1/
src/mocks/

Also inspect package.json before changing chart libraries.

============================================================
23. CHART LIBRARY
============================================================

Use TradingView Lightweight Charts for the primary chart.

Check the existing package.json first.

If lightweight-charts is already installed:

use the existing dependency.

If it is not installed:

add the appropriate dependency.

Remove Recharts usage from ChartPage if it is no longer needed by the project.

Do not leave two competing chart implementations unnecessarily.

============================================================
24. DO NOT OVERDESIGN
============================================================

The current UI is intentionally premium, minimal, and mobile-oriented.

Do not turn the chart page into a Bloomberg-style terminal.

Do not add:
- dozens of indicators
- order book
- depth chart
- options chain
- complex technical analysis panels
- excessive controls

V1 chart needs:

symbol
LTP/change
candles
volume
timeframe
crosshair
zoom
scroll
theme

============================================================
25. DEFINITION OF DONE
============================================================

[ ] Existing visual design preserved

[ ] Mobile bottom navigation preserved

[ ] Desktop sidebar preserved

[ ] LONG positions display correctly

[ ] SHORT positions display correctly

[ ] BUY/SELL/CLOSE semantics are clear

[ ] CLOSE is available only when a position exists

[ ] Position quantity remains positive

[ ] Flip confirmation works

[ ] P&L displays correctly for LONG and SHORT

[ ] Market CLOSED does not disable valid participant market orders

[ ] Chart supports 10–12 symbols

[ ] One active symbol chart at a time

[ ] Symbol selector works

[ ] Candlestick chart implemented

[ ] OHLCV supported

[ ] Volume displayed

[ ] Crosshair works

[ ] Zoom works

[ ] Horizontal scrolling works

[ ] 1m / 5m / 15m / 1H / 1D work

[ ] Light theme works

[ ] Dark theme works

[ ] Mobile chart works

[ ] No page horizontal overflow

[ ] Mock data includes LONG + SHORT

[ ] Mock data includes 10–12 symbols

[ ] No API contract changes

============================================================
26. FINAL REPORT
============================================================

Report:

1. Files changed
2. Files created
3. Navigation changes
4. LONG/SHORT UI changes
5. Order control changes
6. CLOSE behavior
7. Flip confirmation
8. Chart architecture
9. Symbol selector
10. Timeframe behavior
11. Responsive behavior
12. Mock data changes
13. API integration changes
14. Dependencies changed
15. Tests/build/lint results
16. Any remaining UI issues

Do not modify the backend.

Do not modify the frozen API contract.

Do not redesign the application.

Implement only the required UI refinement described above.