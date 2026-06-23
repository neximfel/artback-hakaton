// fetch('http://localhost:3003/api/main')
//     .then(res => res.json())
//     .then(data => {
//         document.getElementById('result').innerHTML = data.map(row => `
//             <p>ID: ${row.id}</p>
//             <p>Login: ${row.login}</p>
//             <p>Password: ${row.password}</p>
//             <p>Phone number: ${row.number}</p>
//             <button onclick="deleteData(${row.id})">Удалить</button>
//             <hr>
//         `).join('');
//     })
//     .catch(err => {
//         document.getElementById('result').innerHTML = `<p style="color:red">Ошибка: ${err.message}</p>`;
//     })

// function sendData() {
//     fetch('http://localhost:3003/api/main', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//             login: document.getElementById('login').value,
//             password: document.getElementById('password').value,
//             number: document.getElementById('number').value
//         })
//     })
//     .then(res => res.json())
//     .then(res => location.reload())
//     .then(data => console.log('Ответ:', data))
//     .catch(err => console.error('Ошибка:', err))
// }

// function deleteData(id){
//     fetch(`http://localhost:3003/api/main/${id}`, {
//         method:'DELETE'
//     })
//     .then(res => res.json())
//     .then(() => location.reload())
//     .catch(err => console.error('Ошибка', err))
// }







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
                ? `<img src="http://localhost:3003${row.image_url}" alt="${row.name}" class="art-card__img">` 
                : `<div class="art-card__no-img"></div>`;

            return `
            <div class="art-card">
                <div class="art-card__image-wrapper">
                    ${imageBlock}
                </div>
                <div class="art-card__content">
                    <div class="art-card__header">
                        <h3 class="art-card__title">${row.name}</h3>
                        <span class="art-card__genre">${row.genre}</span>
                    </div>
                    <div class="art-card__author-stats">
                        <div class="art-card__author">
                            <div class="art-card__avatar"></div>
                            <span class="art-card__author-name">Автор <span class="art-card__tick">✔</span></span>
                        </div>
                        <div class="art-card__stats">
                            <span class="art-card__likes">♡ ${row.likes}</span>
                            <span class="art-card__views">👁 ${row.views}</span>
                        </div>
                    </div>
                    <p class="art-card__description">${row.descr || 'Описание работы отсутствует.'}</p>
                    <hr class="art-card__divider">
                    <div class="art-card__footer">
                        <div class="art-card__rating">${row.rating}/10</div>
                        <button class="art-card__rate-btn">Оценить</button>
                    </div>
                </div>
                <button class="art-card__delete" onclick="deleteData(${row.id})">Удалить</button>
            </div>
        `}).join('');
    })
    .catch(err => {
        const lenta = document.getElementById('lenta__arts');
        if (lenta) lenta.innerHTML = `<p style="color:red">Ошибка соединения с сервером: ${err.message}</p>`;
    });

function deleteData(id){
    fetch(`http://localhost:3003/api/main/${id}`, {
        method:'DELETE'
    })
    .then(res => res.json())
    .then(() => location.reload())
    .catch(err => console.error('Ошибка при удалении:', err));
}