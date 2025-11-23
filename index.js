const { Command } = require('commander');
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const program = new Command();

// Налаштування аргументів командного рядка
program
  .requiredOption('--host <host>', 'адреса сервера')
  .requiredOption('-p, --port <port>', 'порт сервера')
  .requiredOption('-c, --cache <path>', 'шлях до директорії кешу');

program.parse(process.argv);
const options = program.opts();

// Створення директорії кешу, якщо вона не існує
if (!fs.existsSync(options.cache)) {
  try {
    fs.mkdirSync(options.cache, { recursive: true });
    console.log(`Created cache directory: ${options.cache}`);
  } catch (err) {
    console.error(`Error creating cache directory: ${err.message}`);
    process.exit(1);
  }
}

const app = express();

// Налаштування для зчитування даних
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Налаштування Multer для збереження фото в папку uploads
const upload = multer({ dest: 'uploads/' });

// Масив для зберігання речей
let inventory = [];

// --- API Ендпоінти ---

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Реєстрація нового пристрою
 *     description: Приймає multipart/form-data з ім'ям, описом та фото.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               inventory_name:
 *                 type: string
 *                 description: Ім'я речі (обов'язково)
 *               description:
 *                 type: string
 *                 description: Опис речі
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Файл фото
 *     responses:
 *       '201':
 *         description: Пристрій успішно зареєстровано.
 *       '400':
 *         description: Не вказано обов'язкове поле 'inventory_name'.
 */
app.post('/register', upload.single('photo'), (req, res) => {
  const { inventory_name, description } = req.body;

  if (!inventory_name) {
    return res.status(400).send('Bad Request: inventory_name is required');
  }

  const newItem = {
    id: Date.now().toString(),
    name: inventory_name,
    description: description || '',
    photo: req.file ? req.file.path : null
  };

  inventory.push(newItem);
  console.log('Added item:', newItem);
  res.status(201).send(`Item registered with ID: ${newItem.id}`);
});

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: Отримання списку всіх інвентаризованих речей
 *     description: Повертає JSON-масив усіх речей.
 *     responses:
 *       '200':
 *         description: Успішна відповідь зі списком речей.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   photo:
 *                     type: string
 */
app.get('/inventory', (req, res) => {
  res.json(inventory);
});

/**
 * @swagger
 * /inventory/{id}:
 *   get:
 *     summary: Отримання інформації про конкретну річ
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID речі
 *     responses:
 *       '200':
 *         description: Успішна відповідь
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 photo:
 *                   type: string
 *       '404':
 *         description: Річ не знайдено
 */
app.get('/inventory/:id', (req, res) => {
  const item = inventory.find(i => i.id === req.params.id);
  if (!item) {
    return res.status(404).send('Not found');
  }
  res.json(item);
});

/**
 * @swagger
 * /inventory/{id}:
 *   put:
 *     summary: Оновлення імені або опису конкретної речі
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID речі
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Успішно оновлено
 *       '404':
 *         description: Річ не знайдено
 */
app.put('/inventory/:id', (req, res) => {
  const item = inventory.find(i => i.id === req.params.id);
  if (!item) return res.status(404).send('Not found');

  const { name, description } = req.body;
  if (name) item.name = name;
  if (description) item.description = description;

  res.json(item);
});

/**
 * @swagger
 * /inventory/{id}/photo:
 *   get:
 *     summary: Отримання фото зображення конкретної речі
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID речі
 *     responses:
 *       '200':
 *         description: Успішна відповідь (повертає зображення)
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       '404':
 *         description: Річ або фото не знайдено
 */
app.get('/inventory/:id/photo', (req, res) => {
  const item = inventory.find(i => i.id === req.params.id);
  if (!item || !item.photo) return res.status(404).send('Not found');
  res.sendFile(path.resolve(item.photo));
});

/**
 * @swagger
 * /inventory/{id}/photo:
 *   put:
 *     summary: Оновлення фото зображення конкретної речі
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID речі
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Успішно оновлено
 *       '404':
 *         description: Річ не знайдено
 */
app.put('/inventory/:id/photo', upload.single('photo'), (req, res) => {
  const item = inventory.find(i => i.id === req.params.id);
  if (!item) return res.status(404).send('Not found');

  if (req.file) {
    if (item.photo && fs.existsSync(item.photo)) {
      try {
        fs.unlinkSync(item.photo);
      } catch (e) {
        console.error("Error deleting old photo", e);
      }
    }
    item.photo = req.file.path;
  }
  res.json(item);
});

/**
 * @swagger
 * /inventory/{id}:
 *   delete:
 *     summary: Видалення інвентаризованої речі
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID речі
 *     responses:
 *       '200':
 *         description: Успішно видалено
 *       '404':
 *         description: Річ не знайдено
 */
app.delete('/inventory/:id', (req, res) => {
  const index = inventory.findIndex(i => i.id === req.params.id);
  if (index === -1) return res.status(404).send('Not found');

  const deletedItem = inventory.splice(index, 1)[0];
  if (deletedItem.photo && fs.existsSync(deletedItem.photo)) {
    try {
      fs.unlinkSync(deletedItem.photo);
    } catch (e) {
      console.error("Error deleting photo", e);
    }
  }

  res.send(`Item ${deletedItem.id} deleted`);
});

/**
 * @swagger
 * /search:
 *   post:
 *     summary: Обробка запиту пошуку пристрою за ID
 *     description: Приймає x-www-form-urlencoded дані з ID та прапорцем has_photo.
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: ID речі для пошуку
 *               has_photo:
 *                 type: string
 *                 description: "on - додати посилання на фото до опису"
 *     responses:
 *       '200':
 *         description: Успішна відповідь
 *       '404':
 *         description: Річ не знайдено
 */
app.post('/search', (req, res) => {
  const { id, has_photo } = req.body;
  const item = inventory.find(i => i.id === id);

  if (!item) {
    return res.status(404).send('Item not found');
  }

  const responseItem = { ...item };

  if (has_photo === 'on' && item.photo) {
    const photoUrl = `http://${options.host}:${options.port}/${item.photo}`;
    responseItem.description += ` \n[Photo: ${photoUrl}]`;
  }

  res.json(responseItem);
});

// --- Ендпоінти для видачі HTML сторінок ---

/**
 * @swagger
 * /RegisterForm.html:
 *   get:
 *     summary: Веб-форма для реєстрації пристрою
 *     responses:
 *       '200':
 *         description: Повертає HTML сторінку
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
app.get('/RegisterForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'RegisterForm.html'));
});

/**
 * @swagger
 * /SearchForm.html:
 *   get:
 *     summary: Веб-форма для пошуку пристрою
 *     responses:
 *       '200':
 *         description: Повертає HTML сторінку
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 */
app.get('/SearchForm.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'SearchForm.html'));
});

// --- Налаштування Swagger ---
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Inventory Service API',
      version: '1.0.0',
      description: 'Документація для Лабораторної роботи №6',
    },
    servers: [
      {
        url: `http://${options.host}:${options.port}`,
      },
    ],
  },
  apis: ['./index.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Запуск сервера
app.listen(options.port, options.host, () => {
  console.log(`Сервер (Express) запущено на http://${options.host}:${options.port}`);
});