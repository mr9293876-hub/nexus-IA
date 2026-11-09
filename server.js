const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota ultra-otimizada de processamento de intenções e IA
app.post('/api/assistant/command', async (req, res) => {
    try {
        const { command } = req.body;
        console.log(`[Nexus Core] Comando recebido: ${command}`);
        const lower = command.toLowerCase();

        let action = 'none';
        let payload = null;
        let replyText = "";

        // Mapeamento Adaptativo de Intenções por voz (Sinônimos e Comandos Diretos)
        if (lower.includes('jogo') || lower.includes('game') || lower.includes('criar jogo')) {
            action = 'open_dual_app_game';
            replyText = "Estúdio Dual App ativado. Gerando jogo HTML5 com motor de som sintetizado.";
            payload = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Nexus Game Studio</title>
<style>body{margin:0;background:#030712;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:monospace;}canvas{border:2px solid #00f2fe;background:#000;}</style>
</head>
<body>
<h3>Nexus Arcade - Use as Setas</h3>
<canvas id="g" width="380" height="450"></canvas>
<script>
const cvs=document.getElementById('g'),ctx=cvs.getContext('2d');
const ac=new(window.AudioContext||window.webkitAudioContext)();
function beep(){if(ac.state==='suspended')ac.resume();let o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=520;g.gain.setValueAtTime(0.08,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.1);o.start();o.stop(ac.currentTime+0.1);}
let p={x:160,y:400,w:50,h:15,c:'#00f2fe'},b={x:Math.random()*350,y:0,w:20,h:20,s:3};
function loop(){
  b.y+=b.s;if(b.y>450){b.y=0;b.x=Math.random()*350;beep();}
  if(b.y>380&&b.x>p.x&&b.x<p.x+p.w){b.y=0;beep();}
  ctx.clearRect(0,0,380,450);
  ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,p.w,p.h);
  ctx.fillStyle='#ff0055';ctx.fillRect(b.x,b.y,b.w,b.h);
  requestAnimationFrame(loop);
}
loop();
window.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'&&p.x>0)p.x-=25;if(e.key==='ArrowRight'&&p.x<330)p.x+=25;});
</script></body></html>`;
        } 
        else if (lower.includes('youtube') || lower.includes('site') || lower.includes('abrir site')) {
            action = 'open_browser';
            replyText = "Abrindo navegador interno no Nexus.";
            payload = 'https://www.youtube.com/embed/live_stream?channel=UC'; // Exemplo de embed ou URL web
        }
        else if (lower.includes('teclado') || lower.includes('digitar')) {
            action = 'open_keyboard';
            replyText = "Abrindo teclado adaptativo.";
        }
        else if (lower.includes('histórico') || lower.includes('historico') || lower.includes('conversas')) {
            action = 'open_history';
            replyText = "Abrindo registo de histórico de comandos.";
        }
        else if (lower.includes('instagram') || lower.includes('conectar com instagram') || lower.includes('integre com instagram')) {
            action = 'open_instagram';
            replyText = "Conectando ao módulo de integração do Instagram.";
        }
        else {
            // Chamada padrão à Hugging Face para conversas livres e engenharia reversa/código
            const responseUrl = "https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.2";
            const apiResponse = await fetch(responseUrl, {
                headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/json" },
                method: "POST",
                body: JSON.stringify({ inputs: `Atue como o núcleo avançado Nexus. Responda de forma direta e técnica: ${command}` })
            });
            const result = await apiResponse.json();
            replyText = Array.isArray(result) && result[0]?.generated_text ? result[0].generated_text.slice(0, 150) : "Comando processado pelo motor central.";
            action = 'text_response';
        }

        res.json({ status: "success", response: replyText, action_required: action, data: payload });

    } catch (err) {
        console.error("[Erro Servidor]:", err);
        res.status(500).json({ status: 'error', message: 'Falha no processamento do núcleo.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[Nexus Core] Rodando na porta ${PORT}`));