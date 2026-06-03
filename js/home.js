// js/home.js - ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ

// Загрузка и отображение категорий с картинками
async function loadAndRenderCategories() {
    try {
        const categories = await api.getRootCategories()
        const catalogGrid = document.querySelector('.catalog-grid')
        
        if (catalogGrid && categories.length) {
            // Создаём карточки
            catalogGrid.innerHTML = categories.map(cat => `
                <div class="catalog-card" data-category="${cat.slug}" data-id="${cat.id}" style="min-height: 160px;">
                    <p>${api.escapeHtml(cat.name)}</p>
                </div>
            `).join('')
            
            // Применяем фоновые изображения
            await applyCategoryBackgrounds()
            
            // Добавляем обработчики кликов
            document.querySelectorAll('.catalog-card').forEach(card => {
                card.addEventListener('click', () => {
                    const categoryId = card.getAttribute('data-id')
                    window.location.href = `product.html?category_id=${categoryId}`
                })
            })
        }
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error)
    }
}

// Применение фоновых изображений к карточкам
async function applyCategoryBackgrounds() {
    const categoryImages = {
        'engine': 'category-engine.png',
        'electricity': 'category-electronic.png',
        'running-gear': 'category-chassis.png',
        'fasteners': 'category-fasteners.png',
        'tools': 'category-tool.png'
    }
    
    const cards = document.querySelectorAll('.catalog-card')
    console.log('Применяем фоны к', cards.length, 'карточкам')
    
    for (const card of cards) {
        const slug = card.getAttribute('data-category')
        const fileName = categoryImages[slug]
        
        if (fileName) {
            const imageUrl = api.getImageUrl('home', fileName)
            console.log(`  ${slug} -> ${imageUrl}`)
            
            if (imageUrl) {
                card.style.backgroundImage = `url(${imageUrl})`
                card.style.backgroundSize = 'cover'
                card.style.backgroundPosition = 'center'
                
                const p = card.querySelector('p')
                if (p) {
                    p.style.padding = '8px 16px'
                    p.style.borderRadius = '8px'
                    p.style.color = '#211F22'
                    p.style.display = 'inline-block'
                    p.style.backdropFilter = 'blur(4px)'
                }
            }
        }
    }
}

// Загрузка баннера (разные версии для десктопа и мобилки)
async function loadBanner() {
    const bannerElement = document.querySelector('.fullwidth-banner')
    if (!bannerElement) return
    
    // Определяем, мобильное ли устройство
    const isMobile = window.innerWidth <= 768
    
    // Выбираем нужную картинку
    const bannerFileName = isMobile ? 'banner-mob.png' : 'banner-02.png'
    const bannerUrl = api.getImageUrl('home', bannerFileName)
    
    if (bannerUrl) {
        bannerElement.style.backgroundImage = `url(${bannerUrl})`
        bannerElement.style.backgroundSize = 'cover'
        bannerElement.style.backgroundPosition = 'center'
        bannerElement.innerHTML = ''
        console.log(`Баннер загружен: ${bannerFileName}`)
    }
}

// Следим за изменением размера окна (если пользователь повернул телефон)
window.addEventListener('resize', () => {
    // Простая защита от частых вызовов
    clearTimeout(window.bannerResizeTimeout)
    window.bannerResizeTimeout = setTimeout(() => {
        loadBanner()
    }, 300)
})

// Загрузка блога
async function loadBlog() {
    try {
        const posts = await api.getBlogPosts()
        const blogGrid = document.querySelector('.blog-grid')
        
        if (blogGrid && posts.length) {
            blogGrid.innerHTML = posts.map(post => {
                const imageUrl = api.getImageUrl('home', post.image_url)
                return `
                    <div class="blog-card">
                        <div class="blog-image-section">
                            <div class="blog-img-placeholder" style="background-image: url(${imageUrl}); background-size: cover; background-position: center; min-height: 180px; border-radius: 12px;">
                                ${!imageUrl ? '📷' : ''}
                            </div>
                        </div>
                        <div class="blog-content">
                            <h3>${api.escapeHtml(post.title)}</h3>
                            <p>${api.escapeHtml(post.description)}</p>
                        </div>
                    </div>
                `
            }).join('')
            console.log('Блог загружен')
        }
    } catch (error) {
        console.error('Ошибка загрузки блога:', error)
    }
}

// Загрузка блока "О нас"
async function loadAboutImages() {
    const aboutImages = {
        'about-delivery.jpg': '.plate-delivery',
        'about-contact.webp': '.plate-contacts',
        'about-client.jpg': '.plate-clients'
    }
    
    for (const [fileName, selector] of Object.entries(aboutImages)) {
        const element = document.querySelector(selector)
        if (element) {
            const imgUrl = api.getImageUrl('home', fileName)
            if (imgUrl) {
                element.style.backgroundImage = `url(${imgUrl})`
                element.style.backgroundSize = 'cover'
                element.style.backgroundPosition = 'center'
                element.style.minHeight = '200px'
                element.style.display = 'flex'
                element.style.alignItems = 'flex-end'
                element.style.justifyContent = 'flex-start'
                element.style.color = '#E9F055'
                element.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)'
                element.style.fontWeight = 'bold'
                element.style.fontSize = '1.5rem'
                element.style.padding = '24px'
                console.log(`${fileName} загружено`)
            }
        }
    }
}

// Поиск на главной
async function performSearch() {
    const searchField = document.getElementById('searchField')
    const query = searchField?.value.trim()
    if (!query) {
        alert('Введите данные для поиска')
        return
    }
    
    const isVinMode = document.getElementById('vinSearchBtn')?.classList.contains('active')
    
    try {
        let results
        if (isVinMode) {
            results = await api.searchByVin(query)
        } else {
            results = await api.getProducts({ search: query })
        }
        
        if (results && results.length > 0) {
            localStorage.setItem('searchResults', JSON.stringify(results))
            window.location.href = `product.html?search=${encodeURIComponent(query)}${isVinMode ? '&vin_mode=1' : ''}`
        } else {
            alert('Товары не найдены')
        }
    } catch (error) {
        console.error('Ошибка поиска:', error)
        alert('Ошибка при поиске. Попробуйте позже.')
    }
}

// ========== ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Запуск главной страницы...')
    
    await loadBanner()
    await loadAndRenderCategories()
    await loadBlog()
    await loadAboutImages()
    
    console.log('✅ Главная страница полностью загружена')
})

// ========== НАСТРОЙКА ПОИСКА ==========
const searchBtn = document.getElementById('searchActionBtn')
const searchField = document.getElementById('searchField')
if (searchBtn) {
    searchBtn.addEventListener('click', performSearch)
}
if (searchField) {
    searchField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch()
    })
}

// ========== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ПОИСКА ==========
const simpleBtn = document.getElementById('simpleSearchBtn')
const vinBtn = document.getElementById('vinSearchBtn')
const exampleSpan = document.getElementById('exampleText')

if (simpleBtn && vinBtn) {
    simpleBtn.addEventListener('click', () => {
        simpleBtn.classList.add('active')
        vinBtn.classList.remove('active')
        if (searchField) searchField.placeholder = "Название детали или артикул..."
        if (exampleSpan) exampleSpan.innerText = "Пример: прокладка ГБЦ, поршень, катушка зажигания"
    })
    
    vinBtn.addEventListener('click', () => {
        vinBtn.classList.add('active')
        simpleBtn.classList.remove('active')
        if (searchField) searchField.placeholder = "Введите 17 символов VIN-кода"
        if (exampleSpan) exampleSpan.innerText = "Пример VIN: JN1BANY50U0130646"
    })
}