(() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws`;
  let socket;
  let retry = 1000;

  function open() {
    socket = new WebSocket(url);
    socket.addEventListener('open', () => {
      retry = 1000;
      socket.send(JSON.stringify({ type: 'subscribe', channels: ['nexus', 'visual', 'untitled'] }));
      window.dispatchEvent(new CustomEvent('nexus:realtime', { detail: { status: 'connected' } }));
    });
    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'untitled:status' || message.type === 'nexus:ready') {
        window.dispatchEvent(new CustomEvent('nexus:realtime', { detail: message }));
      }
      // Contrato de entrada visual: Untitled envia {type:'visual', html:'...'}.
      // A interface original permanece intacta; somente o conteúdo do painel dual é atualizado.
      if ((message.type === 'visual' || message.type === 'visual:update') && typeof message.html === 'string') {
        const frame = document.getElementById('dualFrame');
        if (frame) {
          frame.srcdoc = message.html;
          const overlay = document.getElementById('dual-overlay');
          if (overlay) { overlay.style.width = '50%'; overlay.style.right = '0'; }
        }
        window.dispatchEvent(new CustomEvent('nexus:visual', { detail: message }));
      }
      window.dispatchEvent(new CustomEvent('nexus:message', { detail: message }));
    });
    socket.addEventListener('close', () => {
      window.dispatchEvent(new CustomEvent('nexus:realtime', { detail: { status: 'disconnected' } }));
      window.setTimeout(open, retry);
      retry = Math.min(retry * 2, 10000);
    });
  }

  window.nexusRealtime = {
    emit(payload) {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'untitled:emit', payload }));
      }
    }
  };
  open();
})();
