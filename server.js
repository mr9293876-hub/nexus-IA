const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rota de processamento do chat/comandos do Nexus
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log("Comando recebido:", prompt);

        let respostaVoz = "Comando processado com sucesso.";
        let jogoHTML = null;

        const promptLower = (prompt || "").toLowerCase();

        // Se pedires para criar um jogo, gera o código estruturado para o iframe
        if (promptLower.includes("jogo") || promptLower.includes("criar") || promptLower.includes("cria")) {
            respostaVoz = "Criando o jogo na tela.";
            jogoHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; background: #000; color: #00f3ff; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                        canvas { background: #05050a; border: 1px solid #00f3ff; }
                    </style>
                </head>
                <body>
                    <canvas id="game" width="400" height="300"></canvas>
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
                            if(e.key === 'ArrowLeft') x -= 10;
                            if(e.key === 'ArrowRight') x += 10;
                            if(e.key === 'ArrowUp') y -= 10;
                            if(e.key === 'ArrowDown') y += 10;
                        });
                        render();
                    </script>
                </body>
                </html>
            `;
        }

        res.json({
            resposta: respostaVoz,
            jogo: jogoHTML
        });

    } catch (erro) {
        console.error("Erro:", erro);
        res.status(500).json({ erro: "Erro interno." });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor a correr na porta ${PORT}`);
});