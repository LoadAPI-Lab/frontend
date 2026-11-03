---
name: ui-components
description: How to build UI in the LoadAPI frontend, covering the three component tiers and how granular to make them, Base UI wrappers, Tailwind tokens for the dark routelab look, Storybook, charts, the JSON body editor and accessibility. Use when creating, splitting or changing any component, page layout or style, or implementing a Figma frame.
---

# UI components

## Three tiers

| Tier                  | Folder                  | Knows about                                                                         | May import                      | Examples                                                                                                                                                                               |
| --------------------- | ----------------------- | ----------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Primitives         | `components/ui`         | nothing domain-specific                                                             | Base UI, `lib/cn`               | Built: Button, IconButton, Field, Input, Textarea, NumberField, Select, SegmentedControl, Tabs, Tooltip, Badge, Chip, Card. Next: Dialog, Menu, Toast, Progress, Skeleton, Collapsible |
| 2. Shared blocks      | `components/shared`     | LoadAPI concepts (HTTP methods, percentiles, status codes) but **no data fetching** | tier 1, `lib`                   | MethodBadge, StatCard, LatencyPill, StatusDonut, LiveLatencyChart, JsonBodyEditor, PlaceholderChips, KeyValueEditor, TreeView, EmptyState, ErrorState                                  |
| 3. Feature components | `features/*/components` | one feature's data and actions                                                      | tiers 1–2, feature hooks, `api` | CollectionsSidebar, TestConfigBar, EndpointHeader, LiveMetricsRow, RequestEditorPanel, RecentRunsCard, RunsTable                                                                       |

Layout pieces (AppShell, TopBar, PageHeader) live in `components/layout`; they are tier 2 that take slots (`children`, `actions`) rather than data.

### How granular

- **Tier 1 mirrors Base UI's compound API.** Export a namespace (`Tabs.Root`, `Tabs.List`, `Tabs.Tab`, `Tabs.Panel`) with our styles applied. Do not invent `<Tabs items={[...]}>` config props; composition stays flexible.
- **Tier 2 is props in, callbacks out.** Typed props, no `useQuery`, no router. Must render in Storybook with plain data.
- **Tier 3 connects.** Calls feature hooks, maps data to tier-2 props, handles loading, empty and error states.
- **Split when** a component has more than one reason to change, passes the same props through more than two levels, or passes ~150 lines. Prefer `children` and slots over boolean-prop explosions (`showIcon`, `isCompact`, `withBorder`).
- **Promote when** a tier-3 piece is needed by a second feature: strip data access, move it to `components/shared`.
- **Do not pre-abstract.** Write it in the feature first; promote on the second use.

Example decomposition of the Tests page (Single):

```
StressTestPage (feature)
├─ TestConfigBar        → SegmentedControl, NumberField×3, Button(danger)
├─ EndpointHeader       → MethodBadge, RunStatus (Progress + timer)
├─ LiveMetricsRow       → StatCard×4
├─ RequestEditorPanel   → Tabs(Body/Headers/Auth/Params) → JsonBodyEditor, PlaceholderChips, KeyValueEditor
└─ side column
   ├─ LiveLatencyChart
   ├─ StatusDonut
   └─ RecentRunsCard    → MethodBadge, LatencyPill
```

## Component folder

Tiers 1–2: one folder per component.

```
components/shared/stat-card/
  stat-card.tsx
  stat-card.stories.tsx
  stat-card.test.tsx      # only if it has logic (formatting, states)
  index.ts
```

Tier 3: flat files in `features/x/components/` with tests next to them; stories optional.

## Wrapper pattern (tier 1)

```tsx
import { Tabs as BaseTabs } from '@base-ui/react/tabs';

import { cn } from '@/lib/cn';

function Tab({ className, ...props }: BaseTabs.Tab.Props) {
    return (
        <BaseTabs.Tab
            className={cn(
                'rounded-md px-3 py-1.5 text-sm text-fg-muted outline-none focus-visible:ring-2 focus-visible:ring-accent data-[selected]:bg-surface-2 data-[selected]:text-fg',
                className,
            )}
            {...props}
        />
    );
}

export const Tabs = { Root: BaseTabs.Root, List: BaseTabs.List, Tab, Panel: BaseTabs.Panel };
```

- Style Base UI state with its data attributes (`data-[selected]`, `data-[open]`, `data-[disabled]`), not extra React state.
- Variants with `cva`; always accept and merge `className` last.
- `cn()` uses a `tailwind-merge` configured with our custom sizes and radii (`src/lib/cn.ts`). When you add a font-size or radius token to `theme.css`, add its name there too, or `cn` drops it next to a colour class.
- Form controls go inside `Field.Root` (label, description, error wiring). Config-bar fields use `NumberField.Group` + `NumberField.InlineLabel` (label inside the box, as in Figma).
- `SegmentedControl` is a single-select ToggleGroup that never allows an empty selection; use Tabs when the choice swaps a panel of content.
- Forward refs implicitly (React 19 `ref` prop); never drop props.

## Storybook

Every tier-1 and tier-2 component has stories covering its variants and states (default, hover/focus via play, disabled, loading, empty, error, long text). Use the a11y addon and run stories as tests through the Vitest addon. Stories are the review surface for design: link the Figma node in the story `parameters.design`.

## Design tokens

