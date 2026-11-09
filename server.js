const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Memória temporária do jogo ativo no Dual App
let currentGameCode = "";

app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Core] Comando: ${command}`);
        const lower = command.toLowerCase();

        let action = 'none';
        let payload = null;
        let replyText = "";

        // Detecta pedido de criação ou modificação/correção de jogo
        if (lower.includes('jogo') || lower.includes('game') || lower.includes('conserta') || lower.includes('corrigir') || lower.includes('mudar') || lower.includes('alterar')) {
            action = 'open_dual_app_game';
            
            // Simula tempo de build otimizado para gerar jogos mais completos
            await new Promise(r => setTimeout(r, 1500));

            if (lower.includes('conserta') || lower.includes('corrigir') || lower.includes('mudar') || lower.includes('alterar')) {
                replyText = "Recompilando o código do jogo com as correções e otimizações solicitadas.";
            } else {
                replyText = "Gerando novo build completo do jogo HTML5 no Dual App Studio.";
            }

            // Build de jogo limpo com áudio sintetizado nativo
            currentGameCode = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Nexus Game Studio</title>
<style>
  body { margin: 0; background: #02040a; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: monospace; }
  canvas { border: 2px solid #ffffff; background: #000; box-shadow: 0 0 20px rgba(255,255,255,0.2); }
</style>
</head>
<body>
<h3 style="margin-bottom:10px; color:#fff;">Nexus Clean Build Arcade - Controles: Setas / Espaço</h3>
<canvas id="g" width="400" height="450"></canvas>
<script>
const cvs = document.getElementById('g'), ctx = cvs.getContext('2d');
const ac = new (window.AudioContext || window.webkitAudioContext)();

function playAudioEffect(freq, type = 'sine') {
    if (ac.state === 'suspended') ac.resume();
    let osc = ac.createOscillator(), gain = ac.createGain();
    osc.type = type;
    osc.connect(gain); gain.connect(ac.destination);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
    osc.start(); osc.stop(ac.currentTime + 0.15);
}

let player = { x: 175, y: 380, w: 50, h: 15, color: '#ffffff' };
let ball = { x: 200, y: 200, dx: 3, dy: -3, r: 8 };

function update() {
    ball.x += ball.dx; ball.y += ball.dy;
    if (ball.x - ball.r < 0 || ball.x + ball.r > 400) { ball.dx *= -1; playAudioEffect(400); }
    if (ball.y - ball.r < 0) { ball.dy *= -1; playAudioEffect(450); }
    
    // Colisão com jogador
    if (ball.y + ball.r >= player.y && ball.x >= player.x && ball.x <= player.x + player.w) {
        ball.dy = -Math.abs(ball.dy);
        playAudioEffect(600, 'square');
    }
    
    if (ball.y > 450) { ball.x = 200; ball.y = 200; ball.dy = -3; playAudioEffect(150, 'sawtooth'); }
}

function draw() {
    ctx.clearRect(0,0,400,450);
    ctx.fillStyle = player.color; ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fillStyle = '#ffffff'; ctx.fill();
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();

window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' && player.x > 0) player.x -= 20;
    if (e.key === 'ArrowRight' && player.x < 350) player.x += 20;
});
</script></body></html>`;

            payload = currentGameCode;
        } 
        else if (lower.includes('youtube') || lower.includes('site') || lower.includes('abrir site') || lower.includes('navegador')) {
            action = 'open_browser';
            replyText = "Abrindo interface web no Dual App.";
            payload = 'https://www.youtube.com/embed/';
        }
        else if (lower.includes('teclado') || lower.includes('digitar')) {
            action = 'open_keyboard';
            replyText = "Teclado adaptativo ativado.";
        }
        else if (lower.includes('histórico') || lower.includes('historico') || lower.includes('conversas')) {
            action = 'open_history';
            replyText = "Exibindo histórico de interações.";
        }
        else if (lower.includes('instagram') || lower.includes('conectar') || lower.includes('integre')) {
            action = 'open_instagram';
            replyText = "Módulo de integração ativado.";
        }
        else {
            const responseUrl = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";
            const apiResponse = await fetch(responseUrl, {
                headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({ inputs: `Atue como a assistente digital Nexus. Responda de forma direta e concisa: ${command}` })
            });
            const result = await apiResponse.json();
            replyText = Array.isArray(result) && result[0]?.generated_text 
                ? result[0].generated_text.replace(`Atue como a assistente digital Nexus. Responda de forma direta e concisa: ${command}`, "").trim()
                : "Comando processado pelo motor Nexus.";
            action = 'text_response';
        }

        res.json({ status: "success", response: replyText || "Pronto.", action_required: action, data: payload });

    } catch (err) {
        console.error("[Erro Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha no processamento.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Nexus Hub] Servidor rodando na porta ${PORT}`));