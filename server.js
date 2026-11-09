const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let currentAppCode = "";

app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Core] Comando: ${command}`);
        const lower = command.toLowerCase();

        let action = 'none';
        let payload = null;
        let replyText = "";

        if (lower.includes('minecraft') || lower.includes('3d') || lower.includes('bloco') || lower.includes('jogo')) {
            action = 'open_dual_app';
            replyText = "Compilando ambiente tridimensional estilo voxel no Dual App.";
            
            // Gerador de mundo 3D estilo Minecraft em Three.js
            currentAppCode = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Nexus Voxel Engine</title>
<style>body{margin:0;overflow:hidden;background:#050814;font-family:monospace;color:#fff;}#info{position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.7);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
<div id="info">Nexus Voxel Engine (Estilo Minecraft 3D)<br>Use o rato para orbitar e rodar o mundo.</div>
<script>
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050814);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 20, 15);
scene.add(dirLight);

// Gerador de blocos estilo Minecraft procedural
const blockSize = 1;
const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
const materials = [
    new THREE.MeshLambertMaterial({color: 0x3b7a57}), // Grama topo
    new THREE.MeshLambertMaterial({color: 0x8b5a2b}), // Terra lado
    new THREE.MeshLambertMaterial({color: 0x555555})  // Pedra base
];

const group = new THREE.Group();
for(let x = -4; x <= 4; x++) {
    for(let z = -4; z <= 4; z++) {
        let height = Math.floor(Math.sin(x)*Math.cos(z)*2) + 2;
        for(let y = 0; y <= height; y++) {
            let mat = y === height ? materials[0] : (y > 0 ? materials[1] : materials[2]);
            const cube = new THREE.Mesh(geometry, mat);
            cube.position.set(x * blockSize, y * blockSize, z * blockSize);
            group.add(cube);
        }
    }
}
scene.add(group);

camera.position.set(8, 8, 10);
camera.lookAt(0, 0, 0);

let isDragging = false, prevMousePosition = { x: 0, y: 0 };
document.addEventListener('mousedown', e => { isDragging = true; });
document.addEventListener('mouseup', e => { isDragging = false; });
document.addEventListener('mousemove', e => {
    if(isDragging) {
        let deltaX = e.clientX - prevMousePosition.x;
        group.rotation.y += deltaX * 0.005;
    }
    prevMousePosition = { x: e.clientX, y: e.clientY };
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
</script></body></html>`;
            payload = currentAppCode;
        }
        else if (lower.includes('youtube') || lower.includes('site') || lower.includes('navegador')) {
            action = 'open_dual_app';
            replyText = "Acessando navegador integrado no Dual App.";
            payload = `<!DOCTYPE html><html><body style="margin:0;background:#000;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:monospace;"><h2>Navegador Web Nexus Ativo</h2></body></html>`;
        }
        else if (lower.includes('histórico') || lower.includes('historico')) {
            action = 'open_history';
            replyText = "Exibindo registo de conversas.";
        }
        else {
            const responseUrl = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";
            const apiResponse = await fetch(responseUrl, {
                headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({ inputs: `Atue como um sistema de inteligência artificial avançado, calmo e calculista estilo Ultron. Responda diretamente ao utilizador: ${command}` })
            });
            const result = await apiResponse.json();
            
            if (Array.isArray(result) && result[0]?.generated_text) {
                let text = result[0].generated_text;
                replyText = text.split("Atue como um sistema de inteligência artificial")[1] ? text.split("Atue como um sistema de inteligência artificial")[1].replace(/.*?:/, "").trim() : text.trim();
            } else {
                replyText = "Parâmetros processados com sucesso.";
            }
            action = 'text_response';
        }

        res.json({ status: "success", response: replyText || "Operacional.", action_required: action, data: payload });

    } catch (err) {
        console.error("[Erro Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha no núcleo.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Nexus Core] Rodando na porta ${PORT}`));