/**
 * Trusted RenderPlan -> AuthorityObservedOutput extraction.
 *
 * This is intentionally renderer-side: callers cannot provide a translated observed
 * tree. Every atomic primitive in the actual plan must carry one explicit role. Missing
 * roles fail closed, including an otherwise plausible extra point/rect appended after
 * all expected tagged carriers. Axes, text, disclosures and explicitly decorative atoms
 * are excluded; connector vertices remain visible to this audit but cannot satisfy a
 * scientific-carrier obligation.
 */

import type {
  AuthorityObservedGeometryNodeV1,
  AuthorityObservedOutputV1,
} from '../core/output-authority.js';
import type {
  AreaMark,
  ArrowMark,
  LineMark,
  Mark,
  OutputAuthorityAtomicRoleV1,
  PathMark,
  PointMark,
  RectMark,
  RenderPlanV1,
  RuleMark,
} from './model/renderPlan.js';

export interface AuthorityExtractionProblemV1 {
  readonly path: string;
  readonly message: string;
}

export interface AuthorityExtractionSuccessV1 {
  readonly tag: 'extracted';
  readonly observed: AuthorityObservedOutputV1;
}

export interface AuthorityExtractionFailureV1 {
  readonly tag: 'invalid_plan_roles';
  readonly problems: readonly AuthorityExtractionProblemV1[];
}

export type AuthorityExtractionResultV1 =
  | AuthorityExtractionSuccessV1
  | AuthorityExtractionFailureV1;

const MAX_AUTHORITY_MARK_DEPTH = 128;
const MAX_AUTHORITY_ATOMS = 1_000_000;
const MAX_AUTHORITY_PROBLEMS = 32;

interface RenderRunOwnershipContext {
  readonly subpathByIdentity: Map<string, string>;
}

function recordProblem(
  problems: AuthorityExtractionProblemV1[],
  problem: AuthorityExtractionProblemV1,
): void {
  if (problems.length < MAX_AUTHORITY_PROBLEMS) problems.push(problem);
}

function classifiedAtom(
  role: OutputAuthorityAtomicRoleV1 | undefined,
  geometry: Record<string, unknown>,
  path: string,
  problems: AuthorityExtractionProblemV1[],
): AuthorityObservedGeometryNodeV1 | null {
  if (role === undefined) {
    recordProblem(problems, {
      path,
      message: 'atomic plan geometry has no explicit data_carrier/connector/decorative_mark role',
    });
    return null;
  }
  switch (role.tag) {
    case 'data_carrier':
      return {
        tag: 'data_mark',
        entry: {
          tag: 'canonical_geometry',
          classId: role.classId,
          provenance: role.provenance,
          geometry: geometry as never,
        },
      };
    case 'connector':
      // Connector vertices are explicit, but carrier-only V1 does not assure their shape.
      return { tag: 'decorative_mark' };
    case 'decorative_mark':
      return { tag: 'decorative_mark' };
    default:
      recordProblem(problems, { path, message: 'atomic plan geometry has an unknown explicit role tag' });
      return null;
  }
}

function preflightPlanMarks(plan: RenderPlanV1): AuthorityExtractionProblemV1[] {
  const problems: AuthorityExtractionProblemV1[] = [];
  const pending: { readonly mark: Mark; readonly path: string; readonly depth: number }[] = [];
  for (let panelIndex = plan.panels.length - 1; panelIndex >= 0; panelIndex--) {
    const marks = plan.panels[panelIndex].marks;
    for (let markIndex = marks.length - 1; markIndex >= 0; markIndex--) {
      pending.push({ mark: marks[markIndex], path: `/panels/${panelIndex}/marks/${markIndex}`, depth: 1 });
    }
  }
  const seen = new WeakSet<object>();
  let atoms = 0;
  while (pending.length > 0) {
    const { mark, path, depth } = pending.pop()!;
    if (mark === null || typeof mark !== 'object' || seen.has(mark)) {
      recordProblem(problems, { path, message: 'mark graph repeats/cycles or contains a non-object mark' });
      continue;
    }
    seen.add(mark);
    if (depth > MAX_AUTHORITY_MARK_DEPTH) {
      recordProblem(problems, { path, message: `mark nesting exceeds ${MAX_AUTHORITY_MARK_DEPTH}` });
      continue;
    }
    switch (mark.type) {
      case 'group':
        for (let index = mark.marks.length - 1; index >= 0; index--) {
          pending.push({ mark: mark.marks[index], path: `${path}/marks/${index}`, depth: depth + 1 });
        }
        break;
      case 'line':
      case 'area':
      case 'path':
        for (const subpath of mark.subpaths) atoms += subpath.length;
        break;
      case 'arrow': atoms += mark.arrows.length; break;
      case 'point': atoms += mark.points.length; break;
      case 'rect': atoms += mark.rects.length; break;
      case 'rule': atoms += mark.lines.length; break;
      case 'text': break;
      default:
        recordProblem(problems, { path, message: 'mark has an unknown or missing closed-union type' });
    }
    if (atoms > MAX_AUTHORITY_ATOMS) {
      recordProblem(problems, { path, message: `authority extraction exceeds ${MAX_AUTHORITY_ATOMS} atomic primitives` });
      break;
    }
  }
  return problems;
}

