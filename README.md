# xindongOS

电子音乐情绪可视化 Web 产品原型。

## 功能

- 全屏混沌谐波视觉，黑底霓虹、粒子轨道、呼吸式核心波形。
- 支持 `NEON`、`LIQUID`、`STORM`、`AETHER`、`SILK`、`RITUAL` 六个视觉预设。
- 支持谐波、空灵、丝绸、晶体、律动、薄雾六种视觉素材层。
- 可微调复杂度、流动速度、霓虹强度、粒子密度、情绪敏感度。
- 支持麦克风输入，通过 Web Audio 分析能量和频段倾向，实时改变画面情绪。
- 支持自然语言编辑画面，本地规则可直接使用，部署后可接模型 API。
- 内置代码编辑器 / AI VJ 配方，可运行类似 `osc(18).kaleid(6).aura().color("aether").out()` 的安全视觉链式语法，也能由自然语言自动生成后再手动微调。
- 已内置真实 `hydra-synth` 浏览器版，支持原生 Hydra VJ 代码，如 `osc().kaleid().modulate().out()`。
- 代码、图片、摄像头会进入自定义创作状态，不再挂在默认预设下面。
- 摄像头轮廓源会把人影/物品抽成白色线框，并随音乐能量呼吸和变形。
- 编辑面板支持拖拽换位置，并支持演出模式隐藏全部编辑 UI，只保留画面。
- 支持 `window.postMessage` 联动外部音乐工具，接收自然语言 prompt 或结构化 visual intent。
- 纯静态实现，可直接部署到 Cloudflare Pages、Vercel、Netlify 或任意静态服务器。

## 外部音乐工具联动

朋友的音乐工具可以把生成的音乐情绪发给 xindongOS：

```js
window.postMessage({
  type: "xindongOS.visualIntent",
  prompt: "这段音乐是空灵、缓慢、有水晶感的律动"
});
```

也可以直接传结构化参数：

```js
window.postMessage({
  type: "xindongOS.visualIntent",
  intent: {
    style: "aura",
    theme: "aether",
    complexity: 5,
    speed: 36,
    glow: 96,
    density: 420,
    sensitivity: 80
  }
});
```

## 模型接口

部署到 Cloudflare Pages 后，如果用 OpenAI 兼容接口，在环境变量里配置：

```text
MODEL_PROVIDER=openai
MODEL_API_URL=https://api.openai.com/v1/chat/completions
MODEL_API_KEY=你的服务端密钥
MODEL_NAME=gpt-4o-mini
```

如果用 Google Generative AI 兼容接口，例如：

```python
genai.configure(
    api_key="sk-你的tenant-key",
    transport="rest",
    client_options={"api_endpoint": "https://agentllm.linkyun.co/v1beta/google"}
)
model = genai.GenerativeModel("nano-banana-pro-preview")
```

对应的 Cloudflare Pages 环境变量是：

```text
MODEL_PROVIDER=google
MODEL_API_URL=https://agentllm.linkyun.co/v1beta/google
MODEL_API_KEY=sk-你的tenant-key
MODEL_NAME=nano-banana-pro-preview
```

浏览器不会直接看到 `MODEL_API_KEY`。

## 本地运行

静态预览：

```bash
python3 -m http.server 4273
```

然后访问：

```text
http://localhost:4273
```

本地测试模型接口：

1. 创建 `.dev.vars`，按 `.dev.vars.example` 填入服务端 key。
2. 运行：

```bash
/Users/wcg/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node local-server.mjs
```

3. 访问：

```text
http://localhost:4274
```

麦克风功能需要在浏览器里授权。多数浏览器要求页面运行在 `localhost` 或 HTTPS 环境下。

## 云服务器部署

普通云服务器可以直接运行内置 Node 服务：

```bash
MODEL_PROVIDER=google \
MODEL_API_URL=https://agentllm.linkyun.co/v1beta/google \
MODEL_API_KEY=你的服务端密钥 \
MODEL_NAME=nano-banana-pro-preview \
PORT=8080 \
node local-server.mjs
```

也可以用 Docker：

```bash
docker build -t xindongos .
docker run -d --name xindongos -p 8080:8080 \
  -e MODEL_PROVIDER=google \
  -e MODEL_API_URL=https://agentllm.linkyun.co/v1beta/google \
  -e MODEL_API_KEY=你的服务端密钥 \
  -e MODEL_NAME=nano-banana-pro-preview \
  xindongos
```

摄像头和麦克风在公网访问时通常需要 HTTPS；生产环境建议用 Nginx/Caddy 反向代理并配置 TLS。
