import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'
import qrcode from 'qrcode-terminal'

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr) {
      qrcode.generate(qr, { small: true })
      console.log('QR code gerado, escaneie com o WhatsApp para conectar.')
    }

    if (connection === 'close') {
      // Checa se lastDisconnect existe e se tem error com output.statusCode
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      console.log('Conexão fechada, motivo:', lastDisconnect?.error, 'Reconn:', shouldReconnect)
      if (shouldReconnect) {
        startSock()
      }
    } else if (connection === 'open') {
      console.log('Conectado ao WhatsApp!')
    }
  })

  sock.ev.on('creds.update', saveCreds)
}

startSock().catch(console.error)
