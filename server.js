require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Inicializa a API do Gemini de forma segura
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

app.post('/api/nexus', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log("[Nexus Core] Pedido recebido:", prompt);

        if (!prompt) return res.status(400).json({ erro: "Comando vazio." });

        if (!apiKey) {
            return res.status(500).json({ erro: "Chave da API do Gemini não configurada no Render (.env)." });
        }

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
        else {
            try {
                // Comunicação direta com o Gemini em segundo plano
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Atua como o núcleo Jarvis do sistema Nexus. O utilizador ordenou: "${prompt}". Responde de forma direta, tática e em Português.`
                });

                respostaVoz = "Comando executado pela inteligência central.";
                const textoGerado = response.text || "Operação concluída.";

                if (t.includes("jogo") || t.includes("minecraft") || t.includes("criar") || t.includes("código")) {
                    painelHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { margin: 0; background: #000; color: #00f3ff; font-family: monospace; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                                pre { background: #050510; border: 1px solid #00f3ff; padding: 15px; width: 90%; height: 65vh; overflow: auto; font-size: 12px; color: #00ff66; border-radius: 6px; }
                                h3 { margin-bottom: 10px; letter-spacing: 2px; font-size: 14px; }
                            </style>
                        </head>
                        <body>
                            <h3>[ NEXUS CORE // CÓDIGO & SANDBOX ]</h3>
                            <pre>${textoGerado}</pre>
                            <button onclick="parent.fecharDual()" style="margin-top:15px; background:#00f3ff; color:#000; border:none; padding:8px 18px; font-weight:bold; cursor:pointer; border-radius:4px;">FECHAR PAINEL</button>
                        </body>
                        </html>
                    `;
                } else {
                    painelHtml = `
                        <div style="background:#000; color:#00f3ff; font-family:monospace; padding:30px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
                            <h3 style="letter-spacing:2px; margin-bottom:15px;">[ RELATÓRIO DO NÚCLEO ]</h3>
                            <p style="color:#ccc; font-size:13px; max-width:450px; line-height:1.5;">${textoGerado}</p>
                            <button onclick="parent.fecharDual()" style="margin-top:20px; background:#00f3ff; color:#000; border:none; padding:8px 18px; font-weight:bold; cursor:pointer; border-radius:4px;">FECHAR PAINEL</button>
                        </div>
                    `;
                }
                actionType = "open";
            } catch (err) {
                console.error("Erro na API do Gemini:", err);
                return res.status(500).json({ erro: "Erro ao comunicar com a API do Google Gemini." });
            }
        }

        res.json({ resposta: respostaVoz, painel: painelHtml, action: actionType });
    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

app.listen(PORT, () => {
    console.log(`Nexus Core online na porta ${PORT}`);
});