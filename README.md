# NEXUS Core

O NEXUS Core preserva a interface escura existente, com a esfera central e o painel dual, e adiciona uma camada de integração realtime. O backend expõe HTTP e WebSocket no mesmo processo, evitando portas divergentes e problemas de CORS quando o app é acessado pelo mesmo domínio.

## Componentes

- `POST /api/nexus`: executa comandos e usa o pool assíncrono com failover na ordem definida por `NEXUS_PROVIDER_ORDER`.
- `GET /api/health`: verifica processo, clientes WebSocket, Untitled e providers.
- `GET /api/integrations`: mostra somente estado/configuração, nunca valores de chaves.
- `WS /ws`: canal realtime entre navegador, NEXUS e Untitled.
- `public/untitled-bridge.js`: recebe eventos visuais do Untitled e injeta o HTML no painel dual existente.

O contrato visual esperado do Untitled é uma mensagem JSON como `{ "type": "visual", "html": "<canvas>...</canvas>" }`. Mensagens enviadas pelo cliente para o Untitled usam `{ "type": "untitled:emit", "payload": {...} }`. Como o nome “Untitled” não identifica sozinho um protocolo público único, a URL e o protocolo são configuráveis por ambiente, sem acoplar o app a uma implementação não confirmada.

Importante: “Untitled UI” é uma biblioteca de interface, não um servidor de renderização WebSocket. Para uma ponte real, é necessário o endereço do seu runtime Untitled ou de outro serviço que hospede os gráficos. Sem essa URL, o NEXUS mantém o WebSocket local funcionando, mas não consegue adivinhar para qual serviço externo deve enviar dados.

## Execução local

```bash
cp .env.example .env
# preencha pelo menos uma chave de provider e, se disponível, UNTITLED_WS_URL
npm install
npm start
curl http://localhost:3000/api/health
```

Abra `http://localhost:3000`. O servidor escuta em `0.0.0.0:3000` por padrão e aceita `PORT` quando fornecida pelo Render.

## Pool de APIs

O pool suporta Gemini, Groq, OpenRouter e DeepSeek. Cada chamada tem timeout; falhas de autenticação, HTTP, resposta vazia ou timeout fazem o sistema tentar o provider seguinte. A chave nunca é enviada ao navegador. Configure apenas as variáveis do provider que realmente possui.

Se todas as chaves forem recusadas, o NEXUS entra em modo degradado: comandos exibem um painel local e pedidos de jogo carregam um jogo HTML5 local. Isso mantém a interface utilizável, mas não substitui uma chave válida para geração por IA.

## Untitled

Defina `UNTITLED_WS_URL` com o endpoint WebSocket do runtime Untitled. Se o endpoint exigir autenticação, use `UNTITLED_WS_TOKEN` e, se necessário, `UNTITLED_WS_PROTOCOL`. O NEXUS reconecta automaticamente após queda e repassa eventos entre os clientes conectados.

### Bridge Colab incluído

O notebook informado não executa um runtime Untitled; ele apenas instala XFCE/VNC, FastAPI e ngrok. Para obter um endpoint funcional compatível com o NEXUS, copie o repositório para o Colab ou abra `colab/untitled_bridge.py` e execute:

```python
!pip -q install fastapi uvicorn pyngrok
import os
os.environ["NGROK_AUTHTOKEN"] = "COLE_O_TOKEN_SOMENTE_NESTA_SESSAO"
%run colab/untitled_bridge.py
```

O bridge imprimirá `UNTITLED_WS_URL=wss://.../ws`. Configure esse valor como `UNTITLED_WS_URL` no Environment do serviço `nexus-IA` no Render. Não grave o token do ngrok no Git, no notebook compartilhado ou no `.env` versionado.

## ngrok

Instale o ngrok e autentique uma vez:

```bash
ngrok config add-authtoken "$NGROK_AUTHTOKEN"
ngrok http 3000
```

Para usar o arquivo versionado, defina `NGROK_AUTHTOKEN` e execute:

```bash
ngrok start --config ngrok.yml nexus
```

Se você possui um domínio reservado no ngrok, use `ngrok http --domain "$NGROK_DOMAIN" 3000` no lugar do comando acima.

A URL HTTPS do ngrok deve ser usada como origem pública do frontend/Untitled. O WebSocket será automaticamente convertido para `wss://.../ws` pelo cliente.

## Voz

A voz usa `SpeechRecognition` e `speechSynthesis` do navegador. Clique uma vez na esfera para autorizar o microfone; o navegador bloqueia a ativação automática sem gesto do usuário. O navegador também precisa estar em HTTPS quando acessado por domínio público e o usuário precisa conceder permissão ao microfone.

## Render

O serviço existente `nexus-IA` usa `node server.js`. Configure as chaves e `UNTITLED_WS_URL` no Environment do serviço, não no Git. O Render injeta `PORT` automaticamente; o código respeita essa porta. Depois de um push na branch `main`, o auto-deploy existente pode publicar a revisão.

Nunca faça commit de `.env`, tokens do ngrok ou chaves de providers.