function validateRenderRunSubpath(
  roles: readonly (OutputAuthorityAtomicRoleV1 | undefined)[],
  subpath: string,
  problems: AuthorityExtractionProblemV1[],
  ownership: RenderRunOwnershipContext,
): void {
  const identities = new Set<string>();
  let untaggedDataCarrierCount = 0;
  for (const role of roles) {
    if (role?.tag !== 'data_carrier') continue;
    const provenance = role.provenance;
    if (
      provenance === null ||
      typeof provenance !== 'object' ||
      Array.isArray(provenance)
    ) {
      untaggedDataCarrierCount++;
      continue;
    }
    const renderRunOrdinal = provenance.renderRunOrdinal;
    if (renderRunOrdinal === undefined) {
      untaggedDataCarrierCount++;
      continue;
    }
    if (
      typeof provenance.seriesId !== 'string' ||
      !Number.isSafeInteger(renderRunOrdinal) ||
      (renderRunOrdinal as number) < 0
    ) {
      recordProblem(problems, {
        path: subpath,
        message: 'render-run provenance requires a string seriesId and non-negative safe-integer renderRunOrdinal',
      });
      continue;
    }
    identities.add(JSON.stringify([
      role.classId,
      provenance.seriesId,
      renderRunOrdinal,
    ]));
  }
  if (identities.size === 0) return;
  if (untaggedDataCarrierCount > 0) {
    recordProblem(problems, {
      path: subpath,
      message: 'one tagged RenderPlan line/path subpath mixes declared render-run carriers with data carriers lacking renderRunOrdinal',
    });
  }
  if (identities.size !== 1) {
    recordProblem(problems, {
      path: subpath,
      message: 'one RenderPlan line/path subpath contains carriers from multiple declared render runs',
    });
    return;
  }
  const identity = [...identities][0];
  const prior = ownership.subpathByIdentity.get(identity);
  if (prior !== undefined && prior !== subpath) {
    recordProblem(problems, {
      path: subpath,
      message: `one declared render run is split across multiple RenderPlan line/path subpaths (first at ${prior})`,
    });
    return;
  }
  ownership.subpathByIdentity.set(identity, subpath);
}

function lineNodes(
  mark: LineMark,
  path: string,
  problems: AuthorityExtractionProblemV1[],
  runOwnership: RenderRunOwnershipContext,
): AuthorityObservedGeometryNodeV1[] {
  const output: AuthorityObservedGeometryNodeV1[] = [];
  for (let subpathIndex = 0; subpathIndex < mark.subpaths.length; subpathIndex++) {
    const subpath = mark.subpaths[subpathIndex];
    validateRenderRunSubpath(
      subpath.map((point) => point.authority),
      `${path}/subpaths/${subpathIndex}`,
      problems,
      runOwnership,
    );
    for (let pointIndex = 0; pointIndex < subpath.length; pointIndex++) {
      const point = subpath[pointIndex];
      const node = classifiedAtom(point.authority, {
        tag: 'line_vertex',
        x: point.x,
        y: point.y,
        stroke: mark.stroke,
        strokeWidth: mark.strokeWidth,
        ...(mark.dash === undefined ? {} : { dash: mark.dash }),
      }, `${path}/subpaths/${subpathIndex}/${pointIndex}`, problems);
      if (node) output.push(node);
    }
  }
  return output;
}

function arrowNodes(
  mark: ArrowMark,
  path: string,
  problems: AuthorityExtractionProblemV1[],
): AuthorityObservedGeometryNodeV1[] {
  return mark.arrows.flatMap((arrow, index) => {
    const node = classifiedAtom(arrow.authority, {
      tag: 'arrow',
      from: arrow.from,
      to: arrow.to,
      fill: mark.fill,
      size: mark.size,
    }, `${path}/arrows/${index}`, problems);
    return node ? [node] : [];
  });
}

function pointNodes(
  mark: PointMark,
  path: string,
  problems: AuthorityExtractionProblemV1[],
): AuthorityObservedGeometryNodeV1[] {
  return mark.points.flatMap((point, index) => {
    const node = classifiedAtom(point.authority, {
      tag: 'point',
      x: point.x,
      y: point.y,
      fill: mark.fill,
      radius: mark.radius,
      shape: mark.shape,
    }, `${path}/points/${index}`, problems);
    return node ? [node] : [];
  });
}

function rectNodes(
  mark: RectMark,
  path: string,
  problems: AuthorityExtractionProblemV1[],
): AuthorityObservedGeometryNodeV1[] {
  return mark.rects.flatMap((rect, index) => {
    const node = classifiedAtom(rect.authority, {
      tag: 'rect',
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fill: rect.fill,
      ...(mark.stroke === undefined ? {} : { stroke: mark.stroke }),
    }, `${path}/rects/${index}`, problems);
    return node ? [node] : [];
  });
}

