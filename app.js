const canvas = document.querySelector("#stage");
const ctx = canvas.getContext("2d", { alpha: false });
const hydraCanvas = document.createElement("canvas");
hydraCanvas.id = "hydraStage";
canvas.insertAdjacentElement("afterend", hydraCanvas);
const shell = document.querySelector(".shell");
const controlPanel = document.querySelector(".control-panel");
const dragHandle = document.querySelector("#dragHandle");
const stageModeButton = document.querySelector("#stageModeButton");
const controls = {
  complexity: document.querySelector("#complexity"),
  speed: document.querySelector("#speed"),
  glow: document.querySelector("#glow"),
  density: document.querySelector("#density"),
  sensitivity: document.querySelector("#sensitivity"),
};
const micButton = document.querySelector("#micButton");
const audioState = document.querySelector("#audioState");
const emotionLabel = document.querySelector("#emotionLabel");
const energyMeter = document.querySelector("#energyMeter");
const valenceMeter = document.querySelector("#valenceMeter");
const bpmValue = document.querySelector("#bpmValue");
const visualPrompt = document.querySelector("#visualPrompt");
const promptButton = document.querySelector("#promptButton");
const promptStatus = document.querySelector("#promptStatus");
const modelMode = document.querySelector("#modelMode");
const hydraCode = document.querySelector("#hydraCode");
const codeRunButton = document.querySelector("#codeRunButton");
const codeAiButton = document.querySelector("#codeAiButton");
const codeStatus = document.querySelector("#codeStatus");
const exampleButton = document.querySelector("#exampleButton");
const addLayerButton = document.querySelector("#addLayerButton");
const clearLayersButton = document.querySelector("#clearLayersButton");
const layerList = document.querySelector("#layerList");
const templateName = document.querySelector("#templateName");
const saveTemplateButton = document.querySelector("#saveTemplateButton");
const templateList = document.querySelector("#templateList");
const templateStatus = document.querySelector("#templateStatus");
const imageInput = document.querySelector("#imageInput");
const imageCodeButton = document.querySelector("#imageCodeButton");
const imagePreview = document.querySelector("#imagePreview");
const imagePreviewCtx = imagePreview.getContext("2d", { alpha: false });
const imageSwatches = document.querySelector("#imageSwatches");
const imageStatus = document.querySelector("#imageStatus");
const cameraButton = document.querySelector("#cameraButton");
const cameraVideo = document.querySelector("#cameraVideo");
const cameraPreview = document.querySelector("#cameraPreview");
const cameraPreviewCtx = cameraPreview.getContext("2d", { alpha: false, willReadFrequently: true });
const cameraStatus = document.querySelector("#cameraStatus");

const palettes = {
  cyan: ["#12f7ff", "#ff2fd6", "#f5fbff"],
  magenta: ["#ff2fd6", "#ffc247", "#12f7ff"],
  amber: ["#ffc247", "#12f7ff", "#ff4a68"],
  lime: ["#9cff54", "#12f7ff", "#ff2fd6"],
  aether: ["#b8f7ff", "#b59cff", "#fff8d8"],
  violet: ["#9b7cff", "#25f0ff", "#ff76c8"],
};

const presets = {
  neon: { complexity: 7, speed: 68, glow: 70, density: 310, sensitivity: 92, style: "harmonic", theme: "cyan" },
  liquid: { complexity: 5, speed: 42, glow: 82, density: 240, sensitivity: 72, style: "silk", theme: "magenta" },
  storm: { complexity: 11, speed: 112, glow: 91, density: 470, sensitivity: 132, style: "crystal", theme: "violet" },
  aether: { complexity: 4, speed: 28, glow: 96, density: 360, sensitivity: 66, style: "aura", theme: "aether" },
  silk: { complexity: 6, speed: 52, glow: 88, density: 290, sensitivity: 84, style: "silk", theme: "amber" },
  ritual: { complexity: 9, speed: 96, glow: 76, density: 420, sensitivity: 118, style: "pulse", theme: "lime" },
};

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  time: 0,
  energy: 0.24,
  valence: 0.55,
  micEnergy: 0,
  micValence: 0.5,
  palette: palettes.cyan,
  particles: [],
  audio: null,
  micStream: null,
  analyser: null,
  data: null,
  micEnabled: false,
  style: "harmonic",
  source: "osc",
  kaleid: 1,
  rotation: 0,
  contrast: 1,
  blend: null,
  blendAmount: 0,
  modulate: null,
  modulateAmount: 0,
  layers: [],
  imageReady: false,
  imageName: "",
  imagePalette: null,
  cameraEnabled: false,
  cameraStream: null,
};

const sourceImage = new Image();
const sourceImageCanvas = document.createElement("canvas");
const sourceImageCtx = sourceImageCanvas.getContext("2d", { willReadFrequently: true });
const cameraWorkCanvas = document.createElement("canvas");
const cameraWorkCtx = cameraWorkCanvas.getContext("2d", { willReadFrequently: true });
const templateStorageKey = "xindongOS.templates.v1";
const panelPositionKey = "xindongOS.panelPosition.v1";
let hydraSynth = null;

function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = Math.floor(window.innerWidth);
  state.height = Math.floor(window.innerHeight);
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  seedParticles();
}

function seedParticles() {
  const count = Number(controls.density.value);
  state.particles = Array.from({ length: count }, (_, index) => ({
    seed: index * 19.37,
    orbit: 0.18 + Math.random() * 0.78,
    phase: Math.random() * Math.PI * 2,
    size: 0.55 + Math.random() * 2.4,
  }));
}

function clampPanelPosition(left, top) {
  const rect = controlPanel.getBoundingClientRect();
  const width = rect.width || 360;
  const height = Math.min(rect.height || 520, window.innerHeight - 24);
  return {
    left: Math.max(12, Math.min(window.innerWidth - width - 12, left)),
    top: Math.max(12, Math.min(window.innerHeight - Math.min(height, window.innerHeight - 24) - 12, top)),
  };
}

function setPanelPosition(left, top, persist = true) {
  const position = clampPanelPosition(left, top);
  controlPanel.style.left = `${position.left}px`;
  controlPanel.style.top = `${position.top}px`;
  controlPanel.style.right = "auto";
  if (persist) localStorage.setItem(panelPositionKey, JSON.stringify(position));
}

function restorePanelPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(panelPositionKey) || "null");
    if (saved) setPanelPosition(saved.left, saved.top, false);
  } catch (error) {
    localStorage.removeItem(panelPositionKey);
  }
}

function toggleStageMode() {
  const active = shell.classList.toggle("stage-mode");
  stageModeButton.textContent = active ? "打开编辑" : "演出模式";
}

function initHydra() {
  if (hydraSynth || !window.Hydra) return hydraSynth;
  hydraCanvas.width = window.innerWidth;
  hydraCanvas.height = window.innerHeight;
  hydraSynth = new window.Hydra({
    canvas: hydraCanvas,
    width: window.innerWidth,
    height: window.innerHeight,
    detectAudio: false,
    enableStreamCapture: false,
    makeGlobal: true,
  });
  hydraSynth.eval('solid(0,0,0,0).out()');
  return hydraSynth;
}

function resizeHydra() {
  if (!hydraSynth) return;
  hydraSynth.synth.setResolution(window.innerWidth, window.innerHeight);
}

function runHydraCode(code) {
  const synth = initHydra();
  if (!synth) {
    codeStatus.textContent = "Hydra 没有加载成功";
    return false;
  }
  synth.eval(code);
  shell.classList.add("hydra-active");
  enterCustomMode("Hydra VJ 自定义创作");
  return true;
}

function stopHydra() {
  if (hydraSynth) hydraSynth.synth.hush();
  shell.classList.remove("hydra-active");
}

