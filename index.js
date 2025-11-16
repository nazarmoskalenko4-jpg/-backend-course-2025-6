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