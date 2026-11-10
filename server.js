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
        console.log("[Nexus Core] Comando de voz recebido:", prompt);

        if (!prompt) return res.status(400).json({ erro: "Comando vazio." });

        const t = prompt.toLowerCase();
        let respostaVoz = "Comando executado.";
        let painelHtml = "";
        let actionType = "none";

        // Comando de Voz: Teclado
        if (t.includes("teclado") || t.includes("abrir teclado")) {
            respostaVoz = "A abrir painel de teclado virtual.";
            actionType = "keyboard";
        }
        // Comando de Voz: Instagram / Redes
        else if (t.includes("instagram") || t.includes("conectar instagram")) {
            respostaVoz = "A estabelecer ligação com o Instagram.";
            painelHtml = `
                <div style="background:#000; color:#ff0055; font-family:monospace; padding:30px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <h2 style="letter-spacing:2px; margin-bottom:10px;">[ INSTAGRAM GATEWAY ]</h2>
                    <p style="color:#aaa; font-size:13px; margin-bottom:20px;">Interface de conexão tática ativa.</p>
                    <button onclick="parent.fecharDual()" style="background:#ff0055; color:#000; border:none; padding:10px 20px; font-weight:bold; cursor:pointer; font-family:monospace;">FECHAR PAINEL</button>
                </div>
            `;
            actionType = "dual_open";
        }
        // Comando de Voz: Criar Jogo / Site / App / Texturas
        else if (t.includes("jogo") || t.includes("site") || t.includes("app") || t.includes("criar") || t.includes("textura") || t.includes("foto")) {
            respostaVoz = "Ambiente dual ativado. Pronto para carregar texturas e criar aplicações.";
            painelHtml = `
                <div style="background:#010108; color:#00f3ff; font-family:monospace; padding:30px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <h2 style="letter-spacing:2px; margin-bottom:15px;">[ NEXUS DUAL SANDBOX ]</h2>
                    <p style="color:#888; font-size:13px; margin-bottom:15px;">Selecione ficheiros, texturas ou envie instruções visuais.</p>
                    <input type="file" id="fileUpload" style="color:#00f3ff; margin-bottom:20px;" />
                    <button onclick="parent.fecharDual()" style="background:#00f3ff; color:#000; border:none; padding:10px 20px; font-weight:bold; cursor:pointer; font-family:monospace;">FECHAR PAINEL DUAL</button>
                </div>
            `;
            actionType = "dual_open";
        } else {
            respostaVoz = `Comando compreendido: ${prompt}`;
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