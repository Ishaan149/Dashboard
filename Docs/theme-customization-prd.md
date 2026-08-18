# Product Requirements Document: Dark Theme Customization

## Status

Proposed version-one specification created August 18, 2026. This document is implementation-ready; no theme implementation is included.

## Summary

Add an **Appearance** section to the existing Settings page where users can choose among five dark, muted theme presets and customize the active preset's accent, background, and foreground colors.

Theme selection and color edits preview immediately across the unlocked dashboard and persist in the current browser. Preset edits are intentionally temporary: they survive a reload while that preset remains active, but choosing a different preset immediately discards the edits. The dedicated Habit Tracker component keeps its current internal appearance, and the locked password screen remains unchanged.

## Problem

The dashboard currently has one fixed dark green appearance. Its shared CSS variables already establish a global background, foreground, accent, surfaces, borders, focus treatments, and related derived colors, but users cannot select another visual identity. Some feature styles also repeat fixed versions of the current palette, which prevents a global appearance choice from applying consistently.

The user needs a small, visual theme system rather than a full design editor: five curated dark presets, an immediate preview, and native controls for changing the three primary colors.

## Goals

- Add five cohesive dark theme presets: Forest, Slate, Plum, Mocha, and Graphite.
- Preserve the current green appearance as the **Forest** preset and initial default.
- Present presets as selectable miniature-dashboard preview cards in the existing Settings page.
- Let the user customize the active theme's accent, background, and foreground with native color pickers.
- Apply selections immediately without a Save or Apply action.
- Persist the active preset and its current temporary edits in `localStorage` on the current browser/device.
- Apply themes consistently throughout the unlocked application, including Overview and its Today's Habits card.
- Keep the dedicated Habit Tracker component's internal styling unchanged.
- Preserve keyboard, touch, reduced-motion, and forced-colors behavior.

## Non-goals

Version one will not include:

- Light mode, automatic mode, or system appearance detection.
- Typography, spacing, density, radius, shadow, blur, or layout customization.
- User-created, named, duplicated, reordered, or deleted themes.
- Multiple saved custom themes or saved per-preset edits.
- Text entry for HEX, RGB, HSL, OKLCH, or other color formats.
- Import, export, copying, sharing, or shareable theme links.
- Account or Firestore synchronization of appearance preferences.
- A Save, Apply, Undo, Reset, or Restore Defaults action.
- Warnings, blocking validation, or automatic correction for low-contrast color combinations.
- Theme changes to the locked `PasswordGate` screen.
- Theme changes to the dedicated Habit Tracker component's internal colors.
- Changing semantic category colors in Day Planner or fixed semantic colors such as danger, success, warnings, and favorites merely to match a preset.

## Existing system context

The project is a React 18/Vite single-page application. `src/App.jsx` owns the active view and renders the unlocked application through `AppShell`; the password gate is rendered before that tree.

Global styling in `src/index.css` already defines shared properties including `--bg`, `--glass`, `--border`, `--ink`, `--text`, `--accent`, `--accent-glow`, and focus tokens. Most current feature styles consume these variables, but some repeat hard-coded green, dark-surface, or white values. The theme work must consolidate theme-owned values behind shared semantic tokens wherever required for consistent application.

The current Settings view contains Shortcuts and Security. Appearance is added to this existing page rather than creating another view or quick switcher.

The dedicated `HabitTracker` uses `HabitTracker.module.css` and intentionally retains its internal fixed palette. Overview has a separate `HabitsCard`; that Overview card is not excluded and must follow the active theme like the rest of Overview.

## User experience

### Settings information architecture

The Settings page contains these sections in order:

1. **Appearance** — preset cards and three color controls.
2. **Shortcuts** — existing shortcut list, unchanged.
3. **Security** — existing Lock Dashboard action, unchanged.

The Appearance section has a heading and concise helper text such as `Choose a dark theme and adjust its colors.` It must fit the existing Settings card and remain usable on phone, tablet, and desktop layouts.

### Preset gallery

Display five theme cards in this order:

1. Forest
2. Slate
3. Plum
4. Mocha
5. Graphite

Each card is a button and contains:

