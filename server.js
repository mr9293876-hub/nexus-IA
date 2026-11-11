require('dotenv').config();

const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const REQUEST_TIMEOUT_MS = Math.min(Math.max(Number(process.env.NEXUS_REQUEST_TIMEOUT_MS || 6000), 2000), 8000);
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '*').split(',').map((value) => value.trim()).filter(Boolean);
const providerOrder = (process.env.NEXUS_PROVIDER_ORDER || 'gemini,groq,openrouter,deepseek')
  .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (CORS_ORIGINS.includes('*') || (origin && CORS_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGINS.includes('*') ? '*' : origin);
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html' || req.path === '/untitled-bridge.js') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

const clients = new Set();
let untitledSocket = null;
let untitledReconnectTimer = null;
let untitledState = 'disabled';

function safeJson(value) {
  try { return JSON.stringify(value); } catch { return '{}'; }
}

function broadcast(message, { exclude } = {}) {
  const serialized = safeJson(message);
  for (const client of clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) client.send(serialized);
  }
}

function sendToUntitled(message) {
  if (untitledSocket && untitledSocket.readyState === WebSocket.OPEN) {
    untitledSocket.send(safeJson(message));
    return true;
  }
  return false;
}

function connectUntitled() {
  const url = process.env.UNTITLED_WS_URL;
  if (!url) {
    untitledState = 'disabled';
    return;
  }
  if (untitledSocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(untitledSocket.readyState)) return;

  untitledState = 'connecting';
  try {
    untitledSocket = new WebSocket(url, process.env.UNTITLED_WS_PROTOCOL || undefined, {
      handshakeTimeout: 8000,
      headers: process.env.UNTITLED_WS_TOKEN ? { Authorization: `Bearer ${process.env.UNTITLED_WS_TOKEN}` } : undefined
    });
    untitledSocket.on('open', () => {
      untitledState = 'connected';
      untitledSocket.send(safeJson({ type: 'nexus:hello', source: 'nexus-core', version: '1.0.0' }));
      broadcast({ type: 'untitled:status', status: untitledState });
    });
    untitledSocket.on('message', (raw) => {
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      broadcast({ ...message, source: 'untitled' });
    });
    untitledSocket.on('close', () => {
      untitledState = 'disconnected';
      untitledSocket = null;
      broadcast({ type: 'untitled:status', status: untitledState });
      clearTimeout(untitledReconnectTimer);
      untitledReconnectTimer = setTimeout(connectUntitled, 5000);
    });
    untitledSocket.on('error', (error) => {
      console.warn('[Untitled] conexão falhou:', error.message);
      untitledState = 'error';
    });
  } catch (error) {
    console.warn('[Untitled] URL inválida:', error.message);
    untitledState = 'error';
  }
}

function withTimeout(promise, timeoutMs = REQUEST_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout após ${timeoutMs}ms`)), timeoutMs))
  ]);
}

function requireKey(name) {
  const value = String(process.env[name] || '').trim().replace(/\s+/g, '');
  if (!value) throw new Error(`${name} não configurada`);
  if (/[\r\n]/.test(value)) throw new Error(`${name} inválida`);
  return value;
}

function publicProviderError(error) {
  const message = String(error?.message || error).replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]');
  return message.replace(/sk-[a-z0-9_-]+/gi, '[redacted]').slice(0, 300);
}

async function callOpenAICompatible({ url, keyName, model, prompt, headers = {} }) {
  const response = await withTimeout(fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${requireKey(keyName)}`, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2 })
  }));
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${keyName}: HTTP ${response.status} ${data?.error?.message || ''}`.trim());
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${keyName}: resposta vazia`);
  return text;
}

async function callProvider(provider, prompt) {
  if (provider === 'gemini') {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY não configurada');
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await withTimeout(ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: `Atue como o núcleo Nexus. Responda em Português do Brasil, com objetividade. Pedido: ${prompt}`
    }));
    if (!response?.text) throw new Error('Gemini: resposta vazia');
    return response.text;
  }
  if (provider === 'groq') {
    return callOpenAICompatible({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      keyName: 'GROQ_API_KEY', model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', prompt
    });
  }
  if (provider === 'openrouter') {
    return callOpenAICompatible({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      keyName: 'OPENROUTER_API_KEY', model: process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat', prompt,
      headers: { 'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000', 'X-Title': 'NEXUS Core' }
    });
  }
  if (provider === 'deepseek') {
    return callOpenAICompatible({
      url: 'https://api.deepseek.com/chat/completions',
      keyName: 'DEEPSEEK_API_KEY', model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', prompt
    });
  }
  throw new Error(`provider desconhecido: ${provider}`);
}

