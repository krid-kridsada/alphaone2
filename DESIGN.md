---
name: Alpha One
description: Jira-inspired work-management interface for the existing Alpha One dashboards
colors:
  blue-50: "#e9f2ff"
  blue-100: "#cce0ff"
  blue-200: "#85b8ff"
  blue-300: "#579dff"
  blue-400: "#579dff"
  blue-500: "#388bff"
  blue-600: "#0c66e4"
  blue-700: "#0055cc"
  blue-800: "#09326c"
  blue-900: "#092957"
  zinc-50: "#f7f8f9"
  zinc-100: "#f1f2f4"
  zinc-200: "#dcdfe4"
  zinc-300: "#b3b9c4"
  zinc-400: "#8590a2"
  zinc-500: "#626f86"
  zinc-600: "#44546f"
  zinc-700: "#344563"
  zinc-800: "#282e33"
  zinc-900: "#22272b"
  zinc-950: "#1d2125"
  ui-bg: "#fff"
  ui-sidebar: "#f7f8f9"
  ui-subtle: "#f1f2f4"
  ui-hover: "#e9ebee"
  ui-border: "#dcdfe4"
  ui-text: "#172b4d"
  ui-muted: "#626f86"
  ui-accent: "#0c66e4"
  ui-selected: "#e9f2ff"
  ui-dark-bg: "#1d2125"
  ui-dark-sidebar: "#161a1d"
  ui-dark-subtle: "#22272b"
  ui-dark-hover: "#2c333a"
  ui-dark-border: "#38414a"
  ui-dark-text: "#dee4ea"
  ui-dark-muted: "#9fadbc"
  ui-dark-accent: "#85b8ff"
  ui-dark-selected: "#1c2b41"
  primary-hover: "#0055cc"
typography:
  headline:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "25px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-.7px"
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
  card-title:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 450
    lineHeight: 1.65
  control:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 550
  metadata:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "11px"
  lane-label:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "10px"
    fontWeight: 650
    lineHeight: 1.6
    letterSpacing: ".3px"
rounded:
  status-dot: "2px"
  tag: "3px"
  control: "4px"
  card: "5px"
  panel: "6px"
  lane: "7px"
spacing:
  "4": "4px"
  "5": "5px"
  "6": "6px"
  "8": "8px"
  "10": "10px"
  "12": "12px"
  "14": "14px"
  "16": "16px"
  "18": "18px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "40": "40px"
components:
  button-primary:
    backgroundColor: "{colors.blue-600}"
    textColor: "#fff"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.ui-bg}"
    textColor: "{colors.ui-text}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  button-icon:
    textColor: "{colors.ui-muted}"
    rounded: "{rounded.control}"
    width: "32px"
    height: "32px"
  search-field:
    backgroundColor: "{colors.ui-sidebar}"
    textColor: "{colors.ui-text}"
    rounded: "{rounded.card}"
    padding: "0 12px"
    height: "34px"
  project-nav-item:
    textColor: "{colors.ui-muted}"
    rounded: "{rounded.card}"
    padding: "10px 14px"
  project-nav-active:
    backgroundColor: "{colors.ui-selected}"
    textColor: "{colors.ui-accent}"
  area-tag:
    backgroundColor: "{colors.ui-subtle}"
    textColor: "{colors.ui-muted}"
    rounded: "{rounded.tag}"
    padding: "1px 5px"
  work-item:
    backgroundColor: "{colors.ui-bg}"
    textColor: "{colors.ui-text}"
    rounded: "{rounded.card}"
    padding: "12px"
  project-chart:
    backgroundColor: "{colors.ui-bg}"
    rounded: "{rounded.panel}"
    padding: "18px 20px"
  issue-table:
    rounded: "{rounded.card}"
  issue-timeline-row:
    textColor: "{colors.ui-text}"
    height: "43px"
  issue-timeline-bar:
    rounded: "{rounded.control}"
    padding: "0 5px"
    height: "24px"
---

# Design System: Alpha One

## Overview

**Creative North Star: "The Jira Workbench"**

Alpha One uses the Jira interface reference explicitly selected by the user: a compact global bar, pale project sidebar, blue selection states, neutral work surfaces, and dense issue information. The visual language serves the existing overview, roadmap, meeting cycle, and issue tracking screens. It retains the Alpha One name and current Thai/English content.

This is a scan of the implemented system, not a new product specification. Color, spacing, and components come from src/index.css, src/App.jsx, and src/components/StackedProgressBar.jsx. The available evidence does not establish a particular end-user audience. The existing data, calculations, status meanings, and action behavior remain the authority for content and interactions.

**Key Characteristics:**

