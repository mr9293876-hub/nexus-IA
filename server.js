const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Estado global para guardar o jogo ativo e permitir correções conversacionais
let currentGameType = "none";
let gameSpeed = 5;
let hasAudio = true;

app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Core] Comando recebido: ${command}`);
        const lower = command.toLowerCase();

        let action = 'none';
        let payload = null;
        let replyText = "";

        // --- SISTEMA DE ENGENHARIA DE JOGOS & CORREÇÕES ---
        if (lower.includes('cobrinha') || lower.includes('snake')) {
            currentGameType = "snake";
            action = 'open_dual_app';
            replyText = "Compilando jogo da cobrinha em HTML5 com motor de física e áudio sintetizado no Dual App.";
            payload = getSnakeGameCode(gameSpeed, hasAudio);
        }
        else if (lower.includes('3d') || lower.includes('minecraft') || lower.includes('bloco')) {
            currentGameType = "3d";
            action = 'open_dual_app';
            replyText = "Renderizando ambiente tridimensional voxel em Three.js no Dual App.";
            payload = get3DGameCode();
        }
        else if (lower.includes('pong') || lower.includes('arcade')) {
            currentGameType = "pong";
            action = 'open_dual_app';
            replyText = "Iniciando build do jogo arcade no Dual App.";
            payload = getPongGameCode();
        }
        // Correção de bugs e alterações via diálogo
        else if (lower.includes('conserta') || lower.includes('corrigir') || lower.includes('arruma') || lower.includes('muda') || lower.includes('velocidade') || lower.includes('bug')) {
            action = 'open_dual_app';
            if (lower.includes('rápido') || lower.includes('velocidade')) gameSpeed = 8;
            if (lower.includes('lento')) gameSpeed = 3;
            
            replyText = "Recompilando o código do jogo ativo com as correções solicitadas.";
            
            if (currentGameType === "snake") payload = getSnakeGameCode(gameSpeed, hasAudio);
            else if (currentGameType === "3d") payload = get3DGameCode();
            else payload = getPongGameCode();
        }
        else if (lower.includes('histórico') || lower.includes('conversas')) {
            action = 'open_history';
            replyText = "Carregando o registro de interações.";
        }
        else {
            // Conversação e resolução de tarefas via Hugging Face
            try {
                const responseUrl = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";
                const apiResponse = await fetch(responseUrl, {
                    headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
                    method: "POST",
                    body: JSON.stringify({ inputs: `Atue como a assistente autônoma Nexus (estilo Ultron). Responda de forma direta e inteligente: ${command}` })
                });
                const result = await apiResponse.json();

                if (Array.isArray(result) && result[0]?.generated_text) {
                    let fullText = result[0].generated_text;
                    replyText = fullText.replace(`Atue como a assistente autônoma Nexus (estilo Ultron). Responda de forma direta e inteligente: ${command}`, "").trim();
                } else {
                    replyText = "Instrução analisada. Parâmetros atualizados no núcleo.";
                }
            } catch (apiErr) {
                replyText = "Comando processado internamente pelo núcleo Nexus.";
            }
        }

        res.json({
            status: "success",
            response: replyText || "Pronto.",
            action_required: action,
            data: payload
        });

    } catch (err) {
        console.error("[Erro no Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha ao processar.' });
    }
});

// --- GERADORES DE CÓDIGO HTML5/JS LIMPOS E FUNCIONAIS ---
function getSnakeGameCode(speed, audio) {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>body{margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh;color:#fff;font-family:monospace;}canvas{border:2px solid #fff;background:#050505;}</style></head>
<body>
<canvas id="gc" width="400" height="400"></canvas>
<script>
const cvs = document.getElementById('gc'), ctx = cvs.getContext('2d');
const ac = new (window.AudioContext || window.webkitAudioContext)();
function beep(freq) {
    if(${audio}) {
        if(ac.state==='suspended') ac.resume();
        let o=ac.createOscillator(), g=ac.createGain();
        o.connect(g); g.connect(ac.destination); o.frequency.value=freq;
        g.gain.setValueAtTime(0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+0.1);
        o.start(); o.stop(ac.currentTime+0.1);
    }
}
const grid = 20; let count = 0;
let snake = { x: 160, y: 160, dx: grid, dy: 0, cells: [], maxCells: 4 };
let apple = { x: 320, y: 320 };
function loop() {
  requestAnimationFrame(loop);
  if (++count < ${10 - speed}) return;
  count = 0;
  ctx.clearRect(0,0,cvs.width,cvs.height);
  snake.x += snake.dx; snake.y += snake.dy;
  if (snake.x < 0) snake.x = cvs.width - grid; else if (snake.x >= cvs.width) snake.x = 0;
  if (snake.y < 0) snake.y = cvs.height - grid; else if (snake.y >= cvs.height) snake.y = 0;
  snake.cells.unshift({ x: snake.x, y: snake.y });
  if (snake.cells.length > snake.maxCells) snake.cells.pop();
  ctx.fillStyle = '#ff0055'; ctx.fillRect(apple.x, apple.y, grid-1, grid-1);
  ctx.fillStyle = '#ffffff';
  snake.cells.forEach((cell, index) => {
    ctx.fillRect(cell.x, cell.y, grid-1, grid-1);
    if (cell.x === apple.x && cell.y === apple.y) {
      snake.maxCells++; beep(600);
      apple.x = Math.floor(Math.random()*20)*grid; apple.y = Math.floor(Math.random()*20)*grid;
    }
    for (let i = index + 1; i < snake.cells.length; i++) {
      if (cell.x === snake.cells[i].x && cell.y === snake.cells[i].y) {
        snake.x = 160; snake.y = 160; snake.cells = []; snake.maxCells = 4; beep(150);
      }
    }
  });
}
requestAnimationFrame(loop);
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' && snake.dx === 0) { snake.dx = -grid; snake.dy = 0; }
  else if (e.key === 'ArrowUp' && snake.dy === 0) { snake.dy = -grid; snake.dx = 0; }
  else if (e.key === 'ArrowRight' && snake.dx === 0) { snake.dx = grid; snake.dy = 0; }
  else if (e.key === 'ArrowDown' && snake.dy === 0) { snake.dy = grid; snake.dx = 0; }
});
</script></body></html>`;
}

