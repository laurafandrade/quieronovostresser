import express from "express";
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";

const app = express();
const port = process.env.PORT || 3000;

// Servidor web simples para o ping manter o bot acordado
app.get("/", (req, res) => {
  res.send("McFly System Down está ON! 🚀");
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

// Iniciar o bot do WhatsApp com Baileys

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Vai mostrar o QR no terminal na 1ª vez
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if(connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if(statusCode !== DisconnectReason.loggedOut) {
        console.log("Tentando reconectar...");
        startBot();
      } else {
        console.log("Desconectado (logout). Refaça login escaneando QR.");
      }
    } else if(connection === "open") {
      console.log("Bot conectado ao WhatsApp!");
    }
  });

  // Aqui você pode adicionar os eventos e comandos do seu bot.
  // Exemplo simples para responder 'ping' com 'pong':

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if(type !== "notify") return;
    const msg = messages[0];
    if(!msg.message || msg.key.fromMe) return;

    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if(text?.toLowerCase() === "ping") {
      await sock.sendMessage(msg.key.remoteJid, { text: "pong" }, { quoted: msg });
    }
  });
}

startBot();
