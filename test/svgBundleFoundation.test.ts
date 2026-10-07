/**
 * Byte and authority locks for the package-private FigureBundle SVG foundation.
 *
 * The bundle contract does not exist yet. These tests establish the narrower serializer
 * milestone only: the current standalone writer has exact byte locks, while an internal
 * child-fragment path can namespace document-wide IDs and wrap that exact body in one
 * integer translation. No fragment builder is part of `cortexel/render-svg`.
 */

import { describe, expect, it } from 'vitest';

import {
  SKILL_AUTHORING,
  STABLE_SKILL_IDS,
  type StableSkillId,
} from '../src/authoring/index.js';
import { sha256Digest } from '../src/core/sha256.js';
import * as renderSurface from '../src/render/index.js';
import {
  renderTranslationOnlySvgFragmentForBundleInternal,
} from '../src/render/svg.js';

interface SvgBaseline {
  readonly bytes: number;
  readonly digest: string;
}

/** Current19-skill locks after complete header, legend, panel, and footer review. */
const STANDALONE_AUTHORING_SVG_BASELINES = Object.freeze({
  'network.adjacency_matrix': {
    bytes: 9905,
    digest: 'sha256:d987d8261d3737104b2d830329be677ca32bb9d0bc672a60091880b4bf4a1fad',
  },
  'network.connection_graph': {
    bytes: 10615,
    digest: 'sha256:a44ddbd69da174fb86d3c4591559ea55f976dc82f85a887ff27d815f9a79a200',
  },
  'network.degree_distribution': {
    bytes: 7967,
    digest: 'sha256:f14b7e7018c65577af04b9a8706b4a42b83b07e835642d5dc1a33b43e90f7112',
  },
  'network.delay_distribution': {
    bytes: 8446,
    digest: 'sha256:18c66a25a0be5733bfbe589ecbd49d66b39fe1beebbbadec77a66b7f6cf959ea',
  },
  'network.delay_matrix': {
    bytes: 9504,
    digest: 'sha256:eaf911a6a17fdc23671988f259d6367ed3b5dc1f9d13a6f9e17c1a8b2dc576aa',
  },
  'network.spatial_map_2d': {
    bytes: 11862,
    digest: 'sha256:2587cd2dbab87a9733ef5fa4e327405ff96ebab0dcfdcff3b192e2e6e87ebf01',
  },
  'network.synaptic_weight_trace': {
    bytes: 13667,
    digest: 'sha256:bf358caf879f2bcf01efa885796f0948837802b2845d4636271736d72380fa49',
  },
  'network.weight_distribution': {
    bytes: 8274,
    digest: 'sha256:dd661731c52ba85455c777e45551de61e610e8bed22418dad74e2e7c3e5227e4',
  },
  'network.weight_matrix': {
    bytes: 11246,
    digest: 'sha256:fd3404714a393e472a84c33bb927e99756b894bda78f880e32de0cb7905a5410',
  },
  'neuro.analog_trace': {
    bytes: 10741,
    digest: 'sha256:505114599cc80d66e2301cfa8ef1a86ddc8ff1fbf2f7fabb200a131f3d12ab18',
  },
  'neuro.compartment_trace': {
    bytes: 12043,
    digest: 'sha256:bc2c16457ed093f4500c4424c039ac35861be9b35a0832ed63f920ea647747bf',
  },
  'neuro.correlogram': {
    bytes: 11364,
    digest: 'sha256:0f35c2da06e281d849c61198489cd7e5556b3659a7a9dc3d86c7fc81f3a6b273',
  },
  'neuro.isi_distribution': {
    bytes: 8289,
    digest: 'sha256:b68e832864bfcb85c3dc791300f51eacf1582fb5387be58d2b30a1caa9b252c5',
  },
  'neuro.multisignal_trace': {
    bytes: 14508,
    digest: 'sha256:acf2a960a19c30ce7fa98f338081fb92981077d9e2b570dd105b65147f363934',
  },
  'neuro.phase_plane': {
    bytes: 12658,
    digest: 'sha256:dea79bf0d8d5104ff795fb722968a35d2422a9499eb4260a0e6d5edd8242e3c0',
  },
  'neuro.population_rate': {
    bytes: 8935,
    digest: 'sha256:34461970571632ce920a18ccd90b4a147cca694d2d54a94de2cd2e2dfdf17866',
  },
  'neuro.psth': {
    bytes: 12230,
    digest: 'sha256:ae1f29204e7cf4c7574fec2d1b7d48249ecd7197edb362ccd70e9198f1824f20',
  },
  'neuro.response_curve': {
    bytes: 14339,
    digest: 'sha256:8dfd084a0f916e487a3fa17040eb5f82bbaaaab90c1ef7fc5ca1f814d5b6af5a',
  },
  'neuro.spike_raster': {
    bytes: 7097,
    digest: 'sha256:669caa652c43037e6f52a83fc55b882b67bbce8364930aa5c7c0af49a0433922',
  },
} as const satisfies Readonly<Record<StableSkillId, SvgBaseline>>);

