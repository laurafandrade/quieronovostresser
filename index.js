import makeWASocket, { useSingleFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'

const { state, saveState } = useSingleFileAuthState('./auth.json')

async function startSock() {
    const sock = makeWASocket({
        auth: state
    })

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            qrcode.generate(qr, { small: true })
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('Conexão fechada devido a', lastDisconnect.error, ', reconectar', shouldReconnect)
            if (shouldReconnect) {
                startSock()
            }
        } else if (connection === 'open') {
            console.log('Conectado ao WhatsApp ✅')
        }
    })

    sock.ev.on('creds.update', saveState)
}

startSock()
