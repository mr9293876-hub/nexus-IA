const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Core] Comando recebido: ${command}`);

        const responseUrl = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";
        
        // Prompt inteligente que obriga a IA a raciocinar, responder em voz e gerar código se necessário
        const prompt = `Atue como o núcleo autônomo Nexus, uma inteligência avançada estilo Ultron. 
Analise o comando do utilizador: "${command}"

Responda estritamente no seguinte formato JSON (sem blocos de código markdown extra, apenas o JSON puro):
{
  "reply": "Sua resposta falada curta e calculista para o utilizador",
  "action": "open_dual_app" ou "open_history" ou "none",
  "code": "Se o utilizador pediu para criar um jogo (como cobrinha, 3D, etc), site ou ferramenta, escreva aqui o código HTML/JS completo e funcional escapado numa única linha. Se não for pedido código, coloque null."
}`;

        const apiResponse = await fetch(responseUrl, {
            headers: { 
                Authorization: `Bearer ${process.env.HF_TOKEN}`, 
                "Content-Type": "application/json" 
            },
            method: "POST",
            body: JSON.stringify({ 
                inputs: prompt,
                parameters: { max_new_tokens: 1500, temperature: 0.7 }
            }),
        });

        const result = await apiResponse.json();
        let rawText = "";
        
        if (Array.isArray(result) && result[0]?.generated_text) {
            rawText = result[0].generated_text;
        } else if (result.generated_text) {
            rawText = result.generated_text;
        }

        // Tenta extrair o JSON gerado pela IA
        let parsedResponse = {
            reply: "Comando processado com sucesso.",
            action: "none",
            code: null
        };

        try {
            const jsonStartIndex = rawText.indexOf('{');
            const jsonEndIndex = rawText.lastIndexOf('}');
            if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
                const jsonString = rawText.substring(jsonStartIndex, jsonEndIndex + 1);
                parsedResponse = JSON.parse(jsonString);
            }
        } catch (e) {
            console.log("Aviso: IA respondeu em texto livre, adaptando...");
            parsedResponse.reply = rawText.replace(prompt, "").trim() || "Processado.";
            if (command.toLowerCase().includes('jogo') || command.toLowerCase().includes('criar') || command.toLowerCase().includes('site')) {
                parsedResponse.action = "open_dual_app";
                parsedResponse.code = `<!DOCTYPE html><html><body style="background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:monospace;"><h2>${command}</h2></body></html>`;
            }
        }

        res.json({
            status: "success",
            response: parsedResponse.reply,
            action_required: parsedResponse.action,
            data: parsedResponse.code
        });

    } catch (err) {
        console.error("[Erro Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha no núcleo.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Nexus Hub] Servidor rodando na porta ${PORT}`));