Tokens live in `src/app/styles/theme.css` as Tailwind 4 `@theme` variables, taken from the Figma variables of "LoadAPI (Copy)" (`oqsJDQ4p2kQzIheXlVJDFO`, frame 5:293). Each token notes its Figma variable. Dark-only in v1.

| Token                                 | Value                             | Use in Figma                                                                         |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| `bg`                                  | `#0e0e0e`                         | page background                                                                      |
| `surface-1`                           | `#141414`                         | cards                                                                                |
| `surface-input`                       | `#151515`                         | inputs, config fields, small sidebar buttons                                         |
| `surface-raised` / `surface-selected` | `#171717` / `#1a1a1a`             | active top-bar tab / selected route (with accent border)                             |
| `surface-code`                        | `#121212`                         | body editor (border `track`)                                                         |
| `surface-2`                           | `#1f1f1f`                         | method chips, tabs, badges                                                           |
| `border` / `border-strong`            | `#1f1f1f` / `#262626`             | cards / inputs, buttons, tabs                                                        |
| `fg`                                  | `#f4f3ee`                         | primary text, numbers                                                                |
| `fg-secondary` / `fg-muted`           | `#a6a5a0` / `#8a8a86`             | route paths / nav, folders, timer                                                    |
| `fg-subtle`                           | `#6b6b67`                         | labels, units, captions: **3.4:1 on cards**, so only for large or non-essential text |
| `fg-faint` / `fg-disabled`            | `#55554f` / `#3d3d3a`             | counts / line numbers                                                                |
| `accent` (+ `accent-fg`)              | `#c6f432`                         | logo, POST, RUNNING, progress, placeholders                                          |
| `info` / `warning` / `danger`         | `#86a8f5` / `#e0b54a` / `#f07b6b` | GET, p95, 4xx / PATCH / DELETE, errors, 5xx, Stop                                    |

Tinted states use opacity on the token: `bg-accent/15` (badge), `bg-accent/4` (highlighted editor line), `bg-danger/10 border-danger/35` (Stop test).
Type scale (`text-*`, px): 2xs 9.5 · xs 10 · sm 10.5 · label 11 · base 11.5 · control 12 · md 12.5 · lg 14 · xl 17 · 2xl 21 (stat values). Uppercase section labels: `text-xs font-semibold uppercase tracking-label`.
Radii (`rounded-*`): xs 3 · sm 5 · md 6 · lg 8 · editor 9 · card 12.
Fonts: Inter (UI) and JetBrains Mono (paths, numbers, code, badges); `font-mono tabular-nums` on every metric. Self-hosted via Fontsource.
PUT has no colour in the design yet (placeholder). HTTP method colours live only in `src/lib/http-method.ts`.

Layout is desktop only (≥ 1280px); do not add mobile breakpoints.
Spacing: the frame uses a 4px scale (8/12/16 gaps and paddings seen in Figma). Use Tailwind's default spacing; no arbitrary `px` values.
Fonts: sans for UI, **monospace for paths, numbers, code and badges**; `font-mono tabular-nums` on every metric. Self-host fonts (no runtime Google Fonts).
HTTP method colors: one map in `src/lib/http-method.ts`.

## Implementing a Figma frame

Frames: TESTS PAGE (Single, Batch, Round Robin), SCENARIOS PAGE, HISTORY PAGE (Single, Scenario, Batch, Round Robin). Batch and Round-robin are out of v1.

1. Use the file `oqsJDQ4p2kQzIheXlVJDFO` (our copy, Dev Mode). `get_design_context` + `get_variable_defs` on the node; treat output as reference, map onto tokens and existing components.
2. Without access, work from a screenshot and list guessed values in the PR.
3. Reuse or extend tier 1–2 first; only then build the tier-3 composition.
4. Add or update stories, then check keyboard use and focus rings.

## Specialised widgets

| Widget              | Library                                                         | Notes                                                                                                                           |
| ------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| LiveLatencyChart    | uPlot                                                           | Append points; never re-create the chart per update. Fixed time window.                                                         |
| StatusDonut         | plain SVG                                                       | 2xx/4xx/5xx/errors slices.                                                                                                      |
| JsonBodyEditor      | CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-json`) | Decorate `{{$uuid}}`, `{{$randomInt}}`, `{{$randomEmail}}`, `{{$timestamp}}`, `{{var}}`. PlaceholderChips insert at the cursor. |
| RunsTable           | TanStack Table                                                  | headless, our tokens                                                                                                            |
| Icons               | lucide-react                                                    |                                                                                                                                 |
| Toasts              | Base UI Toast                                                   | test finished, stopped or failed                                                                                                |
| (later) Batch queue | dnd-kit                                                         | keyboard alternative required                                                                                                   |

## Text

All visible text, `aria-label`s and `alt` text come from `t()` (see `frontend-conventions`, i18n). Tier 1–2 components never contain hard-coded copy: take text as props or `children`.
Leave room for longer translations: no fixed widths on text containers.

## Accessibility checklist

- Semantic elements; no duplicate ARIA on Base UI parts.
- Icon-only buttons have `aria-label`.
- Muted text reaches 4.5:1 on its surface.
- Never color alone: keep text labels (`POST`, `5xx 3.1%`).
- Do not put per-second metrics in `aria-live`; announce only started, finished, failed.
- Visible `focus-visible` styles on everything interactive.
