import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { ScrollTrigger } from '../core/gsap.js';

// modelUrl/hdrUrl point at public/model.glb and public/hdri.exr, served
// from this deployment's own base path (Vite copies public/ verbatim to
// dist/ — BASE_URL resolves correctly in both dev, "/", and the GitHub
// Pages build, "/hpo/"). Model loading still fails safe if these are ever
// wrong — canvas hides, HTML footer stays usable.
const DEFAULT_CONFIG = {
  modelUrl: `${import.meta.env.BASE_URL}model.glb`,
  hdrUrl: `${import.meta.env.BASE_URL}hdri.exr`,
  // Empty, not placeholder paths: the footer video's <source> already has a
  // real, working URL in the markup, and there's no fallback background
  // image at all — both defaulted to a dead "/assets/..." path that 404s on
  // every load until a real URL is supplied via config. Leaving these unset
  // means no background-image/no source-overwrite happens until then,
  // instead of requesting a file that doesn't exist.
  backgroundVideoUrl: '',
  backgroundUrl: '',
  glowUrl: '',
  cameraFov: 24,
  cameraZ: 6,
  modelScale: 0.93,
  modelFitHeight: 0.522,
  modelBaseY: 0.86,
  modelPositionX: 0.05,
  modelPositionY: 0.86,
  modelPositionZ: -0.47,
  modelRotationX: 74,
  modelRotationY: 100.5,
  modelRotationZ: -6,
  modelStartY: -1.35,
  modelEndY: 0,
  modelStartScale: 0.9,
  modelEndScale: 1,
  pointerMoveX: 0,
  pointerMoveAxis: 'x',
  pointerMoveAmount: 0.5,
  pointerRotateAxis: 'y',
  pointerRotateAmount: 60,
  pointerRotateX: 120,
  pointerRotateZ: 15,
  pointerRotateY: 0,
  pointerDamping: 5,
  appearanceEase: 'linear',
  appearanceSpinAxis: 'z',
  appearanceSpinZ: -40,
  toneMappingExposure: 1,
  environmentIntensity: 2.8,
  material: {
    roughness: 0.001,
    transmission: 1,
    thickness: 2.05,
    ior: 1.56,
    clearcoat: 1,
    clearcoatRoughness: 0.002,
    attenuationColor: '#ffffff',
    attenuationDistance: 1.2,
    iridescence: 0,
    dispersion: 0.22,
    specularIntensity: 2,
  },
  materialTune: {
    transparency: 0.26,
    saturation: 1.56,
    contrast: 1.41,
    brightness: 0.94,
    orangeBrightness: 0.05,
    greenBrightness: 0.38,
    colorCoverage: 0.4,
    innerHighlights: 0.6,
    shadowDepth: 0.99,
    shadowColorLift: 0.14,
    highlightProtection: 0.72,
    colorBoostEnabled: true,
    colorBoostStrength: 1,
    colorExposure: 0.38,
    colorSaturation: 1.65,
    colorContrast: 1.28,
    orangeIntensity: 1.9,
    greenIntensity: 1.7,
  },
  lighting: { keyIntensity: 3.2, fillIntensity: 0.38 },
  scroll: { start: 'top bottom', end: 'bottom bottom', scrub: true },
  debug: false,
};

const INIT_KEY = '__empirioXFooterSceneInstance';
const DEBUG_HASH_PREFIX = 'empiriox=';
const AXES = ['x', 'y', 'z'];
const EASES = ['linear', 'power1.out', 'power2.out', 'power3.out', 'sine.out', 'expo.out', 'back.out'];

function easeProgress(ease, rawProgress) {
  const progress = THREE.MathUtils.clamp(rawProgress, 0, 1);
  switch (ease) {
    case 'power1.out':
      return 1 - Math.pow(1 - progress, 2);
    case 'power2.out':
      return 1 - Math.pow(1 - progress, 3);
    case 'power3.out':
      return 1 - Math.pow(1 - progress, 4);
    case 'sine.out':
      return Math.sin((progress * Math.PI) / 2);
    case 'expo.out':
      return progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    case 'back.out':
      return 1 + 2.70158 * Math.pow(progress - 1, 3) + 1.70158 * Math.pow(progress - 1, 2);
    default:
      return progress;
  }
}

function mergeConfig(base, overrides = {}) {
  const merged = { ...base, ...overrides };
  for (const key of ['material', 'materialTune', 'lighting', 'scroll']) {
    merged[key] = { ...base[key], ...(overrides[key] || {}) };
  }
  return merged;
}

function parseDebugHash() {
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash.startsWith(DEBUG_HASH_PREFIX)) return null;
  try {
    return JSON.parse(decodeURIComponent(hash.slice(DEBUG_HASH_PREFIX.length)));
  } catch (error) {
    console.warn('[EmpirioX footer] Failed to parse debug settings from URL hash.', error);
    return null;
  }
}

