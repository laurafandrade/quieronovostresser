import { makeWASocket, DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import P from "pino";
import qrcode from "qrcode-terminal";

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    auth: state,
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('🚩 Escaneie o QR Code abaixo com seu WhatsApp:');
      qrcode.generate(qr, { small: true });
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
