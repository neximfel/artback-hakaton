const API = 'http://localhost:3003';

// Цвета жанров — совпадают с req.js
const GENRE_COLORS = {
    'Фотография':   '#7DAA89',
    'Digital':      '#7D86AA',
    '3D':           '#C9AF78',
    'Иллюстрации':  '#B092CA',
    'Традиционный': '#8A5858',
};

const params  = new URLSearchParams(window.location.search);
const CARD_ID = parseInt(params.get('id'), 10);

let cardData = null;
let isLiked  = false;

// ─── Загрузка поста ──────────────────────────────────────────────────────────
async function loadPost() {
    if (!CARD_ID) return showError();
    try {
        const res = await fetch(`${API}/api/main/${CARD_ID}`);
        if (!res.ok) throw new Error();
        cardData = await res.json();
        renderPost(cardData);
        loadComments();
    } catch {
        showError();
    }
}

function showError() {
    document.getElementById('postLoading').style.display = 'none';
    document.getElementById('postError').style.display   = 'block';
}

function renderPost(data) {
    document.title = `ArtBack — ${data.name}`;

    // Изображение
    if (data.image_url) {
        const img = document.getElementById('postImage');
        img.src = `${API}${data.image_url}`;
        img.alt = data.name;
    } else {
        document.getElementById('postHero').style.display = 'none';
    }

    // Название
    document.getElementById('postTitle').textContent = data.name;

    // Жанр-бейдж
    const badge = document.getElementById('postGenreBadge');
    if (data.genre) {
        badge.textContent = data.genre;
        badge.style.backgroundColor = GENRE_COLORS[data.genre] || '#C9A8A8';
    } else {
        badge.style.display = 'none';
    }

    document.getElementById('postDescr').textContent      = data.descr || 'Описание отсутствует.';
    document.getElementById('postRating').textContent     = `${data.rating}/10`;
    document.getElementById('postLikesCount').textContent = data.likes;
    document.getElementById('postViewsCount').textContent = data.views;

    document.getElementById('postLoading').style.display = 'none';
    document.getElementById('postWrap').style.display    = 'block';
}

// ─── Лайтбокс ────────────────────────────────────────────────────────────────
function openLightbox() {
    const src = document.getElementById('postImage').src;
    if (!src) return;
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
}

// ESC закрывает лайтбокс
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
});

// ─── Слайдеры ────────────────────────────────────────────────────────────────
document.querySelectorAll('.post__slider').forEach(slider => {
    const row   = slider.closest('.slider-row');
    const valEl = row.querySelector('.slider-val');

    valEl.textContent = `${slider.value}/10`;
    updateSliderTrack(slider);

    slider.addEventListener('input', () => {
        valEl.textContent = `${slider.value}/10`;
        updateSliderTrack(slider);
        recalcTotal();
    });
});

function updateSliderTrack(slider) {
    const pct = (slider.value / slider.max) * 100;
    slider.style.background =
        `linear-gradient(to right, #3D9992 ${pct}%, #d0e8e6 ${pct}%)`;
}

function recalcTotal() {
    const sliders = [...document.querySelectorAll('.post__slider')];
    const avg = sliders.reduce((sum, s) => sum + Number(s.value), 0) / sliders.length;
    document.getElementById('totalScore').textContent = avg.toFixed(1);
    return avg;
}

// ─── Публикация оценки + комментария ─────────────────────────────────────────
document.getElementById('publishRatingBtn').addEventListener('click', async () => {
    if (!CARD_ID) return;

    const avg     = recalcTotal();
    const comment = document.getElementById('ratingCommentInput').value.trim();
    const donate  = parseFloat(document.getElementById('donateInput').value) || null;

    if (!comment) {
        alert('Напишите комментарий перед публикацией.');
        document.getElementById('ratingCommentInput').focus();
        return;
    }

    try {
        // Обновляем рейтинг карточки
        const ratingRes = await fetch(`${API}/api/main/${CARD_ID}/rating`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating: parseFloat(avg.toFixed(1)) })
        });
        const ratingData = await ratingRes.json();

        // Публикуем комментарий вместе с рейтингом
        const res = await fetch(`${API}/api/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                card_id: CARD_ID,
                author:  'Автор',
                text:    comment,
                donated: donate,
                rating:  parseFloat(avg.toFixed(1))
            })
        });

        if (!res.ok) throw new Error();

        // Сброс формы
        document.getElementById('ratingCommentInput').value = '';
        document.getElementById('donateInput').value        = '';
        document.querySelectorAll('.post__slider').forEach(s => {
            s.value = 5;
            updateSliderTrack(s);
            s.closest('.slider-row').querySelector('.slider-val').textContent = '5/10';
        });
        recalcTotal();

        // Обновить рейтинг поста в шапке (пришёл с сервера)
        if (ratingData.rating !== undefined) {
            document.getElementById('postRating').textContent = `${ratingData.rating}/10`;
        }

        loadComments();
    } catch {
        alert('Ошибка при публикации. Попробуйте ещё раз.');
    }
});

// ─── Загрузка комментариев ───────────────────────────────────────────────────
async function loadComments() {
    try {
        const res  = await fetch(`${API}/api/comments/${CARD_ID}`);
        const list = await res.json();

        const container = document.getElementById('commentsList');
        const empty     = document.getElementById('commentsEmpty');

        if (!list.length) {
            container.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        container.innerHTML = list.map(c => {
            const donateTag = c.donated
                ? `<span class="comment-card__donate">₽ ${Number(c.donated).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</span>`
                : '';

            // Рейтинг комментатора — справа
            const ratingTag = c.rating !== null && c.rating !== undefined
                ? `<span class="comment-card__rating">${Number(c.rating).toFixed(1)}/10</span>`
                : '';

            return `
            <div class="comment-card">
                <div class="comment-card__avatar"></div>
                <div class="comment-card__body">
                    <div class="comment-card__author-row">
                        <span class="comment-card__author">${escHtml(c.author)}</span>
                        ${donateTag}
                    </div>
                    <p class="comment-card__text">${escHtml(c.text)}</p>
                </div>
                ${ratingTag}
            </div>`;
        }).join('');

    } catch {
        // тихо
    }
}

// ─── Лайк ────────────────────────────────────────────────────────────────────
async function toggleLike() {
    if (!CARD_ID) return;
    const btn = document.getElementById('postLikeBtn');
    if (btn.dataset.pending === 'true') return;
    btn.dataset.pending = 'true';

    const url = `${API}/api/main/${CARD_ID}/${isLiked ? 'unlike' : 'like'}`;
    try {
        const res  = await fetch(url, { method: 'POST' });
        const data = await res.json();
        isLiked = !isLiked;
        document.getElementById('postLikesCount').textContent = data.likes;
        document.getElementById('postLikeIcon').textContent   = isLiked ? '♥' : '♡';
        btn.classList.toggle('liked', isLiked);
    } catch {
        console.error('Ошибка лайка');
    } finally {
        btn.dataset.pending = 'false';
    }
}

// ─── Утилита ─────────────────────────────────────────────────────────────────
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── Инициализация ───────────────────────────────────────────────────────────
recalcTotal();
loadPost();