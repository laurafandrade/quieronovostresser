import makeWASocket from '@adiwajshing/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import fs from 'fs';

const authFile = './auth_info.json';

async function startSock() {
  // Tenta carregar sessão salva, se existir
  let authState = {};
  if (fs.existsSync(authFile)) {
    authState = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
  }

  const sock = makeWASocket({
    auth: authState,
    printQRInTerminal: false, // remove essa opção porque está deprecated
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Gera QR no terminal
      qrcode.generate(qr, { small: true });
      console.log('Escaneie o QR Code acima com o WhatsApp');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !==
        Boom.statusCodes.logout;
      console.log('Conexão fechada devido a', lastDisconnect.error, ', tentando reconectar:', shouldReconnect);
      if (shouldReconnect) {
        startSock(); // tenta reconectar
      }
    } else if (connection === 'open') {
      console.log('Conectado ao WhatsApp!');
    }
  });

  sock.ev.on('creds.update', () => {
    // Salva sessão no arquivo toda vez que atualizar credenciais
    fs.writeFileSync(authFile, JSON.stringify(sock.authState, null, 2));
  });
}

startSock();
