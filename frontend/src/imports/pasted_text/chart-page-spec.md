We need to fix the Chart page implementation.

IMPORTANT:
The current chart shown in the UI is a custom line/area chart. It is NOT TradingView Lightweight Charts.

I want you to replace the current chart implementation with the actual TradingView Lightweight Charts library while preserving the existing WARANGAL TRADING RING visual design.

DO NOT redesign the entire Chart page.
DO NOT turn it into a Bloomberg-style terminal.
Keep the existing premium, minimal, mobile-first design.

==================================================
1. CURRENT PROBLEM
==================================================

The current chart looks like:

- green line
- gradient area below the line
- manually rendered price labels
- manually rendered "Current" price
- no candlesticks
- no volume
- no TradingView crosshair
- no proper chart interaction

This must be replaced with a real Lightweight Charts implementation.

==================================================
2. USE TRADINGVIEW LIGHTWEIGHT CHARTS
==================================================

Install/use:

lightweight-charts

Use the actual Lightweight Charts API.

Do NOT simulate a Lightweight Charts appearance using Recharts, SVG, CSS, or a custom canvas implementation.

Remove the current Recharts chart implementation from ChartPage if it is no longer needed.

The chart must be created through Lightweight Charts.

==================================================
3. CHART TYPE
==================================================

Use a real candlestick series.

Each candle must contain:

- time
- open
- high
- low
- close

Use proper OHLC candles.

Do NOT use the current line/area chart.

Also add a volume histogram series below the candlestick chart.

The chart should have approximately:

70–75% height for price
25–30% height for volume

Keep the overall chart compact enough for the existing mobile layout.

==================================================
4. EXISTING DESIGN MUST REMAIN
==================================================

Preserve the existing:

- WARANGAL TRADING RING header
- NIFTY 50 / selected symbol title
- current price
- percentage change
- absolute change
- timeframe selector
- bottom navigation
- dark/light theme behavior
- existing typography
- spacing
- gold accent
- mobile-first layout

Do not unnecessarily change unrelated components.

The screenshot's overall visual hierarchy is good.

Only replace the chart itself with a proper trading chart.

==================================================
5. SYMBOL SUPPORT
==================================================

We need to support approximately 10–12 market symbols.

IMPORTANT:

DO NOT display 10–12 charts simultaneously.

There should be ONE active chart.

Add a compact symbol selector above the chart.

Example symbols:

NIFTY 50
BANK NIFTY
FINNIFTY
SENSEX
RELIANCE
TCS
INFY
HDFCBANK
ICICIBANK
SBIN
ITC
TATAMOTORS

Use the actual symbols available from the API/contracts if those differ.

The selected symbol controls:

- displayed symbol name
- current price
- percentage change
- chart candles
- volume
- selected timeframe

Changing the symbol should update the same Lightweight Chart instance/data rather than rendering 12 charts.

On mobile, the symbol selector should remain compact and horizontally scrollable if necessary.

==================================================
6. TIMEFRAMES
==================================================

Keep the existing timeframe options:

1m
5m
15m
1H
1D

The selected timeframe must reload/update the candles for the currently selected symbol.

Do not remove these existing options.

The active timeframe should continue using the existing gold selected-state styling.

==================================================
7. LIGHTWEIGHT CHART INTERACTION
==================================================

Enable real Lightweight Charts interactions:

- crosshair
- mouse/touch tracking
- horizontal scrolling
- zoom
- pinch zoom on mobile
- wheel zoom where appropriate
- price scale
- time scale

The user should be able to inspect individual candles.

Use the Lightweight Charts crosshair rather than a custom tooltip implementation.

When the crosshair is over a candle, show its:

OHLC values

For example:

O 24,750
H 24,780
L 24,735
C 24,768

Keep this compact and consistent with the existing design.

==================================================
8. CURRENT PRICE
==================================================

Use the Lightweight Charts price line for the latest/current price.

Do NOT manually render a fake horizontal line inside the chart.

The latest price should be represented by the chart's actual price line.

Keep the current price information at the top of the page as it currently exists.

Do not keep the separate manually rendered:

"Current ₹24,758.35"

section below the chart if it becomes redundant.

Use the available space for the actual chart.

==================================================
9. VOLUME
==================================================

Add a real volume histogram below the candlestick chart.

Volume should use the candle's volume field.

If the API contract already provides volume, use it directly.

Do not generate fake volume when real API data is available.

For mock mode, create realistic mock OHLCV data.

==================================================
10. RESPONSIVE BEHAVIOR
==================================================

This is primarily a mobile trading application.

The chart must work correctly at the existing phone width.

Requirements:

- no horizontal page overflow
- chart fills available content width
- chart height is appropriate for mobile
- candles remain readable
- crosshair works with touch
- timeframe buttons remain accessible
- symbol selector can horizontally scroll
- bottom navigation must remain fixed and unaffected

Do not let the chart extend behind the bottom navigation.

Respect the existing safe-area padding.

==================================================
11. DARK/LIGHT THEME
==================================================

The Lightweight Chart must follow the existing ThemeContext.

For dark mode:

- dark chart background matching the existing page
- muted grid lines
- existing text hierarchy
- existing gold accent where appropriate

For light mode:

- light chart background
- appropriate grid/text colors

Do not hard-code only the dark theme.

When the application theme changes, update the Lightweight Charts colors without recreating the entire page unnecessarily.

==================================================
12. DATA ARCHITECTURE
==================================================

Use the existing market API layer/contracts.

Do NOT invent a new API contract.

The data flow should be:

selected symbol
        ↓
selected timeframe
        ↓
market API
        ↓
OHLCV candles
        ↓
Lightweight Charts

Normalize the API response into the format expected by Lightweight Charts.

Do not put API-fetching logic directly into the chart rendering code if the existing project architecture has an API layer.

Reuse the existing:

src/lib/api/market.ts

and existing contracts where possible.

==================================================
13. MOCK DATA
==================================================

Update mock market data so the UI can demonstrate:

- all 10–12 symbols
- all 5 timeframes
- OHLCV candles

The mock data must contain:

time
open
high
low
close
volume

Do not use only `price`.

==================================================
14. PERFORMANCE
==================================================

Do not recreate the chart on every React render.

Use a proper lifecycle:

- create chart once
- create series once
- update data when symbol/timeframe changes
- resize chart when container dimensions change
- remove/dispose chart on unmount

Use ResizeObserver if appropriate.

Avoid memory leaks.

==================================================
15. IMPORTANT POSITION/TRADING SEMANTICS
==================================================

Do not mix up order side and position side.

The platform supports:

Position:
LONG / SHORT

Orders:
BUY / SELL

CLOSE is an action on an existing position.

The chart itself does not need special LONG/SHORT rendering.

Do NOT display:

BUY = LONG
SELL = SHORT

because that is incorrect.

==================================================
16. MARKET STATUS
==================================================

The platform simulation allows valid MARKET participant orders even when the market status is CLOSED.

Therefore:

Market CLOSED should be informational.

Do NOT disable the trading controls simply because market status is CLOSED.

This chart can display the market status, but do not introduce a frontend rule that blocks market orders because of CLOSED status.

==================================================
17. DO NOT CHANGE NAVIGATION
==================================================

Preserve the current navigation.

Mobile bottom navigation:

Positions
Chart
P&L
Balance

Desktop navigation:

Dashboard
Positions
Chart
P&L
Balance
Leaderboard

Chart remains the selected tab when the user is on the Chart page.

==================================================
18. VISUAL TARGET
==================================================

The final page should still feel visually similar to the supplied screenshot:

WARANGAL TRADING RING
NIFTY 50
₹24,758.35
+0.52%
+₹128.4

[ symbol selector ]

[ 1m ] [ 5m ] [ 15m ] [ 1H ] [ 1D ]

[ REAL LIGHTWEIGHT CHART ]
  candlesticks
  price scale
  time scale
  crosshair
  current-price line
  volume

The chart should feel like a real modern trading application, not a generic dashboard chart.

==================================================
19. FILES TO INSPECT FIRST
==================================================

Before modifying anything, inspect:

src/components/chart/ChartPage.tsx
src/lib/api/market.ts
src/contracts/v1/market.ts
src/mocks/market.ts
src/index.css
src/contexts/ThemeContext.tsx
package.json

Also inspect the existing navigation/layout so the chart does not break the current design.

==================================================
20. IMPLEMENTATION RULE
==================================================

Do not rewrite unrelated parts of the application.

Make the smallest clean set of changes required to:

1. Replace the existing custom/Recharts chart.
2. Install/use Lightweight Charts.
3. Add candlesticks.
4. Add volume.
5. Add real crosshair/zoom/scroll.
6. Support 10–12 selectable symbols.
7. Preserve 1m/5m/15m/1H/1D.
8. Support dark/light theme.
9. Update mock data to OHLCV.
10. Keep the existing WARANGAL TRADING RING design and navigation.

After implementation:

- run the project
- verify TypeScript
- verify build
- verify mobile layout
- verify symbol switching
- verify timeframe switching
- verify theme switching
- verify chart resize
- verify no page overflow
- verify the bottom navigation is not covered

Finally, give me a concise implementation report listing:
- files changed
- dependency added
- chart library used
- symbol support
- timeframe support
- interactions implemented
- validation/build result
- any remaining issue