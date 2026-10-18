# ADR-0001: Vanilla TypeScript & Native Responsive SVG for Platform UI

* **Status:** Accepted
* **Date:** 2026-10-18
* **Deciders:** cdr74, Engineering Team

---

## Context
The Classic Board Games platform delivers multiple classic board games across desktop web and mobile devices (Android PWA and Capacitor). We evaluated whether to use heavy frontend single-page frameworks (React, Vue) versus lightweight Vanilla TypeScript with native responsive SVG.

## Decision
We chose **Vanilla TypeScript and Native Responsive SVG** (`viewBox="0 0 600 600"`).

## Rationale
- **Performance & Startup Time:** Zero framework runtime eliminates virtual DOM overhead. The initial application bundle stays under 40 KB gzipped.
- **Flawless Vector Scalability:** Native SVG scales crisply on mobile screens and high-DPI retina displays without canvas rasterization blur.
- **Ergonomic Touch Targets:** SVG circle and polygon elements allow invisible $\ge 48\text{px}$ touch hitboxes with standard DOM click/touch event listeners.

## Consequences
- **Positive:** Blazing fast load times, minimal dependencies, longevity without framework deprecations.
- **Negative:** UI components (menus, dialogs) require direct DOM generation rather than JSX templates.
