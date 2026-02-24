const form = document.getElementById('form');
const input = document.getElementById('input');
const sendBtn = document.getElementById('sendBtn');
const messagesEl = document.getElementById('messages');
const welcome = document.getElementById('welcome');
const themeToggle = document.querySelector('.theme-toggle');

let eventSource = null;
let currentBotBuffer = [];

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function appendUserMessage(text) {
  welcome.classList.add('hidden');
  const wrap = document.createElement('div');
  wrap.className = 'msg user';
  wrap.innerHTML = `
    <span class="msg-avatar">Vous</span>
    <div class="msg-bubble">${escapeHtml(text)}</div>
  `;
  messagesEl.appendChild(wrap);
  scrollToBottom();
}

function appendBotChunk(text) {
  if (text == null || text === '') return;
  const decoded = typeof text === 'string' ? text.replace(/\\n/g, '\n') : String(text);
  currentBotBuffer.push(decoded);
  removeWaitingPlaceholder();
  renderBotMessage();
  scrollToBottom();
}

function removeWaitingPlaceholder() {
  const placeholder = document.querySelector('.msg.bot .waiting-placeholder');
  if (placeholder) placeholder.remove();
}

function renderBotMessage() {
  let botRow = messagesEl.querySelector('.msg.bot:last-child');
  if (!botRow) {
    botRow = document.createElement('div');
    botRow.className = 'msg bot';
    botRow.innerHTML = `
      <span class="msg-avatar">◇</span>
      <div class="msg-bubble"></div>
    `;
    messagesEl.appendChild(botRow);
  }
  const full = currentBotBuffer.join('\n');
  const bubble = botRow.querySelector('.msg-bubble');
  bubble.textContent = full;
  scrollToBottom();
}

function startNewBotReply() {
  currentBotBuffer = [];
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function connectSSE() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/stream');
  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      appendBotChunk(data);
    } catch (_) {
      appendBotChunk(e.data);
    }
  };
  eventSource.onerror = () => {
    setTimeout(connectSSE, 2000);
  };
}

async function sendMessage(text) {
  if (!text.trim()) return;
  appendUserMessage(text.trim());
  startNewBotReply();
  showWaitingPlaceholder();
  input.value = '';
  input.style.height = 'auto';
  sendBtn.disabled = true;
  try {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text.trim() })
    });
    if (!res.ok) throw new Error('Erreur envoi');
  } catch (err) {
    removeWaitingPlaceholder();
    appendBotChunk('[Erreur: ' + err.message + ']');
  }
  sendBtn.disabled = false;
  input.focus();
}

function showWaitingPlaceholder() {
  let botRow = messagesEl.querySelector('.msg.bot:last-child');
  if (!botRow) {
    botRow = document.createElement('div');
    botRow.className = 'msg bot';
    botRow.innerHTML = '<span class="msg-avatar">◇</span><div class="msg-bubble"></div>';
    messagesEl.appendChild(botRow);
  }
  const bubble = botRow.querySelector('.msg-bubble');
  const placeholder = document.createElement('span');
  placeholder.className = 'waiting-placeholder';
  placeholder.textContent = 'Réponse en cours…';
  placeholder.setAttribute('aria-live', 'polite');
  bubble.appendChild(placeholder);
  scrollToBottom();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage(input.value);
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(input.value);
  }
});

input.addEventListener('input', () => {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 180) + 'px';
});

// Theme
const saved = localStorage.getItem('claude-web-theme');
if (saved) document.body.setAttribute('data-theme', saved);

themeToggle.addEventListener('click', () => {
  const theme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', theme);
  localStorage.setItem('claude-web-theme', theme);
});

// Afficher le nom d'utilisateur de la session (Hello, [nom])
fetch('/api/me')
  .then(r => r.json())
  .then(data => {
    const el = document.getElementById('userName');
    if (el) el.textContent = data.username || 'Utilisateur';
  })
  .catch(() => {
    const el = document.getElementById('userName');
    if (el) el.textContent = 'Utilisateur';
  });

connectSSE();
input.focus();
