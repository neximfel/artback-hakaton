const MAX_DESCR_LENGTH = 90;
const POSTS_PER_PAGE = 9;

let allData = [];
let filteredData = [];
let currentPage = 1;
let currentFilter = 'all';

// Маппинг data-filter → точный текст жанра в БД (берётся из .text опций select в script.js)
const GENRE_MAP = {
    all:     null,
    drawing: 'Рисунок',
    photo:   'Фотография',
    design:  'Дизайн',
    other:   'Другое',
};

// Цвета жанров для бейджа на карточке
const GENRE_COLORS = {
    'Фотография':   '#7DAA89',
    'Digital':      '#7D86AA',
    '3D':           '#C9AF78',
    'Иллюстрации':  '#B092CA',
    'Традиционный': '#8A5858',
};

const likedSet = new Set();

// ─── Утилиты ────────────────────────────────────────────────

function truncate(text, max) {
    if (!text) return 'Описание работы отсутствует.';
    return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

// ─── Фильтр ─────────────────────────────────────────────────

function applyFilter(filter) {
    currentFilter = filter;
    currentPage   = 1;

    const genre  = GENRE_MAP[filter];

    // Диагностика — убери после проверки
    if (allData.length) {
        const uniqueGenres = [...new Set(allData.map(r => r.genre))];
        console.log('[Filter] Жанры в БД:', uniqueGenres);
        console.log('[Filter] Ищем:', genre, '| Найдено:', allData.filter(r => r.genre === genre).length);
    }

    filteredData = genre
        ? allData.filter(r => r.genre === genre)
        : [...allData];

    renderPage(1);
}

// Вешаем кнопки сразу при загрузке DOM — не ждём fetch
document.addEventListener('DOMContentLoaded', function () {
    const buttons = document.querySelectorAll('.lenta__header-genres button');
    buttons.forEach(btn => {
        btn.addEventListener('click', function () {
            buttons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            applyFilter(this.dataset.filter);
        });
    });
});

// ─── Рендер страницы ────────────────────────────────────────

function renderPage(page) {
    currentPage = page;
    const lenta = document.getElementById('lenta__arts');
    if (!lenta) return;

    const start    = (page - 1) * POSTS_PER_PAGE;
    const pageData = filteredData.slice(start, start + POSTS_PER_PAGE);

    if (pageData.length === 0) {
        lenta.innerHTML = '<p class="lenta__empty">Работ в этой категории пока нет.</p>';
        renderPagination(0);
        return;
    }

    lenta.innerHTML = pageData.map(row => {
        const imageBlock = row.image_url
            ? `<a href=""><img src="http://localhost:3003${row.image_url}" alt="${row.name}" class="art-card__img"></a>`
            : '';

        const isLiked    = likedSet.has(row.id);
        const likeIcon   = isLiked ? '♥' : '♡';
        const likedClass = isLiked ? ' liked' : '';

        return `
        <div class="art-card">
            <div class="art-card__image-wrapper">
                ${imageBlock}
                <button class="art-card__delete" onclick="deleteData(${row.id})">Удалить</button>
            </div>
            <div class="art-card__content">
                <div class="art-card__header">
                    <a href="" class="art-card__title">${row.name}</a>
                    <span class="art-card__genre" style="background-color:${GENRE_COLORS[row.genre] || '#C9A8A8'}">${row.genre}</span>
                </div>
                <div class="art-card__author-stats">
                    <a href="" class="art-card__author">
                        <div class="art-card__avatar"></div>
                        <span class="art-card__author-name">Автор</span>
                        <span class="art-card__tick">✔</span>
                    </a>
                    <div class="art-card__stats">
                        <button
                            class="art-card__like-btn${likedClass}"
                            id="like-btn-${row.id}"
                            onclick="toggleLike(${row.id})"
                            title="${isLiked ? 'Убрать лайк' : 'Поставить лайк'}"
                        >
                            <span class="art-card__like-icon">${likeIcon}</span>
                            <span class="art-card__like-count" id="like-count-${row.id}">${row.likes}</span>
                        </button>
                        <span class="art-card__divider-dot">·</span>
                        <span class="art-card__views">
                            <span class="art-card__views-icon">◎</span>
                            ${row.views}
                        </span>
                    </div>
                </div>
                <div class="art-card__bottom">
                    <p class="art-card__description">${truncate(row.descr, MAX_DESCR_LENGTH)}</p>
                    <div class="art-card__rating">${row.rating}/10</div>
                </div>
                <hr class="art-card__divider">
            </div>
        </div>
        `;
    }).join('');

    renderPagination(Math.ceil(filteredData.length / POSTS_PER_PAGE));

    const lentaSection = document.querySelector('.lenta');
    if (lentaSection) {
        lentaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// ─── Пагинация ──────────────────────────────────────────────

function renderPagination(totalPages) {
    const old = document.getElementById('pagination-container');
    if (old) old.remove();
    if (totalPages <= 1) return;

    const container = document.createElement('div');
    container.id    = 'pagination-container';
    container.className = 'pagination';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination__arrow' + (currentPage === 1 ? ' disabled' : '');
    prevBtn.innerHTML = '&#8249;';
    prevBtn.disabled  = currentPage === 1;
    prevBtn.addEventListener('click', () => { if (currentPage > 1) renderPage(currentPage - 1); });
    container.appendChild(prevBtn);

    const dotsWrapper = document.createElement('div');
    dotsWrapper.className = 'pagination__dots';
    for (let i = 1; i <= totalPages; i++) {
        const dot = document.createElement('button');
        dot.className    = 'pagination__dot' + (i === currentPage ? ' active' : '');
        dot.dataset.page = i;
        dot.addEventListener('click', () => renderPage(i));
        dotsWrapper.appendChild(dot);
    }
    container.appendChild(dotsWrapper);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination__arrow' + (currentPage === totalPages ? ' disabled' : '');
    nextBtn.innerHTML = '&#8250;';
    nextBtn.disabled  = currentPage === totalPages;
    nextBtn.addEventListener('click', () => { if (currentPage < totalPages) renderPage(currentPage + 1); });
    container.appendChild(nextBtn);

    const lenta = document.getElementById('lenta__arts');
    if (lenta && lenta.parentNode) {
        lenta.parentNode.insertBefore(container, lenta.nextSibling);
    }
}

// ─── Загрузка данных ────────────────────────────────────────

fetch('http://localhost:3003/api/main')
    .then(res => res.json())
    .then(data => {
        allData      = data;
        filteredData = [...allData];

        const lenta = document.getElementById('lenta__arts');
        if (!lenta) return;

        if (allData.length === 0) {
            lenta.innerHTML = '<p>Пока нет ни одной работы.</p>';
            return;
        }

        renderPage(1);
    })
    .catch(err => {
        const lenta = document.getElementById('lenta__arts');
        if (lenta) lenta.innerHTML = `<p style="color:red">Ошибка соединения с сервером: ${err.message}</p>`;
    });

// ─── Лайк-тогл ──────────────────────────────────────────────

function toggleLike(id) {
    const btn = document.getElementById(`like-btn-${id}`);
    if (!btn || btn.dataset.pending === 'true') return;
    btn.dataset.pending = 'true';

    const isLiked = likedSet.has(id);
    const url     = `http://localhost:3003/api/main/${id}/${isLiked ? 'unlike' : 'like'}`;

    fetch(url, { method: 'POST' })
        .then(res => {
            if (!res.ok) throw new Error('Ошибка сервера');
            return res.json();
        })
        .then(data => {
            isLiked ? likedSet.delete(id) : likedSet.add(id);

            [allData, filteredData].forEach(arr => {
                const card = arr.find(c => c.id === id);
                if (card) card.likes = data.likes;
            });

            const countEl = document.getElementById(`like-count-${id}`);
            if (countEl) countEl.textContent = data.likes;

            const icon = btn.querySelector('.art-card__like-icon');
            if (icon) icon.textContent = likedSet.has(id) ? '♥' : '♡';

            if (likedSet.has(id)) {
                btn.classList.add('liked');
                btn.title = 'Убрать лайк';
            } else {
                btn.classList.remove('liked');
                btn.title = 'Поставить лайк';
            }
        })
        .catch(err => console.error('Ошибка при лайке:', err))
        .finally(() => { btn.dataset.pending = 'false'; });
}

// ─── Удаление ───────────────────────────────────────────────

function deleteData(id) {
    fetch(`http://localhost:3003/api/main/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => location.reload())
        .catch(err => console.error('Ошибка при удалении:', err));
}