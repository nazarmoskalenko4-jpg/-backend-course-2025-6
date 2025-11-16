const { Command } = require('commander');
const http = require('http');
const fs = require('fs');
const path = require('path');

const program = new Command();

// Налаштування аргументів командного рядка 
program
  .requiredOption('-h, --host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до директорії кешу');

program.parse(process.argv);

const options = program.opts();

// Логіка створення директорії кешу, якщо її не існує 
const cacheDir = path.resolve(options.cache);
if (!fs.existsSync(cacheDir)) {
    try {
        fs.mkdirSync(cacheDir, { recursive: true });
        console.log(`Створено директорію кешу: ${cacheDir}`);
    } catch (err) {
        console.error(`Не вдалося створити директорію кешу: ${err.message}`);
        process.exit(1);
    }
}

// Запуск веб-сервера 
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is running');
});

server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);
    console.log(`Кеш директорія: ${cacheDir}`);
});