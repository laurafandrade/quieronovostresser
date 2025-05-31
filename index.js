import makeWASocket, { useSingleFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import { exec } from 'child_process'

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
            console.log('Conexão fechada', lastDisconnect.error, 'Reconectar:', shouldReconnect)
            if (shouldReconnect) {
                startSock()
            }
        } else if (connection === 'open') {
            console.log('🤖 Conectado ao WhatsApp')
        }
    })

    sock.ev.on('creds.update', saveState)

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        const msg = messages[0]
        if (!msg.message) return

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text
        const jid = msg.key.remoteJid

        if (!texto) return

        // Comando !start
        if (texto.toLowerCase() === '!start') {
            const mensagem = `
🚀 *MCFLY SYSTEM DOWN* 🚀

🔗 *Sistema desenvolvido para realizar testes de estresse em servidores e sites.*

📜 *COMANDOS DISPONÍVEIS:*
 
👉 */stress url tempo threads*
    - Exemplo: /stress https://site.com 60 100
    - ⚠️ Limite: Máx. 800 segundos e 800 threads.

🛑 *Use com responsabilidade. Apenas para testes autorizados.*
            `
            await sock.sendMessage(jid, { text: mensagem })
            return
        }

        // Comando /stress
        if (texto.startsWith('/stress')) {
            const partes = texto.split(' ')
            if (partes.length !== 4) {
                await sock.sendMessage(jid, { text: '❌ Uso correto: /stress URL TEMPO THREADS' })
                return
            }

            const url = partes[1]
            const tempo = parseInt(partes[2])
            const threads = parseInt(partes[3])

            // Validação dos limites
            if (isNaN(tempo) || isNaN(threads)) {
                await sock.sendMessage(jid, { text: '❌ Tempo e Threads precisam ser números.' })
                return
            }
            if (tempo > 800 || threads > 800) {
                await sock.sendMessage(jid, { text: '❌ Limite máximo é 800 segundos e 800 threads.' })
                return
            }

            await sock.sendMessage(jid, { text: `🚀 Iniciando stress em:\n🌐 ${url}\n⏳ Tempo: ${tempo}s\n💥 Threads: ${threads}` })

            exec(`python3 stress.py ${url} ${tempo} ${threads}`, (error, stdout, stderr) => {
                if (error) {
                    sock.sendMessage(jid, { text: `❌ Erro:\n${error.message}` })
                    return
                }
                if (stderr) {
                    sock.sendMessage(jid, { text: `⚠️ Atenção:\n${stderr}` })
                    return
                }
                sock.sendMessage(jid, { text: `✅ Finalizado:\n${stdout}` })
            })
        }
    })
}

startSock()
