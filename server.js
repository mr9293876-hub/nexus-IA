require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar a API do Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

app.post('/api/nexus', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log("[Nexus Core] Comando:", prompt);

        if (!prompt) return res.status(400).json({ erro: "Comando vazio." });

        const t = prompt.toLowerCase();
        let respostaVoz = "Comando processado.";
        let painelHtml = "";
        let actionType = "none";

        if (t.includes("fechar") || t.includes("ocultar")) {
            respostaVoz = "Painel fechado, senhor.";
            actionType = "close";
        } 
        else if (t.includes("expandir") || t.includes("tela cheia")) {
            respostaVoz = "Painel expandido.";
            actionType = "expand";
        }
        else if (t.includes("teclado")) {
            respostaVoz = "Teclado ativado.";
            actionType = "keyboard";
        }
        else {
            // Processamento com a IA Real do Gemini
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Atua como Jarvis do sistema Nexus. O utilizador ordenou: "${prompt}". Responde de forma direta e tática em Português.`
                });

                respostaVoz = "Comando executado pela inteligência central.";
                const textoGerado = response.text || "Operação concluída.";

                if (t.includes("jogo") || t.includes("minecraft") || t.includes("criar")) {
                    painelHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { margin: 0; background: #000; color: #00f3ff; font-family: monospace; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                                canvas { background: #050510; border: 1px solid #00f3ff; box-shadow: 0 0 15px rgba(0,243,255,0.3); }
                                h3 { margin-bottom: 8px; letter-spacing: 2px; font-size: 13px; }
                            </style>
                        </head>
                        <body>
                            <h3>[ NEXUS ENGINE // SANDBOX DE JOGO ]</h3>
                            <canvas id="gameCanvas" width="400" height="250"></canvas>
                            <p style="color:#888; font-size:11px; margin-top:8px;">Use as setas para mover. Cofre de bioma ativo.</p>
                            <script>
                                const canvas = document.getElementById('gameCanvas');
                                const ctx = canvas.getContext('2d');
                                let x = 50, y = 125;
                                window.addEventListener('keydown', e => {
                                    if(e.key === 'ArrowUp') y -= 15;
                                    if(e.key === 'ArrowDown') y += 15;
                                    if(e.key === 'ArrowLeft') x -= 15;
                                    if(e.key === 'ArrowRight') x += 15;
                                });
                                function loop() {
                                    ctx.fillStyle = '#050510';
                                    ctx.fillRect(0,0,400,250);
                                    ctx.fillStyle = '#00f3ff';
                                    ctx.fillRect(x, y, 20, 20);
                                    // Cofre simulado
                                    ctx.fillStyle = '#ffd700';
                                    ctx.fillRect(300, 100, 25, 25);
                                    requestAnimationFrame(loop);
                                }
                                loop();
                            </script>
                        </body>
                        </html>
                    `;
                } else {
                    painelHtml = `
                        <div style="background:#000; color:#00f3ff; font-family:monospace; padding:30px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
                            <h3 style="letter-spacing:2px; margin-bottom:12px;">[ RELATÓRIO DO SISTEMA ]</h3>
                            <p style="color:#ccc; font-size:13px; max-width:450px; line-height:1.4;">${textoGerado}</p>
                            <button onclick="parent.fecharDual()" style="margin-top:20px; background:#00f3ff; color:#000; border:none; padding:8px 16px; font-weight:bold; cursor:pointer;">FECHAR PAINEL</button>
                        </div>
                    `;
                }
                actionType = "open";
            } catch (err) {
                console.error("Erro na IA:", err);
                respostaVoz = "Erro ao processar com a inteligência artificial.";
            }
        }

        res.json({ resposta: respostaVoz, painel: painelHtml, action: actionType });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro interno." });
    }
});

app.listen(PORT, () => {
    console.log(`Nexus Core a correr na porta ${PORT}`);
});