function setTheme(theme) {
  if (theme === "image" && state.imagePalette) {
    state.palette = state.imagePalette;
  } else {
    state.palette = palettes[theme] || state.palette || palettes.cyan;
  }
  document.documentElement.style.setProperty("--hot", state.palette[0]);
  document.documentElement.style.setProperty("--warm", state.palette[1]);
  document.querySelectorAll(".swatch").forEach((item) => {
    item.classList.toggle("active", item.dataset.theme === theme);
  });
}

function applyPreset(name) {
  markPresetActive(name);
  state.source = "osc";
  Object.entries(presets[name]).forEach(([key, value]) => {
    if (controls[key]) controls[key].value = value;
  });
  setStyle(presets[name].style, true);
  setTheme(presets[name].theme);
  state.blend = null;
  state.modulate = null;
  state.layers = [];
  renderLayers();
  seedParticles();
}

function markPresetActive(name) {
  document.querySelectorAll(".preset").forEach((item) => {
    item.classList.toggle("active", item.dataset.preset === name);
  });
}

function enterCustomMode(label = "custom composition") {
  markPresetActive(null);
  markStyleActive(null);
  templateStatus.textContent = label;
}

function markStyleActive(style) {
  document.querySelectorAll(".style-chip").forEach((item) => {
    item.classList.toggle("active", item.dataset.style === style);
  });
}

function setStyle(style, reflect = true) {
  state.style = style;
  if (reflect) markStyleActive(style);
}

function clearDefaultEffects() {
  markPresetActive(null);
  setStyle("none", true);
  state.source = "none";
  state.blend = null;
  state.modulate = null;
  templateStatus.textContent = "默认效果已关闭";
}

function setControl(name, value) {
  if (!controls[name]) return;
  controls[name].value = value;
  if (name === "density") seedParticles();
}

function applyIntent(intent) {
  const custom = intent.source === "image" || intent.source === "camera" || intent.custom;
  if (intent.style) setStyle(intent.style, !custom);
  if (intent.theme) setTheme(intent.theme);
  ["complexity", "speed", "glow", "density", "sensitivity"].forEach((key) => {
    if (intent[key] !== undefined) setControl(key, intent[key]);
  });
  if (intent.source) state.source = intent.source;
  if (intent.theme === "image" && state.imagePalette) setTheme("image");
  if (intent.kaleid) state.kaleid = Math.max(1, Math.min(16, Number(intent.kaleid)));
  if (intent.rotation !== undefined) state.rotation = Number(intent.rotation) || 0;
  if (intent.contrast) state.contrast = Math.max(0.5, Math.min(2.4, Number(intent.contrast)));
  state.blend = intent.blend || null;
  state.blendAmount = Math.max(0, Math.min(1, Number(intent.blendAmount) || 0));
  state.modulate = intent.modulate || null;
  state.modulateAmount = Math.max(0, Math.min(1, Number(intent.modulateAmount) || 0));
  if (Array.isArray(intent.layers)) {
    state.layers = intent.layers.slice(0, 8);
    renderLayers();
  }
  if (custom) enterCustomMode("当前为自定义创作");
  seedParticles();
}

function captureIntent() {
  return {
    source: state.source,
    style: state.style,
    theme: state.source === "image" && state.imagePalette ? "image" : Object.keys(palettes).find((key) => palettes[key] === state.palette) || "cyan",
    complexity: Number(controls.complexity.value),
    speed: Number(controls.speed.value),
    glow: Number(controls.glow.value),
    density: Number(controls.density.value),
    sensitivity: Number(controls.sensitivity.value),
    kaleid: state.kaleid,
    rotation: state.rotation,
    contrast: state.contrast,
    blend: state.blend,
    blendAmount: state.blendAmount,
    modulate: state.modulate,
    modulateAmount: state.modulateAmount,
    layers: state.layers,
    code: hydraCode.value,
  };
}

function parseNaturalVisual(text) {
  const prompt = text.toLowerCase();
  const intent = {};
  if (/hydra|vj|现场|酷|迷幻|视频合成|反馈|feedback|glitch|故障/.test(prompt)) {
    const fast = /快|强|炸|激烈|rave|hard|现场/.test(prompt);
    const soft = /空灵|慢|柔|梦|冥想/.test(prompt);
    intent.hydraNative = soft
      ? 'gradient(1).hue(() => time * 0.04).modulate(osc(12, 0.03), 0.15).blend(noise(2).colorama(0.2), 0.28).out()'
      : fast
        ? 'osc(34, 0.04, 0.9).kaleid(8).modulateRotate(shape(4).repeat(6, 4), 0.22).diff(noise(3).posterize(4)).out()'
        : 'voronoi(7, 0.35, 0.1).kaleid(7).modulate(osc(12, 0.08), 0.18).blend(osc(18).color(0.1,0.8,1), 0.35).out()';
  }
  if (/空灵|仙|漂浮|呼吸|冥想|aether|ethereal/.test(prompt)) {
    intent.style = "aura";
    intent.theme = "aether";
    intent.glow = 96;
    intent.speed = 30;
    intent.density = 380;
  }
  if (/丝绸|水波|流体|柔|液态|silk|liquid/.test(prompt)) {
    intent.style = "silk";
    intent.theme = intent.theme || "magenta";
    intent.speed = 48;
    intent.glow = 88;
  }
  if (/晶体|水晶|玻璃|棱镜|折射|crystal/.test(prompt)) {
    intent.style = "crystal";
    intent.theme = "violet";
    intent.complexity = 10;
    intent.glow = 86;
  }
  if (/律动|节拍|鼓|跳动|脉冲|pulse|beat|groove/.test(prompt)) {
    intent.style = "pulse";
    intent.theme = intent.theme || "lime";
    intent.speed = 104;
    intent.sensitivity = 130;
  }
  if (/薄雾|雾|云|烟|朦胧|veil|mist/.test(prompt)) {
    intent.style = "veil";
    intent.theme = "aether";
    intent.glow = 94;
    intent.density = 430;
  }
  if (/快|强|炸|高能|激烈|rave|hard/.test(prompt)) {
    intent.speed = 120;
    intent.complexity = 11;
    intent.sensitivity = 145;
  }
  if (/慢|轻|安静|缓|低能|calm|slow/.test(prompt)) {
    intent.speed = 28;
    intent.complexity = 4;
    intent.sensitivity = 62;
  }
  if (/冷|蓝|冰|cyan|blue/.test(prompt)) intent.theme = "cyan";
  if (/紫|梦|violet|purple/.test(prompt)) intent.theme = "violet";
  if (/暖|金|日落|amber|gold/.test(prompt)) intent.theme = "amber";
  if (/绿|生命|森林|lime|green/.test(prompt)) intent.theme = "lime";
  if (/粉|霓虹|magenta|pink/.test(prompt)) intent.theme = "magenta";
  if (/粒子.*多|更多粒子|密/.test(prompt)) intent.density = 500;
  if (/粒子.*少|更干净|留白/.test(prompt)) intent.density = 160;
  if (/叠加|混合|blend|双层|多层|丰富|细节|vj|hydra/.test(prompt)) {
    intent.blend = /晶体|水晶|crystal/.test(prompt) ? "crystal" : /雾|noise|veil/.test(prompt) ? "veil" : "crystal";
    intent.blendAmount = /强|重|炸|复杂/.test(prompt) ? 0.56 : 0.38;
    intent.modulate = /律动|节奏|beat|pulse/.test(prompt) ? "pulse" : "noise";
    intent.modulateAmount = /强|重|炸|复杂/.test(prompt) ? 0.44 : 0.28;
  }
  return {
    style: intent.style || state.style,
    theme: intent.theme || "aether",
    complexity: intent.complexity || Number(controls.complexity.value),
    speed: intent.speed || Number(controls.speed.value),
    glow: intent.glow || Number(controls.glow.value),
    density: intent.density || Number(controls.density.value),
    sensitivity: intent.sensitivity || Number(controls.sensitivity.value),
    blend: intent.blend,
    blendAmount: intent.blendAmount,
    modulate: intent.modulate,
    modulateAmount: intent.modulateAmount,
    summary: "本地语义已应用",
  };
}

