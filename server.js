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
        console.log("[Nexus Core] Comando Recebido:", prompt);

        if (!prompt) return res.status(400).json({ erro: "Comando vazio." });

        const t = prompt.toLowerCase();
        let respostaVoz = "";
        let painelHtml = "";
        let actionType = "none";

        // Comandos de Controlo do Painel
        if (t.includes("fechar") || t.includes("ocultar")) {
            respostaVoz = "A fechar o painel dual.";
            actionType = "close";
        } 
        else if (t.includes("expandir") || t.includes("tela cheia") || t.includes("maximizar")) {
            respostaVoz = "A expandir para ecrã inteiro.";
            actionType = "expand";
        }
        else if (t.includes("teclado")) {
            respostaVoz = "A abrir o teclado virtual.";
            actionType = "keyboard";
        }
        // GERAÇÃO REAL DE JOGO (Minecraft / Biomas / Cofre / Arcade)
        else if (t.includes("jogo") || t.includes("minecraft") || t.includes("bioma") || t.includes("criar")) {
            respostaVoz = "A compilar o ambiente virtual na nuvem. Painel dual ativado.";
            
            // Código completo gerado dinamicamente para o Iframe Dual
            painelHtml = `
                <!DOCTYPE html>
                <html lang="pt">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { background: #050508; color: #00f3ff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                        h2 { margin-bottom: 8px; font-size: 14px; letter-spacing: 2px; }
                        #canvas-container { position: relative; border: 2px solid #00f3ff; box-shadow: 0 0 20px rgba(0,243,255,0.2); }
                        canvas { display: block; background: #111; }
                        .controls { margin-top: 10px; font-size: 11px; color: #888; text-align: center; }
                    </style>
                </head>
                <body>
                    <h2>[ NEXUS ENGINE // SANDBOX MINECRAFT 2D ]</h2>
                    <div id="canvas-container">
                        <canvas id="mcCanvas" width="500" height="300"></canvas>
                    </div>
                    <div class="controls">
                        <p>Controis: A / D (Mover) | W (Saltar) | Clique Esquerdo (Construir/Quebrar) | C (Abrir Cofre)</p>
                    </div>

                    <script>
                        const canvas = document.getElementById('mcCanvas');
                        const ctx = canvas.getContext('2d');

                        const tileSize = 20;
                        const cols = 25, rows = 15;
                        const world = [];

                        // Geração de Bioma Simples (Grama, Terra, Pedra, Cofre)
                        for (let r = 0; r < rows; r++) {
                            world[r] = [];
                            for (let c = 0; c < cols; c++) {
                                if (r < 9) world[r][c] = 0; // Ar
                                else if (r === 9) world[r][c] = 1; // Relva/Bioma
                                else if (r < 13) world[r][c] = 2; // Terra
                                else world[r][c] = 3; // Pedra
                            }
                        }

                        // Colocar um Cofre no mapa
                        world[8][12] = 4; // Cofre

                        let player = { x: 100, y: 140, w: 16, h: 20, vx: 0, vy: 0, grounded: false };
                        let cofreAberto = false;

                        window.addEventListener('keydown', (e) => {
                            if (e.key === 'a' || e.key === 'A') player.vx = -3;
                            if (e.key === 'd' || e.key === 'D') player.vx = 3;
                            if ((e.key === 'w' || e.key === 'W') && player.grounded) { player.vy = -7; player.grounded = false; }
                            if (e.key === 'c' || e.key === 'C') cofreAberto = !cofreAberto;
                        });

                        window.addEventListener('keyup', (e) => {
                            if (e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D') player.vx = 0;
                        });

                        canvas.addEventListener('click', (e) => {
                            const rect = canvas.getBoundingClientRect();
                            const mx = Math.floor((e.clientX - rect.left) / tileSize);
                            const my = Math.floor((e.clientY - rect.top) / tileSize);
                            if (world[my] && world[my][mx] !== undefined) {
                                world[my][mx] = world[my][mx] === 0 ? 1 : 0;
                            }
                        });

                        function update() {
                            player.vy += 0.4; // Gravidade
                            player.x += player.vx;
                            player.y += player.vy;

                            // Colisão básica com o chão
                            if (player.y + player.h >= 180) {
                                player.y = 180 - player.h;
                                player.vy = 0;
                                player.grounded = true;
                            }

                            draw();
                            requestAnimationFrame(update);
                        }

                        function draw() {
                            ctx.clearRect(0, 0, canvas.width, canvas.height);

                            // Renderizar Mapa / Bioma
                            for (let r = 0; r < rows; r++) {
                                for (let c = 0; c < cols; c++) {
                                    let type = world[r][c];
                                    if (type === 1) ctx.fillStyle = '#2e8b57'; // Relva
                                    else if (type === 2) ctx.fillStyle = '#8b4513'; // Terra
                                    else if (type === 3) ctx.fillStyle = '#708090'; // Pedra
                                    else if (type === 4) ctx.fillStyle = '#ffd700'; // Cofre
                                    
                                    if (type !== 0) ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
                                }
                            }

                            // Renderizar Jogador
                            ctx.fillStyle = '#00f3ff';
                            ctx.fillRect(player.x, player.y, player.w, player.h);

                            // Mostrar Interface do Cofre
                            if (cofreAberto) {
                                ctx.fillStyle = 'rgba(0,0,0,0.85)';
                                ctx.fillRect(100, 50, 300, 150);
                                ctx.strokeStyle = '#ffd700';
                                ctx.strokeRect(100, 50, 300, 150);
                                ctx.fillStyle = '#ffd700';
                                ctx.font = '12px monospace';
                                ctx.fillText("[ COFRE DO BIOMA - ITENS ALOCADOS ]", 120, 80);
                                ctx.fillStyle = '#fff';
                                ctx.fillText("> 64x Blocos de Terra", 120, 110);
                                ctx.fillText("> 1x Espada de Diamante", 120, 130);
                            }
                        }

                        update();
                    </script>
                </body>
                </html>
            `;
            actionType = "open";
        }
        else {
            respostaVoz = `Entendido. A processar o comando: ${prompt}`;
        }

        res.json({ resposta: respostaVoz, painel: painelHtml, action: actionType });

    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro interno no servidor Nexus." });
    }
});

app.listen(PORT, () => {
    console.log(`Nexus Core online na porta ${PORT}`);
});