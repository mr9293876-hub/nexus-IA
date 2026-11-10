require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar Google GenAI
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: geminiApiKey });

// Função de Failover Multi-API para garantir que nunca falha
async function consultarInteligenciaCentral(prompt) {
    let textoGerado = "";

    // 1. Tentar Google Gemini primeiro
    try {
        if (geminiApiKey) {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Atua como o núcleo Jarvis de desenvolvimento do sistema Nexus. O utilizador ordenou: "${prompt}". Se for um pedido de jogo ou código, retorna código limpo e funcional. Caso contrário, responde de forma direta e tática em Português.`
            });
            if (response && response.text) {
                return response.text;
            }
        }
    } catch (err) {
        console.warn("[Nexus Failover] Gemini falhou, a tentar alternativas...", err.message);
    }

    // 2. Tentar Groq (se configurado no .env)
    if (process.env.GROQ_API_KEY) {
        try {
            const fetch = (await import('node-fetch')).default;
            const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const groqData = await groqRes.json();
            if (groqData.choices && groqData.choices[0]) {
                return groqData.choices[0].message.content;
            }
        } catch (e) {
            console.warn("[Nexus Failover] Groq falhou...", e.message);
        }
    }

    // 3. Tentar OpenRouter (se configurado no .env)
    if (process.env.OPENROUTER_API_KEY) {
        try {
            const fetch = (await import('node-fetch')).default;
            const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek/deepseek-chat',
                    messages: [{ role: 'user', content: prompt }]
                })
            });
            const orData = await orRes.json();
            if (orData.choices && orData.choices[0]) {
                return orData.choices[0].message.content;
            }
        } catch (e) {
            console.warn("[Nexus Failover] OpenRouter falhou...", e.message);
        }
    }

    throw new Error("Todas as APIs do pool de failover falharam ou não estão configuradas.");
}

app.post('/api/nexus', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log("[Nexus Core] Comando recebido:", prompt);

        if (!prompt) return res.status(400).json({ erro: "Comando vazio." });

        const t = prompt.toLowerCase();
        let respostaVoz = "Comando processado.";
        let painelHtml = "";
        let actionType = "none";

        if (t.includes("fechar") || t.includes("ocultar")) {
            respostaVoz = "Painel fechado.";
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
            try {
                // Obter resposta através do sistema com failover automático
                const textoGerado = await consultarInteligenciaCentral(prompt);
                respostaVoz = "Comando executado pela inteligência central.";

                // Se o utilizador pediu um jogo, código ou sandbox
                if (t.includes("jogo") || t.includes("minecraft") || t.includes("criar") || t.includes("código")) {
                    painelHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { margin: 0; background: #000; color: #00f3ff; font-family: monospace; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                                canvas { background: #050510; border: 1px solid #00f3ff; box-shadow: 0 0 15px rgba(0,243,255,0.3); }
                                pre { background: #050510; border: 1px solid #00f3ff; padding: 12px; width: 90%; max-height: 40vh; overflow: auto; font-size: 11px; color: #00ff66; border-radius: 6px; margin-top: 10px; }
                                h3 { margin-bottom: 6px; letter-spacing: 2px; font-size: 13px; }
                            </style>
                        </head>
                        <body>
                            <h3>[ NEXUS ENGINE // SANDBOX & CÓDIGO ]</h3>
                            <canvas id="gameCanvas" width="360" height="200"></canvas>
                            <pre>${textoGerado.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
                            <p style="color:#888; font-size:10px; margin-top:5px;">Use as setas para mover no sandbox.</p>
                            <button onclick="parent.fecharDual()" style="margin-top:8px; background:#00f3ff; color:#000; border:none; padding:6px 14px; font-weight:bold; cursor:pointer; border-radius:4px;">FECHAR PAINEL</button>
                            <script>
                                const canvas = document.getElementById('gameCanvas');
                                const ctx = canvas.getContext('2d');
                                let x = 40, y = 100;
                                window.addEventListener('keydown', e => {
                                    if(e.key === 'ArrowUp') y -= 12;
                                    if(e.key === 'ArrowDown') y += 12;
                                    if(e.key === 'ArrowLeft') x -= 12;
                                    if(e.key === 'ArrowRight') x += 12;
                                });
                                function loop() {
                                    ctx.fillStyle = '#050510';
                                    ctx.fillRect(0, 0, 360, 200);
                                    ctx.fillStyle = '#00f3ff';
                                    ctx.fillRect(x, y, 18, 18);
                                    ctx.fillStyle = '#ffd700';
                                    ctx.fillRect(280, 80, 20, 20);
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
                            <h3 style="letter-spacing:2px; margin-bottom:12px;">[ RELATÓRIO DO NÚCLEO ]</h3>
                            <p style="color:#ccc; font-size:13px; max-width:450px; line-height:1.4;">${textoGerado}</p>
                            <button onclick="parent.fecharDual()" style="margin-top:20px; background:#00f3ff; color:#000; border:none; padding:8px 16px; font-weight:bold; cursor:pointer; border-radius:4px;">FECHAR PAINEL</button>
                        </div>
                    `;
                }
                actionType = "open";
            } catch (err) {
                console.error("Erro geral no pool de IA:", err);
                respostaVoz = "Erro ao processar com a inteligência artificial.";
            }
        }

        res.json({ resposta: respostaVoz, painel: painelHtml, action: actionType });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

app.listen(PORT, () => {
    console.log(`Nexus Core a correr na porta ${PORT}`);
});