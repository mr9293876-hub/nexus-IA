const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Memória do código do jogo atual para permitir correções via conversa
let currentGameCode = "";

app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Core] Comando: ${command}`);
        const lower = command.toLowerCase();

        let action = 'none';
        let payload = null;
        let replyText = "";

        // Verifica se é um pedido para criar ou modificar o jogo da cobrinha ou outro jogo
        if (lower.includes('cobrinha') || lower.includes('snake')) {
            action = 'open_dual_app_game';
            replyText = "Iniciando protocolos de engenharia. Construindo o jogo da cobrinha com motor otimizado.";
            
            currentGameCode = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Nexus Snake Studio</title>
<style>
  body { margin: 0; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #fff; font-family: monospace; }
  canvas { border: 1px solid #fff; background: #050505; }
</style>
</head>
<body>
<canvas id="gc" width="400" height="400"></canvas>
<script>
const canvas = document.getElementById('gc');
const ctx = canvas.getContext('2d');
const grid = 20;
let count = 0;
let snake = { x: 160, y: 160, dx: grid, dy: 0, cells: [], maxCells: 4 };
let apple = { x: 320, y: 320 };

function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min)) + min; }

function loop() {
  requestAnimationFrame(loop);
  if (++count < 6) return;
  count = 0;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  snake.x += snake.dx;
  snake.y += snake.dy;

  if (snake.x < 0) snake.x = canvas.width - grid;
  else if (snake.x >= canvas.width) snake.x = 0;
  if (snake.y < 0) snake.y = canvas.height - grid;
  else if (snake.y >= canvas.height) snake.y = 0;

  snake.cells.unshift({ x: snake.x, y: snake.y });
  if (snake.cells.length > snake.maxCells) snake.cells.pop();

  ctx.fillStyle = '#ff0000';
  ctx.fillRect(apple.x, apple.y, grid-1, grid-1);

  ctx.fillStyle = '#ffffff';
  snake.cells.forEach(function(cell, index) {
    ctx.fillRect(cell.x, cell.y, grid-1, grid-1);
    if (cell.x === apple.x && cell.y === apple.y) {
      snake.maxCells++;
      apple.x = getRandomInt(0, 20) * grid;
      apple.y = getRandomInt(0, 20) * grid;
    }
    for (let i = index + 1; i < snake.cells.length; i++) {
      if (cell.x === snake.cells[i].x && cell.y === snake.cells[i].y) {
        snake.x = 160; snake.y = 160; snake.cells = []; snake.maxCells = 4;
        apple.x = getRandomInt(0, 20) * grid; apple.y = getRandomInt(0, 20) * grid;
      }
    }
  });
}
requestAnimationFrame(loop);

document.addEventListener('keydown', function(e) {
  if (e.key === 'ArrowLeft' && snake.dx === 0) { snake.dx = -grid; snake.dy = 0; }
  else if (e.key === 'ArrowUp' && snake.dy === 0) { snake.dy = -grid; snake.dx = 0; }
  else if (e.key === 'ArrowRight' && snake.dx === 0) { snake.dx = grid; snake.dy = 0; }
  else if (e.key === 'ArrowDown' && snake.dy === 0) { snake.dy = grid; snake.dx = 0; }
});
</script></body></html>`;
            payload = currentGameCode;
        } 
        else if (lower.includes('jogo') || lower.includes('game') || lower.includes('conserta') || lower.includes('alterar')) {
            action = 'open_dual_app_game';
            replyText = "Atualizando parâmetros do estúdio de jogos conforme solicitado.";
            payload = currentGameCode || `<!DOCTYPE html><html><body style="background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:monospace;"><h3>Aguardando diretrizes de código...</h3></body></html>`;
        }
        else if (lower.includes('youtube') || lower.includes('site') || lower.includes('navegador')) {
            action = 'open_browser';
            replyText = "Acessando interface web solicitada.";
            payload = 'https://www.youtube.com/embed/';
        }
        else if (lower.includes('teclado') || lower.includes('digitar')) {
            action = 'open_keyboard';
            replyText = "Ativando terminal de entrada adaptativo.";
        }
        else if (lower.includes('histórico') || lower.includes('historico') || lower.includes('conversas')) {
            action = 'open_history';
            replyText = "Recuperando registo de conversas.";
        }
        else {
            // Conversação natural livre via Hugging Face com tom analítico
            const responseUrl = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";
            const apiResponse = await fetch(responseUrl, {
                headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({ inputs: `Atue como um sistema de inteligência artificial avançado, calmo, calculista e direto, estilo Ultron. Responda de forma natural e humana ao comentário: ${command}` })
            });
            const result = await apiResponse.json();
            replyText = Array.isArray(result) && result[0]?.generated_text 
                ? result[0].generated_text.replace(`Atue como um sistema de inteligência artificial avançado, calmo, calculista e direto, estilo Ultron. Responda de forma natural e humana ao comentário: ${command}`, "").trim()
                : "Compreendido. Processando diretrizes.";
            action = 'text_response';
        }

        res.json({ status: "success", response: replyText || "Sistema operando normalmente.", action_required: action, data: payload });

    } catch (err) {
        console.error("[Erro Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha no processamento.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Nexus Core] Rodando na porta ${PORT}`));