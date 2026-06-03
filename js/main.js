// ========== НАВИГАЦИЯ ПО НИЖНЕЙ ПАНЕЛИ ==========
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const navType = item.getAttribute('data-nav');
        
        if (navType === 'catalog') {
            window.location.href = 'catalog.html';
        } else if (navType === 'garage') {
            // Переключение на вкладку гаража в ЛК
            if (window.location.pathname.includes('lk.html')) {
                activateGarageTab?.();
            } else {
                window.location.href = 'lk.html?tab=garage';
            }
        } else if (navType === 'cart') {
            window.location.href = 'cart.html';
        } else if (navType === 'favorites') {
            if (window.location.pathname.includes('lk.html')) {
                activateFavoritesTab?.();
            } else {
                window.location.href = 'lk.html?tab=favorites';
            }
        } else if (navType === 'profile') {
            window.location.href = 'lk.html';
        }
    });
});

// ========== ОБЩИЕ ФУНКЦИИ ДЛЯ МОДАЛОК ==========
function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.classList.remove('modal-open');
}

// Закрытие по клику на оверлей
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    });
});

// Добавьте в конец файла js/main.js

// Анимация для уведомлений
const style = document.createElement('style')
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`
document.head.appendChild(style)


// Загрузка логотипа из Supabase
async function loadLogo() {
    const logoContainer = document.querySelector('.logo-placeholder')
    if (!logoContainer) return
    
    const logoUrl = api.getImageUrl('home', 'logo.png')
    
    if (logoUrl) {
        logoContainer.innerHTML = `<img src="${logoUrl}" alt="Логотип" style="height: 100%; width: auto; max-height: 40px; object-fit: contain;">`
        logoContainer.style.backgroundColor = 'transparent'
        logoContainer.style.padding = '0'
    }
}

// Запускаем после загрузки DOM
if (document.querySelector('.logo-placeholder')) {
    document.addEventListener('DOMContentLoaded', loadLogo)
}

// Делаем логотип кликабельным
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo-placeholder')
    if (logo && !logo.closest('a')) {
        // Оборачиваем логотип в ссылку
        const link = document.createElement('a')
        link.href = 'index.html'
        link.className = 'logo-link'
        link.style.display = 'inline-block'
        link.style.textDecoration = 'none'
        
        // Перемещаем логотип внутрь ссылки
        logo.parentNode.insertBefore(link, logo)
        link.appendChild(logo)
    }
})