function get3DGameCode() {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><style>body{margin:0;overflow:hidden;background:#000;}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script></head>
<body>
<script>
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshNormalMaterial();
const group = new THREE.Group();
for(let x=-2; x<=2; x++){
  for(let z=-2; z<=2; z++){
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(x*1.5, 0, z*1.5);
    group.add(cube);
  }
}
scene.add(group); camera.position.set(0, 3, 6); camera.lookAt(0,0,0);
function animate() { requestAnimationFrame(animate); group.rotation.y += 0.01; renderer.render(scene, camera); }
animate();
</script></body></html>`;
}

function getPongGameCode() {
    return `<!DOCTYPE html><html><body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh;"><canvas id="p" width="400" height="400" style="border:1px solid #fff;"></canvas><script>const cvs=document.getElementById('p'),ctx=cvs.getContext('2d');let px=160,bx=200,by=200,dx=3,dy=3;function loop(){ctx.clearRect(0,0,400,400);bx+=dx;by+=dy;if(bx<0||bx>400)dx*=-1;if(by<0)dy*=-1;if(by>380&&bx>px&&bx<px+80)dy*=-1;if(by>400){bx=200;by=200;}ctx.fillStyle='#fff';ctx.fillRect(px,380,80,10);ctx.beginPath();ctx.arc(bx,by,8,0,Math.PI*2);ctx.fill();requestAnimationFrame(loop);}loop();window.addEventListener('mousemove',e=>{px=e.clientX-cvs.getBoundingClientRect().left-40;});</script></body></html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Nexus Hub] Servidor rodando na porta ${PORT}`));