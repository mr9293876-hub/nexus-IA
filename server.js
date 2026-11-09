const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota inteligente para comandos da assistente e estúdio de jogos (Dual App)
app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Assistant] Comando recebido: ${command}`);

        const lowerCmd = command.toLowerCase();
        let action = 'none';
        let generatedGameCode = null;

        // Se o utilizador pediu para criar um jogo
        if (lowerCmd.includes('jogo') || lowerCmd.includes('game') || lowerCmd.includes('criar')) {
            action = 'open_dual_app';
            generatedGameCode = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Nexus Game Studio - Clean Build</title>
    <style>
        body { margin: 0; background: #000; overflow: hidden; display: flex; justify-content: center; align-items: center; height: 100vh; color: #fff; font-family: monospace; }
        canvas { background: #111; border: 2px solid #00f2fe; }
    </style>
</head>
<body>
    <div style="position: absolute; top: 10px; text-align: center; width: 100%;">Nexus Game - Use Setas para Jogar</div>
    <canvas id="gameCanvas" width="400" height="500"></canvas>
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Exemplo funcional com som sintetizado (Web Audio API)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        function playSound() {
            if (audioCtx.state === 'suspended') { audioCtx.resume(); }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = 440;
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        }

        let player = { x: 180, y: 420, width: 40, height: 40, color: '#00f2fe' };
        let obstacle = { x: Math.random() * 360, y: 0, width: 30, height: 30, speed: 3 };

        function update() {
            obstacle.y += obstacle.speed;
            if (obstacle.y > 500) {
                obstacle.y = 0;
                obstacle.x = Math.random() * 370;
                playSound(); // Som integrado garantido
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            ctx.fillStyle = '#ff0055';
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }

        function loop() {
            update();
            draw();
            requestAnimationFrame(loop);
        }
        loop();

        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && player.x > 0) player.x -= 20;
            if (e.key === 'ArrowRight' && player.x < 360) player.x += 20;
        });
    </script>
</body>
</html>`;
        }

        // Chamada à Hugging Face para obter a resposta de voz/texto da assistente
        const responseUrl = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";
        const apiResponse = await fetch(responseUrl, {
            headers: { 
                Authorization: `Bearer ${process.env.HF_TOKEN}`, 
                "Content-Type": "application/json" 
            },
            method: "POST",
            body: JSON.stringify({ inputs: `Atue como a assistente digital Nexus. Responda de forma direta, otimizada e humana ao comando: ${command}` }),
        });

        const result = await apiResponse.json();
        let reply = "Comando processado com sucesso.";
        if (Array.isArray(result) && result[0]?.generated_text) {
            reply = result[0].generated_text.replace(`Atue como a assistente digital Nexus. Responda de forma direta, otimizada e humana ao comando: ${command}`, "").trim();
        }

        res.json({
            status: "success",
            response: reply || "Pronto por aqui!",
            action_required: action,
            game_code: generatedGameCode
        });

    } catch (err) {
        console.error("[Erro no Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha ao processar comando.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Nexus Hub] Servidor rodando na porta ${PORT}`);
});