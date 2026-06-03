// js/logo.js - загрузка логотипа из Supabase

async function loadLogo() {
    const logoContainer = document.querySelector('.logo-placeholder')
    if (!logoContainer) return
    
    try {
        // Название файла логотипа в бакете home
        const logoFileName = 'logo.png'
        
        // Получаем URL из Supabase Storage
        const logoUrl = api.getImageUrl('home', logoFileName)
        
        if (logoUrl) {
            // Заменяем текст на изображение
            logoContainer.innerHTML = `<img src="${logoUrl}" alt="Логотип" style="height: 100%; width: auto; max-height: 40px; object-fit: contain;">`
            logoContainer.style.backgroundColor = 'transparent'
            logoContainer.style.padding = '0'
            console.log('✅ Логотип загружен')
        } else {
            console.warn('Логотип не найден в бакете home')
            logoContainer.textContent = 'ЛОГО'
        }
    } catch (error) {
        console.error('Ошибка загрузки логотипа:', error)
        logoContainer.textContent = 'ЛОГО'
    }
}

// Загружаем логотип при загрузке страницы
document.addEventListener('DOMContentLoaded', loadLogo)