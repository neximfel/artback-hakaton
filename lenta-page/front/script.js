document.addEventListener('DOMContentLoaded', function () {
    // Элементы модального окна
    const uploadModal = document.getElementById('uploadModal');
    const uploadButton = document.getElementById('upload-button'); // Кнопка в хедере
    const closeModalBtn = document.getElementById('closeModalBtn'); // Крестик

    // Остальные твои элементы
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('preview');
    const publishBtn = document.getElementById('publishBtn');
    const titleInput = document.getElementById('titleInput');
    const categorySelect = document.getElementById('categorySelect');

    // ===== Логика Модального Окна =====
    
    // Открытие модалки при клике на иконку в хедере
    if (uploadButton && uploadModal) {
        uploadButton.addEventListener('click', function () {
            uploadModal.classList.add('active');
        });
    }

    // Закрытие при клике на крестик
    if (closeModalBtn && uploadModal) {
        closeModalBtn.addEventListener('click', function () {
            uploadModal.classList.remove('active');
        });
    }

    // Закрытие при клике на затемненную область (вне upload-section)
    if (uploadModal) {
        uploadModal.addEventListener('click', function (e) {
            // Если кликнули именно по подложке upload-modal, а не по форме внутри неё
            if (e.target === uploadModal) {
                uploadModal.classList.remove('active');
            }
        });
    }

    // ===== Твоя рабочая логика загрузки файлов =====
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', function () {
            fileInput.click();
        });

        fileInput.addEventListener('change', function () {
            if (this.files && this.files[0]) {
                showPreview(this.files[0]);
            }
        });

        uploadArea.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function (e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function (e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                fileInput.files = e.dataTransfer.files;
                showPreview(file);
            } else {
                alert('Пожалуйста, выберите изображение.');
            }
        });
    }

    function showPreview(file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            preview.src = e.target.result;
            uploadArea.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    }

    // ===== Публикация работы =====
    if (publishBtn) {
        publishBtn.addEventListener('click', function () {
            const title = titleInput.value.trim();
            const file = fileInput.files[0];
            const descriptionInput = document.getElementById('descriptionInput');
            const descrText = descriptionInput ? descriptionInput.value.trim() : '';
            
            let category = 'Другое';
            if (categorySelect && categorySelect.selectedIndex !== -1) {
                category = categorySelect.options[categorySelect.selectedIndex].text;
            }

            if (!file) {
                alert('Пожалуйста, загрузите изображение.');
                return;
            }
            if (!title) {
                alert('Введите название работы.');
                titleInput.focus();
                return;
            }
            if (!categorySelect.value) {
                alert('Выберите категорию.');
                return;
            }

            const formData = new FormData();
            formData.append('name', title);
            formData.append('genre', category);
            formData.append('image', file);
            formData.append('descr', descrText);

            fetch('http://localhost:3003/api/main', {
                method: 'POST',
                body: formData
            })
            .then(res => {
                if (!res.ok) throw new Error('Ошибка сервера');
                return res.json();
            })
            .then(data => {
                alert('Работа успешно опубликована! ✅');
                resetForm();
                uploadModal.classList.remove('active'); // Закрываем модалку после успеха
                location.reload();
            })
            .catch(err => {
                console.error('Ошибка при отправке:', err);
                alert('Не удалось связаться с сервером.');
            });
        });
    }

    function resetForm() {
        if (fileInput) fileInput.value = '';
        if (titleInput) titleInput.value = '';
        if (categorySelect) categorySelect.selectedIndex = 0;
        const descriptionInput = document.getElementById('descriptionInput');
        if (descriptionInput) descriptionInput.value = '';
        if (preview) preview.src = '';
        if (uploadArea) uploadArea.classList.remove('has-image');
    }
});