function applyDebugSettings(config, debug) {
  if (!debug) return;

  if (debug.position) {
    config.modelPositionX = Number(debug.position.x ?? config.modelPositionX);
    config.modelPositionY = Number(debug.position.y ?? config.modelPositionY);
    config.modelPositionZ = Number(debug.position.z ?? config.modelPositionZ);
    config.modelBaseY = config.modelPositionY;
  }

  if (debug.rotation) {
    config.modelRotationX = Number(debug.rotation.x ?? config.modelRotationX);
    config.modelRotationY = Number(debug.rotation.y ?? config.modelRotationY);
    config.modelRotationZ = Number(debug.rotation.z ?? config.modelRotationZ);
  }

  if (debug.animation) {
    config.pointerMoveAxis = AXES.includes(debug.animation.moveAxis) ? debug.animation.moveAxis : config.pointerMoveAxis;
    config.pointerMoveAmount = Number(debug.animation.moveAmount ?? config.pointerMoveAmount);
    config.pointerRotateAxis = AXES.includes(debug.animation.rotateAxis) ? debug.animation.rotateAxis : config.pointerRotateAxis;
    config.pointerRotateAmount = Number(debug.animation.rotateAmount ?? config.pointerRotateAmount);
  }

  if (debug.appearance) {
    config.appearanceEase = EASES.includes(debug.appearance.ease) ? debug.appearance.ease : config.appearanceEase;
    config.appearanceSpinAxis = AXES.includes(debug.appearance.spinAxis) ? debug.appearance.spinAxis : config.appearanceSpinAxis;
    config.appearanceSpinZ = Number(debug.appearance.spin ?? debug.appearance.spinZ ?? config.appearanceSpinZ);
  }

  if (Number.isFinite(Number(debug.scale))) config.modelScale = Number(debug.scale);

  if (debug.material) {
    for (const key of Object.keys(config.materialTune)) {
      if (key === 'colorBoostEnabled' && debug.material[key] !== undefined) {
        config.materialTune[key] = Boolean(debug.material[key]);
        continue;
      }
      if (Number.isFinite(Number(debug.material[key]))) config.materialTune[key] = Number(debug.material[key]);
    }
  }
}

function getDebugSettings(config) {
  return {
    position: {
      x: Number(config.modelPositionX.toFixed(4)),
      y: Number(config.modelPositionY.toFixed(4)),
      z: Number(config.modelPositionZ.toFixed(4)),
    },
    rotation: {
      x: Number(config.modelRotationX.toFixed(4)),
      y: Number(config.modelRotationY.toFixed(4)),
      z: Number(config.modelRotationZ.toFixed(4)),
    },
    animation: {
      moveAxis: config.pointerMoveAxis,
      moveAmount: Number(config.pointerMoveAmount.toFixed(4)),
      rotateAxis: config.pointerRotateAxis,
      rotateAmount: Number(config.pointerRotateAmount.toFixed(4)),
    },
    appearance: {
      ease: config.appearanceEase,
      spinAxis: config.appearanceSpinAxis,
      spin: Number(config.appearanceSpinZ.toFixed(4)),
    },
    material: {
      transparency: Number(config.materialTune.transparency.toFixed(4)),
      saturation: Number(config.materialTune.saturation.toFixed(4)),
      contrast: Number(config.materialTune.contrast.toFixed(4)),
      brightness: Number(config.materialTune.brightness.toFixed(4)),
      orangeBrightness: Number(config.materialTune.orangeBrightness.toFixed(4)),
      greenBrightness: Number(config.materialTune.greenBrightness.toFixed(4)),
      colorCoverage: Number(config.materialTune.colorCoverage.toFixed(4)),
      innerHighlights: Number(config.materialTune.innerHighlights.toFixed(4)),
      shadowDepth: Number(config.materialTune.shadowDepth.toFixed(4)),
      shadowColorLift: Number(config.materialTune.shadowColorLift.toFixed(4)),
      highlightProtection: Number(config.materialTune.highlightProtection.toFixed(4)),
      colorBoostEnabled: Boolean(config.materialTune.colorBoostEnabled),
      colorBoostStrength: Number(config.materialTune.colorBoostStrength.toFixed(4)),
      colorExposure: Number(config.materialTune.colorExposure.toFixed(4)),
      colorSaturation: Number(config.materialTune.colorSaturation.toFixed(4)),
      colorContrast: Number(config.materialTune.colorContrast.toFixed(4)),
      orangeIntensity: Number(config.materialTune.orangeIntensity.toFixed(4)),
      greenIntensity: Number(config.materialTune.greenIntensity.toFixed(4)),
    },
    scale: Number(config.modelScale.toFixed(4)),
  };
}

