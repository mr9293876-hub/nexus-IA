const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota Principal da IA (Comando Nexus, Geração de Jogos, Modos NPC e Debug)
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt, modo } = req.body;
        console.log(`[Nexus Engine] Comando recebido (${modo || 'geral'}):`, prompt);

        if (!prompt) {
            return res.status(400).json({ erro: "Nenhum comando fornecido." });
        }

        const promptLower = prompt.toLowerCase();
        let respostaVoz = "";
        let jogoHTML = null;

        // Lógica de Atuação / Geração
        if (promptLower.includes("jogo") || promptLower.includes("criar") || promptLower.includes("cria")) {
            respostaVoz = "Entendido. Iniciando a compilação do jogo no painel secundário agora.";
            jogoHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; background: #000; color: #00f3ff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                        canvas { background: #05050a; border: 1px solid #00f3ff; box-shadow: 0 0 20px rgba(0,243,255,0.2); }
                        #info { margin-top: 10px; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <h3>[ NEXUS SANDBOX ENGINE ]</h3>
                    <canvas id="game" width="400" height="300"></canvas>
                    <div id="info">Use as setas direcionais para mover o núcleo.</div>
                    <script>
                        const canvas = document.getElementById('game');
                        const ctx = canvas.getContext('2d');
                        let x = 180, y = 130;

                        function render() {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.fillStyle = '#00f3ff';
                            ctx.fillRect(x, y, 30, 30);
                            requestAnimationFrame(render);
                        }
                        
                        window.addEventListener('keydown', (e) => {
                            if(e.key === 'ArrowLeft') x -= 12;
                            if(e.key === 'ArrowRight') x += 12;
                            if(e.key === 'ArrowUp') y -= 12;
                            if(e.key === 'ArrowDown') y += 12;
                        });

                        render();
                    </script>
                </body>
                </html>
            `;
        } else if (modo === "npc") {
            respostaVoz = `[NPC Ativo]: Entendido! Estou sincronizado com a partida. O que vamos fazer agora?`;
        } else if (modo === "debug") {
            respostaVoz = `[Debug System]: Analisando a estrutura de código... Nenhum erro crítico encontrado no ambiente.`;
        } else {
            respostaVoz = `Processado. Sistema operando em capacidade nominal no Render.`;
        }

        res.json({
            resposta: respostaVoz,
            jogo: jogoHTML
        });

    } catch (erro) {
        console.error("Erro interno:", erro);
        res.status(500).json({ erro: "Falha na comunicação com o servidor Nexus." });
    }
});

app.listen(PORT, () => {
    console.log(`[Nexus Core] Servidor operacional na porta ${PORT}`);
});