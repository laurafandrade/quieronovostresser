const { default: makeWASocket, DisconnectReason, useSingleFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Cria servidor web simples
app.get('/', (req, res) => {
    res.send('🔥 McFly System Down - Online ✅');
});

app.listen(PORT, () => {
    console.log(`🟢 Servidor rodando na porta ${PORT}`);
});

// Conexão WhatsApp
const { state, saveState } = useSingleFileAuthState('./auth.json');

async function connectToWhatsapp() {
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: state,
    });

    sock.ev.on('creds.update', saveState);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)
                ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                : true;

            console.log('🔌 Conexão encerrada:', lastDisconnect.error, 'Reconectar?', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsapp();
            }
        } else if (connection === 'open') {
            console.log('🟢 Bot conectado no WhatsApp ✅');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        const sender = msg.key.remoteJid;
        const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text;

        if (!messageContent) return;

        console.log(`💬 Mensagem de ${sender}: ${messageContent}`);

        // !start -> Envia o menu
        if (messageContent.toLowerCase() === '!start') {
            const menu = 
                `🔥 *McFly System Down*\n\n` +
                `👨‍💻 Sou um bot de testes de stress DDoS.\n\n` +
                `🛠️ *Comando disponível:*\n\n` +
                `➤ *!stress (url) (tempo) (threads)*\n\n` +
                `🧠 *Exemplo:*\n` +
                `!stress https://seusite.com 60 50\n\n` +
                `⏳ *Limites:* Tempo: 600s | Threads: 800\n\n` +
                `⚠️ *Uso exclusivo para testes em sites autorizados pela sua equipe.*`;

            await sock.sendMessage(sender, { text: menu });
        }

        // !stress -> Executa o ataque
        if (messageContent.toLowerCase().startsWith('!stress')) {
            const args = messageContent.split(' ');
            if (args.length !== 4) {
                await sock.sendMessage(sender, { text: '❌ *Uso incorreto!*\n\n🧠 Exemplo:\n!stress https://seusite.com 60 50' });
                return;
            }

            const url = args[1];
            const tempo = parseInt(args[2]);
            const threads = parseInt(args[3]);

            if (isNaN(tempo) || isNaN(threads)) {
                await sock.sendMessage(sender, { text: '❌ Tempo ou Threads inválidos!' });
                return;
            }

            if (tempo > 600) {
                await sock.sendMessage(sender, { text: '⚠️ Limite de tempo excedido! (máx 600s)' });
                return;
            }

            if (threads > 800) {
                await sock.sendMessage(sender, { text: '⚠️ Limite de threads excedido! (máx 800)' });
                return;
            }

            await sock.sendMessage(sender, { text: `🚀 Iniciando ataque em: ${url}\n⏳ Tempo: ${tempo}s | Threads: ${threads}\n\n⚠️ *Uso autorizado apenas pela sua equipe.*` });

            // Aqui é onde você chama seu script de stress
            const processo = spawn('node', ['attack.js', url, tempo, threads]);

            processo.stdout.on('data', (data) => {
                console.log(`LOG: ${data}`);
            });

            processo.stderr.on('data', (data) => {
                console.error(`ERRO: ${data}`);
            });

            processo.on('close', (code) => {
                console.log(`✅ Ataque finalizado com código ${code}`);
                sock.sendMessage(sender, { text: `✅ Ataque finalizado em ${url}` });
            });
        }
    });

    return sock;
}

connectToWhatsapp();