function writeDebugHash(config) {
  const hash = `${DEBUG_HASH_PREFIX}${encodeURIComponent(JSON.stringify(getDebugSettings(config)))}`;
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${hash}`);
}

async function copyDebugSettings(config) {
  const json = JSON.stringify(getDebugSettings(config), null, 2);
  try {
    await navigator.clipboard.writeText(json);
  } catch (error) {
    console.warn('[EmpirioX footer] Clipboard write failed; select the JSON manually.', error);
  }
}

// Debug-only tuning UI, manually enabled via config.debug or the #empiriox=
// URL hash — lazy-loaded from CDN since it's tooling, not production code.
async function setupDebugGui(config, onMaterialChange = () => {}) {
  const { GUI } = await import('https://esm.sh/lil-gui@0.20.0');
  const gui = new GUI({ title: 'EmpirioX footer tune' });
  const state = { settingsJson: '', copySettings: () => copyDebugSettings(config) };

  const output = document.createElement('textarea');
  output.readOnly = true;
  output.setAttribute('aria-label', 'EmpirioX debug settings JSON');
  output.style.cssText =
    'position:fixed;right:12px;bottom:12px;z-index:99999;width:320px;height:150px;padding:10px;border:1px solid rgba(0,0,0,.18);border-radius:8px;background:rgba(255,255,255,.94);color:#111;font:11px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace;box-shadow:0 12px 34px rgba(0,0,0,.18);resize:vertical';
  document.body.appendChild(output);

  const syncOutput = () => {
    config.modelBaseY = config.modelPositionY;
    state.settingsJson = JSON.stringify(getDebugSettings(config), null, 2);
    output.value = state.settingsJson;
    writeDebugHash(config);
  };

  const syncOutputAndMaterial = () => {
    syncOutput();
    onMaterialChange();
  };

  const positionFolder = gui.addFolder('default / center position');
  positionFolder.add(config, 'modelPositionX', -3, 3, 0.01).name('position x').onChange(syncOutput);
  positionFolder.add(config, 'modelPositionY', -3, 3, 0.01).name('position y').onChange(syncOutput);
  positionFolder.add(config, 'modelPositionZ', -3, 3, 0.01).name('position z').onChange(syncOutput);
  positionFolder.add(config, 'modelRotationX', -180, 180, 0.5).name('rotation x').onChange(syncOutput);
  positionFolder.add(config, 'modelRotationY', -180, 180, 0.5).name('rotation y').onChange(syncOutput);
  positionFolder.add(config, 'modelRotationZ', -180, 180, 0.5).name('rotation z').onChange(syncOutput);
  positionFolder.open();

  const animationFolder = gui.addFolder('animation params');
  animationFolder.add(config, 'pointerMoveAxis', AXES).name('move axis').onChange(syncOutput);
  animationFolder.add(config, 'pointerMoveAmount', -3, 3, 0.01).name('move amount').onChange(syncOutput);
  animationFolder.add(config, 'pointerRotateAxis', AXES).name('rotate axis').onChange(syncOutput);
  animationFolder.add(config, 'pointerRotateAmount', -180, 180, 0.5).name('rotate amount').onChange(syncOutput);
  animationFolder.open();

  const appearanceFolder = gui.addFolder('appearance');
  appearanceFolder.add(config, 'appearanceEase', EASES).name('ease').onChange(syncOutput);
  appearanceFolder.add(config, 'appearanceSpinAxis', AXES).name('spin axis').onChange(syncOutput);
  appearanceFolder.add(config, 'appearanceSpinZ', -1080, 1080, 1).name('spin degrees').onChange(syncOutput);
  appearanceFolder.open();

  const materialFolder = gui.addFolder('material');
  materialFolder.add(config.materialTune, 'transparency', 0, 0.75, 0.01).name('transparency').onChange(syncOutputAndMaterial);
  materialFolder.add(config.materialTune, 'saturation', 0, 3, 0.01).name('saturation').onChange(syncOutputAndMaterial);
  materialFolder.add(config.materialTune, 'contrast', 0.6, 4, 0.01).name('contrast').onChange(syncOutputAndMaterial);
  materialFolder.add(config.materialTune, 'brightness', 0.4, 2, 0.01).name('brightness').onChange(syncOutputAndMaterial);
  materialFolder.add(config.materialTune, 'orangeBrightness', 0, 3, 0.01).name('orange brightness').onChange(syncOutputAndMaterial);
  materialFolder.add(config.materialTune, 'greenBrightness', 0, 3, 0.01).name('green brightness').onChange(syncOutputAndMaterial);
  materialFolder.add(config.materialTune, 'colorCoverage', 0, 2, 0.01).name('color coverage').onChange(syncOutputAndMaterial);
  materialFolder.add(config.materialTune, 'innerHighlights', 0, 3, 0.01).name('inner highlights').onChange(syncOutputAndMaterial);
  materialFolder.add(config.materialTune, 'shadowDepth', 0, 2.5, 0.01).name('shadow depth').onChange(syncOutputAndMaterial);

  const colorBoostFolder = materialFolder.addFolder('color boost');
  colorBoostFolder.add(config.materialTune, 'colorBoostEnabled').name('enabled').onChange(syncOutputAndMaterial);
  colorBoostFolder.add(config.materialTune, 'colorBoostStrength', 0, 1, 0.01).name('master strength').onChange(syncOutputAndMaterial);
  colorBoostFolder.add(config.materialTune, 'colorExposure', -0.5, 1.5, 0.01).name('color exposure').onChange(syncOutputAndMaterial);
  colorBoostFolder.add(config.materialTune, 'colorSaturation', 0.5, 3, 0.01).name('saturation').onChange(syncOutputAndMaterial);
  colorBoostFolder.add(config.materialTune, 'colorContrast', 0.7, 2, 0.01).name('contrast').onChange(syncOutputAndMaterial);
  colorBoostFolder.add(config.materialTune, 'orangeIntensity', 0.5, 3, 0.01).name('orange intensity').onChange(syncOutputAndMaterial);
  colorBoostFolder.add(config.materialTune, 'greenIntensity', 0.5, 3, 0.01).name('green intensity').onChange(syncOutputAndMaterial);
  colorBoostFolder.add(config.materialTune, 'shadowColorLift', 0, 0.5, 0.005).name('shadow color').onChange(syncOutputAndMaterial);
  colorBoostFolder.add(config.materialTune, 'highlightProtection', 0, 1, 0.01).name('highlight protection').onChange(syncOutputAndMaterial);
  colorBoostFolder.open();
  materialFolder.open();

  gui.add(config, 'modelScale', 0.1, 4, 0.01).name('model scale').onChange(syncOutput);
  gui.add(state, 'copySettings').name('Copy settings');
  syncOutput();

  const destroyGui = gui.destroy.bind(gui);
  gui.destroy = () => {
    output.remove();
    destroyGui();
  };

  return gui;
}

function loadTexture(loader, url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}

function loadGltf(loader, url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
}

function createMaterialTuneUniforms(config) {
  const tune = config.materialTune;
  return {
    uSaturation: { value: tune.saturation },
    uContrast: { value: tune.contrast },
    uBrightness: { value: tune.brightness },
    uOrangeBrightness: { value: tune.orangeBrightness },
    uGreenBrightness: { value: tune.greenBrightness },
    uColorCoverage: { value: tune.colorCoverage },
    uInnerHighlights: { value: tune.innerHighlights },
    uShadowDepth: { value: tune.shadowDepth },
    uShadowColorLift: { value: tune.shadowColorLift },
    uHighlightProtection: { value: tune.highlightProtection },
    uColorBoostEnabled: { value: tune.colorBoostEnabled ? 1 : 0 },
    uColorBoostStrength: { value: tune.colorBoostStrength },
    uColorExposure: { value: tune.colorExposure },
    uColorSaturation: { value: tune.colorSaturation },
    uColorContrast: { value: tune.colorContrast },
    uOrangeIntensity: { value: tune.orangeIntensity },
    uGreenIntensity: { value: tune.greenIntensity },
  };
}

function syncMaterialTuning(material, config) {
  if (!material) return;
  material.opacity = THREE.MathUtils.clamp(1 - config.materialTune.transparency, 0.15, 1);

  const uniforms = material.userData.empirioUniforms;
  if (!uniforms) return;

  const tune = config.materialTune;
  uniforms.uSaturation.value = tune.saturation;
  uniforms.uContrast.value = tune.contrast;
  uniforms.uBrightness.value = tune.brightness;
  uniforms.uOrangeBrightness.value = tune.orangeBrightness;
  uniforms.uGreenBrightness.value = tune.greenBrightness;
  uniforms.uColorCoverage.value = tune.colorCoverage;
  uniforms.uInnerHighlights.value = tune.innerHighlights;
  uniforms.uShadowDepth.value = tune.shadowDepth;
  uniforms.uShadowColorLift.value = tune.shadowColorLift;
  uniforms.uHighlightProtection.value = tune.highlightProtection;
  uniforms.uColorBoostEnabled.value = tune.colorBoostEnabled ? 1 : 0;
  uniforms.uColorBoostStrength.value = tune.colorBoostStrength;
  uniforms.uColorExposure.value = tune.colorExposure;
  uniforms.uColorSaturation.value = tune.colorSaturation;
  uniforms.uColorContrast.value = tune.colorContrast;
  uniforms.uOrangeIntensity.value = tune.orangeIntensity;
  uniforms.uGreenIntensity.value = tune.greenIntensity;
}

function createGlassMaterial(config) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: config.material.roughness,
    transmission: config.material.transmission,
    thickness: config.material.thickness,
    ior: config.material.ior,
    clearcoat: config.material.clearcoat,
    clearcoatRoughness: config.material.clearcoatRoughness,
    envMapIntensity: config.environmentIntensity,
    attenuationColor: new THREE.Color(config.material.attenuationColor),
    attenuationDistance: config.material.attenuationDistance,
    iridescence: config.material.iridescence,
    specularIntensity: config.material.specularIntensity,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    opacity: THREE.MathUtils.clamp(1 - config.materialTune.transparency, 0.15, 1),
  });

  if ('dispersion' in material) material.dispersion = config.material.dispersion;

  material.onBeforeCompile = (shader) => {
    const uniforms = createMaterialTuneUniforms(config);
    Object.assign(shader.uniforms, uniforms);
    material.userData.empirioUniforms = uniforms;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vEmpirioWorldPosition;\nvarying vec3 vEmpirioLocalPosition;'
      )
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvEmpirioWorldPosition = worldPosition.xyz;\nvEmpirioLocalPosition = position;'
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uSaturation;
uniform float uContrast;
uniform float uBrightness;
uniform float uOrangeBrightness;
uniform float uGreenBrightness;
uniform float uColorCoverage;
uniform float uInnerHighlights;
uniform float uShadowDepth;
uniform float uShadowColorLift;
uniform float uHighlightProtection;
uniform float uColorBoostEnabled;
uniform float uColorBoostStrength;
uniform float uColorExposure;
uniform float uColorSaturation;
uniform float uColorContrast;
uniform float uOrangeIntensity;
uniform float uGreenIntensity;
varying vec3 vEmpirioWorldPosition;
varying vec3 vEmpirioLocalPosition;`
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        `
        vec3 p = vEmpirioLocalPosition;
        vec3 viewDir = normalize(cameraPosition - vEmpirioWorldPosition);
        vec3 pseudoNormal = normalize(vec3(p.x * 0.86, p.y * 2.4, p.z * 1.08));
        float fresnel = pow(1.0 - clamp(dot(viewDir, pseudoNormal), 0.0, 1.0), 3.0);

        float leftTint = smoothstep(0.7, -0.76, p.x);
        float rightTint = smoothstep(-0.18, 0.86, p.x);
        float lowerTint = smoothstep(-0.28, 0.56, p.z);
        float topTint = smoothstep(0.3, -0.6, p.z);
        float centerTint = 1.0 - smoothstep(0.1, 0.86, length(vec2(p.x * 0.86, p.z * 1.08)));
        float lowerLeftTint = lowerTint * smoothstep(0.28, -0.74, p.x);
        float lowerRightTint = lowerTint * smoothstep(-0.18, 0.88, p.x);
        float upperLeftTint = topTint * smoothstep(0.3, -0.78, p.x);
        float upperCenterTint = topTint * smoothstep(0.62, -0.06, abs(p.x - 0.02));
        float roseCore = smoothstep(0.46, -0.24, p.z) * smoothstep(0.82, 0.04, abs(p.x + 0.08));
        float redField = smoothstep(0.62, -0.1, p.z) * smoothstep(1.05, -0.04, abs(p.x + 0.06));
        float cyanField = lowerTint * smoothstep(-0.04, 0.92, abs(p.x));
        float upperRightNeutral = topTint * rightTint;
        float edgeDepth = smoothstep(0.1, 0.58, abs(p.y));
        float thickEdge = smoothstep(0.18, 0.62, abs(p.y));

        vec3 rose = vec3(1.68, 0.5, 0.28) * uOrangeBrightness;
        vec3 coral = vec3(1.68, 0.5, 0.28) * uOrangeBrightness;
        vec3 mint = vec3(0.0, 0.808, 0.675) * uGreenBrightness;
        vec3 mintSoft = vec3(0.22, 0.92, 0.78) * uGreenBrightness;
        vec3 amber = vec3(1.0, 0.58, 0.32);
        vec3 neutral = vec3(1.0, 0.82, 0.66);
        vec3 warmClear = vec3(1.0, 0.62, 0.46);
        vec3 deepOrange = vec3(1.42, 0.3, 0.08) * uOrangeBrightness;
        vec3 deepGreen = vec3(0.0, 0.44, 0.36) * uGreenBrightness;

        float innerCut = smoothstep(0.12, 0.72, abs(p.x + p.z * 0.42));
        float facetBandA = smoothstep(0.18, 0.0, abs(p.x + p.z * 0.42 - 0.06));
        float facetBandB = smoothstep(0.22, 0.0, abs(p.x - p.z * 0.32 + 0.18));
        float innerFold = max(facetBandA * 0.42, facetBandB * 0.32) * innerCut;
        float coreShadow = smoothstep(0.1, 0.64, abs(p.x - 0.02)) * smoothstep(0.46, -0.16, p.z) * 0.42;
        float rimShadow = pow(fresnel, 1.35) * thickEdge;
        float absorptionDepth = clamp((coreShadow * 0.74 + rimShadow * 0.3 + edgeDepth * 0.52) * uShadowDepth, 0.0, 1.0);
        float greenField = clamp((cyanField + lowerRightTint * 0.86 + lowerLeftTint * 0.58) * uColorCoverage, 0.0, 1.0);
        float orangeField = clamp((redField + upperCenterTint * 0.92 + roseCore * 0.88 + upperLeftTint * 1.0 + leftTint * (1.0 - lowerTint * 0.45) * 0.72) * uColorCoverage, 0.0, 1.0);
        orangeField *= 1.0 - greenField * 0.42;
        float orangeEdge = orangeField * smoothstep(0.12, 0.62, edgeDepth);

        float bevelHighlight = (pow(fresnel, 1.15) + innerFold * 0.28) * uInnerHighlights;

        vec3 glassTint = neutral;
        glassTint = mix(glassTint, warmClear, centerTint * 0.32);
        glassTint = mix(glassTint, coral, redField * 1.0 * uColorCoverage);
        glassTint = mix(glassTint, coral, upperCenterTint * 1.0 * uColorCoverage);
        glassTint = mix(glassTint, coral, roseCore * 1.0 * uColorCoverage);
        glassTint = mix(glassTint, rose, upperLeftTint * 1.0 * uColorCoverage);
        glassTint = mix(glassTint, rose, leftTint * lowerTint * 0.42 * uColorCoverage);
        glassTint = mix(glassTint, mint, lowerRightTint * 0.96 * uColorCoverage);
        glassTint = mix(glassTint, mintSoft, lowerLeftTint * 0.72 * uColorCoverage);
        glassTint = mix(glassTint, mint, cyanField * 0.42 * uColorCoverage);
        glassTint = mix(glassTint, coral, orangeField * 0.45);
        vec3 localAbsorption = mix(deepOrange, deepGreen, clamp(cyanField + lowerRightTint * 0.55 + lowerLeftTint * 0.42, 0.0, 1.0));
        localAbsorption = mix(localAbsorption, deepOrange, orangeField * 0.9);
        glassTint = mix(glassTint, localAbsorption, absorptionDepth * 0.62);
        glassTint = mix(glassTint, localAbsorption, upperRightNeutral * 0.22);
        glassTint += coral * redField * 0.64;
        glassTint += coral * orangeField * 0.34;
        glassTint += coral * orangeEdge * 0.76;
        glassTint += rose * upperLeftTint * 0.38;
        glassTint += mint * cyanField * 0.16;

        vec3 reflectionBands = mix(coral, mint, clamp(lowerTint + rightTint * 0.45, 0.0, 1.0));
        glassTint += reflectionBands * innerFold * 0.34 * uInnerHighlights;
        glassTint += vec3(1.0) * bevelHighlight * 0.26;
        glassTint *= mix(1.08, mix(1.08, 0.72, uShadowDepth), edgeDepth);
        glassTint = mix(glassTint, deepOrange, orangeEdge * 0.3);
        float tintLuma = dot(glassTint, vec3(0.299, 0.587, 0.114));
        float peakBeforeCorrection = max(max(glassTint.r, glassTint.g), glassTint.b);
        float highlightMask = smoothstep(0.78, 1.36, peakBeforeCorrection + bevelHighlight * 0.34) * uHighlightProtection;
        vec3 protectedHighlight = mix(glassTint, vec3(max(peakBeforeCorrection, tintLuma)), highlightMask * 0.72);
        vec3 correctedTint = mix(vec3(tintLuma), glassTint, uSaturation);
        correctedTint = (correctedTint - vec3(0.18)) * uContrast + vec3(0.18);
        correctedTint *= uBrightness;
        glassTint = mix(correctedTint, protectedHighlight, highlightMask);

        vec3 colorGlow = coral * redField * 1.18 + coral * orangeField * 0.38 + coral * orangeEdge * 0.68 + rose * upperLeftTint * 0.46 + mint * cyanField * 0.42;
        float shadowLiftMask = absorptionDepth * clamp(innerFold * 0.72 + edgeDepth * 0.52, 0.0, 1.0);
        vec3 shadowColorLift = localAbsorption * shadowLiftMask * uShadowColorLift;
        vec3 empirioGlassGlow = reflectionBands * (fresnel * 0.34 + innerFold * 0.12) * uInnerHighlights + colorGlow + shadowColorLift;
        vec4 diffuseColor = vec4(glassTint, opacity);
        `
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += empirioGlassGlow;')
      .replace(
        '#include <tonemapping_fragment>',
        `
        if (uColorBoostEnabled > 0.5) {
          vec3 sourceColor = gl_FragColor.rgb;
          const vec3 EMPIRIO_LUMA = vec3(0.2126, 0.7152, 0.0722);
          float sourceLuma = dot(sourceColor, EMPIRIO_LUMA);

          vec3 saturatedColor = mix(vec3(sourceLuma), sourceColor, uColorSaturation);
          vec3 contrastedColor = (saturatedColor - vec3(0.18)) * uColorContrast + vec3(0.18);
          contrastedColor *= exp2(uColorExposure);

          float orangeMask = clamp(orangeField * (1.0 - greenField * 0.65), 0.0, 1.0);
          float greenMask = clamp(greenField * (1.0 - orangeField * 0.45), 0.0, 1.0);

          float gradedLuma = dot(contrastedColor, EMPIRIO_LUMA);
          vec3 neutralPart = vec3(gradedLuma);
          vec3 chromaPart = contrastedColor - neutralPart;
          float localColorIntensity = 1.0 + orangeMask * (uOrangeIntensity - 1.0) + greenMask * (uGreenIntensity - 1.0);
          vec3 gradedColor = neutralPart + chromaPart * localColorIntensity;

          float shadowMask = 1.0 - smoothstep(0.08, 0.58, sourceLuma);
          vec3 orangeShadowColor = vec3(1.0, 0.18, 0.065);
          vec3 greenShadowColor = vec3(0.0, 0.72, 0.62);
          vec3 localShadowColor = orangeShadowColor * orangeMask + greenShadowColor * greenMask;
          gradedColor += localShadowColor * shadowMask * uShadowColorLift;

          float sourcePeak = max(max(sourceColor.r, sourceColor.g), sourceColor.b);
          float finalHighlightMask = smoothstep(0.72, 1.4, sourcePeak);
          gradedColor = mix(gradedColor, sourceColor, finalHighlightMask * uHighlightProtection);
          gradedColor = max(gradedColor, vec3(0.0));

          gl_FragColor.rgb = mix(sourceColor, gradedColor, uColorBoostStrength);
        }

        #include <tonemapping_fragment>
        `
      );
  };

  return material;
}

