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
        let respostaVoz = "Comando executado.";
        let painelHtml = "";
        let actionType = "none";

        // Abrir Teclado / Ferramentas
        if (t.includes("teclado") || t.includes("abrir teclado")) {
            respostaVoz = "Abrindo teclado virtual.";
            actionType = "keyboard";
        }
        // Conectar a Redes (Instagram, etc.)
        else if (t.includes("instagram") || t.includes("conectar")) {
            respostaVoz = "A estabelecer ligação com o Instagram.";
            painelHtml = `
                <div style="background:#000; color:#ff0055; font-family:monospace; padding:30px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <h2>[ INTEGRAÇÃO INSTAGRAM ]</h2>
                    <p style="color:#aaa; margin-top:10px;">Ligação segura com a API estabelecida.</p>
                </div>
            `;
            actionType = "dual_fullscreen";
        }
        // Criar Jogos / Apps / Texturas / Fotos
        else if (t.includes("jogo") || t.includes("site") || t.includes("app") || t.includes("criar") || t.includes("textura") || t.includes("foto")) {
            respostaVoz = "A gerar ambiente dual e carregar ativos na nuvem.";
            painelHtml = `
                <div style="background:#010108; color:#00f3ff; font-family:monospace; padding:30px; height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center;">
                    <h2 style="letter-spacing:2px; margin-bottom:15px;">[ NEXUS DUAL SANDBOX // ATIVO ]</h2>
                    <p style="color:#888; font-size:13px; margin-bottom:20px;">Ambiente pronto para texturas, upload de imagens e simulação de IA.</p>
                    <input type="file" id="fileUpload" style="color:#00f3ff; margin-bottom:15px;" />
                    <button onclick="parent.fecharDual()" style="background:#00f3ff; color:#000; border:none; padding:10px 20px; font-weight:bold; cursor:pointer; font-family:monospace;">FECHAR DUAL / VOLTAR À BOLA</button>
                </div>
            `;
            actionType = "dual_fullscreen";
        } else {
            respostaVoz = `Comando processado: ${prompt}`;
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