function buildAuthoringFigure(skillId: StableSkillId) {
  const result = renderSurface.buildFigure(
    structuredClone(SKILL_AUTHORING[skillId].authoringExample),
  );
  expect(result.ok, `${skillId} authoring example did not build`).toBe(true);
  if (!result.ok) throw new Error(`${skillId} authoring example did not build`);
  return result;
}

function rootParts(serialized: string): {
  readonly opening: string;
  readonly body: string;
  readonly closing: string;
} {
  const lines = serialized.split('\n');
  expect(lines.at(-1), 'serializer must retain its exact trailing newline').toBe('');
  expect(lines.length).toBeGreaterThanOrEqual(3);
  return {
    opening: lines[0],
    body: lines.slice(1, -2).join('\n'),
    closing: lines.at(-2)!,
  };
}

function attributeValues(serialized: string, attribute: string): string[] {
  // Attribute names such as `data-id` and `data-disclosure-id` must not be mistaken
  // for the exact XML `id` attribute merely because `-` creates a regexp word boundary.
  return [...serialized.matchAll(new RegExp(`(?:^|\\s)${attribute}="([^"]+)"`, 'gu'))]
    .map((match) => match[1]);
}

function namespaceAccessibilityDefinitionIds(
  body: string,
  fromPrefix: string,
  toPrefix: string,
): string {
  let namespaced = body;
  for (const suffix of ['title', 'desc', 'details']) {
    namespaced = namespaced.replaceAll(
      `id="${fromPrefix}-${suffix}"`,
      `id="${toPrefix}-${suffix}"`,
    );
  }
  return namespaced;
}

function removeAccessibilityDefinitionIds(body: string, prefix: string): string {
  let withoutDefinitions = body;
  for (const suffix of ['title', 'desc', 'details']) {
    withoutDefinitions = withoutDefinitions.replaceAll(
      `id="${prefix}-${suffix}"`,
      '',
    );
  }
  return withoutDefinitions;
}

describe('standalone SVG byte lock', () => {
  it('pins one exact public authoring example for every stable skill', () => {
    expect(STABLE_SKILL_IDS).toHaveLength(19);
    expect(Object.keys(STANDALONE_AUTHORING_SVG_BASELINES).sort()).toEqual(
      [...STABLE_SKILL_IDS].sort(),
    );

    for (const skillId of STABLE_SKILL_IDS) {
      const result = buildAuthoringFigure(skillId);
      const expected = STANDALONE_AUTHORING_SVG_BASELINES[skillId];
      expect(
        new TextEncoder().encode(result.svg).byteLength,
        `${skillId} standalone SVG byte length drifted`,
      ).toBe(expected.bytes);
      expect(sha256Digest(result.svg), `${skillId} standalone SVG bytes drifted`).toBe(
        expected.digest,
      );
      expect(
        (result.artifact.outputs as readonly { role: string; sha256: string }[])
          .find((output) => output.role === 'figure_svg')?.sha256,
        `${skillId} artifact lost the exact standalone SVG binding`,
      ).toBe(expected.digest);
    }
  });
});

