const express = require('express');
const path = require('path');
const app = express();

// Usa a porta dinâmica do Render ou a 10000 por defeito
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pasta pública onde ficam os ficheiros do teu app/jogos
app.use(express.static(path.join(__dirname, 'public')));

// Rota de teste/estado para saberes se está online
app.get('/api/status', (req, res) => {
    res.json({
        status: "online",
        projeto: "nexus-IA",
        mensagem: "Servidor a funcionar 24h na nuvem!"
    });
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Nexus-IA a milhão na porta ${PORT}`);
});