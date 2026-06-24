const MAX_DESCR_LENGTH = 90;

function truncate(text, max) {
    if (!text) return 'Описание работы отсутствует.';
    return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

fetch('http://localhost:3003/api/main')
    .then(res => res.json())
    .then(data => {
        const lenta = document.getElementById('lenta__arts');
        if (!lenta) return;

        if (data.length === 0) {
            lenta.innerHTML = '<p>Пока нет ни одной работы.</p>';
            return;
        }

        lenta.innerHTML = data.map(row => {
            const imageBlock = row.image_url
                ? `<a href=""><img src="http://localhost:3003${row.image_url}" alt="${row.name}" class="art-card__img"></a>`
                : '';

            const shortDescr = truncate(row.descr, MAX_DESCR_LENGTH);

            return `
            <div class="art-card">
                <div class="art-card__image-wrapper">
                    ${imageBlock}
                    <button class="art-card__delete" onclick="deleteData(${row.id})">Удалить</button>
                </div>

                <div class="art-card__content">

                    <div class="art-card__header">
                        <a href="" class="art-card__title">${row.name}</a>
                        <span class="art-card__genre">${row.genre}</span>
                    </div>

                    <div class="art-card__author-stats">
                        <a href="" class="art-card__author">
                            <div class="art-card__avatar"></div>
                            <span class="art-card__author-name">Автор</span>
                            <span class="art-card__tick">✔</span>
                        </a>
                        <div class="art-card__stats">
                            <button
                                class="art-card__like-btn"
                                id="like-btn-${row.id}"
                                onclick="likeCard(${row.id})"
                                title="Поставить лайк"
                            >
                                <span class="art-card__like-icon">♡</span>
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
                        <p class="art-card__description">${shortDescr}</p>
                        <div class="art-card__rating">${row.rating}/10</div>
                    </div>

                    <hr class="art-card__divider">

                </div>
            </div>
        `;
        }).join('');
    })
    .catch(err => {
        const lenta = document.getElementById('lenta__arts');
        if (lenta) lenta.innerHTML = `<p style="color:red">Ошибка соединения с сервером: ${err.message}</p>`;
    });


// ─── Лайк ───────────────────────────────────────────────────
function likeCard(id) {
    const btn = document.getElementById(`like-btn-${id}`);
    if (btn && btn.disabled) return;
    if (btn) btn.disabled = true;

    fetch(`http://localhost:3003/api/main/${id}/like`, { method: 'POST' })
        .then(res => {
            if (!res.ok) throw new Error('Ошибка сервера');
            return res.json();
        })
        .then(data => {
            const countEl = document.getElementById(`like-count-${id}`);
            if (countEl) countEl.textContent = data.likes;

            const icon = btn ? btn.querySelector('.art-card__like-icon') : null;
            if (icon) icon.textContent = '♥';
            if (btn)  btn.classList.add('liked');
        })
        .catch(err => {
            console.error('Ошибка при лайке:', err);
            if (btn) btn.disabled = false;
        });
}


// ─── Удаление ───────────────────────────────────────────────
function deleteData(id) {
    fetch(`http://localhost:3003/api/main/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => location.reload())
        .catch(err => console.error('Ошибка при удалении:', err));
}