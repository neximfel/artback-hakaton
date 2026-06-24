const express = require('express')
const app = express()
const PORT = 3003
const { Pool } = require("pg")
const cors = require("cors")
const multer = require("multer")
const path = require("path")

app.use(cors())
app.use(express.json())

// Раздаём статику: картинки из front/uploads
app.use('/uploads', express.static(path.join(__dirname, 'front', 'uploads')))

// Раздаём весь front как статику (html, css, js)
app.use(express.static(path.join(__dirname, 'front')))

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

// ══════════════════════════════════════════════════════════════
//  КАРТОЧКИ (card)
// ══════════════════════════════════════════════════════════════

// 1. GET — Все карточки
app.get('/api/main', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM public.card ORDER BY id DESC')
        res.json(result.rows)
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// 2. GET — Одна карточка по id (для страницы поста)
app.get('/api/main/:id', async (req, res) => {
    const { id } = req.params
    try {
        // Заодно увеличиваем счётчик просмотров при каждом открытии
        const result = await pool.query(
            'UPDATE public.card SET views = views + 1 WHERE id = $1 RETURNING *',
            [id]
        )
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Карточка не найдена' })
        }
        res.json(result.rows[0])
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// 3. POST — Создание карточки с картинкой
app.post('/api/main', upload.single('image'), async (req, res) => {
    const { name, genre, descr } = req.body
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null

    try {
        const result = await pool.query(
            'INSERT INTO public.card ("name", genre, image_url, descr) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, genre, imageUrl, descr]
        )
        res.json(result.rows[0])
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// 4. DELETE — Удаление карточки по id
app.delete('/api/main/:id', async (req, res) => {
    const { id } = req.params
    try {
        await pool.query('DELETE FROM public.card WHERE id = $1', [id])
        res.json({ message: 'Удалено' })
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// 5. POST — Лайк карточки
app.post('/api/main/:id/like', async (req, res) => {
    const { id } = req.params
    try {
        const result = await pool.query(
            'UPDATE public.card SET likes = likes + 1 WHERE id = $1 RETURNING likes',
            [id]
        )
        if (result.rowCount === 0) return res.status(404).json({ error: 'Карточка не найдена' })
        res.json({ likes: result.rows[0].likes })
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// 6. POST — Анлайк карточки
app.post('/api/main/:id/unlike', async (req, res) => {
    const { id } = req.params
    try {
        const result = await pool.query(
            'UPDATE public.card SET likes = GREATEST(likes - 1, 0) WHERE id = $1 RETURNING likes',
            [id]
        )
        if (result.rowCount === 0) return res.status(404).json({ error: 'Карточка не найдена' })
        res.json({ likes: result.rows[0].likes })
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// 7. POST — Обновить рейтинг карточки (усреднение со старым)
app.post('/api/main/:id/rating', async (req, res) => {
    const { id } = req.params
    const { rating } = req.body

    if (rating === undefined || rating < 0 || rating > 10) {
        return res.status(400).json({ error: 'Рейтинг должен быть от 0 до 10' })
    }

    try {
        // Усредняем: (старый + новый) / 2, округляем
        const result = await pool.query(
            `UPDATE public.card
             SET rating = ROUND((rating + $1::numeric) / 2)
             WHERE id = $2
             RETURNING rating`,
            [rating, id]
        )
        if (result.rowCount === 0) return res.status(404).json({ error: 'Карточка не найдена' })
        res.json({ rating: result.rows[0].rating })
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// ══════════════════════════════════════════════════════════════
//  КОММЕНТАРИИ (comment)
// ══════════════════════════════════════════════════════════════

// 8. GET — Все комментарии к карточке
app.get('/api/comments/:card_id', async (req, res) => {
    const { card_id } = req.params
    try {
        const result = await pool.query(
            'SELECT * FROM public.comment WHERE card_id = $1 ORDER BY created_at ASC',
            [card_id]
        )
        res.json(result.rows)
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// 9. POST — Добавить комментарий (принимает card_id, author, text, donated, rating)
app.post('/api/comments', async (req, res) => {
    const { card_id, author, text, donated, rating } = req.body

    if (!card_id || !text) {
        return res.status(400).json({ error: 'card_id и text обязательны' })
    }

    try {
        const result = await pool.query(
            `INSERT INTO public.comment (card_id, author, text, donated, rating)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [card_id, author || 'Автор', text, donated || null, rating !== undefined ? rating : null]
        )
        res.json(result.rows[0])
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// 10. DELETE — Удалить комментарий по id
app.delete('/api/comments/:id', async (req, res) => {
    const { id } = req.params
    try {
        await pool.query('DELETE FROM public.comment WHERE id = $1', [id])
        res.json({ message: 'Комментарий удалён' })
    } catch (error) {
        res.status(500).json({ error: `Server error: ${error.message}` })
    }
})

// ══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`)
})