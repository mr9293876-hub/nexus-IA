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
        console.log(`[Nexus Assistant] Comando recebido: ${command}`);

        const responseUrl = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";
        
        const apiResponse = await fetch(responseUrl, {
            headers: { 
                Authorization: `Bearer ${process.env.HF_TOKEN}`, 
                "Content-Type": "application/json" 
            },
            method: "POST",
            body: JSON.stringify({ inputs: `Atue como a assistente digital Nexus. Responda de forma direta e otimizada ao comando: ${command}` }),
        });

        const result = await apiResponse.json();
        const reply = Array.isArray(result) && result[0]?.generated_text ? result[0].generated_text : "Comando processado com sucesso.";

        res.json({
            status: "success",
            response: reply,
            action_required: command.toLowerCase().includes('instagram') ? 'open_instagram_overlay' : 'none'
        });
    } catch (err) {
        console.error("[Erro no Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha ao processar comando na assistente.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[Nexus Hub] Servidor rodando na porta ${PORT}`);
});