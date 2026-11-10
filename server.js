require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar a API do Gemini com a chave do .env
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY });

app.post('/api/nexus', async (req, res) => {
    try {
        const { prompt } = req.body;
        console.log("[Nexus AI Core] Comando recebido:", prompt);

        if (!prompt) return res.status(400).json({ erro: "Comando vazio." });

        const t = prompt.toLowerCase();
        let respostaVoz = "Comando processado pelo núcleo.";
        let painelHtml = "";
        let actionType = "none";

        // Comandos de Controlo de Interface
        if (t.includes("fechar") || t.includes("ocultar")) {
            respostaVoz = "Painel fechado.";
            actionType = "close";
        } 
        else if (t.includes("expandir") || t.includes("tela cheia")) {
            respostaVoz = "Painel expandido em ecrã inteiro.";
            actionType = "expand";
        }
        else if (t.includes("teclado")) {
            respostaVoz = "Teclado virtual ativado.";
            actionType = "keyboard";
        }
        // Se pedir para criar jogo, app ou usar IA avançada
        else {
            try {
                // Usar o Gemini real para gerar a resposta ou o código do pedido
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `O utilizador pediu no sistema Nexus: "${prompt}". Responde de forma direta, tática e em Português do Brasil, ideal para uma IA estilo Jarvis, gerando também uma estrutura HTML/Canvas leve se for pedido para criar um jogo ou aplicação.`
                });

                respostaVoz = "Comando interpretado pela inteligência central.";
                const textoGerado = response.text || "Processado com sucesso.";

                // Se o pedido envolver criar jogo / minecraft / código
                if (t.includes("jogo") || t.includes("minecraft") || t.includes("criar") || t.includes("app")) {
                    painelHtml = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { margin: 0; background: #000; color: #00f3ff; font-family: monospace; padding: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
                                pre { background: #050510; border: 1px solid #00f3ff; padding: 15px; width: 90%; height: 70vh; overflow: auto; font-size: 12px; color: #00ff66; }
                                h3 { margin-bottom: 10px; letter-spacing: 2px; }
                            </style>
                        </head>
                        <body>
                            <h3>[ NEXUS AI // CÓDIGO GERADO NA NUVEM ]</h3>
                            <pre>${textoGerado}</pre>
                            <button onclick="parent.fecharDual()" style="margin-top:10px; background:#00f3ff; color:#000; border:none; padding:8px 15px; font-weight:bold; cursor:pointer;">FECHAR PAINEL</button>
                        </body>
                        </html>
                    `;
                } else {
                    painelHtml = `
                        <div style="background:#000; color:#00f3ff; font-family:monospace; padding:30px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
                            <h3 style="letter-spacing:2px; margin-bottom:15px;">[ RELATÓRIO DO NÚCLEO NEXUS ]</h3>
                            <p style="color:#ccc; font-size:13px; max-width:500px; line-height: 1.5;">${textoGerado}</p>
                            <button onclick="parent.fecharDual()" style="margin-top:20px; background:#00f3ff; color:#000; border:none; padding:8px 15px; font-weight:bold; cursor:pointer;">FECHAR PAINEL</button>
                        </div>
                    `;
                }
                actionType = "open";

            } catch (err) {
                console.error("Erro na API Gemini:", err);
                respostaVoz = "Erro ao comunicar com o modelo de inteligência artificial.";
            }
        }

        res.json({ resposta: respostaVoz, painel: painelHtml, action: actionType });

    } catch (e) {
        console.error(e);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

app.listen(PORT, () => {
    console.log(`Nexus AI Core online na porta ${PORT}`);
});