function methodNumber(code, name, fallback) {
  const match = code.match(new RegExp(`\\.${name}\\(([-\\d.]+)\\)`));
  return match ? Number(match[1]) : fallback;
}

function methodString(code, name) {
  const match = code.match(new RegExp(`\\.${name}\\([\"']([^\"']+)[\"']\\)`));
  return match ? match[1] : undefined;
}

function methodPair(code, name) {
  const match = code.match(new RegExp(`\\.${name}\\([\"']([^\"']+)[\"']\\s*,\\s*([-\\d.]+)\\)`));
  return match ? { name: match[1], amount: Number(match[2]) } : null;
}

function parseHydraChain(code) {
  const imageSource = /\b(src|image)\s*\(\s*["'](?:image|upload|photo|图片)["']\s*\)/.test(code);
  const cameraSource = /\b(src|camera|cam)\s*\(\s*["']?(?:camera|cam|摄像头)["']?\s*\)/.test(code);
  const sourceMatch = code.match(/\b(osc|shape|noise|voronoi|gradient|feedback|camera|cam)\s*\(([^)]*)\)/);
  const source = cameraSource ? "camera" : imageSource ? "image" : sourceMatch ? sourceMatch[1].replace("cam", "camera") : "osc";
  const firstNumber = sourceMatch?.[2]?.split(",").map((item) => Number(item.trim())).find(Number.isFinite);
  const styleMap = {
    aura: "aura",
    silk: "silk",
    crystal: "crystal",
    pulse: "pulse",
    veil: "veil",
    harmonic: "harmonic",
  };
  const styleName = Object.keys(styleMap).find((name) => new RegExp(`\\.${name}\\(`).test(code));
  const sourceStyle = { osc: "harmonic", shape: "crystal", noise: "veil", voronoi: "crystal", gradient: "aura", feedback: "pulse", image: "aura", camera: "pulse" }[source];
  const blend = methodPair(code, "blend");
  const add = methodPair(code, "add");
  const modulate = methodPair(code, "modulate");
  return {
    source,
    style: styleName ? styleMap[styleName] : sourceStyle,
    theme: imageSource ? "image" : cameraSource ? "cyan" : methodString(code, "color") || methodString(code, "theme") || undefined,
    complexity: methodNumber(code, "kaleid", firstNumber ? Math.max(2, Math.min(12, Math.round(firstNumber / 3))) : undefined),
    speed: methodNumber(code, "speed", undefined),
    glow: methodNumber(code, "glow", undefined),
    density: methodNumber(code, "density", undefined),
    sensitivity: methodNumber(code, "sensitivity", undefined),
    kaleid: methodNumber(code, "kaleid", 1),
    rotation: methodNumber(code, "rotate", state.rotation),
    contrast: methodNumber(code, "contrast", state.contrast),
    blend: blend?.name || add?.name,
    blendAmount: blend?.amount || add?.amount || 0,
    modulate: modulate?.name,
    modulateAmount: modulate?.amount || 0,
    summary: "Hydra chain applied",
  };
}

function codeFromIntent(intent) {
  if (intent.hydraNative) return intent.hydraNative;
  const source = intent.source || (intent.style === "crystal" ? "shape" : intent.style === "veil" ? "noise" : intent.style === "pulse" ? "feedback" : "osc");
  if (source === "camera") {
    return `src("camera").pulse().color("cyan").kaleid(${intent.kaleid || 5}).rotate(${intent.rotation || 0.18}).contrast(${intent.contrast || 1.65}).glow(${intent.glow || 90}).speed(${intent.speed || 88}).density(${intent.density || 360}).blend("aura", 0.28).modulate("pulse", 0.42).out()`;
  }
  if (source === "image") {
    const kaleid = intent.kaleid || Math.max(3, Math.round((intent.complexity || 7) * 0.9));
    return `src("image").${intent.style || "aura"}().color("image").kaleid(${kaleid}).rotate(${intent.rotation || 0.12}).contrast(${intent.contrast || 1.35}).glow(${intent.glow || 90}).speed(${intent.speed || 58}).density(${intent.density || 360}).blend("crystal", 0.36).modulate("pulse", 0.28).out()`;
  }
  const seed = Math.max(6, Math.round((intent.complexity || 7) * 3));
  const kaleid = intent.kaleid || Math.max(3, Math.round((intent.complexity || 7) * 0.9));
  const rotate = intent.rotation || Number(((intent.speed || 80) / 180).toFixed(2));
  const contrast = intent.contrast || (intent.speed > 100 ? 1.8 : 1.25);
  const style = intent.style || "harmonic";
  const blend = intent.blend || (style === "aura" ? "veil" : style === "crystal" ? "pulse" : "crystal");
  const modulate = intent.modulate || (style === "pulse" ? "noise" : "pulse");
  const blendAmount = intent.blendAmount || (intent.speed > 100 ? 0.52 : 0.34);
  const modulateAmount = intent.modulateAmount || (intent.speed > 100 ? 0.42 : 0.24);
  return `${source}(${seed}).${style}().color("${intent.theme || "cyan"}").kaleid(${kaleid}).rotate(${rotate}).contrast(${contrast}).glow(${intent.glow || 82}).speed(${intent.speed || 76}).density(${intent.density || 320}).blend("${blend}", ${blendAmount}).modulate("${modulate}", ${modulateAmount}).out()`;
}

function colorDistance(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function drawImagePreview() {
  const size = 72;
  imagePreview.width = size;
  imagePreview.height = size;
  imagePreviewCtx.fillStyle = "#05070a";
  imagePreviewCtx.fillRect(0, 0, size, size);
  if (!state.imageReady) return;
  const scale = Math.max(size / sourceImage.width, size / sourceImage.height);
  const w = sourceImage.width * scale;
  const h = sourceImage.height * scale;
  imagePreviewCtx.drawImage(sourceImage, (size - w) / 2, (size - h) / 2, w, h);
}

function extractImagePalette() {
  const data = sourceImageCtx.getImageData(0, 0, sourceImageCanvas.width, sourceImageCanvas.height).data;
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 20) {
    if (data[i + 3] < 180) continue;
    const r = Math.round(data[i] / 28) * 28;
    const g = Math.round(data[i + 1] / 28) * 28;
    const b = Math.round(data[i + 2] / 28) * 28;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;
    const brightness = r + g + b;
    if (brightness < 70 || brightness > 735 || saturation < 18) continue;
    const key = `${Math.min(255, r)},${Math.min(255, g)},${Math.min(255, b)}`;
    buckets.set(key, (buckets.get(key) || 0) + saturation * 1.8 + Math.abs(brightness - 382) * 0.08);
  }
  const picked = [];
  for (const [key] of [...buckets.entries()].sort((a, b) => b[1] - a[1])) {
    const [r, g, b] = key.split(",").map(Number);
    const color = { r, g, b };
    if (picked.every((item) => colorDistance(item, color) > 82)) picked.push(color);
    if (picked.length === 3) break;
  }
  while (picked.length < 3) picked.push({ r: 18, g: 247, b: 255 });
  return picked.map(rgbToHex);
}

function updateImageSwatches() {
  imageSwatches.innerHTML = "";
  for (const color of state.imagePalette || []) {
    const swatch = document.createElement("span");
    swatch.style.background = color;
    imageSwatches.appendChild(swatch);
  }
}

function writeImageVisualCode() {
  if (!state.imageReady) {
    imageStatus.textContent = "先上传一张图片";
    return;
  }
  const intent = {
    source: "image",
    style: state.style === "harmonic" ? "aura" : state.style,
    theme: "image",
    complexity: Number(controls.complexity.value),
    speed: Number(controls.speed.value),
    glow: Number(controls.glow.value),
    density: Number(controls.density.value),
    kaleid: state.kaleid,
    rotation: state.rotation,
    contrast: state.contrast,
  };
  hydraCode.value = codeFromIntent(intent);
  codeStatus.textContent = "image source code ready";
}

function loadImageSource(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    sourceImage.onload = () => {
      const maxSize = 520;
      const scale = Math.min(1, maxSize / Math.max(sourceImage.width, sourceImage.height));
      sourceImageCanvas.width = Math.max(1, Math.floor(sourceImage.width * scale));
      sourceImageCanvas.height = Math.max(1, Math.floor(sourceImage.height * scale));
      sourceImageCtx.clearRect(0, 0, sourceImageCanvas.width, sourceImageCanvas.height);
      sourceImageCtx.drawImage(sourceImage, 0, 0, sourceImageCanvas.width, sourceImageCanvas.height);
      state.imageReady = true;
      state.imageName = file.name;
      state.imagePalette = extractImagePalette();
      state.source = "image";
      enterCustomMode("图片源自定义创作");
      setStyle("aura");
      setTheme("image");
      drawImagePreview();
      updateImageSwatches();
      writeImageVisualCode();
      imageStatus.textContent = `${file.name} 已写入视觉源`;
    };
    sourceImage.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function enableCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    state.cameraStream = stream;
    state.cameraEnabled = true;
    cameraVideo.srcObject = stream;
    await cameraVideo.play();
    cameraButton.textContent = "关闭摄像头";
    cameraStatus.textContent = state.micEnabled ? "camera contour reacts to music" : "开启麦克风后轮廓随音乐舞动";
    applyIntent({
      source: "camera",
      style: "pulse",
      theme: "cyan",
      complexity: 7,
      speed: 88,
      glow: 90,
      density: 360,
      contrast: 1.65,
      blend: "aura",
      blendAmount: 0.28,
      modulate: "pulse",
      modulateAmount: 0.42,
      custom: true,
    });
    hydraCode.value = codeFromIntent({ source: "camera", speed: 88, glow: 90, density: 360, contrast: 1.65 });
  } catch (error) {
    cameraStatus.textContent = "camera permission needed";
  }
}

function disableCamera() {
  state.cameraStream?.getTracks().forEach((track) => track.stop());
  state.cameraStream = null;
  state.cameraEnabled = false;
  cameraVideo.srcObject = null;
  cameraButton.textContent = "开启摄像头";
  cameraStatus.textContent = "camera contour empty";
  cameraPreviewCtx.clearRect(0, 0, cameraPreview.width, cameraPreview.height);
}

function toggleCamera() {
  if (state.cameraEnabled) disableCamera();
  else enableCamera();
}

function drawCameraContours(t) {
  if (!state.cameraEnabled || cameraVideo.readyState < 2) return;
  const w = 220;
  const h = 156;
  cameraWorkCanvas.width = w;
  cameraWorkCanvas.height = h;
  cameraWorkCtx.save();
  cameraWorkCtx.translate(w, 0);
  cameraWorkCtx.scale(-1, 1);
  cameraWorkCtx.drawImage(cameraVideo, 0, 0, w, h);
  cameraWorkCtx.restore();

  const frame = cameraWorkCtx.getImageData(0, 0, w, h);
  const data = frame.data;
  const previewW = 240;
  const previewH = 140;
  cameraPreview.width = previewW;
  cameraPreview.height = previewH;
  cameraPreviewCtx.fillStyle = "#020304";
  cameraPreviewCtx.fillRect(0, 0, previewW, previewH);

  const scale = Math.min(state.width / w, state.height / h) * 0.96;
  const ox = (state.width - w * scale) / 2;
  const oy = (state.height - h * scale) / 2;
  const px = previewW / w;
  const py = previewH / h;
  const threshold = 52 - state.energy * 18;
  const pulse = 1 + state.energy * 0.1 + Math.sin(t * 0.006) * state.energy * 0.035;
  const offset = state.energy * 10;
  const scanY = ((t * (0.045 + state.energy * 0.12)) % (state.height + 120)) - 60;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 0.75 + state.energy * 2.2;
  ctx.shadowBlur = 10 + state.energy * 36;
  ctx.shadowColor = "#ffffff";

  ctx.fillStyle = `rgba(255,255,255,${0.035 + state.energy * 0.06})`;
  ctx.fillRect(0, Math.max(0, scanY - 2), state.width, 4 + state.energy * 14);
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(state.width, scanY + Math.sin(t * 0.004) * 18);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.9)";

  cameraPreviewCtx.strokeStyle = "rgba(255,255,255,0.9)";
  cameraPreviewCtx.lineWidth = 1;
  cameraPreviewCtx.shadowBlur = 8;
  cameraPreviewCtx.shadowColor = "#ffffff";

  for (let y = 2; y < h - 2; y += 2) {
    for (let x = 2; x < w - 2; x += 2) {
      const i = (y * w + x) * 4;
      const left = (y * w + x - 1) * 4;
      const right = (y * w + x + 1) * 4;
      const up = ((y - 1) * w + x) * 4;
      const down = ((y + 1) * w + x) * 4;
      const luma = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      const dx = Math.abs(data[left] - data[right]) + Math.abs(data[left + 1] - data[right + 1]) + Math.abs(data[left + 2] - data[right + 2]);
      const dy = Math.abs(data[up] - data[down]) + Math.abs(data[up + 1] - data[down + 1]) + Math.abs(data[up + 2] - data[down + 2]);
      const edge = dx * 0.45 + dy * 0.45 + Math.abs(luma - 128) * 0.1;
      if (edge < threshold) continue;
      const wobble = Math.sin(t * 0.01 + x * 0.21 + y * 0.09) * offset;
      const mx = ox + (x - w / 2) * scale * pulse + (w * scale) / 2 + wobble;
      const my = oy + (y - h / 2) * scale * pulse + (h * scale) / 2 + Math.cos(t * 0.008 + x * 0.11) * offset;
      const nearScan = Math.max(0, 1 - Math.abs(my - scanY) / 90);
      ctx.globalAlpha = 0.42 + state.energy * 0.28 + nearScan * 0.42;
      ctx.beginPath();
      ctx.moveTo(mx - 1.4 - state.energy * 5, my);
      ctx.lineTo(mx + 1.4 + state.energy * 5, my + Math.sin(t * 0.01 + y) * state.energy * 6);
      ctx.stroke();

      const vx = x * px;
      const vy = y * py;
      cameraPreviewCtx.beginPath();
      cameraPreviewCtx.moveTo(vx - 1.5, vy);
      cameraPreviewCtx.lineTo(vx + 1.5, vy);
      cameraPreviewCtx.stroke();
    }
  }
  ctx.restore();
}

async function requestModelIntent(prompt) {
  const response = await fetch("/api/visual-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) throw new Error("模型接口还没配置");
  const data = await response.json();
  if (!data.intent) throw new Error(data.error || "模型没有返回视觉参数");
  return data.intent;
}

function readMic() {
  if (!state.analyser || !state.data) return;
  state.analyser.getByteFrequencyData(state.data);
  let low = 0;
  let mid = 0;
  let high = 0;
  const third = Math.floor(state.data.length / 3);
  for (let i = 0; i < state.data.length; i += 1) {
    const v = state.data[i] / 255;
    if (i < third) low += v;
    else if (i < third * 2) mid += v;
    else high += v;
  }
  low /= third;
  mid /= third;
  high /= state.data.length - third * 2;
  const sensitivity = Number(controls.sensitivity.value) / 100;
  state.micEnergy = Math.min(1, (low * 0.52 + mid * 0.34 + high * 0.14) * sensitivity * 1.8);
  state.micValence = Math.min(1, Math.max(0, 0.38 + high * 0.82 - low * 0.24 + mid * 0.16));
}

async function enableMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    state.audio = new AudioContext();
    const source = state.audio.createMediaStreamSource(stream);
    state.analyser = state.audio.createAnalyser();
    state.analyser.fftSize = 1024;
    state.data = new Uint8Array(state.analyser.frequencyBinCount);
    source.connect(state.analyser);
    state.micStream = stream;
    state.micEnabled = true;
    micButton.classList.add("active");
    micButton.innerHTML = '<span class="icon">◼</span> 关闭麦克风';
    audioState.textContent = "microphone emotion";
  } catch (error) {
    audioState.textContent = "mic permission needed";
  }
}

