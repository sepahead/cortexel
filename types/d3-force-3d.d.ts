/**
 * Minimal ambient types for `d3-force-3d` (the package ships no `.d.ts`).
 *
 * Covers only the surface this app uses: a 3-dimensional force simulation whose
 * nodes carry x/y/z (+ velocities) and the handful of forces we attach. Kept
 * deliberately loose — the runtime shape mirrors d3-force, with a z axis added.
 */
declare module 'd3-force-3d' {
  export interface SimNode {
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
    index?: number;
    [key: string]: unknown;
  }

  export interface SimLink {
    source: number | string | SimNode;
    target: number | string | SimNode;
    [key: string]: unknown;
  }

  export interface Simulation<N extends SimNode = SimNode> {
    nodes(): N[];
    nodes(nodes: N[]): this;
    numDimensions(): number;
    numDimensions(n: number): this;
    force(name: string): unknown;
    force(name: string, force: unknown | null): this;
    alpha(): number;
    alpha(a: number): this;
    alphaTarget(a: number): this;
    alphaDecay(a: number): this;
    alphaMin(a: number): this;
    velocityDecay(v: number): this;
    tick(iterations?: number): this;
    stop(): this;
    restart(): this;
    on(typenames: string, listener: (() => void) | null): this;
  }

  export interface LinkForce<N extends SimNode = SimNode, L extends SimLink = SimLink> {
    (alpha: number): void;
    links(): L[];
    links(links: L[]): this;
    id(fn: (node: N, i: number, nodes: N[]) => string | number): this;
    distance(d: number | ((link: L) => number)): this;
    strength(s: number | ((link: L) => number)): this;
  }

  export interface ManyBodyForce {
    (alpha: number): void;
    strength(s: number | ((node: SimNode) => number)): this;
    distanceMax(d: number): this;
    theta(t: number): this;
  }

  export interface CollideForce {
    (alpha: number): void;
    radius(r: number | ((node: SimNode) => number)): this;
    strength(s: number): this;
    iterations(n: number): this;
  }

  export interface CenteringForce {
    (alpha: number): void;
    strength(s: number): this;
  }

  export function forceSimulation<N extends SimNode = SimNode>(
    nodes?: N[],
    numDimensions?: number,
  ): Simulation<N>;
  export function forceLink<N extends SimNode = SimNode, L extends SimLink = SimLink>(
    links?: L[],
  ): LinkForce<N, L>;
  export function forceManyBody(): ManyBodyForce;
  export function forceCollide(radius?: number | ((node: SimNode) => number)): CollideForce;
  export function forceCenter(x?: number, y?: number, z?: number): CenteringForce;
  export function forceX(x?: number): CenteringForce;
  export function forceY(y?: number): CenteringForce;
  export function forceZ(z?: number): CenteringForce;
}