describe('translation-only package-private fragment emission', () => {
  it('keeps the complete child body exact apart from its document-wide ID namespace', () => {
    const result = buildAuthoringFigure('neuro.spike_raster');
    const fragment = renderTranslationOnlySvgFragmentForBundleInternal(
      result.plan,
      { idNamespace: 'bundle-cell-0', x: 37, y: 41 },
      sha256Digest,
    );
    const standaloneParts = rootParts(result.svg);
    const fragmentParts = rootParts(fragment.fragment);
    const artifactRender = result.artifact.render as {
      readonly markCount: number;
      readonly textCount: number;
    };

    expect(standaloneParts.opening.startsWith('<svg ')).toBe(true);
    expect(standaloneParts.closing).toBe('</svg>');
    expect(fragmentParts.closing).toBe('</g>');
    expect(fragmentParts.opening).toBe(
      `<g data-cortexel-fragment="figure" data-cortexel-id-namespace="bundle-cell-0" transform="translate(37 41)" role="img" aria-labelledby="${fragment.idPrefix}-title" aria-describedby="${fragment.idPrefix}-desc">`,
    );

    // Namespace only the exact accessibility ID definitions. A broad lexical
    // replacement could hide an accidental mutation in metadata or caller-visible text.
    const expectedFragmentBody = namespaceAccessibilityDefinitionIds(
      standaloneParts.body,
      result.plan.figureId,
      fragment.idPrefix,
    );
    expect(expectedFragmentBody).not.toContain(`id="${result.plan.figureId}-`);
    expect(removeAccessibilityDefinitionIds(expectedFragmentBody, fragment.idPrefix))
      .not.toContain(fragment.idPrefix);
    expect(fragmentParts.body).toBe(expectedFragmentBody);
    expect(fragment.markCount).toBe(artifactRender.markCount);
    expect(fragment.textCount).toBe(artifactRender.textCount);
    expect(fragment.width).toBe(result.plan.width);
    expect(fragment.height).toBe(result.plan.height);
    expect(fragment.translation).toEqual({ x: 37, y: 41 });
    expect(fragment.digest).toBe(sha256Digest(fragment.fragment));

    // Inspect only the new wrapper: child marks may legitimately own rotation or fill
    // opacity, but the bundle wrapper owns no operation except integer translation.
    expect(fragmentParts.opening.match(/\btransform="([^"]+)"/u)?.[1]).toBe(
      'translate(37 41)',
    );
    for (const forbidden of [
      'viewBox',
      'width',
      'height',
      'clip-path',
      'mask',
      'opacity',
      'display',
      'visibility',
      'overflow',
      'aria-hidden',
    ]) {
      expect(fragmentParts.opening, `wrapper must not carry ${forbidden}`).not.toMatch(
        new RegExp(`\\b${forbidden}=`, 'u'),
      );
    }
  });

  it('preserves every stable child body except exact accessibility ID definitions', () => {
    for (const [index, skillId] of STABLE_SKILL_IDS.entries()) {
      const result = buildAuthoringFigure(skillId);
      const fragment = renderTranslationOnlySvgFragmentForBundleInternal(
        result.plan,
        { idNamespace: `bundle-cell-${index}`, x: index, y: index },
        sha256Digest,
      );
      const standaloneBody = rootParts(result.svg).body;
      const fragmentBody = rootParts(fragment.fragment).body;
      const expectedFragmentBody = namespaceAccessibilityDefinitionIds(
        standaloneBody,
        result.plan.figureId,
        fragment.idPrefix,
      );

      expect(
        expectedFragmentBody,
        `${skillId} retained an un-namespaced accessibility definition`,
      ).not.toContain(`id="${result.plan.figureId}-`);
      expect(
        fragmentBody,
        `${skillId} fragment changed bytes outside exact accessibility ID definitions`,
      ).toBe(expectedFragmentBody);
      expect(
        removeAccessibilityDefinitionIds(fragmentBody, fragment.idPrefix),
        `${skillId} fragment namespace escaped its exact ID definitions`,
      ).not.toContain(fragment.idPrefix);
    }
  });

  it('namespaces duplicate identical plans without dangling or duplicate ARIA targets', () => {
    // analog_trace carries the optional accessibility-details node, complementing the
    // no-details spike-raster branch exercised above.
    const result = buildAuthoringFigure('neuro.analog_trace');
    const first = renderTranslationOnlySvgFragmentForBundleInternal(
      result.plan,
      { idNamespace: 'bundle-cell-0', x: 0, y: 0 },
      sha256Digest,
    );
    const second = renderTranslationOnlySvgFragmentForBundleInternal(
      result.plan,
      { idNamespace: 'bundle-cell-1', x: result.plan.width, y: 0 },
      sha256Digest,
    );
    const combined = [first.fragment, second.fragment].join('');
    const firstIds = attributeValues(first.fragment, 'id');
    const secondIds = attributeValues(second.fragment, 'id');
    const allIds = [...firstIds, ...secondIds];

    expect(first.idPrefix).not.toBe(second.idPrefix);
    expect(firstIds.every((id) => id.startsWith(`${first.idPrefix}-`))).toBe(true);
    expect(secondIds.every((id) => id.startsWith(`${second.idPrefix}-`))).toBe(true);
    expect(new Set(allIds).size).toBe(allIds.length);

    const references = [
      ...attributeValues(combined, 'aria-labelledby'),
      ...attributeValues(combined, 'aria-describedby'),
    ].flatMap((value) => value.split(' '));
    for (const referencedId of references) {
      expect(
        allIds.filter((id) => id === referencedId),
        `accessibility reference ${referencedId} must resolve exactly once`,
      ).toHaveLength(1);
    }
  });

  it('refuses non-closed namespaces and non-integer or negative translations', () => {
    const result = buildAuthoringFigure('neuro.spike_raster');
    const render = (idNamespace: string, x: number, y: number) =>
      renderTranslationOnlySvgFragmentForBundleInternal(
        result.plan,
        { idNamespace, x, y },
        sha256Digest,
      );

    expect(() => render('contains space', 0, 0)).toThrow();
    expect(() => render('cell', -1, 0)).toThrow();
    expect(() => render('cell', -0, 0)).toThrow();
    expect(() => render('cell', 0.5, 0)).toThrow();
    expect(() => render('cell', 0, Number.POSITIVE_INFINITY)).toThrow();
    expect(() => render('cell', Number.MAX_SAFE_INTEGER, 0)).toThrow();
    expect(() => render('cell', 0, Number.MAX_SAFE_INTEGER)).toThrow();
  });

  it('refuses a copied RenderPlan lookalike before fragment emission', () => {
    const result = buildAuthoringFigure('neuro.spike_raster');
    const copiedPlan = structuredClone(result.plan);

    expect(() => renderTranslationOnlySvgFragmentForBundleInternal(
      copiedPlan,
      { idNamespace: 'bundle-cell-0', x: 0, y: 0 },
      sha256Digest,
    )).toThrow('exact closed RenderPlan capability');
  });

  it('does not expose fragment or raw-plan authority from cortexel/render-svg', () => {
    expect(Object.keys(renderSurface).sort()).toEqual([
      'buildFigure',
      'buildFigureFromJson',
      'buildFigureFromValidated',
    ]);
    expect('renderTranslationOnlySvgFragmentForBundleInternal' in renderSurface).toBe(false);
  });
});
