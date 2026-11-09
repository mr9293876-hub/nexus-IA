const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let currentGameCode = "";

app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Core] Comando: ${command}`);
        const lower = command.toLowerCase();

        let action = 'none';
        let payload = null;
        let replyText = "";

        // Se o utilizador pediu para criar um jogo (3D, arcade, cobrinha, etc.)
        if (lower.includes('jogo') || lower.includes('game') || lower.includes('3d') || lower.includes('criar')) {
            action = 'open_dual_app_game';
            
            if (lower.includes('3d')) {
                replyText = "Iniciando motor gráfico 3D no Dual App Studio. Renderizando ambiente tridimensional.";
                currentGameCode = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Nexus 3D Studio</title>
<style>body{margin:0;background:#000;overflow:hidden;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
<script>
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const geometry = new THREE.BoxGeometry(2, 2, 2);
const material = new THREE.MeshBasicMaterial({color: 0x00f2fe, wireframe: true});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

camera.position.z = 5;

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.02;
    renderer.render(scene, camera);
}
animate();
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
</script></body></html>`;
            } else {
                replyText = "Compilando estúdio de jogos interativo no Dual App.";
                currentGameCode = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Nexus Arcade</title>
<style>body{margin:0;background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:monospace;}canvas{border:1px solid #fff;background:#050505;}</style>
</head>
<body>
<canvas id="c" width="400" height="400"></canvas>
<script>
const cvs = document.getElementById('c'), ctx = cvs.getContext('2d');
let x = 200, y = 200, dx = 3, dy = 3;
function loop() {
    ctx.clearRect(0,0,400,400);
    x += dx; y += dy;
    if(x<10 || x>390) dx *= -1;
    if(y<10 || y>390) dy *= -1;
    ctx.fillStyle = '#00f2fe'; ctx.fillRect(x-15, y-15, 30, 30);
    requestAnimationFrame(loop);
}
loop();
</script></body></html>`;
            }
            payload = currentGameCode;
        } 
        else if (lower.includes('youtube') || lower.includes('site') || lower.includes('navegador')) {
            action = 'open_browser';
            replyText = "Abrindo navegador integrado no Dual App.";
            payload = 'https://www.youtube.com/embed/';
        }
        else if (lower.includes('teclado') || lower.includes('digitar')) {
            action = 'open_keyboard';
            replyText = "Ativando terminal de entrada.";
        }
        else if (lower.includes('histórico') || lower.includes('historico') || lower.includes('conversas')) {
            action = 'open_history';
            replyText = "Carregando registo de conversas.";
        }
        else {
            // Conversação natural livre via Hugging Face com o cérebro do Ultron
            const responseUrl = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";
            const apiResponse = await fetch(responseUrl, {
                headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({ inputs: `Atue como um sistema de inteligência artificial autônomo avançado, calmo e calculista estilo Ultron. Responda diretamente ao utilizador sem preâmbulos: ${command}` })
            });
            const result = await apiResponse.json();
            
            if (Array.isArray(result) && result[0]?.generated_text) {
                let text = result[0].generated_text;
                // Remove o prompt injetado para limpar a resposta
                replyText = text.split("Atue como um sistema de inteligência artificial")[1] ? text.split("Atue como um sistema de inteligência artificial")[1].replace(/.*?:/, "").trim() : text.trim();
            } else {
                replyText = "Estou a processar os seus parâmetros de raciocínio.";
            }
            action = 'text_response';
        }

        res.json({ status: "success", response: replyText || "Sistema online.", action_required: action, data: payload });

    } catch (err) {
        console.error("[Erro Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha no núcleo.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Nexus Core] Rodando na porta ${PORT}`));