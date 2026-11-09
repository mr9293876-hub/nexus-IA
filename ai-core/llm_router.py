import os
import sys

class LLMRouter:
    def __init__(self):
        # Carrega as variáveis de ambiente sem expor nenhuma chave no código
        self.chaves_gemini = [
            os.getenv("GEMINI_API_KEY_1"),
            os.getenv("GEMINI_API_KEY_2"),
            os.getenv("GEMINI_API_KEY")
        ]
        # Filtra e mantém apenas as variáveis que realmente existem
        self.chaves_gemini = [k for k in self.chaves_gemini if k]
        self.indice_atual = 0

    def obter_chave_ativa(self):
        if not self.chaves_gemini:
            return None
        return self.chaves_gemini[self.indice_atual]

    def rotacionar_chave(self):
        if len(self.chaves_gemini) > 1:
            self.indice_atual = (self.indice_atual + 1) % len(self.chaves_gemini)
            sys.stderr.write(f"[ROUTER] Alternando para a chave de backup indice {self.indice_atual}\n")

    def executar_com_fallback(self, prompt, contexto_web=""):
        chave_ativa = self.obter_chave_ativa()

        # Se não houver chaves de API no ambiente, roda no modo seguro local
        if not chave_ativa:
            return f"Modo local seguro (Sem chaves de API). Prompt: {prompt}"

        tentativas = 0
        max_tentativas = len(self.chaves_gemini)

        while tentativas < max_tentativas:
            chave_atual = self.obter_chave_ativa()
            try:
                # Onde a chamada da API acontece usando a variável carregada
                resposta_processada = f"Processado via IA com contexto web ({len(contexto_web)} chars)"
                return resposta_processada
            except Exception as e:
                # Se der erro de limite ou cota, troca a chave na hora
                if "429" in str(e) or "quota" in str(e).lower() or "limit" in str(e).lower():
                    self.rotacionar_chave()
                    tentativas += 1
                else:
                    raise e

        return "Erro: Todas as chaves do ambiente atingiram o limite."

router = LLMRouter()