- The preset name.
- A miniature, non-interactive dashboard preview built from simple decorative regions: background, sidebar/header or surface, foreground lines, and an accent element.
- A persistent selected treatment that does not depend on color alone, such as a visible checkmark and stronger border.

The preview is illustrative rather than a screenshot. It must use the preset's canonical colors, not the active temporary edits, so every card continues to represent the preset that selecting it will load. Decorative preview elements are hidden from assistive technology.

Cards form a responsive grid. They must remain large enough to understand on a narrow screen and must not require horizontal page scrolling.

### Selecting a preset

Selecting a different preset performs all of the following as one immediate interaction:

1. Replaces the active accent, background, and foreground with that preset's canonical values.
2. Applies the new theme to every in-scope mounted element before the next paint where practical.
3. Marks the selected card active.
4. Persists the preset ID and canonical colors locally.
5. Permanently discards any temporary edits made to the previously active preset.

There is no confirmation, warning, toast, Undo action, or saved edit history when switching. Selecting the already-active card is a no-op; it does not reset or restore temporary edits.

### Color controls

Below the preset gallery, show three labelled rows in this order:

1. **Accent**
2. **Background**
3. **Foreground**

Each row displays a color swatch implemented with a native `<input type="color">`. Only the visible swatch opens the native browser/operating-system color picker. Clicking the label or unused row area does not open it.

Requirements:

- The swatch's accessible name identifies its role, for example `Choose accent color`.
- No editable text value is shown.
- A chosen color applies to the live interface immediately as the browser emits changes.
- Every accepted change is stored locally without a separate save step.
- Editing any color keeps the same preset selected; there is no separate Custom card or custom name.
- A reload restores the active preset and its temporary edited values.
- Choosing any other preset discards all three temporary values together, even if only one was changed.
- Returning to the earlier preset loads its canonical colors rather than the discarded edits.
- Selecting the same active preset does not restore its canonical colors. Version one intentionally offers no restoration mechanism.

## Preset definitions

The following canonical values define the five muted themes. Forest retains the current dashboard foundation and is the default. Exact derived surface and muted-text tokens are calculated from these base values rather than authored as additional user settings.

| ID | Display name | Accent | Background | Foreground | Direction |
|---|---|---:|---:|---:|---|
| `forest` | Forest | `#73B592` | `#131419` | `#E9EAE6` | Existing green dashboard identity |
| `slate` | Slate | `#8296B0` | `#12151A` | `#E7E9ED` | Cool, restrained blue-grey |
| `plum` | Plum | `#AA8FAA` | `#171319` | `#EEE8EE` | Muted purple with a warm dark base |
| `mocha` | Mocha | `#B59A7A` | `#191512` | `#EFE9E2` | Warm neutral brown and cream |
| `graphite` | Graphite | `#A7A7A7` | `#141414` | `#ECECEC` | Neutral monochrome dark theme |

`#73B592` is the sRGB representation of the current Forest accent direction. Implementation may retain the current OKLCH source as the canonical CSS token if its rendered color is equivalent, while the native picker state remains a six-digit hexadecimal value.

## Theme token contract

The user controls exactly three base tokens:

| User-facing value | Base token | Meaning |
|---|---|---|
| Accent | `--theme-accent` | Active navigation, primary highlights, progress, links, and focus emphasis |
| Background | `--theme-background` | Application canvas and base used to derive dark elevated surfaces |
| Foreground | `--theme-foreground` | Primary readable text and base used to derive secondary/muted text |

The application derives its implementation tokens from those bases. At minimum this includes `--bg`, `--accent`, `--accent-glow`, `--focus-color`, `--focus-ring`, `--ink`, `--ink-2`, `--ink-3`, `--text`, `--subtext`, `--glass`, `--glass-hover`, `--border`, and `--border-hi`.

Derived tokens should use CSS `color-mix()` or deterministic JavaScript color utilities so temporary edits propagate consistently. They must not be independently persisted or exposed as settings. The implementation must provide safe fallback values equal to Forest for browsers evaluating the initial stylesheet before stored preferences are applied.

Theme-owned hard-coded copies in feature styles must move to semantic variables where necessary. Semantic colors keep their meaning:

