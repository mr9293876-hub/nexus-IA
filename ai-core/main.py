import sys
import json
from duckduckgo_search import DDGS
from nexus_shield import shield
from nexus_healer import healer  # Importa o nosso sistema de auto-cura

CACHE_MEMORIA = {}

def buscar_web_livre(query):
    try:
        results = list(DDGS().text(query, max_results=3))
        if results:
            resultados = []
            for r in results:
                resultados.append(f"Título: {r.get('title')}\nResumo: {r.get('body')}")
            return "\n---\n".join(resultados)
    except Exception as e:
        sys.stderr.write(f"Erro na busca livre: {e}\n")
    return ""

def _nucleo_processamento(data):
    """Lógica interna protegida pelo healer"""
    prompt_bruto = data.get("prompt", "")
    usar_busca = data.get("use_search", False)
    acao_especial = data.get("action", None)
    
    prompt = shield.sanitizar_e_proteger(prompt_bruto)
    
    if acao_especial:
        resultado_adaptativo = shield.adaptador_inteligente(acao_especial, data)
        return {
            "status": "success",
            "source": "adaptive_shield_engine",
            "result": resultado_adaptativo
        }

    cache_key = f"{prompt}_{usar_busca}"
    if cache_key in CACHE_MEMORIA:
        return {
            "status": "success",
            "source": "cache_memory",
            "thought": CACHE_MEMORIA[cache_key]
        }

    contexto_web = buscar_web_livre(prompt) if usar_busca else ""
    resposta_processada = f"Processado com segurança máxima e contexto web ({len(contexto_web)} chars)" if contexto_web else "Processado via engine local blindada"
    
    resultado = {
        "status": "success",
        "source": "healed_shielded_engine",
        "context_length": len(contexto_web),
        "thought": resposta_processada,
        "payload_original": prompt
    }

    CACHE_MEMORIA[cache_key] = resposta_processada
    return resultado

def processar_pensamento(data):
    # Envolve a execução no sistema de auto-cura do Healer
    return healer.interceptar_e_corrigir(_nucleo_processamento, data)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            raw_input = sys.argv[1]
            input_data = json.loads(raw_input)
            output = processar_pensamento(input_data)
            print(json.dumps(output))
        except Exception as err:
            print(json.dumps({"status": "error", "message": str(err)}))
    else:
        print(json.dumps({"status": "active", "module": "python_brain_fully_healed"}))