function fitModelToHeight(model, targetHeight) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);

  model.position.sub(center);
  if (maxDimension > 0) model.scale.multiplyScalar(targetHeight / maxDimension);
}

function createRenderer(container, config) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = config.toneMappingExposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

function setRendererSize(renderer, camera, referenceEl) {
  const rect = referenceEl.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function applyScrollProgress(glowEl, animState, config, rawProgress) {
  const eased = easeProgress(config.appearanceEase, rawProgress);
  animState.progress = rawProgress;
  animState.easedProgress = eased;
  animState.y = THREE.MathUtils.lerp(config.modelStartY, config.modelEndY, rawProgress);
  animState.scale = THREE.MathUtils.lerp(config.modelStartScale, config.modelEndScale, rawProgress);
  animState.appearanceSpin = -config.appearanceSpinZ * (1 - eased);
  if (glowEl) glowEl.style.opacity = String(eased);
}

function setupScroll(triggerEl, glowEl, animState, config) {
  if (glowEl) glowEl.style.opacity = '0';

  return ScrollTrigger.create({
    trigger: triggerEl,
    start: config.scroll.start,
    end: config.scroll.end,
    scrub: config.scroll.scrub,
    onUpdate(self) {
      applyScrollProgress(glowEl, animState, config, self.progress);
    },
  });
}

function setupBackgroundVideo(glowEl, config) {
  if (!glowEl) return;

  const bgUrl = config.backgroundUrl || config.glowUrl;
  if (bgUrl) glowEl.style.setProperty('--empiriox-bg-image', `url("${bgUrl}")`);

  const video = glowEl.querySelector('.footer-scene__bg-video');
  if (!video || !config.backgroundVideoUrl) return;

  const source = video.querySelector('source');
  if (source) source.src = config.backgroundVideoUrl;
  else video.src = config.backgroundVideoUrl;

  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.load();
  video.play()?.catch?.(() => {});
}

export async function initEmpirioXFooterScene(options = {}) {
  if (window[INIT_KEY]) return window[INIT_KEY];

  const root = options.root || document.querySelector('.section_bf-footer.footer-scene') || document.querySelector('.footer-scene') || document.querySelector('.section_bf-footer');
  if (!root) {
    console.warn('[EmpirioX footer] .footer-scene / .section_bf-footer was not found.');
    return null;
  }

  const scrollRoot = options.scrollRoot || root.closest('.footer_stack') || root;
  const config = mergeConfig(DEFAULT_CONFIG, window.EMPIRIOX_FOOTER_CONFIG || options.config || {});
  applyDebugSettings(config, parseDebugHash());

  const canvasContainer = root.querySelector('.footer-scene__canvas');
  const glowEl = root.querySelector('.footer-scene__glow');
  if (!canvasContainer) {
    console.warn('[EmpirioX footer] .footer-scene__canvas was not found.');
    return null;
  }

  setupBackgroundVideo(glowEl, config);
  if (glowEl) glowEl.style.opacity = '0';

  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(config.cameraFov, 1, 0.1, 100);
  camera.position.set(0, 0, config.cameraZ);

  const renderer = createRenderer(canvasContainer, config);
  setRendererSize(renderer, camera, root);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const modelGroup = new THREE.Group();
  modelGroup.visible = false;
  scene.add(modelGroup);

  const keyLight = new THREE.RectAreaLight(0xffffff, config.lighting.keyIntensity, 3.6, 2.4);
  keyLight.position.set(-2.8, 3.2, 3.4);
  keyLight.lookAt(0, 0.2, 0);
  scene.add(keyLight);

  const fillLight = new THREE.RectAreaLight(0xdfffff, config.lighting.fillIntensity, 4.2, 2.8);
  fillLight.position.set(3.1, 1.1, 3);
  fillLight.lookAt(0, 0.1, 0);
  scene.add(fillLight);

  const animState = { progress: 0, easedProgress: 0, y: config.modelStartY, scale: config.modelStartScale, appearanceSpin: -config.appearanceSpinZ };
  const pointerState = { targetX: 0, x: 0 };
  const scrollTrigger = setupScroll(scrollRoot, glowEl, animState, config);

  const pointerRoot = scrollRoot;
  let modelScene = null;
  let glassMaterial = null;
  let materialDirty = false;
  let debugGui = null;

  const markMaterialDirty = () => {
    materialDirty = true;
  };

  const onPointerMove = (event) => {
    const rect = pointerRoot.getBoundingClientRect();
    pointerState.targetX = THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
  };

  const onPointerLeave = () => {
    pointerState.targetX = 0;
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const backToTopButton = root.querySelector('.footer-scene__back-to-top') || pointerRoot.querySelector('.footer-scene__back-to-top') || pointerRoot.querySelector('[href="#anchor-top"]');
  backToTopButton?.addEventListener('click', scrollToTop);

  pointerRoot.addEventListener('pointermove', onPointerMove, { passive: true });
  pointerRoot.addEventListener('pointerleave', onPointerLeave, { passive: true });

  let animationFrame = 0;
  let lastFrameTime = performance.now();
  let modelReady = false;

  function tick(now) {
    const deltaSeconds = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (modelReady) {
      if (materialDirty) {
        syncMaterialTuning(glassMaterial, config);
        materialDirty = false;
      }

      pointerState.x = THREE.MathUtils.damp(pointerState.x, pointerState.targetX, config.pointerDamping, deltaSeconds);

      const positionOffset = { x: 0, y: 0, z: 0 };
      positionOffset[config.pointerMoveAxis] = pointerState.x * config.pointerMoveAmount;

      const rotationOffset = { x: 0, y: 0, z: 0 };
      rotationOffset.x = pointerState.x * config.pointerRotateX;
      rotationOffset.y = pointerState.x * config.pointerRotateY;
      rotationOffset.z = -pointerState.x * config.pointerRotateZ;
      rotationOffset[config.appearanceSpinAxis] += animState.appearanceSpin;

      modelGroup.position.x = config.modelPositionX + positionOffset.x;
      modelGroup.position.y = config.modelPositionY + animState.y + positionOffset.y;
      modelGroup.position.z = config.modelPositionZ + positionOffset.z;
      modelGroup.rotation.x = THREE.MathUtils.degToRad(rotationOffset.x);
      modelGroup.rotation.y = THREE.MathUtils.degToRad(rotationOffset.y);
      modelGroup.rotation.z = THREE.MathUtils.degToRad(rotationOffset.z);
      modelGroup.scale.setScalar(config.modelScale * animState.scale);

      modelScene?.rotation.set(THREE.MathUtils.degToRad(config.modelRotationX), THREE.MathUtils.degToRad(config.modelRotationY), THREE.MathUtils.degToRad(config.modelRotationZ));
    }

    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(tick);
  }
  animationFrame = requestAnimationFrame(tick);

  const onResize = () => {
    setRendererSize(renderer, camera, root);
    scrollTrigger?.refresh();
  };
  window.addEventListener('resize', onResize, { passive: true });

  try {
    const exrLoader = new EXRLoader();
    const gltfLoader = new GLTFLoader();

    const [hdrTexture, gltf] = await Promise.all([loadTexture(exrLoader, config.hdrUrl), loadGltf(gltfLoader, config.modelUrl)]);

    const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
    scene.environment = envMap;
    scene.background = null;
    hdrTexture.dispose();
    pmremGenerator.dispose();

    glassMaterial = createGlassMaterial(config);
    syncMaterialTuning(glassMaterial, config);

    modelScene = gltf.scene;
    modelScene.rotation.set(THREE.MathUtils.degToRad(config.modelRotationX), THREE.MathUtils.degToRad(config.modelRotationY), THREE.MathUtils.degToRad(config.modelRotationZ));
    modelScene.traverse((node) => {
      if (node.isMesh) {
        node.material = glassMaterial;
        node.castShadow = false;
        node.receiveShadow = false;
        node.frustumCulled = false;
      }
    });

    fitModelToHeight(modelScene, config.modelFitHeight);
    modelGroup.add(modelScene);
    modelGroup.visible = true;
    modelReady = true;
    canvasContainer.classList.add('is-ready');

    if (config.debug) {
      try {
        debugGui = await setupDebugGui(config, markMaterialDirty);
      } catch (error) {
        console.warn('[EmpirioX footer] Debug UI failed to load; scene continues without it.', error);
      }
    }
  } catch (error) {
    console.warn('[EmpirioX footer] 3D layer failed to load. The HTML footer remains usable.', error);
    canvasContainer.style.display = 'none';
    if (glowEl) glowEl.style.opacity = '0';
  }

  const instance = {
    config,
    destroy() {
      cancelAnimationFrame(animationFrame);
      scrollTrigger?.kill();
      window.removeEventListener('resize', onResize);
      pointerRoot.removeEventListener('pointermove', onPointerMove);
      pointerRoot.removeEventListener('pointerleave', onPointerLeave);
      backToTopButton?.removeEventListener('click', scrollToTop);
      renderer.dispose();
      debugGui?.destroy();
      canvasContainer.innerHTML = '';
      delete window[INIT_KEY];
    },
  };

  window[INIT_KEY] = instance;
  return instance;
}

// Exposed globally so the debug GUI can be triggered manually from devtools
// (e.g. `initEmpirioXFooterScene({ debug: true })`) without editing code.
window.initEmpirioXFooterScene = initEmpirioXFooterScene;
