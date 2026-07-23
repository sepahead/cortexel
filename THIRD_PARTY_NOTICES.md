# Third-party notices

This file covers third-party source code and colour data copied into Cortexel. Package dependencies are distributed separately under their own licenses.

## Scientific Colour Maps 8.0.1

Local use: sampled and rounded `batlow`, `vik`, and `romaO` colour data, plus Cortexel-derived semantic, categorical, and GLSL palettes in `core/colormaps.ts` and the palette registry.

Author: Fabio Crameri. Source: <https://www.fabiocrameri.ch/colourmaps/> and the versioned archive at <https://zenodo.org/records/8409685>.

Copyright (c) 2023, Fabio Crameri

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Viridis, magma, inferno, and plasma

Local use: reduced, evenly sampled, and rounded sRGB control stops in `core/colormaps.ts`.

Original source: the BIDS `mpl-colormaps` work by Nathaniel Smith and Stefan van der Walt; Eric Firing is additionally credited for viridis. The source data is dedicated to the public domain under CC0 1.0. See `LICENSES/CC0-1.0.txt`, <https://github.com/BIDS/colormap>, and <https://github.com/BIDS/colormap/blob/master/LICENSE.txt>.

The viridis GLSL polynomial is a separate CC0 work originally published at Shadertoy (`WlfXRN`) and preserved with its attribution and license declaration in Google Research ZapBench: <https://github.com/google-research/zapbench/blob/main/fluroglancer/src/shader/colormaps.glsl>. Cortexel reformatted it as a TypeScript string and retained the coefficients.

## Cividis

Local use: a ten-stop sampled, rounded sRGB approximation in `core/colormaps.ts`.

The local stops align with Matplotlib's cividis table, which derives from the PNNL/Battelle cividis work. Cortexel conservatively distributes both applicable notices: `LICENSES/Matplotlib.txt` and `LICENSES/PNNL-cividis.txt`. Sources: <https://github.com/matplotlib/matplotlib>, <https://github.com/pnnl/cmaputil>, and the PNNL government disclaimer at <https://github.com/pnnl/cmaputil/blob/master/cividis_disclaimer_pnnl.docx>.

Modification summary: Cortexel sampled, rounded, and reduced the source table to ten sRGB control stops.

## Turbo

Local use: the polynomial CPU and GLSL implementations in `core/colormaps.ts`.

Copyright 2019 Google LLC.

Colormap design: Anton Mikhailov. GLSL polynomial approximation: Ruofei Du. Source: <https://gist.github.com/mikhailov-work>.

Licensed under the Apache License, Version 2.0. See `LICENSES/Apache-2.0.txt`.

Modification summary: Cortexel adapted the polynomial to TypeScript and GLSL strings, renamed local variables, added finite-domain clamping and integer sRGB rounding, and formatted the source to project conventions.

## Okabe–Ito colour-universal palette

Local use: the original eight-colour reference set in `core/colormaps.ts`; the stable contract palette uses seven original colours and replaces the original bright yellow `#f0e442` with Cortexel's contrast-adjusted dark yellow `#8a6d00`.

Authors: Masataka Okabe and Kei Ito. Source and requested attribution: <https://jfly.uni-koeln.de/color/>.

The authors' page does not state a software or data license. Cortexel therefore makes no claim that this palette is MIT-, BSD-, or CC0-licensed; this entry records authorship, source, exact local use, and the Cortexel modification.

## fdlibm

Local use: TypeScript ports of the IEEE-754 `log`, `exp`, and non-negative `log1p` kernels in `src/core/deterministic-transcendentals.ts`, derived from `e_log.c`, `e_exp.c`, and `s_log1p.c`.

Copyright (C) 1993-2004 by Sun Microsystems, Inc. All rights reserved.

Developed at SunSoft, a Sun Microsystems, Inc. business.

Permission to use, copy, modify, and distribute this software is freely granted, provided that this notice is preserved.

Sources: <https://www.netlib.org/fdlibm/>, <https://www.netlib.org/fdlibm/e_log.c>, <https://www.netlib.org/fdlibm/e_exp.c>, and <https://www.netlib.org/fdlibm/s_log1p.c>.

Modification summary: Cortexel ported the kernels to TypeScript, replaced C word-access macros with explicit big-endian `DataView` bit access, specialized the exposed `log1p` entry point to the non-negative domain used by positive ratios, and retained IEEE special-value handling.