- Compact work-management hierarchy with rectangular controls.
- Blue navigation and actions against light or dark neutral surfaces.
- Dense issue cards, tables, and task-row timelines.
- Responsive navigation and deliberate scrolling for wide work areas.

## Colors

Blue is the interface accent; cool neutrals carry the working surfaces. The frontmatter records the CSS values verbatim. Its `ui-*` names map to `--ui-*` in `.app-shell`; `ui-dark-*` records the matching `.app-shell.theme-dark` override. The `blue-*` and `zinc-*` entries map to the existing Tailwind `@theme` scale, not a second palette.

### Primary

- **Action Blue** (`blue-600`): primary page actions, brand symbol, issue-type icons, input accent/caret, and the global focus outline. Primary page-action hover uses `primary-hover`.
- **Selection Blue** (`ui-accent` / `ui-dark-accent`): active navigation, selected tabs, and focus-within search styling. Pair it with the corresponding selected background.

### Neutral

- **Workspace Surface** (`ui-bg` / `ui-dark-bg`): main canvas, cards, menus, and modal surface.
- **Sidebar Surface** (`ui-sidebar` / `ui-dark-sidebar`): project rail, kanban lanes, and table/timeline headers.
- **Subtle Surface** (`ui-subtle` / `ui-dark-subtle`): metadata tags, secondary hover, and progress tracks.
- **Hover Surface** (`ui-hover` / `ui-dark-hover`): navigation hover and small count badges.
- **Divider** (`ui-border` / `ui-dark-border`): restrained 1px edges and separators.
- **Primary Text** (`ui-text` / `ui-dark-text`) and **Muted Text** (`ui-muted` / `ui-dark-muted`): information hierarchy.

Semantic status, date, priority, and chart series colors continue to come from their existing source mappings and Tailwind classes. These are content meanings; do not recolor them into a single accent or infer new status categories.

## Typography

**Font stack:** Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif. Inter is requested by CSS; its runtime availability is not asserted here. Thai content falls through to available system glyphs.

The scale is compact and functional. Body text is 14px with 1.5 line height and tabular numerals. Page headings are 25px/1.3 at weight 650 with -.7px tracking, reducing to 23px below 768px. Metric values use 25px/1.3 at weight 600 and -.5px tracking. Card titles use 13px/1.65 at weight 450; action controls are 12px at weight 550. Metadata is 10–12px. Lane labels are 10px/1.6, weight 650, uppercase, with .3px tracking. Table headers use sentence case at 12px/600. There is no separate display or mono family.

## Layout

The desktop shell is a two-column grid: 232px project sidebar and `minmax(0, 1fr)` main content, with a 58px global bar. The global bar sticks to the top. The sidebar sticks below it and fills the remaining viewport height. Workspace padding is 24px 32px 16px; common gaps are 8px, 12px, 16px, 20px, and 24px. Content order is heading, status summary, metrics/filters, work board, then charts.

- At 1280px and wider, metrics and controls share a row. Below 1280px, they stack; workspace-name decoration is hidden.
- Below 1024px, the rail is 200px and content padding is 22px 24px 16px.
- Below 768px, the sidebar becomes fixed bottom navigation with four equal items. The shell reserves 76px below content. Content padding becomes 20px 16px 16px. Navigation labels are 10px; each item is at least 52px high.
- At 420px and narrower, metrics become two columns, filters become one column, and the brand wordmark hides.
- At 1700px and wider, the content is centered at a maximum 1760px width, with 28px 40px 20px padding.

The kanban grid keeps four lanes and scrolls horizontally: minimum 245px lanes on the default desktop, 250px below 1280px, and fixed 270px lanes below 768px. Card lists scroll independently with an 8px gap, a 265px minimum height, and 460px maximum height (560px at the wide breakpoint; 440px on mobile). Lists preserve their scrollbar gutter. Issue tables stop at 540px and retain a sticky header.

Charts use a 238px-high viewport/scroll region and a 220px-high SVG with an explicit 600px minimum width. Horizontal scrolling preserves chart readability on narrow screens. Timeline labels stay sticky on the left: 340px on desktop, 210px on mobile. Timeline rows are 43px high, group headings 40px, and bars 24px. The roadmap canvas retains the source’s 2360px minimum width. The existing 24-column timeline track and data-to-position calculation remain unchanged.

## Elevation & Depth

Surfaces are primarily flat, separated by neutral fills and 1px borders. Small shadows identify menus, hover, drag/active states, and the modal rather than turning every panel into a raised card.

- **Light popover / active card:** `0 2px 5px #091e4226, 0 0 1px #091e4230` (`--ui-shadow`).
- **Dark popover / active card:** `0 4px 12px #0006` (`--ui-shadow` in dark mode).
- **Card hover:** `0 2px 4px #091e421a`, with border `#b3b9c4`.
- **Task modal:** `0 12px 32px #091e4240`, over `#091e4280`.

