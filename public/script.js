document.addEventListener("DOMContentLoaded", () => {
    const orb = document.querySelector(".magic-orb");
    const statusText = document.getElementById("statusText");
    const dynamicOverlay = document.getElementById("dynamicOverlay");

    let recognition;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = false;

        recognition.onresult = async (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            statusText.innerText = `Processando: "${transcript}"`;
            await sendCommandToServer(transcript);
        };

        try {
            recognition.start();
            statusText.innerText = "Ouvindo em 2º plano...";
        } catch (e) {
            console.log("Microfone já ativo.");
        }
    } else {
        statusText.innerText = "Toque no orbe para interagir";
    }

    if(orb) {
        orb.addEventListener("click", () => {
            dynamicOverlay.classList.toggle("active");
            statusText.innerText = dynamicOverlay.classList.contains("active") 
                ? "Painel de apps aberto" 
                : "Ouvindo em 2º plano...";
        });
    }
});

async function sendCommandToServer(commandText) {
    const statusText = document.getElementById("statusText");
    const dynamicOverlay = document.getElementById("dynamicOverlay");

    try {
        const response = await fetch('/api/assistant/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: commandText })
        });

        const data = await response.json();
        
        if (data.status === "success") {
            statusText.innerText = data.response;
            if (data.action_required === 'open_instagram_overlay' || commandText.toLowerCase().includes('instagram')) {
                dynamicOverlay.classList.add("active");
            }
        } else {
            statusText.innerText = "Erro ao processar comando.";
        }
    } catch (error) {
        statusText.innerText = "Falha na conexão com o Render.";
    }
}

function executeAction(type) {
    alert("Executando integração nativa com o app: " + type);
}