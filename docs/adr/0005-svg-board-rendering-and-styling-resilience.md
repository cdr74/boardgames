# ADR-0005: SVG Board Rendering Resilience and Platform Theme Styling

* **Status:** Accepted
* **Date:** 2026-10-18
* **Deciders:** cdr74, Engineering Team

---

## Context
During initial manual verification of Nine Men's Morris, the game board rendered only the 24 vertex dots without any grid lines or concentric squares. Investigation revealed that `src/style.css` was missing all CSS declarations for the SVG board classes (`.game-board-svg`, `.square-line`, `.connector-line`, `.point-dot`, `.dest-highlight`, `.selection-halo`, etc.), and `src/games/morris/ui/board-view.ts` did not provide inline presentation attributes for `stroke` and `stroke-width`. According to the SVG specification, `<rect fill="none">` and `<line>` elements with no stroke property default to `stroke: none`, rendering the geometry invisible.

## Decision
We adopt a **dual-layer rendering resilience pattern**:
1. **Structural Inline SVG Attributes:** The SVG renderer in `src/games/morris/ui/board-view.ts` must set essential inline presentation attributes (`stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `fill`, and `rx`/`ry`) directly on elements, including a dedicated board background plate element.
2. **Comprehensive CSS Styling & Design System:** `src/style.css` must include complete classes conforming to the platform's Slate & Sky visual design system:
   - Board plate: Rounded dark slate surface (`#1e293b`), subtle border (`#334155`), and elevated drop shadow.
   - Board lines: Crisp `#64748b` lines with 4px stroke width.
   - Vertices: `#334155` point dots with `#64748b` stroke and `#38bdf8` hover/touch focus.
   - Feedback: Emerald destination highlights (`#10b981`), dashed selection halo (`#38bdf8`), pulse red capture targets (`#ef4444`), and move trajectories.
3. **Automated Visual Contract Verification:** Add unit tests to verify that rendered SVG structures contain board plates, proper stroke attributes, and required CSS classes.

## Consequences
- **Positive:** Guaranteed visual rendering even in environments where external CSS fails or experiences FOUC (flash of unstyled content); crisp, beautiful, high-contrast board UI.
- **Negative:** Minor duplication between inline fallback SVG attributes and CSS classes.