function disableMic() {
  state.micStream?.getTracks().forEach((track) => track.stop());
  state.audio?.close?.();
  state.micStream = null;
  state.audio = null;
  state.analyser = null;
  state.data = null;
  state.micEnabled = false;
  state.micEnergy = 0;
  state.micValence = 0.5;
  micButton.classList.remove("active");
  micButton.innerHTML = '<span class="icon">◉</span> 开启麦克风';
  audioState.textContent = "internal pulse";
}

function toggleMic() {
  if (state.micEnabled) disableMic();
  else enableMic();
}

function drawBackground(t) {
  if (state.source === "camera") {
    ctx.fillStyle = "rgba(0,0,0,0.46)";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.save();
    ctx.globalAlpha = 0.08 + state.energy * 0.1;
    ctx.strokeStyle = "rgba(255,255,255,0.58)";
    ctx.lineWidth = 1;
    const gap = 58;
    for (let x = 0; x < state.width; x += gap) {
      ctx.beginPath();
      ctx.moveTo(x + Math.sin(t * 0.001 + x) * 8, 0);
      ctx.lineTo(x, state.height);
      ctx.stroke();
    }
    for (let y = 0; y < state.height; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(state.width, y + Math.cos(t * 0.001 + y) * 8);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  const fadeAlpha = state.source === "feedback" ? 0.22 : 1;
  if (fadeAlpha < 1) {
    ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
    ctx.fillRect(0, 0, state.width, state.height);
  }
  const gradient = ctx.createRadialGradient(
    state.width * 0.5,
    state.height * 0.45,
    20,
    state.width * 0.5,
    state.height * 0.5,
    Math.max(state.width, state.height) * 0.72,
  );
  gradient.addColorStop(0, "rgba(9, 18, 24, 1)");
  gradient.addColorStop(0.52, "rgba(2, 4, 7, 1)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 1)");
  ctx.fillStyle = gradient;
  ctx.globalAlpha = fadeAlpha < 1 ? 0.38 : 1;
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.globalAlpha = 0.17 + state.energy * 0.18;
  ctx.strokeStyle = state.palette[0];
  ctx.lineWidth = 1;
  const gap = 42;
  for (let x = -gap; x < state.width + gap; x += gap) {
    const wave = Math.sin(t * 0.0004 + x * 0.015) * 14;
    ctx.beginPath();
    ctx.moveTo(x + wave, 0);
    ctx.lineTo(x - wave, state.height);
    ctx.stroke();
  }
  ctx.restore();

  if (state.source === "gradient") {
    const wash = ctx.createLinearGradient(0, 0, state.width, state.height);
    wash.addColorStop(0, `${state.palette[0]}18`);
    wash.addColorStop(0.48, "rgba(255,255,255,0)");
    wash.addColorStop(1, `${state.palette[1]}16`);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, state.width, state.height);
  }

  if (state.source === "image" && state.imageReady) drawImageTexture(t);
}

function drawImageTexture(t) {
  const scale = Math.max(state.width / sourceImage.width, state.height / sourceImage.height);
  const w = sourceImage.width * scale;
  const h = sourceImage.height * scale;
  const x = (state.width - w) / 2 + Math.sin(t * 0.00018) * state.energy * 22;
  const y = (state.height - h) / 2 + Math.cos(t * 0.00021) * state.valence * 18;

  ctx.save();
  ctx.globalAlpha = 0.2 + state.energy * 0.18;
  ctx.filter = `blur(${10 + state.valence * 10}px) saturate(${1.5 + state.energy * 0.9}) contrast(1.12)`;
  ctx.drawImage(sourceImage, x, y, w, h);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.18 + state.valence * 0.18;
  ctx.drawImage(sourceImage, x - w * 0.015, y, w * 1.03, h);
  ctx.restore();
}

function drawVjOverlays(t) {
  const intensity = state.energy * state.contrast;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  if (state.kaleid >= 5) {
    const bands = Math.min(12, Math.floor(state.kaleid));
    for (let i = 0; i < bands; i += 1) {
      const y = (i / bands) * state.height + Math.sin(t * 0.002 + i) * 22;
      ctx.fillStyle = i % 2 ? `${state.palette[0]}18` : `${state.palette[1]}16`;
      ctx.fillRect(0, y, state.width, 2 + intensity * 16);
    }
  }
  if (state.contrast > 1.35) {
    ctx.globalAlpha = Math.min(0.32, (state.contrast - 1) * 0.24 + state.energy * 0.18);
    ctx.fillStyle = state.palette[2];
    const flash = Math.max(0, Math.sin(t * 0.012) - 0.92) * 10;
    if (flash > 0) ctx.fillRect(0, 0, state.width, state.height);
  }
  if (state.source === "feedback") {
    ctx.globalAlpha = 0.18 + state.energy * 0.16;
    ctx.strokeStyle = state.palette[1];
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i += 1) {
      const x = ((t * 0.04 + i * 73) % (state.width + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + Math.sin(t * 0.001 + i) * 90, state.height);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function paletteForName(name) {
  if (name === "image" && state.imagePalette) return state.imagePalette;
  return palettes[name] || state.palette || palettes.cyan;
}

function drawNamedLayer(t, layer, index = 0, alpha = 0.35) {
  const style = layer.style || layer.name || "aura";
  const palette = paletteForName(layer.theme);
  const cx = state.width * (0.5 + Math.sin(t * 0.0002 + index) * 0.035);
  const cy = state.height * (0.5 + Math.cos(t * 0.00024 + index) * 0.035);
  const base = Math.min(state.width, state.height) * (0.17 + (layer.complexity || 7) * 0.012);
  const speed = (layer.speed || Number(controls.speed.value)) / 100;
  const glow = layer.glow || Number(controls.glow.value);

  ctx.save();
  ctx.globalCompositeOperation = layer.mode || "lighter";
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = glow * 0.65;
  ctx.shadowColor = palette[index % palette.length];

  if (style === "crystal" || style === "voronoi") {
    const shards = 24 + (layer.complexity || 8) * 4;
    for (let i = 0; i < shards; i += 1) {
      const a = (i / shards) * Math.PI * 2 + t * 0.00035 * speed + index;
      const inner = base * (0.45 + Math.sin(t * 0.001 + i) * 0.08);
      const outer = base * (1.2 + Math.cos(t * 0.0008 + i) * 0.24);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner * 0.72);
      ctx.lineTo(cx + Math.cos(a + 0.1) * outer, cy + Math.sin(a + 0.1) * outer * 0.72);
      ctx.lineTo(cx + Math.cos(a + 0.22) * inner, cy + Math.sin(a + 0.22) * inner * 0.72);
      ctx.closePath();
      ctx.strokeStyle = palette[i % palette.length];
      ctx.stroke();
    }
  } else if (style === "pulse" || style === "feedback") {
    for (let i = 0; i < 11; i += 1) {
      const phase = (t * 0.00028 * speed + i / 11 + index * 0.13) % 1;
      ctx.strokeStyle = palette[i % palette.length];
      ctx.lineWidth = 1 + (1 - phase) * 5;
      ctx.beginPath();
      ctx.arc(cx, cy, phase * base * 3.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (style === "silk") {
    for (let row = 0; row < 16; row += 1) {
      ctx.beginPath();
      const y = state.height * (0.14 + row * 0.05);
      for (let x = -40; x <= state.width + 40; x += 18) {
        const wave = Math.sin(x * 0.012 + t * 0.0013 * speed + row + index) * (22 + state.energy * 78);
        x === -40 ? ctx.moveTo(x, y + wave) : ctx.lineTo(x, y + wave);
      }
      ctx.strokeStyle = palette[row % palette.length];
      ctx.stroke();
    }
  } else if (style === "veil" || style === "noise") {
    for (let i = 0; i < 34; i += 1) {
      const x = ((i * 83 + t * 0.025 * speed) % (state.width + 180)) - 90;
      const y = state.height * ((Math.sin(i * 3.1 + index) + 1) / 2);
      const gradient = ctx.createLinearGradient(x - 120, y, x + 160, y + 70);
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(0.5, `${palette[i % palette.length]}55`);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 130, y - 40, 300, 90);
    }
  } else {
    for (let i = 0; i < 8; i += 1) {
      const r = base * (0.72 + i * 0.18 + Math.sin(t * 0.0007 + i + index) * 0.04);
      ctx.strokeStyle = palette[i % palette.length];
      ctx.lineWidth = 1.2 + state.energy * 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.25, r * 0.55, t * 0.00024 + i * 0.18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawStackLayers(t) {
  if (state.blend) {
    drawNamedLayer(t, { name: state.blend, theme: "magenta", complexity: Number(controls.complexity.value) + 1, speed: Number(controls.speed.value) }, 41, Math.max(0.16, state.blendAmount));
  }
  if (state.modulate) {
    drawNamedLayer(t, { name: state.modulate, theme: "lime", complexity: Number(controls.complexity.value), speed: Number(controls.speed.value) + 20, mode: "screen" }, 73, Math.max(0.12, state.modulateAmount));
  }
  state.layers.forEach((layer, index) => {
    drawNamedLayer(t, layer, index, 0.2 + Math.min(0.38, (layer.blendAmount || 0.28)));
  });
}

function drawCore(t) {
  const cx = state.width * 0.48;
  const cy = state.height * 0.52;
  const base = Math.min(state.width, state.height) * (0.2 + state.energy * 0.08);
  const complexity = Number(controls.complexity.value);
  const glow = Number(controls.glow.value);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = glow;
  ctx.shadowColor = state.palette[0];

  for (let ring = 0; ring < 3; ring += 1) {
    ctx.beginPath();
    const radius = base * (0.84 + ring * 0.27);
    for (let i = 0; i <= 540; i += 1) {
      const a = (i / 540) * Math.PI * 2;
      const harmonic = Math.sin(a * complexity * state.kaleid + t * 0.0014) * 34 * state.energy * state.contrast;
      const counter = Math.cos(a * (complexity - 2) - t * 0.001) * 22 * state.valence * state.contrast;
      const r = radius + harmonic + counter;
      const x = cx + Math.cos(a + state.rotation) * r;
      const y = cy + Math.sin(a + state.rotation) * r * (0.58 + ring * 0.08);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = ring % 2 ? state.palette[1] : state.palette[0];
    ctx.lineWidth = 1.25 + state.energy * 3;
    ctx.stroke();
  }

  const pulse = ctx.createRadialGradient(cx, cy, 0, cx, cy, base * 1.3);
  pulse.addColorStop(0, `${state.palette[2]}cc`);
  pulse.addColorStop(0.25, `${state.palette[0]}55`);
  pulse.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = pulse;
  ctx.globalAlpha = 0.24 + state.energy * 0.28;
  ctx.beginPath();
  ctx.arc(cx, cy, base * 1.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAura(t) {
  const cx = state.width * 0.48;
  const cy = state.height * 0.5;
  const max = Math.min(state.width, state.height) * 0.54;
  const glow = Number(controls.glow.value);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = glow * 1.2;
  for (let i = 0; i < 9; i += 1) {
    const breath = Math.sin(t * 0.0007 + i * 0.72) * 0.08;
    const r = max * (0.18 + i * 0.07 + breath + state.energy * 0.045);
    const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    g.addColorStop(0, `${state.palette[i % 2]}22`);
    g.addColorStop(0.62, `${state.palette[i % 2]}10`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.18, r * 0.56, t * 0.00018 + i * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawSilk(t) {
  const speed = Number(controls.speed.value) / 100;
  const rows = 18;
  const amp = 32 + state.energy * 80;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 1.2 + state.energy * 1.8;
  ctx.shadowBlur = Number(controls.glow.value) * 0.65;
  for (let row = 0; row < rows; row += 1) {
    const y = state.height * (0.18 + row / rows * 0.68);
    ctx.beginPath();
    for (let x = -20; x <= state.width + 20; x += 12) {
      const wave = Math.sin(x * 0.013 + t * 0.0012 * speed + row * 0.56) * amp;
      const fold = Math.cos(x * 0.006 - t * 0.0009 + row) * amp * 0.42;
      const yy = y + wave + fold;
      if (x === -20) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = row % 2 ? `${state.palette[1]}bb` : `${state.palette[0]}bb`;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCrystal(t) {
  const cx = state.width * 0.48;
  const cy = state.height * 0.52;
  const complexity = Number(controls.complexity.value);
  const shards = complexity * 5;
  const base = Math.min(state.width, state.height) * (0.18 + state.energy * 0.13);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = Number(controls.glow.value) * 0.85;
  for (let i = 0; i < shards; i += 1) {
    const a = (i / shards) * Math.PI * 2 + t * 0.00022;
    const inner = base * (0.55 + Math.sin(t * 0.001 + i) * 0.1);
    const outer = base * (1.35 + Math.cos(t * 0.0008 + i * 1.7) * 0.26);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner * 0.72);
    ctx.lineTo(cx + Math.cos(a + 0.08) * outer, cy + Math.sin(a + 0.08) * outer * 0.72);
    ctx.lineTo(cx + Math.cos(a + 0.18) * inner * 0.82, cy + Math.sin(a + 0.18) * inner * 0.72);
    ctx.closePath();
    ctx.strokeStyle = i % 3 === 0 ? state.palette[2] : i % 2 ? state.palette[1] : state.palette[0];
    ctx.globalAlpha = 0.28 + state.energy * 0.58;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPulse(t) {
  const cx = state.width * 0.48;
  const cy = state.height * 0.52;
  const beat = (t * (0.00022 + state.energy * 0.0002)) % 1;
  const max = Math.min(state.width, state.height) * 0.62;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowBlur = Number(controls.glow.value) * 0.75;
  for (let i = 0; i < 8; i += 1) {
    const phase = (beat + i / 8) % 1;
    const r = phase * max;
    ctx.globalAlpha = (1 - phase) * (0.18 + state.energy * 0.56);
    ctx.strokeStyle = i % 2 ? state.palette[1] : state.palette[0];
    ctx.lineWidth = 1 + (1 - phase) * 5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.2 + state.energy * 0.35;
  ctx.strokeStyle = state.palette[2];
  for (let x = 0; x < state.width; x += 34) {
    const height = Math.sin(x * 0.025 + t * 0.004) * state.energy * 120;
    ctx.beginPath();
    ctx.moveTo(x, cy - height);
    ctx.lineTo(x, cy + height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawVeil(t) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 42; i += 1) {
    const y = ((i * 47 + t * 0.018) % (state.height + 160)) - 80;
    const x = state.width * (0.12 + 0.76 * ((Math.sin(i * 12.989) + 1) / 2));
    const w = 180 + Math.sin(i) * 80;
    const gradient = ctx.createLinearGradient(x - w, y, x + w, y + 70);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.5, `${state.palette[i % 2]}22`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.1 + state.valence * 0.18;
    ctx.fillRect(x - w, y, w * 2, 80);
  }
  ctx.restore();
}

function drawImageRibbons(t) {
  if (!state.imageReady) return;
  const complexity = Number(controls.complexity.value);
  const rows = Math.max(8, complexity * 2);
  const speed = Number(controls.speed.value) / 100;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineWidth = 1.15 + state.energy * 2.2;
  ctx.shadowBlur = Number(controls.glow.value) * 0.6;
  for (let row = 0; row < rows; row += 1) {
    const sy = Math.floor((row / rows) * (sourceImageCanvas.height - 1));
    const sample = sourceImageCtx.getImageData(0, sy, sourceImageCanvas.width, 1).data;
    const channel = sample[(row * 37 * 4) % sample.length] / 255;
    const baseY = state.height * (0.16 + (row / rows) * 0.68);
    ctx.beginPath();
    for (let x = -40; x <= state.width + 40; x += 16) {
      const sampleX = Math.floor(((x / state.width + 1) % 1) * (sourceImageCanvas.width - 1));
      const index = sampleX * 4;
      const luma = (sample[index] * 0.2126 + sample[index + 1] * 0.7152 + sample[index + 2] * 0.0722) / 255;
      const wave = Math.sin(x * 0.011 + t * 0.0011 * speed + row) * (18 + state.energy * 70);
      const lift = (luma - 0.5) * 82 * state.contrast;
      x === -40 ? ctx.moveTo(x, baseY + wave + lift) : ctx.lineTo(x, baseY + wave + lift);
    }
    ctx.strokeStyle = state.palette[row % state.palette.length];
    ctx.globalAlpha = 0.12 + channel * 0.22 + state.energy * 0.22;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMaterial(t) {
  if (state.source === "image") drawImageRibbons(t);
  if (state.style === "aura") drawAura(t);
  if (state.style === "silk") drawSilk(t);
  if (state.style === "crystal") drawCrystal(t);
  if (state.style === "pulse") drawPulse(t);
  if (state.style === "veil") drawVeil(t);
}

function drawParticles(t) {
  const cx = state.width * 0.48;
  const cy = state.height * 0.52;
  const radius = Math.min(state.width, state.height) * 0.42;
  const speed = Number(controls.speed.value) / 100;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const p of state.particles) {
    const a = p.phase + t * 0.00018 * speed * (1 + p.orbit) + Math.sin(p.seed) * 0.02;
    const wobble = Math.sin(t * 0.001 + p.seed) * radius * 0.08 * state.valence;
    const r = radius * p.orbit + wobble;
    const x = cx + Math.cos(a * (1 + state.energy * 0.22)) * r;
    const y = cy + Math.sin(a * 1.7) * r * 0.54;
    const alpha = 0.18 + state.energy * 0.62;
    ctx.fillStyle = p.seed % 3 > 1 ? state.palette[1] : state.palette[0];
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    const size = p.size * (0.8 + state.energy * 1.6);
    if (state.source === "shape") ctx.rect(x - size, y - size, size * 2, size * 2);
    else if (state.source === "voronoi") {
      ctx.moveTo(x, y - size * 1.6);
      ctx.lineTo(x + size * 1.5, y);
      ctx.lineTo(x, y + size * 1.6);
      ctx.lineTo(x - size * 1.5, y);
      ctx.closePath();
    } else ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function updateHud() {
  const energy = Math.round(state.energy * 100);
  const valence = Math.round(state.valence * 100);
  energyMeter.value = energy;
  valenceMeter.value = valence;
  bpmValue.textContent = Math.round(96 + state.energy * 72);

  if (energy > 72 && valence > 58) emotionLabel.textContent = "EUPHORIC";
  else if (energy > 68) emotionLabel.textContent = "TENSE";
  else if (valence > 68) emotionLabel.textContent = "OPEN";
  else if (energy < 28) emotionLabel.textContent = "CALM";
  else emotionLabel.textContent = "FOCUSED";
}

function animate(t = 0) {
  state.time = t;
  readMic();
  const internal = 0.22 + Math.sin(t * 0.0017) * 0.08 + Math.sin(t * 0.00071) * 0.09;
  const targetEnergy = state.micEnabled ? state.micEnergy : internal;
  const targetValence = state.micEnabled ? state.micValence : 0.54 + Math.sin(t * 0.00045) * 0.18;
  state.energy += (targetEnergy - state.energy) * 0.08;
  state.valence += (targetValence - state.valence) * 0.05;

  drawBackground(t);
  if (state.source === "camera") {
    drawCameraContours(t);
  } else {
    drawMaterial(t);
    if (state.source !== "none") drawParticles(t);
    if (state.style === "harmonic" || state.style === "aura" || state.style === "veil") drawCore(t);
    if (state.style === "silk") drawAura(t);
    if (state.style === "crystal" || state.style === "pulse") drawCore(t);
    drawStackLayers(t);
    drawVjOverlays(t);
  }
  updateHud();
  requestAnimationFrame(animate);
}

function readTemplates() {
  try {
    return JSON.parse(localStorage.getItem(templateStorageKey) || "[]");
  } catch (error) {
    return [];
  }
}

function writeTemplates(templates) {
  localStorage.setItem(templateStorageKey, JSON.stringify(templates));
}

function renderTemplates() {
  const templates = readTemplates();
  templateList.innerHTML = "";
  if (!templates.length) {
    templateList.innerHTML = '<div class="prompt-status">还没有保存模板</div>';
    return;
  }
  templates.forEach((template) => {
    const row = document.createElement("div");
    row.className = "template-item";
    row.innerHTML = `
      <span class="template-title">${template.name}</span>
      <button class="mini-button" type="button" data-use="${template.id}">套用</button>
      <button class="danger-button" type="button" data-delete="${template.id}">删除</button>
    `;
    templateList.appendChild(row);
  });
}

function saveCurrentTemplate() {
  const templates = readTemplates();
  const name = templateName.value.trim() || `VJ 模板 ${templates.length + 1}`;
  const template = {
    id: `${Date.now()}`,
    name,
    intent: captureIntent(),
  };
  writeTemplates([template, ...templates].slice(0, 24));
  templateName.value = "";
  templateStatus.textContent = `已保存：${name}`;
  renderTemplates();
}

function useTemplate(id) {
  const template = readTemplates().find((item) => item.id === id);
  if (!template) return;
  applyIntent(template.intent);
  hydraCode.value = template.intent.code || codeFromIntent(template.intent);
  templateStatus.textContent = `已套用：${template.name}`;
}

function deleteTemplate(id) {
  const templates = readTemplates();
  const target = templates.find((item) => item.id === id);
  writeTemplates(templates.filter((item) => item.id !== id));
  templateStatus.textContent = target ? `已删除：${target.name}` : "已删除模板";
  renderTemplates();
}

function renderLayers() {
  layerList.innerHTML = "";
  if (!state.layers.length) {
    layerList.innerHTML = '<div class="prompt-status">暂无叠加效果</div>';
    return;
  }
  state.layers.forEach((layer, index) => {
    const row = document.createElement("div");
    row.className = "layer-item";
    row.innerHTML = `
      <span class="layer-title">${index + 1}. ${layer.style || layer.source || "effect"} / ${layer.theme || "current"}</span>
      <button class="danger-button" type="button" data-layer-delete="${index}">删除</button>
    `;
    layerList.appendChild(row);
  });
}

function addCurrentLayer() {
  const layer = captureIntent();
  layer.blendAmount = Math.max(0.26, layer.blendAmount || 0.32);
  state.layers = [layer, ...state.layers].slice(0, 8);
  renderLayers();
  codeStatus.textContent = `已叠加：${layer.style}`;
}

function clearLayers() {
  state.layers = [];
  renderLayers();
  codeStatus.textContent = "已清空叠加效果";
}

micButton.addEventListener("click", toggleMic);
document.querySelectorAll(".preset").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.classList.contains("active")) {
      clearDefaultEffects();
    } else {
      applyPreset(button.dataset.preset);
    }
  });
});
document.querySelectorAll(".swatch").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".swatch").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    setTheme(button.dataset.theme);
  });
});
document.querySelectorAll(".style-chip").forEach((button) => {
  button.addEventListener("click", () => {
    markPresetActive(null);
    if (button.classList.contains("active")) {
      setStyle("none", true);
      templateStatus.textContent = "素材效果已关闭";
    } else {
      state.source = "osc";
      setStyle(button.dataset.style, true);
      templateStatus.textContent = "素材效果已开启";
    }
  });
});
controls.density.addEventListener("input", seedParticles);
imageInput.addEventListener("change", (event) => loadImageSource(event.target.files[0]));
imageCodeButton.addEventListener("click", writeImageVisualCode);
cameraButton.addEventListener("click", toggleCamera);
stageModeButton.addEventListener("click", toggleStageMode);
dragHandle.addEventListener("pointerdown", (event) => {
  const rect = controlPanel.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  dragHandle.setPointerCapture(event.pointerId);
  const move = (moveEvent) => {
    setPanelPosition(moveEvent.clientX - offsetX, moveEvent.clientY - offsetY);
  };
  const up = () => {
    dragHandle.removeEventListener("pointermove", move);
    dragHandle.removeEventListener("pointerup", up);
    dragHandle.removeEventListener("pointercancel", up);
  };
  dragHandle.addEventListener("pointermove", move);
  dragHandle.addEventListener("pointerup", up);
  dragHandle.addEventListener("pointercancel", up);
});

promptButton.addEventListener("click", async () => {
  const text = visualPrompt.value.trim();
  if (!text) {
    promptStatus.textContent = "先输入一句画面描述";
    return;
  }
  promptStatus.textContent = modelMode.checked ? "asking model..." : "parsing locally...";
  try {
    const intent = modelMode.checked ? await requestModelIntent(text) : parseNaturalVisual(text);
    intent.custom = true;
    applyIntent(intent);
    hydraCode.value = codeFromIntent(intent);
    codeStatus.textContent = "已自动生成 VJ 配方";
    promptStatus.textContent = intent.summary || "visual updated";
  } catch (error) {
    const intent = parseNaturalVisual(text);
    intent.custom = true;
    applyIntent(intent);
    hydraCode.value = codeFromIntent(intent);
    codeStatus.textContent = "已自动生成本地 VJ 配方";
    promptStatus.textContent = `${error.message}，已用本地解析`;
  }
});

codeRunButton.addEventListener("click", () => {
  try {
    if (runHydraCode(hydraCode.value)) {
      codeStatus.textContent = "真实 Hydra VJ 已运行";
      return;
    }
  } catch (error) {
    codeStatus.textContent = "Hydra 原生不支持该写法，已尝试 xindongOS 渲染";
  }
  try {
    const intent = parseHydraChain(hydraCode.value);
    intent.custom = true;
    applyIntent(intent);
    codeStatus.textContent = intent.summary;
  } catch (error) {
    codeStatus.textContent = "视觉代码格式需要像 osc(18).kaleid(6).out()";
  }
});

codeAiButton.addEventListener("click", async () => {
  const text = visualPrompt.value.trim() || "做一个空灵、律动、适合电子音乐现场的画面";
  promptStatus.textContent = modelMode.checked ? "asking model..." : "用本地语义生成代码";
  try {
    const intent = modelMode.checked ? await requestModelIntent(text) : parseNaturalVisual(text);
    intent.custom = true;
    applyIntent(intent);
    hydraCode.value = codeFromIntent(intent);
    promptStatus.textContent = "已生成 Hydra 风格代码";
  } catch (error) {
    promptStatus.textContent = `${error.message}，请先配置模型接口`;
  }
});

const hydraExamples = [
  'osc(18, 0.08, 0.8).kaleid(6).rotate(() => time * 0.12).modulate(noise(3), 0.18).color(0.2, 0.9, 1.0).out()',
  'shape(5, 0.35, 0.02).repeat(4, 3).rotate(() => time * 0.2).modulate(osc(12), 0.08).color(1, 0.2, 0.85).out()',
  'noise(4, 0.22).colorama(0.3).posterize(4, 0.6).modulate(osc(9, 0.1), 0.22).out()',
  'voronoi(8, 0.45, 0.12).kaleid(9).modulate(noise(2), 0.35).color(0.55, 0.4, 1).out()',
  'gradient(1).hue(() => time * 0.05).modulate(osc(16, 0.04), 0.18).blend(osc(8).kaleid(5), 0.45).out()',
  'osc(30, 0.03, 0.9).modulateRotate(shape(3).repeat(5, 5), 0.18).diff(noise(2).posterize(3)).out()',
];
let exampleIndex = 0;
exampleButton.addEventListener("click", () => {
  exampleIndex = (exampleIndex + 1) % hydraExamples.length;
  hydraCode.value = hydraExamples[exampleIndex];
  try {
    runHydraCode(hydraCode.value);
    codeStatus.textContent = "真实 Hydra 酷效果已运行";
  } catch (error) {
    codeStatus.textContent = "Hydra 运行失败，请换一个效果";
  }
});

saveTemplateButton.addEventListener("click", saveCurrentTemplate);
templateList.addEventListener("click", (event) => {
  const useId = event.target.dataset.use;
  const deleteId = event.target.dataset.delete;
  if (useId) useTemplate(useId);
  if (deleteId) deleteTemplate(deleteId);
});
addLayerButton.addEventListener("click", addCurrentLayer);
clearLayersButton.addEventListener("click", clearLayers);
layerList.addEventListener("click", (event) => {
  const index = event.target.dataset.layerDelete;
  if (index === undefined) return;
  state.layers.splice(Number(index), 1);
  renderLayers();
  codeStatus.textContent = "已删除叠加效果";
});

window.addEventListener("message", (event) => {
  const payload = event.data;
  if (!payload || payload.type !== "xindongOS.visualIntent") return;
  if (payload.prompt) {
    const intent = parseNaturalVisual(payload.prompt);
    applyIntent(intent);
    promptStatus.textContent = "received music-tool prompt";
  }
  if (payload.intent) {
    applyIntent(payload.intent);
    promptStatus.textContent = "received external visual params";
  }
});

window.addEventListener("resize", resize);
window.addEventListener("resize", resizeHydra);
window.addEventListener("resize", restorePanelPosition);
resize();
restorePanelPosition();
renderTemplates();
renderLayers();
animate();
