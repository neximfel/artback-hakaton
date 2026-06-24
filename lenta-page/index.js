const express = require('express')
const app = express()
const PORT = 3003
const { Pool } = require("pg")
const cors = require("cors")
const multer = require("multer")
const path = require("path")

app.use(cors())
app.use(express.json())

// Разрешаем раздавать статические файлы (картинки) из папки front/uploads
app.use('/uploads', express.static(path.join(__dirname, 'front', 'uploads')))

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "postgres",
    password: "1234",
    port: "5432"
})

// Настройка сохранения загружаемых картинок в front/uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'front', 'uploads'))
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})
const upload = multer({ storage: storage })

// 1. GET — Получение всех карточек из таблицы public.card
app.get('/api/main', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.card ORDER BY id DESC')
        res.json(result.rows)
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}`})
    }
})

// 2. POST — Создание карточки с картинкой (принимает name, genre и файл image)
app.post('/api/main', upload.single('image'), async (req, res) => {
    const { name, genre, descr } = req.body
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null

    try {
        const result = await pool.query(
            'INSERT INTO public.card ("name", genre, image_url, "descr") VALUES ($1, $2, $3, $4) RETURNING *',
            [name, genre, imageUrl, descr]
        )
        res.json(result.rows[0])
    } catch (error){
        res.status(500).json({error: `Server error: ${error.message}`})
    }
})

// 3. DELETE — Удаление карточки из public.card по id
app.delete('/api/main/:id', async (req, res) => {
    const { id } = req.params
    try {
        await pool.query('DELETE FROM public.card WHERE id = $1', [id])
        res.json({ message: 'Удалено' })
    } catch (error){
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// 4. POST — Лайк карточки: увеличивает likes на 1 и возвращает новое значение
app.post('/api/main/:id/like', async (req, res) => {
    const { id } = req.params
    try {
        const result = await pool.query(
            'UPDATE public.card SET likes = likes + 1 WHERE id = $1 RETURNING likes',
            [id]
        )
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Карточка не найдена' })
        }
        res.json({ likes: result.rows[0].likes })
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

app.listen(PORT,()=>{
    console.log(`Сервер запущен на ${PORT}`)
})