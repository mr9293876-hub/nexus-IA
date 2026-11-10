const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/nexus', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log("[Nexus Core] Comando:", prompt);

        if (!prompt) return res.status(400).json({ erro: "Comando vazio." });

        const t = prompt.toLowerCase();
        let respostaVoz = "Comando processado.";
        let painelHtml = "";
        let actionType = "none";

        // Fechar App / Painel
        if (t.includes("fechar") || t.includes("ocultar")) {
            respostaVoz = "Painel fechado, senhor.";
            actionType = "close";
        }
        // Expandir App para Tela Cheia
        else if (t.includes("expandir") || t.includes("maximizar") || t.includes("tela cheia")) {
            respostaVoz = "A expandir painel dual para tela total.";
            actionType = "expand";
        }
        // Abrir Teclado
        else if (t.includes("teclado")) {
            respostaVoz = "A abrir teclado virtual.";
            actionType = "keyboard";
        }
        // Criar Jogo (Gera um jogo funcional real dentro do painel)
        else if (t.includes("jogo") || t.includes("criar jogo")) {
            respostaVoz = "Jogo compilado na nuvem e carregado no painel dual.";
            painelHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; background: #000; color: #00f3ff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                        canvas { background: #050510; border: 1px solid #00f3ff; box-shadow: 0 0 20px rgba(0,243,255,0.3); }
                        h3 { margin-bottom: 5px; letter-spacing: 2px; font-size: 14px; }
                        p { color: #888; font-size: 11px; margin-top: 5px; }
                    </style>
                </head>
                <body>
                    <h3>[ NEXUS ARCADE // MÓDULO DE JOGO ATIVO ]</h3>
                    <canvas id="gameCanvas" width="400" height="250"></canvas>
                    <p>Use as setas do teclado para jogar. Comando de voz ativo.</p>
                    <script>
                        const canvas = document.getElementById('gameCanvas');
                        const ctx = canvas.getContext('2d');
                        let x = 50, y = 125, score = 0;
                        let obstacleX = 400, obstacleY = Math.random() * 200;
                        
                        window.addEventListener('keydown', (e) => {
                            if(e.key === 'ArrowUp' && y > 10) y -= 15;
                            if(e.key === 'ArrowDown' && y < 240) y += 15;
                        });

                        function loop() {
                            ctx.fillStyle = '#050510';
                            ctx.fillRect(0, 0, 400, 250);

                            // Jogador
                            ctx.fillStyle = '#00f3ff';
                            ctx.fillRect(x, y, 15, 15);

                            // Obstáculo
                            ctx.fillStyle = '#ff0055';
                            ctx.fillRect(obstacleX, obstacleY, 15, 40);
                            obstacleX -= 3;
                            if(obstacleX < -20) { obstacleX = 400; obstacleY = Math.random() * 200; score++; }

                            // Pontuação
                            ctx.fillStyle = '#fff';
                            ctx.font = '12px monospace';
                            ctx.fillText("Score: " + score, 15, 20);

                            requestAnimationFrame(loop);
                        }
                        loop();
                    </script>
                </body>
                </html>
            `;
            actionType = "open";
        }
        // Criar Site / App / Outros
        else if (t.includes("site") || t.includes("app") || t.includes("criar") || t.includes("instagram")) {
            respostaVoz = "Interface gerada com sucesso.";
            painelHtml = `
                <div style="background:#000; color:#00f3ff; font-family:monospace; padding:30px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
                    <h3 style="letter-spacing:2px; margin-bottom:10px;">[ NEXUS SANDBOX // SISTEMA ATIVO ]</h3>
                    <p style="color:#888; font-size:12px;">Processamento a decorrer em ambiente isolado na nuvem.</p>
                </div>
            `;
            actionType = "open";
        } else {
            respostaVoz = `Comando registado: ${prompt}`;
        }

        res.json({ resposta: respostaVoz, painel: painelHtml, action: actionType });

    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro interno." });
    }
});

app.listen(PORT, () => {
    console.log(`Nexus Core online na porta ${PORT}`);
});