Buttons transition background, border, and text color over 120ms ease-out. Roadmap task hover uses a 120ms ease-out filter transition and brightness(.97). The global reduced-motion media query sets animation/transition durations to .01ms and scroll behavior to auto. Existing animation behavior in source should remain intact.

## Shapes

Use the source's compact corners: 2px status squares, 3px tags, 4px controls/timeline bars, 5px issue cards/search/navigation, 6px panels, and 7px lanes/project avatar. Circular shapes are reserved for existing avatars, small count badges, dots, and toggle controls. Borders are thin and neutral; metadata chips are short rectangular labels. Board view tabs are flat with a 2px blue underline for the selected state.

## Components

### Buttons

Primary page actions use Action Blue, white text, a matching 1px border, 4px corners, 6px 12px padding, and a 34px minimum height (36px below 768px). Secondary actions use workspace background, primary text, and the divider border; hover fills the subtle surface. Roadmap view controls retain their source-specific selected treatment. Icon buttons are 32px square with 4px corners. Disabled buttons retain the implemented .5 opacity and not-allowed cursor. Keyboard focus is a 2px Action Blue outline offset 3px.

### Inputs / Fields

The global search is a 34px-high surface with a 1px divider border, 5px corners, 13px input text, and 0 12px padding. Focus-within changes the border to the active accent and adds a 1px outline; the nested input does not add a second outline. Filter buttons use 4px corners and a 32px minimum height. Filter and export popovers use workspace background, 5px corners, and the theme shadow.

### Navigation

The global bar carries Alpha One, the existing search, and existing global actions. Desktop project items use 10px 14px padding, 42px minimum height, 5px corners, and muted text. Hover uses the hover surface and primary text. Active items use selected background, accent text, and weight 600. Mobile uses the bottom-navigation layout described above; preserve accessible names and current page state from source.

### Chips / Tags

Area tags use subtle background, muted 10px/500 text, 1px 5px padding, 3px corners, and truncation at 140px. Existing status chips preserve their mapped colors and labels. Small status-summary squares are 7px by 7px with 2px corners. Counts remain attached to their source-derived category.

### Cards / Containers

Issue cards have workspace background, a 1px divider border, 5px corners, and 12px padding. Present the issue key first, then the 13px detail title, then metadata separated by a thin divider. Neutral lane surfaces group cards. Keep existing drag-and-drop handlers, title truncation, tooltips, and metadata. Empty lanes retain their dashed drop target. Chart and meeting panels use 6px corners and 18px 20px padding (16px chart padding on mobile).

### Tables

Tables use a 5px perimeter, sticky sidebar-toned header, 12px text, and 12px 16px cell padding. Rows hover to sidebar tone. Detail content may wrap to two lines; do not remove columns or alter values to improve visual density.

### Task-row timeline

Use a sticky task identity cell, muted issue key, readable truncated task name, and a separate gridded time track. Group rows use the sidebar surface and compact count treatment. Keep the current status mapping for bars. The narrow-screen label width and horizontal timeline scrolling preserve the relationship between identity and dates. Clicking a row continues to use the existing task-detail action.

### Status summary and charts

The summary places the compact segmented progress track beside its label/count legend, wrapping below 1024px. Segment widths and totals come from StackedProgressBar's existing calculations. Charts appear below the board with the scroll geometry specified in Layout. Label toggles and series values retain their original behavior.

### Modal and transient feedback

The task modal uses workspace background, the modal shadow, and a maximum height of `calc(100dvh - 48px)` with internal vertical scrolling. Its title is 22px with -.4px tracking; mobile padding is 20px. Toasts use the theme popover shadow, 5px corners, and sit at 74px from the top (70px on mobile). Loading/sync surfaces retain current logic and use the active accent.

## Do's and Don'ts

### Do:

- Do use the existing --ui-* role variables so both themes remain coherent.
- Do retain visible keyboard focus and the reduced-motion override.
- Do preserve Thai/English content, real issue values, status labels, and existing interaction behavior.
- Do keep board lanes, wide tables, timelines, and charts scrollable within their work area.
- Do use 13px issue titles, 10–12px metadata, and the established compact corner sizes.

### Don't:

- Don't introduce a new palette, typography family, or decorative surface treatment without an explicit direction change.
- Don't replace existing data with fabricated people, counts, or project details.
- Don't change Firebase, fetching, CSV parsing, sync, export, share, filtering, search, calculation, status, or drag-and-drop logic as part of visual work.
- Don't shrink chart geometry below its 600px minimum width to fit a narrow viewport.
