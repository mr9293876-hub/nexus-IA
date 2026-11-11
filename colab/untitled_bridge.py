"""NEXUS/Untitled-compatible realtime bridge for Google Colab.

Run in a Colab cell after installing:
  !pip -q install fastapi uvicorn pyngrok
  %run colab/untitled_bridge.py

The token is read from the NGROK_AUTHTOKEN environment variable or prompted
at runtime. It is never written to the repository.
"""

import asyncio
import json
import os
import threading
from typing import Set

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pyngrok import ngrok

PORT = int(os.getenv("UNTITLED_BRIDGE_PORT", "8765"))
app = FastAPI(title="NEXUS Untitled Bridge")
clients: Set[WebSocket] = set()


def game_html(prompt: str) -> str:
    safe_prompt = json.dumps(prompt[:180], ensure_ascii=False)
    return f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>html,body{{margin:0;height:100%;background:#050510;color:#00f3ff;font:14px monospace;overflow:hidden}}canvas{{width:100%;height:100%;display:block}}#h{{position:fixed;top:12px;left:12px;background:#000c;padding:8px;border:1px solid #00f3ff}}</style></head><body><div id="h">UNTITLED RUNTIME // {safe_prompt}</div><canvas id="c"></canvas><script>const c=document.querySelector('#c'),x=c.getContext('2d');let p={{x:80,y:80}},k={{}};onkeydown=e=>k[e.key.toLowerCase()]=1;onkeyup=e=>k[e.key.toLowerCase()]=0;function z(){{c.width=innerWidth;c.height=innerHeight}}onresize=z;z();function f(){{p.x+=((k.d||k.arrowright)?4:0)-((k.a||k.arrowleft)?4:0);p.y+=((k.s||k.arrowdown)?4:0)-((k.w||k.arrowup)?4:0);x.fillStyle='#050510';x.fillRect(0,0,c.width,c.height);x.fillStyle='#00f3ff';x.shadowBlur=24;x.shadowColor='#00f3ff';x.fillRect(p.x,p.y,26,26);x.shadowBlur=0;x.fillStyle='#ffd700';x.fillRect(c.width-100,c.height/2,32,32);requestAnimationFrame(f)}}f();</script></body></html>'''


async def broadcast(message: dict):
    dead = []
    for client in list(clients):
        try:
            await client.send_json(message)
        except Exception:
            dead.append(client)
    for client in dead:
        clients.discard(client)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "untitled-bridge", "websocket": "/ws", "clients": len(clients)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    await websocket.send_json({"type": "untitled:ready", "service": "colab-untitled-bridge"})
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "nexus:command":
                prompt = str(message.get("prompt", ""))
                if any(word in prompt.lower() for word in ("jogo", "game", "canvas", "arcade", "crie")):
                    await broadcast({"type": "visual", "html": game_html(prompt), "source": "untitled"})
                else:
                    await broadcast({"type": "untitled:event", "event": "command", "prompt": prompt})
            elif message.get("type") == "nexus:hello":
                await websocket.send_json({"type": "untitled:ack", "source": "colab-untitled-bridge"})
    except WebSocketDisconnect:
        clients.discard(websocket)
    except Exception:
        clients.discard(websocket)


def start_server():
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")


if __name__ == "__main__":
    token = os.getenv("NGROK_AUTHTOKEN", "").strip()
    if not token:
        token = input("Cole o NGROK_AUTHTOKEN (não salve no notebook): ").strip()
    ngrok.set_auth_token(token)
    public = ngrok.connect(PORT, "http")
    thread = threading.Thread(target=start_server, daemon=True)
    thread.start()
    public_url = str(public).replace("http://", "https://")
    print(f"HTTP_URL={public_url}")
    print(f"UNTITLED_WS_URL={public_url.replace('https://', 'wss://')}/ws")
    print("Bridge ativo. Mantenha esta célula em execução.")
    try:
        while True:
            threading.Event().wait(60)
    except KeyboardInterrupt:
        ngrok.disconnect(public.public_url)
        ngrok.kill()
