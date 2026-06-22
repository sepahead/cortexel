type NeuralSceneMode = 'hero' | 'background' | 'standalone';
declare const SCENE_NAMES: readonly ["live-activity", "cortical-column", "stdp", "spike-raster", "network-topology", "voltage-trace", "phase-plane", "brunel-network", "fi-curve", "isi-distribution", "psth", "weight-histogram"];
type SceneName = (typeof SCENE_NAMES)[number];
interface NeuralSceneHandle {
    nextScene: () => void;
    setScene: (scene: SceneName) => void;
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setCameraPreset: (preset: CameraPresetName) => void;
}
interface NeuralSceneProps {
    mode: NeuralSceneMode;
    scene?: SceneName | 'auto';
    opacity?: number;
    cycleInterval?: number;
    themeMode?: 'dark' | 'light';
    /**
     * When false, the WebGL frameloop is suspended (`frameloop="never"`) so a
     * scene hidden behind another tab stops burning GPU/bloom every frame. The
     * last frame stays painted; flipping back to true resumes rendering. Defaults
     * to true so existing call sites are unchanged.
     */
    active?: boolean;
}
interface LayerConfig {
    layer: string;
    y: number;
    count: number;
    color: string;
    label: string;
}
interface STDPSynapse {
    preIdx: number;
    postIdx: number;
    weight: number;
    targetWeight: number;
    lastPreSpike: number;
    lastPostSpike: number;
}
type CameraPresetName = 'default' | 'top' | 'side' | 'close' | 'cinematic';
interface CameraPreset {
    name: CameraPresetName;
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
}
interface PlaybackState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    speed: number;
}
interface SceneData {
    spikeTimes?: Float32Array;
    spikeSenders?: Float32Array;
    voltageTraces?: Float32Array;
    traceTimes?: Float32Array;
    weightSeries?: Float32Array;
    networkNodes?: {
        id: number;
        x: number;
        y: number;
        z: number;
        label: string;
    }[];
    networkEdges?: {
        source: number;
        target: number;
        weight: number;
    }[];
    vectorField?: {
        x: number;
        y: number;
        z: number;
        dx: number;
        dy: number;
        dz: number;
    }[];
}
interface SceneFraming {
    position: [number, number, number];
    target: [number, number, number];
    rotatable: boolean;
}
declare const SCENE_FRAMING: Record<SceneName, SceneFraming>;
declare const CAMERA_PRESETS: Record<CameraPresetName, CameraPreset>;

export { CAMERA_PRESETS as C, type LayerConfig as L, type NeuralSceneHandle as N, type PlaybackState as P, SCENE_FRAMING as S, type CameraPreset as a, type CameraPresetName as b, type NeuralSceneMode as c, type NeuralSceneProps as d, SCENE_NAMES as e, type STDPSynapse as f, type SceneData as g, type SceneFraming as h, type SceneName as i };
