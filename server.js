require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota de status do núcleo
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    runtime: 'Node.js Gateway Active',
    system: 'Nexus Core',
    timestamp: Date.now() 
  });
});

// Endpoint para receber sinais do jogo/navegador e processar via Python se preciso
app.post('/api/process-signal', (req, res) => {
  const payload = req.body;
  console.log(`[Node.js Gateway] Sinal recebido:`, payload);

  // Exemplo de chamada segura para o script Python em segundo plano
  const pythonProcess = spawn('python', ['./ai-core/main.py', JSON.stringify(payload)]);
  
  let pythonData = '';

  pythonProcess.stdout.on('data', (data) => {
    pythonData += data.toString();
  });

  pythonProcess.on('close', (code) => {
    try {
      const parsedResult = pythonData ? JSON.parse(pythonData) : { status: 'processed' };
      res.json({ success: true, gateway: 'Node.js', ai_response: parsedResult });
    } catch (e) {
      res.json({ success: true, gateway: 'Node.js', raw_output: pythonData });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Gateway Node.js rodando na porta ${PORT}`);
});