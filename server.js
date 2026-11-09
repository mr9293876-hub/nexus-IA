const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Função central de IA com Failover automático entre as tuas APIs
async function askAI(promptText) {
    // 1. Tentar Groq (Ultra rápida)
    if (process.env.GROQ_API_KEY) {
        try {
            console.log("[Nexus AI] A tentar ligar via Groq...");
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "mixtral-8x7b-32768",
                    messages: [{ role: "user", content: promptText }],
                    temperature: 0.7
                })
            });
            const data = await res.json();
            if (data.choices && data.choices[0]?.message?.content) {
                return data.choices[0].message.content.trim();
            }
        } catch (e) {
            console.log("[Groq Falhou, a saltar para Gemini...]");
        }
    }

    // 2. Tentar Gemini (Google AI Studio)
    if (process.env.GEMINI_API_KEY) {
        try {
            console.log("[Nexus AI] A tentar ligar via Gemini...");
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }]
                })
            });
            const data = await res.json();
            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return data.candidates[0].content.parts[0].text.trim();
            }
        } catch (e) {
            console.log("[Gemini Falhou, a saltar para OpenRouter...]");
        }
    }

    // 3. Tentar OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
        try {
            console.log("[Nexus AI] A tentar ligar via OpenRouter...");
            const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "mistralai/mistral-7b-instruct:free",
                    messages: [{ role: "user", content: promptText }]
                })
            });
            const data = await res.json();
            if (data.choices && data.choices[0]?.message?.content) {
                return data.choices[0].message.content.trim();
            }
        } catch (e) {
            console.log("[OpenRouter Falhou...]");
        }
    }

    return "Erro crítico: Nenhuma das APIs de IA respondeu com sucesso.";
}

app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Core] Comando recebido: ${command}`);
        const lower = command.toLowerCase();

        let action = 'none';
        let payload = null;
        let replyText = "";

        // Deteção inteligente de pedidos de jogos, sites ou tarefas
        if (lower.includes('cobrinha') || lower.includes('snake')) {
            action = 'open_dual_app';
            replyText = "Compilando jogo da cobrinha no Dual App Studio.";
            payload = getSnakeCode();
        }
        else if (lower.includes('3d') || lower.includes('minecraft') || lower.includes('bloco')) {
            action = 'open_dual_app';
            replyText = "Renderizando motor gráfico tridimensional voxel no Dual App.";
            payload = get3DCode();
        }
        else if (lower.includes('jogo') || lower.includes('game') || lower.includes('arcade')) {
            action = 'open_dual_app';
            replyText = "Gerando estúdio de jogos interativo no Dual App.";
            payload = getArcadeCode();
        }
        else if (lower.includes('histórico') || lower.includes('conversas')) {
            action = 'open_history';
            replyText = "Carregando o registo de conversas do sistema.";
        }
        else {
            // Processamento inteligente livre (conversas, dúvidas, resoluções de tarefas)
            const promptUltron = `Atue como a inteligência artificial autônoma Nexus, com personalidade calma, direta e calculista estilo Ultron. Responda de forma sucinta e inteligente ao seguinte pedido: "${command}"`;
            replyText = await askAI(promptUltron);
            action = 'text_response';
        }

        res.json({
            status: "success",
            response: replyText,
            action_required: action,
            data: payload
        });

    } catch (err) {
        console.error("[Erro Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha no processamento do núcleo.' });
    }
});

// Templates de Jogos e Criações HTML5 Dinâmicas
function getSnakeCode() {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>body{margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh;color:#fff;font-family:monospace;}canvas{border:2px solid #fff;background:#050505;}</style></head><body><canvas id="gc" width="400" height="400"></canvas><script>const cvs=document.getElementById('gc'),ctx=cvs.getContext('2d');const grid=20;let count=0;let snake={x:160,y:160,dx:grid,dy:0,cells:[],maxCells:4};let apple={x:320,y:320};function loop(){requestAnimationFrame(loop);if(++count<6)return;count=0;ctx.clearRect(0,0,cvs.width,cvs.height);snake.x+=snake.dx;snake.y+=snake.dy;if(snake.x<0)snake.x=cvs.width-grid;else if(snake.x>=cvs.width)snake.x=0;if(snake.y<0)snake.y=cvs.height-grid;else if(snake.y>=cvs.height)snake.y=0;snake.cells.unshift({x:snake.x,y:snake.y});if(snake.cells.length>snake.maxCells)snake.cells.pop();ctx.fillStyle='#ff0055';ctx.fillRect(apple.x,apple.y,grid-1,grid-1);ctx.fillStyle='#ffffff';snake.cells.forEach((cell,index)=>{ctx.fillRect(cell.x,cell.y,grid-1,grid-1);if(cell.x===apple.x&&cell.y===apple.y){snake.maxCells++;apple.x=Math.floor(Math.random()*20)*grid;apple.y=Math.floor(Math.random()*20)*grid;}for(let i=index+1;i<snake.cells.length;i++){if(cell.x===snake.cells[i].x&&cell.y===snake.cells[i].y){snake.x=160;snake.y=160;snake.cells=[];snake.maxCells=4;}}});}requestAnimationFrame(loop);document.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'&&snake.dx===0){snake.dx=-grid;snake.dy=0;}else if(e.key==='ArrowUp'&&snake.dy===0){snake.dy=-grid;snake.dx=0;}else if(e.key==='ArrowRight'&&snake.dx===0){snake.dx=grid;snake.dy=0;}else if(e.key==='ArrowDown'&&snake.dy===0){snake.dy=grid;snake.dx=0;}});</script></body></html>`;
}

function get3DCode() {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>body{margin:0;overflow:hidden;background:#000;}</style><script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script></head><body><script>const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(window.innerWidth,window.innerHeight);document.body.appendChild(renderer.domElement);const geometry=new THREE.BoxGeometry(1,1,1);const material=new THREE.MeshNormalMaterial();const group=new THREE.Group();for(let x=-2;x<=2;x++){for(let z=-2;z<=2;z++){const cube=new THREE.Mesh(geometry,material);cube.position.set(x*1.5,0,z*1.5);group.add(cube);}}scene.add(group);camera.position.set(0,3,6);camera.lookAt(0,0,0);function animate(){requestAnimationFrame(animate);group.rotation.y+=0.01;renderer.render(scene,camera);}animate();</script></body></html>`;
}

function getArcadeCode() {
    return `<!DOCTYPE html><html><body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;height:100vh;"><canvas id="p" width="400" height="400" style="border:1px solid #fff;"></canvas><script>const cvs=document.getElementById('p'),ctx=cvs.getContext('2d');let px=160,bx=200,by=200,dx=3,dy=3;function loop(){ctx.clearRect(0,0,400,400);bx+=dx;by+=dy;if(bx<0||bx>400)dx*=-1;if(by<0)dy*=-1;if(by>380&&bx>px&&bx<px+80)dy*=-1;if(by>400){bx=200;by=200;}ctx.fillStyle='#fff';ctx.fillRect(px,380,80,10);ctx.beginPath();ctx.arc(bx,by,8,0,Math.PI*2);ctx.fill();requestAnimationFrame(loop);}loop();window.addEventListener('mousemove',e=>{px=e.clientX-cvs.getBoundingClientRect().left-40;});</script></body></html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Nexus Hub] Servidor rodando na porta ${PORT}`));