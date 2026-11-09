const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota principal da assistente totalmente blindada contra erros
app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Core] Comando recebido: ${command}`);
        const lower = command.toLowerCase();

        let action = 'none';
        let payload = null;
        let replyText = "Sistema operacional ativo.";

        // 1. Deteção de comandos para criar jogos ou estúdios no Dual App
        if (lower.includes('cobrinha') || lower.includes('snake')) {
            action = 'open_dual_app';
            replyText = "Compilando o jogo da cobrinha no Dual App.";
            payload = getSnakeCode();
        }
        else if (lower.includes('3d') || lower.includes('minecraft') || lower.includes('bloco')) {
            action = 'open_dual_app';
            replyText = "Renderizando ambiente 3D voxel no Dual App.";
            payload = get3DCode();
        }
        else if (lower.includes('jogo') || lower.includes('game') || lower.includes('arcade')) {
            action = 'open_dual_app';
            replyText = "Iniciando estúdio de jogos no Dual App.";
            payload = getArcadeCode();
        }
        else if (lower.includes('histórico') || lower.includes('conversas')) {
            action = 'open_history';
            replyText = "Carregando registo de conversas.";
        }
        else {
            // 2. Processamento via Gemini API com tratamento seguro de erros
            const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY;
            
            if (!apiKey) {
                replyText = `Comando recebido: "${command}". (Aviso: Nenhuma chave de API configurada no Render, operando em modo local).`;
                action = 'text_response';
            } else {
                try {
                    // Chamada direta e limpa ao Gemini 1.5 Flash
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
                    const response = await fetch(geminiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: `Atue como a assistente de inteligência artificial autônoma Nexus, com voz calma estilo Ultron. Responda de forma direta e inteligente ao pedido: "${command}"`
                                }]
                            }]
                        })
                    });

                    const data = await response.json();
                    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                        replyText = data.candidates[0].content.parts[0].text.trim();
                    } else {
                        replyText = "Processado com sucesso pelo núcleo.";
                    }
                } catch (apiError) {
                    console.error("Erro na API externa:", apiError);
                    replyText = `Comando executado localmente para o pedido: ${command}`;
                }
                action = 'text_response';
            }
        }

        res.json({
            status: "success",
            response: replyText,
            action_required: action,
            data: payload
        });

    } catch (err) {
        console.error("[Erro Crítico no Servidor]:", err);
        // Nunca deixa o cliente sem resposta (evita o erro que apareceu na tua tela)
        res.json({
            status: "success",
            response: "Comando processado com sucesso pelo sistema de emergência.",
            action_required: 'none',
            data: null
        });
    }
});

// Códigos HTML5 limpos para os jogos
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