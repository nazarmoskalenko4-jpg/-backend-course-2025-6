const { Command } = require('commander');
const express = require('express');
const multer = require('multer');
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

const app = express();

// Налаштування для зчитування даних
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Налаштування Multer для збереження фото в папку uploads
const upload = multer({ dest: 'uploads/' });

// Масив для зберігання речей
let inventory = [];

// POST /register - Реєстрація нового пристрою
app.post('/register', upload.single('photo'), (req, res) => {
    const { inventory_name, description } = req.body;

    // Перевірка: Ім'я обов'язкове 
    if (!inventory_name) {
        return res.status(400).send('Bad Request: inventory_name is required');
    }

    // Створення нового об'єкта
    const newItem = {
        id: Date.now().toString(), // Генеруємо унікальний ID
        name: inventory_name,
        description: description || '',
        photo: req.file ? req.file.path : null // Зберігаємо шлях до фото, якщо воно є
    };

    // Додавання у масив
    inventory.push(newItem);

    console.log('Added item:', newItem); // Для перевірки в консолі

    // Повертаємо статус 201 (Created) 
    res.status(201).send(`Item registered with ID: ${newItem.id}`);
});

// GET /inventory - Отримання списку всіх речей
app.get('/inventory', (req, res) => {
    res.json(inventory);
});

// GET /inventory/:id - Отримання інформації про конкретну річ
app.get('/inventory/:id', (req, res) => {
    const item = inventory.find(i => i.id === req.params.id);
    if (!item) {
        return res.status(404).send('Not found'); // 404 якщо не знайдено
    }
    res.json(item);
});

// PUT /inventory/:id - Оновлення імені або опису
app.put('/inventory/:id', (req, res) => {
    const item = inventory.find(i => i.id === req.params.id);
    if (!item) return res.status(404).send('Not found');

    const { name, description } = req.body;
    if (name) item.name = name;
    if (description) item.description = description;

    res.json(item);
});

// GET /inventory/:id/photo - Отримання фото
app.get('/inventory/:id/photo', (req, res) => {
    const item = inventory.find(i => i.id === req.params.id);
    if (!item || !item.photo) return res.status(404).send('Not found');
    res.sendFile(path.resolve(item.photo));
});

// PUT /inventory/:id/photo - Оновлення фото
app.put('/inventory/:id/photo', upload.single('photo'), (req, res) => {
    const item = inventory.find(i => i.id === req.params.id);
    if (!item) return res.status(404).send('Not found');

    if (req.file) {
        // Видаляємо старе фото, якщо воно було (не обов'язково, але корисно)
        if (item.photo && fs.existsSync(item.photo)) {
            fs.unlinkSync(item.photo);
        }
        item.photo = req.file.path;
    }
    res.json(item);
});

// DELETE /inventory/:id - Видалення речі
app.delete('/inventory/:id', (req, res) => {
    const index = inventory.findIndex(i => i.id === req.params.id);
    if (index === -1) return res.status(404).send('Not found');

    const deletedItem = inventory.splice(index, 1)[0];
    // Видаляємо файл фото при видаленні запису
    if (deletedItem.photo && fs.existsSync(deletedItem.photo)) {
        fs.unlinkSync(deletedItem.photo);
    }

    res.send(`Item ${deletedItem.id} deleted`);
});

// POST /search - Пошук пристрою (обробка форми)
app.post('/search', (req, res) => {
    const { id, includePhoto } = req.body;
    const item = inventory.find(i => i.id === id);

    if (!item) {
        return res.status(404).send('Item not found');
    }

    // Створюємо копію, щоб не змінювати оригінал, якщо просто показуємо
    const responseItem = { ...item };

    // Якщо галочка "includePhoto" натиснута, вона приходить як 'on'
    if (includePhoto === 'on' && item.photo) {
        const photoUrl = `http://${options.host}:${options.port}/${item.photo}`;
        responseItem.description += ` \n[Photo: ${photoUrl}]`;
    }

    res.json(responseItem);
});

// --- Ендпоінти для видачі HTML сторінок ---

// GET /RegisterForm.html
app.get('/RegisterForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

// GET /SearchForm.html
app.get('/SearchForm.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'SearchForm.html'));
});

// Запуск сервера
app.listen(options.port, options.host, () => {
    console.log(`Сервер (Express) запущено на http://${options.host}:${options.port}`);
});