- Destructive/error UI continues using `--danger`.
- Success state may continue using `--success`/`--green` where it conveys success rather than branding.
- Day Planner category colors remain category data.
- Favorites and warnings may retain their semantic amber/yellow treatment.

## Scope and exclusions

### In scope

The active theme applies to:

- Application background and ambient decorative background treatments.
- Desktop rail, mobile navigation, page header, menus, dialogs, sheets, command palette, and toasts.
- Overview, including the Today's Habits card.
- To-Do, Brain Dump, Job Applications, Day Planner, and Settings.
- Shared cards, inputs, buttons, surfaces, borders, primary text, muted text, active states, and focus treatments in those areas.

### Dedicated Habit Tracker exception

When the active view is Habit Tracker:

- The surrounding shared application shell—navigation, page header, and page canvas—continues following the active theme.
- The `HabitTracker` component's internal content and controls retain their existing fixed colors, including its add field/button, section labels, habit rows, completion controls, streaks, history dots, and destructive action.
- Its existing outer shared `Card` may follow the active surface/background token where it is owned by the shared card component. The exception is not permission to fork the shared Card globally.
- Habit data, behavior, and storage remain unchanged.

The separate habits summary implemented inside Overview is ordinary Overview UI and follows the active theme fully.

### Password screen exception

The locked `PasswordGate` screen remains visually unchanged. Theme state may be read before unlock to prevent an unlocked-app flash, but themed variables must not alter the gate's rendered appearance. Locking and unlocking do not reset the selected theme.

## State and persistence

Theme preferences are device/browser-local and must not use `useSyncedStorage`, Firebase, or any account-scoped storage.

Use one versioned `localStorage` record, conceptually:

```js
{
  version: 1,
  presetId: "forest",
  colors: {
    accent: "#73B592",
    background: "#131419",
    foreground: "#E9EAE6"
  }
}
```

The exact key may follow project naming conventions, but must be unique and documented in code. Persistence rules:

- Missing state loads Forest canonical values.
- Valid stored state loads synchronously before or during the first unlocked render to avoid a visible Forest-to-selected-theme flash.
- Every color-picker change writes the complete current record.
- Preset selection writes the new preset ID plus all three canonical colors in one record.
- A malformed record, unsupported version, unknown preset ID, or invalid color value falls back completely to Forest without throwing or breaking unlock.
- Storage write failure does not block live preview. The interface continues for the session without claiming persistence.
- No theme data is written to Firestore.

## Accessibility and interaction requirements

- Theme cards and color inputs use native interactive elements and work with keyboard, pointer, and touch.
- Every theme card has an accessible name and exposes its selected state with `aria-pressed="true"` or equivalent single-selection semantics.
- Selection is communicated by text/icon/border in addition to color.
- Color swatches have visible focus indicators and a minimum 44 by 44 CSS-pixel touch target on mobile.
- The miniature preview is decorative and cannot receive focus.
- Do not announce every color-picker drag/input event. The visible page update is sufficient; preset changes may update concise screen-reader-only selected text.
- Respect the existing `prefers-reduced-motion` rules. Theme changes do not animate the whole page or interpolate colors.
- Under `forced-colors: active`, native pickers remain operable, selection remains identifiable, and system colors may override previews. Do not disable forced-color adjustment globally for the theme controls.
- Version one deliberately permits any native-picker result without contrast warnings or blocking. This product choice does not remove the requirement that all five canonical presets and the Settings controls themselves meet normal accessibility expectations before customization.

## Responsive behavior

- On wide screens, theme cards may use a multi-column grid inside the Settings surface.
- On tablets, reduce the column count without shrinking previews below legibility.
- On phones, use one or two columns depending on available width; never require horizontal scrolling.
- Color rows remain full-width and keep labels and 44px swatches visible without overlap.
- Native color-picker UI is owned by the browser/operating system and must not be replaced with a custom modal in version one.

## Implementation boundaries

The implementation should separate responsibilities:

- A small theme definition module owns preset IDs, names, canonical colors, validation, and the Forest fallback.
- A theme state owner mounted for the unlocked application owns selection, temporary edits, persistence, and applying root variables.
- Settings receives or consumes that state to render the gallery and swatches.
- CSS consumes semantic tokens; it does not read `localStorage` or encode preset-specific selectors throughout feature modules.

Do not add a general state-management library or color-picker dependency. React state, native color inputs, CSS custom properties, and a small local persistence utility are sufficient.

## Testing requirements

### Unit and component tests

- Missing, malformed, invalid-version, and unknown-preset storage all resolve to Forest.
- Each preset ID resolves to the exact canonical base colors.
- Selecting a preset updates all three values and persists one complete record.
- Editing each swatch updates only its corresponding base value, previews immediately, and persists.
- Temporary edits survive remount/reload simulation.
- Switching presets discards prior edits; returning loads canonical values.
- Selecting the already-active preset is a no-op and does not restore edited values.
- Settings renders five correctly named cards and exactly three native color inputs.
- The selected card exposes a non-color selected state.
- Existing Shortcuts and Lock Dashboard behavior remains intact.

### Integration and visual checks

- Verify Forest matches the current appearance closely enough to avoid an unintended redesign.
- Verify Slate, Plum, Mocha, and Graphite across every in-scope view and shared overlay.
- Verify Overview's Today's Habits card follows the theme.
- Verify the dedicated Habit Tracker internals retain current colors while its surrounding app shell changes.
- Verify PasswordGate is unchanged before and after selecting a non-Forest theme.
- Verify reload does not visibly flash Forest before the stored theme on the unlocked application.
- Verify narrow mobile layout, 200% browser zoom, keyboard-only use, native color picker invocation, reduced motion, and forced-colors mode.
- Run existing navigation, Settings, Overview, Habit Tracker, and application tests plus the production build.

## Acceptance criteria

- [ ] Settings contains an Appearance section above Shortcuts and Security.
- [ ] Forest, Slate, Plum, Mocha, and Graphite appear as miniature-dashboard preview cards in the specified order.
- [ ] Forest preserves the current green appearance and is the default when no valid preference exists.
- [ ] Selecting a card immediately changes the in-scope unlocked dashboard and persists locally.
- [ ] Accent, Background, and Foreground each use a native color-input swatch with no text-value editor.
- [ ] Swatch changes preview and persist immediately without Save or Apply.
- [ ] Edited values survive reload while the same preset remains active.
- [ ] Selecting a different preset immediately and silently discards the previous preset's edits.
- [ ] Selecting the active preset does not reset it, and no reset/restore control exists.
- [ ] Themes apply to Overview, including Today's Habits, and to all other in-scope views and shared UI.
- [ ] Dedicated Habit Tracker internals and PasswordGate retain their current appearance.
- [ ] Preferences remain local to the browser and are never synchronized to Firebase.
- [ ] Theme cards and swatches are keyboard/touch accessible and selection is not communicated by color alone.
- [ ] Existing dashboard data, behavior, shortcuts, navigation, locking, and feature storage are unchanged.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Hard-coded colors create a partially themed interface. | Inventory theme-owned colors and migrate them to semantic tokens; keep documented semantic and Habit exceptions. |
| Applying stored state after mount causes a visible flash. | Read and apply valid local theme values synchronously before the first unlocked paint. |
| Arbitrary user colors can reduce readability. | Canonical presets remain reviewed and usable; v1 explicitly allows custom combinations without enforcement. Keep native focus/forced-color fallbacks. |
| Temporary-edit behavior surprises users. | Keep the model simple and consistent: edits survive reload, selecting another preset always loads canonical colors, and no card implies that edits are permanently saved to it. |
| Habit exclusion causes duplicated shared styles. | Scope fixed colors to Habit Tracker internals and continue using shared shell/Card primitives where appropriate. |
| Native color-input behavior differs by browser. | Accept platform-native presentation, test supported browsers, and avoid depending on picker-specific events beyond standard input/change behavior. |

## Future considerations

Possible later versions may add light/system modes, reset controls, contrast guidance, named custom themes, per-preset saved edits, text color values, import/export, sharing, or account synchronization. None should be pre-exposed or partially implemented in version one.
