// Point-neuron shaders as TS string constants (no Vite `?raw` coupling, so this
// builds under tsup and is importable anywhere). Each GL point is ray-cast into a
// shaded sphere — the design-law "single neuron = sphere". The cluster→grid
// expansion is applied on the THREE.Points transform (not hidden in a shader
// offset), so CPU raycasting/culling and the visible neuron positions agree.

export const NEURON_VERT = /* glsl */ `
attribute float neuronIndex;
attribute vec2 neuronActivity;

uniform float uExpansion;
uniform float uSelectedNeuronIndex;
uniform float uRevealCount;   // total neuron count — normalizes the reveal ramp

varying float vMembranePotential;
varying float vSpikeIntensity;
varying float vIsSelected;

void main() {
  // Caller-supplied normalized activity snapshot. Missing attributes are filled
  // with zeros by ExpandableNeurons — never synthesize scientific activity just
  // to make a measured figure look lively.
  vMembranePotential = clamp(neuronActivity.x, 0.0, 1.0);
  vSpikeIntensity = clamp(neuronActivity.y, 0.0, 1.0);

  vIsSelected = abs(neuronIndex - uSelectedNeuronIndex) < 0.1 ? 1.0 : 0.0;

  // Progressive reveal: a small core shows first, outer rows fade in with
  // uExpansion. The ramp is normalized by the ACTUAL neuron count (uRevealCount),
  // so the last row always reaches full visibility at uExpansion=1 — a fixed
  // divisor would silently clip every neuron past a hard-coded index.
  if (neuronIndex > 50.0) {
    float span = max(1.0, uRevealCount - 50.0);
    float rowThreshold = (neuronIndex - 50.0) / span;
    float visibility = smoothstep(rowThreshold - 0.06, rowThreshold + 0.06, uExpansion);
    if (visibility <= 0.01) {
      gl_PointSize = 0.0;
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      return;
    }
  }

  // Cluster tightly at the hub centre when collapsed; spread to the full grid as
  // uExpansion goes to 1. The position attribute is the centered local grid offset.
  float size = mix(1.0, 1.8, uExpansion);
  if (vIsSelected > 0.5) size = 6.5;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const NEURON_FRAG = /* glsl */ `
varying float vMembranePotential;
varying float vSpikeIntensity;
varying float vIsSelected;

uniform vec3 uBaseColor;
uniform vec3 uSpikeColor;
uniform float uOpacity;   // cluster→grid fade-in (custom ShaderMaterial: not auto-applied)

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  // Reconstruct the sphere normal across the point sprite.
  vec3 normal = vec3(center * 2.0, 0.0);
  normal.z = sqrt(max(0.0, 1.0 - dot(normal.xy, normal.xy)));
  normal = normalize(normal);

  vec3 lightDir = normalize(vec3(0.4, 0.6, 0.9));
  float diffuse = max(0.30, dot(normal, lightDir));
  vec3 baseColor = uBaseColor * diffuse * (0.72 + 0.28 * vMembranePotential);

  float fresnel = pow(1.0 - normal.z, 2.5);
  vec3 rim = uBaseColor * fresnel * (0.9 + 0.6 * vMembranePotential);

  float coreGlow = 1.0 - smoothstep(0.0, 0.5, dist);
  vec3 emissive = uBaseColor * coreGlow * (0.35 + 0.55 * vMembranePotential);

  vec3 color = baseColor + rim + emissive;

  // Spike flash — coloured bloom, capped ~1.15 luminance to stay under the
  // bloom bleach budget (design law).
  if (vSpikeIntensity > 0.001) {
    vec3 flash = mix(uSpikeColor, vec3(1.0), 0.35) * (1.10 + 0.05 * vSpikeIntensity);
    color = mix(color, flash, clamp(vSpikeIntensity * 1.1, 0.0, 1.0));
  }

  vec3 viewDir = vec3(0.0, 0.0, 1.0);
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(0.0, dot(normal, halfDir)), 22.0);
  color += vec3(0.35) * spec * (1.0 - 0.4 * vSpikeIntensity);

  float alpha = 1.0 - smoothstep(0.46, 0.5, dist);

  // Selected neuron — gold halo ring.
  if (vIsSelected > 0.5) {
    if (dist > 0.40) {
      float ring = smoothstep(0.40, 0.43, dist);
      color = mix(color, vec3(1.15, 1.0, 0.36), ring);
      alpha = 1.0;
    }
    color += vec3(0.25, 0.22, 0.05);
  }

  // A raw ShaderMaterial does NOT auto-multiply by material.opacity, so the
  // cluster→grid fade must be applied explicitly here from the uOpacity uniform.
  float outputCeiling = (vSpikeIntensity > 0.001 || vIsSelected > 0.5) ? 1.15 : 1.0;
  gl_FragColor = vec4(clamp(color, vec3(0.0), vec3(outputCeiling)), alpha * uOpacity);
}
`;
