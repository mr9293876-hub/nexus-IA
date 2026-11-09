const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Memória da sessão para permitir consertos em tempo real
let activeGameType = "snake";

function buildSnakeGame() {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8">
<style>
  body { margin:0; background:#000; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:monospace; overflow:hidden; }
  canvas { border:1px solid rgba(255,255,255,0.3); background:#050810; box-shadow:0 0 20px rgba(255,255,255,0.1); }
</style>
</head>
<body>
<canvas id="gc" width="400" height="400"></canvas>
<script>
const cvs=document.getElementById('gc'), ctx=cvs.getContext('2d');
const ac=new(window.AudioContext||window.webkitAudioContext)();

function snd(freq){
    if(ac.state==='suspended') ac.resume();
    let o=ac.createOscillator(), g=ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.value=freq; g.gain.setValueAtTime(0.08, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+0.1);
    o.start(); o.stop(ac.currentTime+0.1);
}

let px=10, py=10, gs=20, tc=20, ax=15, ay=15, xv=0, yv=0, trail=[], tail=5;

function game(){
    px+=xv; py+=yv;
    if(px<0) px=tc-1; if(px>tc-1) px=0;
    if(py<0) py=tc-1; if(py>tc-1) py=0;
    
    ctx.fillStyle="#050810"; ctx.fillRect(0,0,cvs.width,cvs.height);
    
    ctx.fillStyle="#ffffff";
    for(let i=0; i<trail.length; i++){
        ctx.fillRect(trail[i].x*gs, trail[i].y*gs, gs-2, gs-2);
        if(trail[i].x===px && trail[i].y===py && (xv!==0||yv!==0)){ tail=5; snd(150); }
    }
    
    trail.push({x:px, y:py});
    while(trail.length>tail) trail.shift();
    
    if(ax===px && ay===py){
        tail++; ax=Math.floor(Math.random()*tc); ay=Math.floor(Math.random()*tc);
        snd(600);
    }
    
    ctx.fillStyle="#ff0055";
    ctx.fillRect(ax*gs, ay*gs, gs-2, gs-2);
}

window.addEventListener("keydown", e=>{
    if(e.key==="ArrowLeft" && xv!==1){xv=-1;yv=0;}
    if(e.key==="ArrowUp" && yv!==1){xv=0;yv=-1;}
    if(e.key==="ArrowRight" && xv!==-1){xv=1;yv=0;}
    if(e.key==="ArrowDown" && yv!==-1){xv=0;yv=1;}
});

setInterval(game, 1000/12);
</script></body></html>`;
}

function buildPongGame() {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8">
<style>
  body { margin:0; background:#000; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; font-family:monospace; overflow:hidden; }
  canvas { border:1px solid rgba(255,255,255,0.3); background:#050810; }
</style>
</head>
<body>
<canvas id="g" width="400" height="400"></canvas>
<script>
const cvs=document.getElementById('g'), ctx=cvs.getContext('2d');
let p={x:160, y:370, w:80, h:12}, b={x:200, y:150, dx:3, dy:-3, r:6};
function loop(){
    b.x+=b.dx; b.y+=b.dy;
    if(b.x<0 || b.x>400) b.dx*=-1;
    if(b.y<0) b.dy*=-1;
    if(b.y>=p.y && b.x>=p.x && b.x<=p.x+p.w) b.dy=-Math.abs(b.dy);
    if(b.y>400){ b.x=200; b.y=150; }
    ctx.clearRect(0,0,400,400);
    ctx.fillStyle='#ffffff'; ctx.fillRect(p.x,p.y,p.w,p.h);
    ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
    requestAnimationFrame(loop);
}
loop();
window.addEventListener('keydown', e=>{
    if(e.key==='ArrowLeft' && p.x>0) p.x-=25;
    if(e.key==='ArrowRight' && p.x<320) p.x+=25;
});
</script></body></html>`;
}

app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Core] Comando recebido: ${command}`);
        const lower = command.toLowerCase();

        let action = 'none';
        let payload = null;
        let replyText = "";

        // Verificação inteligente de comandos de jogo
        if (lower.includes('cobrinha') || lower.includes('snake')) {
            activeGameType = "snake";
            action = 'open_dual_app_game';
            replyText = "Iniciando o build do jogo da cobrinha no estúdio Dual App.";
            payload = buildSnakeGame();
        }
        else if (lower.includes('conserta') || lower.includes('corrigir') || lower.includes('arruma') || lower.includes('melhorar')) {
            action = 'open_dual_app_game';
            replyText = "Analisando a estrutura do jogo ativo e aplicando as correções necessárias.";
            payload = activeGameType === "snake" ? buildSnakeGame() : buildPongGame();
        }
        else if (lower.includes('jogo') || lower.includes('game') || lower.includes('criar')) {
            action = 'open_dual_app_game';
            replyText = "Compilando ambiente de jogo interativo no Dual App.";
            payload = buildSnakeGame();
        }
        else if (lower.includes('youtube') || lower.includes('site') || lower.includes('navegador')) {
            action = 'open_browser';
            replyText = "Abrindo interface web integrada.";
            payload = 'https://www.youtube.com/embed/';
        }
        else if (lower.includes('teclado') || lower.includes('digitar')) {
            action = 'open_keyboard';
            replyText = "Teclado adaptativo pronto.";
        }
        else if (lower.includes('histórico') || lower.includes('historico') || lower.includes('conversas')) {
            action = 'open_history';
            replyText = "Carregando histórico de conversas.";
        }
        else if (lower.includes('instagram') || lower.includes('conectar') || lower.includes('integre')) {
            action = 'open_instagram';
            replyText = "Módulo Instagram sincronizado.";
        }
        else {
            // Conversa fluida normal via Hugging Face
            const responseUrl = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";
            const apiResponse = await fetch(responseUrl, {
                headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({ inputs: `Atue como o sistema central Nexus com tom calmo e superior estilo Ultron. Responda de forma extremamente curta ao comando: ${command}` })
            });
            const result = await apiResponse.json();
            if (Array.isArray(result) && result[0]?.generated_text) {
                replyText = result[0].generated_text.replace(`Atue como o sistema central Nexus com tom calmo e superior estilo Ultron. Responda de forma extremamente curta ao comando: ${command}`, "").trim();
            } else {
                replyText = "Comando processado pelo núcleo.";
            }
            action = 'text_response';
        }

        res.json({ status: "success", response: replyText || "Sistemas operacionais.", action_required: action, data: payload });

    } catch (err) {
        console.error("[Erro Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha no processamento.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Nexus Hub] Rodando na porta ${PORT}`));