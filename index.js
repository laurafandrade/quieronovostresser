import { makeWASocket, DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import P from "pino";

async function startBot() {
  // Cria estado de autenticação, usando pasta 'auth_info'
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: true, // Mostra QR no terminal
    auth: state,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log("🚩 Escaneie o QR Code acima com seu WhatsApp");
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Conexão fechada, tentando reconectar...', lastDisconnect?.error?.message);
      if (shouldReconnect) {
        startBot();
      } else {
        console.log('🛑 Sessão desconectada, faça login novamente escaneando o QR.');
      }
    }

    if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp!');
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

startBot();