function ruleNodes(
  mark: RuleMark,
  path: string,
  problems: AuthorityExtractionProblemV1[],
): AuthorityObservedGeometryNodeV1[] {
  return mark.lines.flatMap((line, index) => {
    const node = classifiedAtom(line.authority, {
      tag: 'rule',
      orientation: mark.orientation,
      position: line.position,
      from: line.from,
      to: line.to,
      stroke: mark.stroke,
      strokeWidth: mark.strokeWidth,
      ...(mark.dash === undefined ? {} : { dash: mark.dash }),
    }, `${path}/lines/${index}`, problems);
    return node ? [node] : [];
  });
}

function areaNodes(
  mark: AreaMark,
  path: string,
  problems: AuthorityExtractionProblemV1[],
): AuthorityObservedGeometryNodeV1[] {
  const output: AuthorityObservedGeometryNodeV1[] = [];
  for (let subpathIndex = 0; subpathIndex < mark.subpaths.length; subpathIndex++) {
    const subpath = mark.subpaths[subpathIndex];
    for (let pointIndex = 0; pointIndex < subpath.length; pointIndex++) {
      const point = subpath[pointIndex];
      const node = classifiedAtom(point.authority, {
        tag: 'area_vertex',
        x: point.x,
        y0: point.y0,
        y1: point.y1,
        fill: mark.fill,
        opacity: mark.opacity,
        ...(mark.stroke === undefined ? {} : { stroke: mark.stroke }),
        ...(mark.strokeWidth === undefined ? {} : { strokeWidth: mark.strokeWidth }),
      }, `${path}/subpaths/${subpathIndex}/${pointIndex}`, problems);
      if (node) output.push(node);
    }
  }
  return output;
}

function pathNodes(
  mark: PathMark,
  path: string,
  problems: AuthorityExtractionProblemV1[],
  runOwnership: RenderRunOwnershipContext,
): AuthorityObservedGeometryNodeV1[] {
  const output: AuthorityObservedGeometryNodeV1[] = [];
  for (let subpathIndex = 0; subpathIndex < mark.subpaths.length; subpathIndex++) {
    const subpath = mark.subpaths[subpathIndex];
    validateRenderRunSubpath(
      subpath.map((point) => point.authority),
      `${path}/subpaths/${subpathIndex}`,
      problems,
      runOwnership,
    );
    for (let pointIndex = 0; pointIndex < subpath.length; pointIndex++) {
      const point = subpath[pointIndex];
      const node = classifiedAtom(point.authority, {
        tag: 'path_vertex',
        x: point.x,
        y: point.y,
        stroke: mark.stroke,
        strokeWidth: mark.strokeWidth,
      }, `${path}/subpaths/${subpathIndex}/${pointIndex}`, problems);
      if (node) output.push(node);
    }
  }
  return output;
}

function markNode(
  mark: Mark,
  path: string,
  problems: AuthorityExtractionProblemV1[],
  runOwnership: RenderRunOwnershipContext,
): AuthorityObservedGeometryNodeV1 {
  switch (mark.type) {
    case 'group':
      return {
        tag: 'group',
        children: mark.marks.map((child, index) =>
          markNode(child, `${path}/marks/${index}`, problems, runOwnership)),
      };
    case 'text':
      return { tag: 'text' };
    case 'line':
      return { tag: 'group', children: lineNodes(mark, path, problems, runOwnership) };
    case 'arrow':
      return { tag: 'group', children: arrowNodes(mark, path, problems) };
    case 'point':
      return { tag: 'group', children: pointNodes(mark, path, problems) };
    case 'rect':
      return { tag: 'group', children: rectNodes(mark, path, problems) };
    case 'rule':
      return { tag: 'group', children: ruleNodes(mark, path, problems) };
    case 'area':
      return { tag: 'group', children: areaNodes(mark, path, problems) };
    case 'path':
      return { tag: 'group', children: pathNodes(mark, path, problems, runOwnership) };
  }
}

export function extractObservedOutputAuthorityV1(plan: RenderPlanV1): AuthorityExtractionResultV1 {
  const problems = preflightPlanMarks(plan);
  if (problems.length > 0) return { tag: 'invalid_plan_roles', problems };
  const runOwnership: RenderRunOwnershipContext = {
    subpathByIdentity: new Map(),
  };
  const geometry: AuthorityObservedGeometryNodeV1[] = plan.panels.map((panel, panelIndex) => ({
    tag: 'group',
    children: [
      ...panel.axes.map((): AuthorityObservedGeometryNodeV1 => ({ tag: 'axis' })),
      ...panel.marks.map((mark, markIndex) =>
        markNode(
          mark,
          `/panels/${panelIndex}/marks/${markIndex}`,
          problems,
          runOwnership,
        )),
    ],
  }));
  for (const _disclosure of plan.disclosures) geometry.push({ tag: 'disclosure' });

  return problems.length > 0
    ? { tag: 'invalid_plan_roles', problems }
    : {
      tag: 'extracted',
      observed: {
        table: plan.table,
        geometry,
        summary: plan.accessibility.summary,
        disclosures: plan.disclosures,
      },
    };
}
