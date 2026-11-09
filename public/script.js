// URL fixo e oficial do teu projeto na nuvem (Adeus Colab e LocalTunnel!)
const NEXUS_API = 'https://nexus-ia-syc5.onrender.com';

async function ligarAoNexus() {
    try {
        console.aba ? console.log("A ligar ao Nexus-IA...") : null;
        
        const resposta = await fetch(`${NEXUS_API}/api/status`);
        const dados = await resposta.json();
        
        if (dados.status === "online") {
            console.log("🔥 Conectado com sucesso ao servidor oficial!", dados);
            // Podes colocar aqui a lógica para iniciar o teu jogo ou carregar o app
        }
    } catch (erro) {
        console.error("Erro de ligação com o Render:", erro);
    }
}

// Executa assim que o app abre
ligarAoNexus();