/**
 * Byte and authority locks for the package-private FigureBundle SVG foundation.
 *
 * The bundle contract does not exist yet. These tests establish the narrower serializer
 * milestone only: the historical standalone writer is byte-identical, while an internal
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

/** Reviewed after the deterministic stable-figure layout revision. */
const STANDALONE_AUTHORING_SVG_BASELINES = Object.freeze({
  'network.adjacency_matrix': {
    bytes: 9742,
    digest: 'sha256:ddb9b5cae16d2ae55d0b6f395740129bf6538cd6b0c69ae66d19854c9270dd14',
  },
  'network.connection_graph': {
    bytes: 10110,
    digest: 'sha256:cece0f9b3d60cd2ecb0eeab661ace1291b1165e3438f7add7729bb35ab2163e2',
  },
  'network.degree_distribution': {
    bytes: 7917,
    digest: 'sha256:810c7c62c3f6a8201905bae9c307a8b6a1a75d458234e997aa4c2cbf8997ca81',
  },
  'network.delay_distribution': {
    bytes: 8281,
    digest: 'sha256:64e8ef64fb32ee8f62ff4f4eef3b798895e8b8e0c988f6baf7aaea9d4420da38',
  },
  'network.delay_matrix': {
    bytes: 9181,
    digest: 'sha256:b9639c5ea578ee85397f7ad3e60aa8504d7d74d1a5c94c287382de8bbb0e147e',
  },
  'network.spatial_map_2d': {
    bytes: 11702,
    digest: 'sha256:02372d78f0466d533e98c223d4ba39912be553b512a5db1490032923f1814f7e',
  },
  'network.synaptic_weight_trace': {
    bytes: 13493,
    digest: 'sha256:d91d2c051d38576647700634afc3f6ed98f31d3a75955f0bf8f4e48842fe344f',
  },
  'network.weight_distribution': {
    bytes: 8110,
    digest: 'sha256:dc4c40d2132c0b3b51e1585859920ac2a98d2befbae6685444830763994588d1',
  },
  'network.weight_matrix': {
    bytes: 11088,
    digest: 'sha256:72b62e83e57f6b8142074f0d7fe64e3173a657f00cf07ea77f69be8dbe6af55f',
  },
  'neuro.analog_trace': {
    bytes: 10592,
    digest: 'sha256:f33a33649a46827acaaef0756d413059995049c2a9301fabfc3d501362c8ea70',
  },
  'neuro.compartment_trace': {
    bytes: 11879,
    digest: 'sha256:a960510cf6d46b4da008f38fd4b5df496af847e0f5a6154f83e7cb11e36ac0b5',
  },
  'neuro.correlogram': {
    bytes: 11209,
    digest: 'sha256:7691a12a6ab22dd322b0aa917e15c249d073c9c80b96e282c46b59a227d0a2cc',
  },
  'neuro.isi_distribution': {
    bytes: 8150,
    digest: 'sha256:491e3451f77ceec7cfabe7d50dc6fa5877350a32162f51e1d8e19bd5bc8b5dfa',
  },
  'neuro.multisignal_trace': {
    bytes: 14344,
    digest: 'sha256:c6bb14fda41921b67558eb5c9101926ccfba0e61cf3db2fc4b43882bc8256375',
  },
  'neuro.phase_plane': {
    bytes: 12265,
    digest: 'sha256:7dc25890900ac4a7efb39a9b9c008738f16e4a8b1fe21ad36c3dafdd734ca19d',
  },
  'neuro.population_rate': {
    bytes: 8797,
    digest: 'sha256:12dcd069cb84b86f390d92d981adb5c512d03319d09f74c86804b46107e45c50',
  },
  'neuro.psth': {
    bytes: 12070,
    digest: 'sha256:4baa8eb6dd1e516dbedea4e9df119d7ae6776473a39f882776e6ff326a615b2c',
  },
  'neuro.response_curve': {
    bytes: 14184,
    digest: 'sha256:d810cd6fcd6b4318a6a98e87643211a53726b12fde8f08fc7da258e153b63d10',
  },
  'neuro.spike_raster': {
    bytes: 6935,
    digest: 'sha256:5ff0385d5b84365e6feea9066fb31bf7506b7b952f29f85d3faa90356b1ec616',
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
