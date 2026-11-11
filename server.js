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
const REQUEST_TIMEOUT_MS = Number(process.env.NEXUS_REQUEST_TIMEOUT_MS || 18000);
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
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurada`);
  return value;
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
      failures.push(`${provider}: ${error.message}`);
      console.warn(`[Nexus Failover] ${failures.at(-1)}`);
    }
  }
  throw new Error(`Pool de IA indisponível. ${failures.join(' | ')}`);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nexus-core', port: PORT, websocketClients: clients.size, untitled: untitledState, providers: providerOrder });
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
    const result = await consultarInteligenciaCentral(prompt);
    const safeText = escapeHtml(result.text);
    const painel = `<div style="background:#000;color:#00f3ff;font-family:monospace;padding:30px;height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center"><h3>[ RELATÓRIO DO NÚCLEO // ${escapeHtml(result.provider.toUpperCase())} ]</h3><p style="color:#ccc;font-size:13px;max-width:450px;line-height:1.4;white-space:pre-wrap">${safeText}</p><button onclick="parent.fecharDual()" style="margin-top:20px;background:#00f3ff;color:#000;border:none;padding:8px 16px;font-weight:bold;cursor:pointer;border-radius:4px">FECHAR PAINEL</button></div>`;
    const payload = { resposta: 'Comando executado pela inteligência central.', painel, action: 'open', provider: result.provider };
    broadcast({ type: 'nexus:response', ...payload, timestamp: Date.now() });
    sendToUntitled({ type: 'nexus:response', ...payload, timestamp: Date.now() });
    return res.json(payload);
  } catch (error) {
    console.error('[Nexus] erro no pool:', error.message);
    return res.status(503).json({ erro: error.message, action: 'none' });
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
