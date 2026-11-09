const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal da IA e Criador de Jogos
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log("Comando recebido pelo Nexus:", prompt);

        if (!prompt) {
            return res.status(400).json({ erro: "Comando vazio." });
        }

        const promptLower = prompt.toLowerCase();
        let respostaIA = "";
        let jogoHTML = null;

        // Se o utilizador pedir para criar um jogo
        if (promptLower.includes("jogo") || promptLower.includes("game") || promptLower.includes("cria")) {
            respostaIA = "Entendido! Gerando o jogo na tela agora...";
            jogoHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; background: #111; color: #fff; text-align: center; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }
                        canvas { background: #222; border: 2px solid #00f3ff; box-shadow: 0 0 15px #00f3ff; }
                        h2 { color: #00f3ff; font-family: monospace; }
                    </style>
                </head>
                <body>
                    <h2>NEXUS CORE GAME ENGINE</h2>
                    <canvas id="gameCanvas" width="400" height="300"></canvas>
                    <p>Usa as setas do teclado para mover o bloco</p>
                    <script>
                        const canvas = document.getElementById('gameCanvas');
                        const ctx = canvas.getContext('2d');
                        let x = 180, y = 130;
                        function draw() {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.fillStyle = '#00f3ff';
                            ctx.fillRect(x, y, 40, 40);
                        }
                        window.addEventListener('keydown', (e) => {
                            if(e.key === 'ArrowLeft') x -= 10;
                            if(e.key === 'ArrowRight') x += 10;
                            if(e.key === 'ArrowUp') y -= 10;
                            if(e.key === 'ArrowDown') y += 10;
                            draw();
                        });
                        draw();
                    </script>
                </body>
                </html>
            `;
        } else {
            respostaIA = `Processado pelo Nexus: Entendi o teu comando "${prompt}". O sistema está 100% operacional no Render.`;
        }

        res.json({
            resposta: respostaIA,
            jogo: jogoHTML
        });

    } catch (erro) {
        console.error("Erro no processamento:", erro);
        res.status(500).json({ erro: "Erro interno no servidor Nexus." });
    }
});

app.listen(PORT, () => {
    console.log(`Nexus-IA a correr 24h na porta ${PORT}`);
});