const express = require('express');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3742;

// Commande Claude (modifiable)
const CLAUDE_CMD = process.env.CLAUDE_CMD || 'claude';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Nom d'utilisateur de la session (Windows: USERNAME, Unix: userInfo)
function getSessionUsername() {
  return process.env.USERNAME || process.env.USER || os.userInfo().username || 'Utilisateur';
}

app.get('/api/me', (req, res) => {
  res.json({ username: getSessionUsername() });
});

let claudeProcess = null;
const sseClients = [];

function startClaude() {
  if (claudeProcess) return;
  try {
    claudeProcess = spawn(CLAUDE_CMD, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    claudeProcess.stdout.setEncoding('utf8');
    claudeProcess.stderr.setEncoding('utf8');

    claudeProcess.stdout.on('data', (chunk) => {
      const text = String(chunk).replace(/\r/g, '');
      if (text) sseSend(text);
    });
    claudeProcess.stderr.on('data', (chunk) => {
      const text = String(chunk).replace(/\r/g, '');
      if (text) sseSend(text);
    });
    claudeProcess.on('close', (code) => {
      claudeProcess = null;
      sseSend('[Claude s\'est arrêté]');
    });
    claudeProcess.on('error', (err) => {
      sseSend('[Erreur: ' + err.message + ']');
    });

    // Débloquer le prompt de sécurité "Is this a project you trust?" (option 1 = Yes)
    setTimeout(() => {
      if (claudeProcess && !claudeProcess.killed) {
        try { claudeProcess.stdin.write('1\n'); } catch (_) {}
      }
    }, 1500);
  } catch (e) {
    sseSend('[Erreur démarrage: ' + e.message + ']');
  }
}

function sseSend(text) {
  const payload = JSON.stringify(String(text ?? ''));
  sseClients.forEach(res => {
    try { res.write(`data: ${payload}\n\n`); } catch (_) {}
  });
}

// Stream des réponses Claude (SSE)
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', () => {
    const i = sseClients.indexOf(res);
    if (i !== -1) sseClients.splice(i, 1);
  });
  startClaude();
});

// Envoyer un message à Claude
app.post('/api/send', (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message requis' });
  }
  startClaude();
  if (claudeProcess && !claudeProcess.killed) {
    claudeProcess.stdin.write(message.trim() + '\n');
  } else {
    sseSend('[Erreur: Claude n\'a pas démarré. Vérifiez que la commande "claude" est disponible.]');
  }
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log('Claude Web: http://localhost:' + PORT);
  const url = 'http://localhost:' + PORT;
  if (process.platform === 'win32') exec('start ' + url);
  else if (process.platform === 'darwin') exec('open ' + url);
  else exec('xdg-open ' + url);
});
