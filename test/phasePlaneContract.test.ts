import { describe, expect, it } from 'vitest';
import { getExamplePayload } from '../core/skills/examples';
import { PhasePlaneParamsSchema } from '../core/skills/params';
import { validateSkillInvocation } from '../core/skills/validateSkillInvocation';
import {
  numericDomain,
  phasePlaneArrowPath,
  phasePlaneSamples,
  type ChartFrame,
} from '../react/charts/chartGeometry';

const frame: ChartFrame = {
  width: 960,
  height: 540,
  left: 68,
  right: 28,
  top: 36,
  bottom: 62,
};

function example() {
  return getExamplePayload('nest.phase_plane')!;
}

describe('legacy phase-plane direction basis', () => {
  it('fails closed without throwing when the phase-plane records are empty', () => {
    const malformed = {
      grid: {},
      derivatives: {},
      axis_units: {},
      derivative_units: {},
      derivative_time_unit: 'ms',
      axis_order: ['v', 'w'],
      flattening: 'row-major-last-axis-fastest',
    };
    expect(() => PhasePlaneParamsSchema.safeParse(malformed)).not.toThrow();
    expect(PhasePlaneParamsSchema.safeParse(malformed).success).toBe(false);

    const spec = example();
    spec.params = malformed;
    expect(() => validateSkillInvocation('nest.phase_plane', spec)).not.toThrow();
    expect(validateSkillInvocation('nest.phase_plane', spec).ok).toBe(false);
  });

  it.each([
    ['a duplicate coordinate', [-70, -70]],
    ['a singleton axis', [-70]],
    ['a descending axis', [-50, -70]],
  ])('rejects %s before rendering', (_label, coordinates) => {
    const spec = example();
    (spec.params.grid as Record<string, unknown>).v = coordinates;
    const result = validateSkillInvocation('nest.phase_plane', spec);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          code: 'invalid_params',
          path: expect.stringMatching(/^params\.grid\.v/u),
        }),
      );
    }
  });

  it('rejects derivative labels whose numerator or shared denominator is unbound', () => {
    const mixedDenominator = example();
    mixedDenominator.params.derivative_time_unit = 'ms';
    (mixedDenominator.params.derivative_units as Record<string, unknown>).w = '1/s';
    expect(
      validateSkillInvocation('nest.phase_plane', mixedDenominator).ok,
    ).toBe(false);

    const wrongNumerator = example();
    (wrongNumerator.params.derivative_units as Record<string, unknown>).v = 'V/ms';
    expect(
      validateSkillInvocation('nest.phase_plane', wrongNumerator).ok,
    ).toBe(false);

    const unsupportedBasis = example();
    unsupportedBasis.params.derivative_time_unit = 'minute';
    expect(
      validateSkillInvocation('nest.phase_plane', unsupportedBasis).ok,
    ).toBe(false);

    const missingBasis = example();
    delete missingBasis.params.derivative_time_unit;
    expect(
      validateSkillInvocation('nest.phase_plane', missingBasis).ok,
    ).toBe(false);
  });

  it('gives the exactly representable ms/s fixture byte-identical arrow geometry', () => {
    const perMs = PhasePlaneParamsSchema.parse(example().params);
    const perSecondInput = structuredClone(perMs);
    perSecondInput.derivative_time_unit = 's';
    perSecondInput.derivative_units = {
      v: 'mV/s',
      w: '1/s',
    };
    perSecondInput.derivatives = Object.fromEntries(
      Object.entries(perSecondInput.derivatives).map(([axis, values]) => [
        axis,
        values.map((value) => value * 1000),
      ]),
    );
    const perSecond = PhasePlaneParamsSchema.parse(perSecondInput);

    const perMsSamples = phasePlaneSamples(
      perMs.axis_order,
      perMs.grid,
      perMs.derivatives,
      perMs.derivative_time_unit,
    );
    const perSecondSamples = phasePlaneSamples(
      perSecond.axis_order,
      perSecond.grid,
      perSecond.derivatives,
      perSecond.derivative_time_unit,
    );
    expect(perSecondSamples).toEqual(perMsSamples);

    const xDomain = numericDomain(perMs.grid[perMs.axis_order[0]]);
    const yDomain = numericDomain(perMs.grid[perMs.axis_order[1]]);
    expect(
      phasePlaneArrowPath(perSecondSamples, xDomain, yDomain, frame),
    ).toBe(phasePlaneArrowPath(perMsSamples, xDomain, yDomain, frame));
  });

  it('rejects a nonzero per-second component that would underflow to zero per ms', () => {
    const underflow = example();
    underflow.params.derivative_time_unit = 's';
    underflow.params.derivative_units = {
      v: 'mV/s',
      w: '1/s',
    };
    (underflow.params.derivatives as Record<string, number[]>).v[0] =
      Number.MIN_VALUE;
    expect(PhasePlaneParamsSchema.safeParse(underflow.params).success).toBe(false);
    expect(validateSkillInvocation('nest.phase_plane', underflow).ok).toBe(false);
  });

  it('uses the declared one-division binary64 conversion rather than multiply by 0.001', () => {
    const component = -8.569733771433736e36;
    const samples = phasePlaneSamples(
      ['v', 'w'],
      { v: [0, 1], w: [0, 1] },
      {
        v: [component, 0, 0, 0],
        w: [0, 0, 0, 0],
      },
      's',
    );
    expect(Object.is(samples[0].dx, component / 1000)).toBe(true);
    expect(Object.is(samples[0].dx, component * (1 / 1000))).toBe(false);
  });
});
