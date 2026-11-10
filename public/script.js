const CLOUD_URL = window.location.origin;

// --- ESFERA 3D (3000 PONTOS) ---
const canvas = document.getElementById('nexusCanvas');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    const numPoints = 3000;
    const points = [];
    const radius = 180;

    for (let i = 0; i < numPoints; i++) {
        const phi = Math.acos(-1 + (2 * i) / numPoints);
        const theta = Math.sqrt(numPoints * Math.PI) * phi;
        points.push({
            x: radius * Math.cos(theta) * Math.sin(phi),
            y: radius * Math.sin(theta) * Math.sin(phi),
            z: radius * Math.cos(phi)
        });
    }

    let angleX = 0, angleY = 0;
    let speed = 1;
    let ballState = "idle";

    function animate() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2;

        if (ballState === "listening") speed = 3.5;
        else if (ballState === "speaking") speed = 2.2;
        else speed = 1;

        angleX += 0.004 * speed;
        angleY += 0.007 * speed;

        const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
        const cosY = Math.cos(angleY), sinY = Math.sin(angleY);

        for (let i = 0; i < points.length; i++) {
            let p = points[i];
            let x1 = p.x * cosY - p.z * sinY;
            let z1 = p.z * cosY + p.x * sinY;
            let y2 = p.y * cosX - z1 * sinX;
            let z2 = z1 * cosX + p.y * sinX;

            let fov = 400;
            let scale = fov / (fov + z2);
            let px = x1 * scale + cx;
            let py = y2 * scale + cy;

            if (z2 > -fov) {
                let alpha = (z2 + radius) / (2 * radius);
                alpha = Math.max(0.1, Math.min(1, alpha));
                ctx.fillStyle = ballState === "listening" ? `rgba(0, 243, 255, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
                ctx.fillRect(px, py, scale * 1.5, scale * 1.5);
            }
        }
        requestAnimationFrame(animate);
    }
    animate();

    window.falarVozMasculina = function(texto) {
        const synth = window.speechSynthesis;
        const utter = new SpeechSynthesisUtterance(texto);
        utter.lang = 'pt-BR';
        const voices = synth.getVoices();
        const voz = voices.find(v => v.lang.includes('pt') && v.name.toLowerCase().includes('male'));
        if (voz) utter.voice = voz;

        utter.onstart = () => { ballState = "speaking"; };
        utter.onend = () => { ballState = "idle"; };
        synth.speak(utter);
    };
}

// Controlos do Painel Dual
function abrirDual(html) {
    const overlay = document.getElementById('dual-overlay');
    if (html) document.getElementById('dualFrame').srcdoc = html;
    if (overlay) {
        overlay.style.width = '50%';
        overlay.style.right = '0';
    }
}

function expandirDual() {
    const overlay = document.getElementById('dual-overlay');
    if (overlay) {
        overlay.style.width = '100%';
        overlay.style.right = '0';
    }
}

function fecharDual() {
    const overlay = document.getElementById('dual-overlay');
    if (overlay) overlay.style.right = '-100%';
}

window.fecharDual = fecharDual;

// Reconhecimento de Voz Inteligente
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (window.SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'pt-BR';

    let timerVoz;
    recognition.onresult = (event) => {
        const idx = event.results.length - 1;
        const frase = event.results[idx][0].transcript.trim();

        if (frase.toLowerCase().includes("nexus")) {
            clearTimeout(timerVoz);
            timerVoz = setTimeout(() => {
                executarComando(frase);
            }, 700);
        }
    };

    recognition.onend = () => { recognition.start(); };
    recognition.start();
}

async function executarComando(frase) {
    try {
        const res = await fetch(`${CLOUD_URL}/api/nexus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: frase })
        });
        const dados = await res.json();

        if (dados.resposta && window.falarVozMasculina) window.falarVozMasculina(dados.resposta);

        if (dados.action === "open" && dados.painel) abrirDual(dados.painel);
        else if (dados.action === "expand") expandirDual();
        else if (dados.action === "close") fecharDual();
    } catch (e) {
        console.error("Erro:", e);
    }
}