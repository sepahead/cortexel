# Brand — Cortexel

_Status: deferred_

The user chose to defer a separate product-brand exercise. Cortexel is a library,
not a shadcn application: it has no `app/globals.css` and no global typography
surface. Its current visual source of truth is the scientific Crameri palette in
`core/colormaps.ts`, with host-owned typography and UI chrome.

To set up a real brand palette, typography, and voice at any time, run:

    /brand-design

or say: "pick brand colors"

When `brand-design` runs, it should treat this deferred marker as permission to
start the full exercise, preserve the scientific color/honesty constraints, and
target Cortexel's exported palette/documentation rather than assuming an app-level
CSS file. This file can then be replaced with the accepted brand specification.

_Deferred at: 2026-07-10T00:00:00+02:00_