async function consultarInteligenciaCentral(prompt) {
  const failures = [];
  for (const provider of providerOrder) {
    try {
      const text = await callProvider(provider, prompt);
      return { text, provider };
    } catch (error) {
      failures.push(`${provider}: ${publicProviderError(error)}`);
      console.warn(`[Nexus Failover] ${failures.at(-1)}`);
    }
  }
  throw new Error(`Pool de IA indisponível. ${failures.join(' | ')}`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

function localGameHtml() {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#050510;color:#00f3ff;font:14px monospace;overflow:hidden}canvas{width:100%;height:100%;display:block}#hint{position:fixed;top:12px;left:12px;background:#000b;padding:8px;border:1px solid #00f3ff}</style></head><body><div id="hint">NEXUS OFFLINE GAME // setas ou WASD</div><canvas id="c"></canvas><script>const c=document.querySelector('#c'),x=c.getContext('2d');let p={x:80,y:80},k={};onkeydown=e=>k[e.key.toLowerCase()]=1;onkeyup=e=>k[e.key.toLowerCase()]=0;function r(){c.width=innerWidth;c.height=innerHeight}onresize=r;r();function loop(){p.x+=((k.d||k.arrowright)?4:0)-((k.a||k.arrowleft)?4:0);p.y+=((k.s||k.arrowdown)?4:0)-((k.w||k.arrowup)?4:0);x.fillStyle='#050510';x.fillRect(0,0,c.width,c.height);x.fillStyle='#00f3ff';x.shadowBlur=20;x.shadowColor='#00f3ff';x.fillRect(p.x,p.y,26,26);x.shadowBlur=0;x.fillStyle='#ffd700';x.fillRect(c.width-100,c.height/2,32,32);requestAnimationFrame(loop)}loop();</script></body></html>`;
}

function extractGameHtml(text) {
  const source = String(text || '').trim();
  const fenced = source.match(/```html?\s*([\s\S]*?)```/i);
  const html = fenced ? fenced[1].trim() : source;
  return /<html[\s>]|<canvas[\s>]|<body[\s>]/i.test(html) ? html : null;
}

function isGamePrompt(prompt) {
  return /\b(jogo|game|jogável|arcade|canvas|minecraft|plataforma|platformer|rpg|simulação)\b/i.test(prompt);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nexus-core', port: PORT, websocketClients: clients.size, untitled: untitledState, providers: providerOrder, configuredProviders: providerOrder.filter((provider) => {
    const keys = { gemini: ['GEMINI_API_KEY', 'API_KEY'], groq: ['GROQ_API_KEY'], openrouter: ['OPENROUTER_API_KEY'], deepseek: ['DEEPSEEK_API_KEY'] }[provider] || [];
    return keys.some((key) => String(process.env[key] || '').trim());
  }) });
});

app.get('/api/integrations', (_req, res) => {
  res.json({ untitled: { configured: Boolean(process.env.UNTITLED_WS_URL), status: untitledState }, ngrok: { configured: Boolean(process.env.NGROK_AUTHTOKEN) }, providerOrder });
});

app.post('/api/nexus', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!prompt) return res.status(400).json({ erro: 'Comando vazio.' });

  broadcast({ type: 'nexus:command', prompt, timestamp: Date.now() });
  sendToUntitled({ type: 'nexus:command', prompt, timestamp: Date.now() });

  const t = prompt.toLowerCase();
  if (t.includes('fechar') || t.includes('ocultar')) return res.json({ resposta: 'Painel fechado.', painel: '', action: 'close' });
  if (t.includes('expandir') || t.includes('tela cheia')) return res.json({ resposta: 'Painel expandido.', painel: '', action: 'expand' });
  if (t.includes('teclado')) return res.json({ resposta: 'Teclado ativado.', painel: '', action: 'keyboard' });

  try {
    const requestPrompt = isGamePrompt(prompt)
      ? `Crie um jogo HTML5 jogável em um único documento HTML, sem bibliotecas externas. Pedido: ${prompt}. Retorne somente o HTML completo, com canvas, controles por teclado e visual escuro neon.`
      : prompt;
    const result = await consultarInteligenciaCentral(requestPrompt);
    const gameHtml = isGamePrompt(prompt) ? (extractGameHtml(result.text) || localGameHtml()) : null;
    const safeText = escapeHtml(gameHtml ? 'Jogo gerado e carregado no painel dual.' : result.text);
    const inner = gameHtml ? `<iframe style="width:100%;height:75vh;border:1px solid #00f3ff;background:#000" sandbox="allow-scripts" srcdoc="${escapeHtml(gameHtml)}"></iframe>` : `<p style="color:#ccc;font-size:13px;max-width:450px;line-height:1.4;white-space:pre-wrap">${safeText}</p>`;
    const painel = `<div style="background:#000;color:#00f3ff;font-family:monospace;padding:20px;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center"><h3>[ NEXUS CORE // ${escapeHtml(result.provider.toUpperCase())} ]</h3>${inner}<button onclick="parent.fecharDual()" style="margin-top:20px;background:#00f3ff;color:#000;border:none;padding:8px 16px;font-weight:bold;cursor:pointer;border-radius:4px">FECHAR PAINEL</button></div>`;
    const payload = { resposta: gameHtml ? 'Jogo criado pela inteligência central.' : 'Comando executado pela inteligência central.', painel, action: 'open', provider: result.provider, game: Boolean(gameHtml) };
    broadcast({ type: 'nexus:response', ...payload, timestamp: Date.now() });
    sendToUntitled({ type: 'nexus:response', ...payload, timestamp: Date.now() });
    return res.json(payload);
  } catch (error) {
    console.error('[Nexus] erro no pool:', error.message);
    if (isGamePrompt(prompt)) {
      const painel = `<div style="background:#000;color:#00f3ff;font-family:monospace;padding:20px;height:100vh;text-align:center"><h3>[ NEXUS OFFLINE FALLBACK ]</h3><iframe style="width:100%;height:75vh;border:1px solid #00f3ff;background:#000" sandbox="allow-scripts" srcdoc="${escapeHtml(localGameHtml())}"></iframe><p>APIs indisponíveis: jogo local carregado. Configure uma chave válida para geração por IA.</p></div>`;
      return res.json({ resposta: 'As APIs estão indisponíveis. Iniciei um jogo local para não interromper o NEXUS.', painel, action: 'open', provider: 'local-fallback', game: true, degraded: true });
    }
    const painel = `<div style="background:#000;color:#00f3ff;font-family:monospace;padding:30px;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center"><h3>[ NEXUS LOCAL CORE ]</h3><p style="color:#ccc;max-width:450px;line-height:1.5">O núcleo local recebeu seu comando, mas as chaves externas foram recusadas. Substitua as chaves no Render para ativar a IA completa.</p><p style="color:#888">Comando recebido: ${escapeHtml(prompt)}</p><button onclick="parent.fecharDual()" style="margin-top:20px;background:#00f3ff;color:#000;border:none;padding:8px 16px;font-weight:bold;cursor:pointer;border-radius:4px">FECHAR PAINEL</button></div>`;
    return res.json({ resposta: 'As APIs externas recusaram as chaves. O núcleo local continua online; substitua as chaves no Render para ativar a IA.', painel, action: 'open', provider: 'local-fallback', degraded: true });
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (socket) => {
  clients.add(socket);
  socket.send(safeJson({ type: 'nexus:ready', service: 'nexus-core', untitled: untitledState }));
  socket.on('message', (raw) => {
    let message;
    try { message = JSON.parse(raw.toString()); } catch { return; }
    if (message?.type === 'untitled:emit') {
      sendToUntitled({ ...message.payload, source: 'nexus-core', timestamp: Date.now() });
      broadcast({ ...message.payload, source: 'nexus-client', timestamp: Date.now() }, { exclude: socket });
    }
  });
  socket.on('close', () => clients.delete(socket));
  socket.on('error', () => clients.delete(socket));
});

server.listen(PORT, HOST, () => {
  console.log(`[Nexus Core] http://${HOST}:${PORT}`);
  console.log(`[Nexus Core] WebSocket /ws | Untitled: ${process.env.UNTITLED_WS_URL ? 'configurado' : 'não configurado'}`);
  connectUntitled();
});

function shutdown(signal) {
  console.log(`[Nexus Core] ${signal}; encerrando`);
  clearTimeout(untitledReconnectTimer);
  if (untitledSocket) untitledSocket.close();
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
