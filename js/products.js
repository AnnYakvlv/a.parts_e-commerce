// js/products.js - полностью замените содержимое

let allProducts = []
let manufacturers = []
let productTypes = []
let currentFilters = {
    category_id: null,
    subcategory_id: null,
    manufacturer_ids: [],
    types: [],
    sort: 'default',
    search: null,
    vin_mode: false
}
let cartItems = {}


// Обновление заголовка страницы и h1
async function updatePageTitle() {
    const titleElement = document.querySelector('.section-title-catalog')
    const breadcrumbDiv = document.querySelector('.breadcrumb')
    if (!titleElement) return
    
    const urlParams = new URLSearchParams(window.location.search)
    const categoryId = urlParams.get('category_id')
    
    if (categoryId) {
        const categories = await api.getCategories()
        const category = categories.find(c => c.id === parseInt(categoryId))
        if (category) {
            // Меняем h1
            titleElement.textContent = category.name
            
            // Меняем хлебные крошки
            if (breadcrumbDiv) {
                if (category.parent_id) {
                    const parent = categories.find(c => c.id === category.parent_id)
                    breadcrumbDiv.innerHTML = `главная / ${parent?.name || ''} / ${category.name} /`
                } else {
                    breadcrumbDiv.innerHTML = `главная / ${category.name} /`
                }
            }
            
            // Меняем title вкладки браузера
            document.title = `${category.name} | Каталог автозапчастей`
        }
    }
}

// Загрузка корзины из Supabase
async function loadCartFromSupabase() {
    try {
        const cart = await api.getCart()
        cartItems = {}
        cart.forEach(item => {
            cartItems[item.product_id] = item.quantity
        })
    } catch (error) {
        console.error('Ошибка загрузки корзины:', error)
        cartItems = {}
    }
}

// Сохранение корзины в Supabase
async function updateCartInSupabase(productId, quantity, price) {
    try {
        if (quantity === 0) {
            await api.updateCartQuantity(productId, 0)
        } else if (cartItems[productId]) {
            await api.updateCartQuantity(productId, quantity)
        } else {
            await api.addToCart(productId, quantity, price)
        }
        await loadCartFromSupabase()
        renderProducts(allProducts)
    } catch (error) {
        console.error('Ошибка обновления корзины:', error)
    }
}

// Добавление/удаление из избранного
async function toggleFavorite(productId) {
    try {
        const favorites = await api.getFavorites()
        const isFavorite = favorites.includes(productId)
        
        if (isFavorite) {
            await api.removeFromFavorite(productId)
            showNotification('Товар удалён из избранного', 'info')
        } else {
            await api.addToFavorite(productId)
            showNotification('Товар добавлен в избранное', 'success')
        }
        
        // Обновляем иконку сердечка в открытой модалке
        updateFavoriteButtonUI(productId)
        
        // Перерисовываем список избранного в ЛК, если он открыт
        if (typeof renderFavorites === 'function') {
            renderFavorites()
        }
    } catch (error) {
        console.error('Ошибка при работе с избранным:', error)
        showNotification('Ошибка, попробуйте позже', 'error')
    }
}

// Обновление UI кнопки избранного
function updateFavoriteButtonUI(productId) {
    // Обновляем кнопку в десктопной модалке
    const desktopFavoriteBtn = document.querySelector('.favorite-btn')
    if (desktopFavoriteBtn) {
        const icon = desktopFavoriteBtn.querySelector('.material-symbols-outlined')
        if (icon) {
            // Здесь нужно проверить, есть ли товар в избранном
            api.getFavorites().then(favorites => {
                if (favorites.includes(productId)) {
                    icon.style.fontVariationSettings = "'FILL' 1"
                    icon.style.color = '#E9F055'
                } else {
                    icon.style.fontVariationSettings = "'FILL' 0"
                    icon.style.color = 'inherit'
                }
            })
        }
    }
    
    // Обновляем кнопку в мобильной модалке
    const mobileFavoriteBtn = document.querySelector('.favorite-btn-mobile')
    if (mobileFavoriteBtn) {
        const icon = mobileFavoriteBtn.querySelector('.material-symbols-outlined')
        if (icon) {
            api.getFavorites().then(favorites => {
                if (favorites.includes(productId)) {
                    icon.style.fontVariationSettings = "'FILL' 1"
                    icon.style.color = '#E9F055'
                } else {
                    icon.style.fontVariationSettings = "'FILL' 0"
                    icon.style.color = 'inherit'
                }
            })
        }
    }
}

// Загрузка товаров
async function loadProducts() {
    try {
        showLoading()
        
        // Получаем параметры из URL
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('category_id')) {
            currentFilters.category_id = parseInt(urlParams.get('category_id'))
            updatePageTitle()
        }
        if (urlParams.get('subcategory_id')) {
            currentFilters.subcategory_id = parseInt(urlParams.get('subcategory_id'))
        }
        if (urlParams.get('search')) {
            currentFilters.search = urlParams.get('search')
            currentFilters.vin_mode = urlParams.get('vin_mode') === '1'
        }
        
        // Загружаем товары
        let products = []
        if (currentFilters.search && currentFilters.vin_mode) {
            products = await api.searchByVin(currentFilters.search)
            currentFilters.search = null
        } else {
            products = await api.getProducts(currentFilters)
        }
        allProducts = products
        
        // Загружаем производителей для фильтра
        manufacturers = await api.getManufacturers()
        
        // Загружаем типы товаров
        productTypes = await api.getProductTypes()
        
        // Загружаем корзину
        await loadCartFromSupabase()
        
        renderProducts(allProducts)
        renderFilterOptions()
        
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error)
        showError('Не удалось загрузить товары')
    }
}

function renderProducts(products) {
    const grid = document.getElementById('productsGrid')
    if (!grid) return
    
    if (!products || products.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: white; border-radius: 16px;">
                Товары не найдены
            </div>
        `
        return
    }
    
    grid.innerHTML = products.map(product => {
        const quantity = cartItems[product.id] || 0
        const inCart = quantity > 0
        
        const buttonContent = inCart ? 
            `<div class="quantity-controls">
                <span class="qty-icon" data-id="${product.id}" data-action="decr">−</span>
                <span class="qty-number">${quantity}</span>
                <span class="qty-icon" data-id="${product.id}" data-action="incr">+</span>
            </div>` :
            `<span class="price-text">${product.price.toFixed(2)} ₽</span>`
        
        // Получаем главное изображение
        const mainImage = product.images?.find(img => img.is_main)
        const imageUrl = mainImage ? api.getImageUrl('product', mainImage.image_url) : null
        
        const stockStatus = product.in_stock 
            ? '<span style="color:#FFFFFF; font-size:12px;">В наличии</span>' 
            : '<span style="color:#c00; font-size:12px;">Под заказ</span>'
        
        return `
            <div class="product-card" data-id="${product.id}">
                <div class="product-image">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${api.escapeHtml(product.name)}" style="width:80%;height:80%;object-fit:contain;">` : ''}
                </div>
                <div class="product-title">${api.escapeHtml(product.name)}</div>
                <div class="product-desc">${api.escapeHtml(product.description?.substring(0, 80) || '')}${product.description?.length > 80 ? '...' : ''}</div>
                <div style="margin-bottom: 8px;">${stockStatus}</div>
                <button class="cart-btn ${inCart ? 'in-cart' : ''}" data-id="${product.id}" data-price="${product.price}">
                    ${buttonContent}
                </button>
            </div>
        `
    }).join('')
    
    attachProductEvents()
}

function attachProductEvents() {
    // Клик по карточке
    document.querySelectorAll('.product-card').forEach(card => {
        card.removeEventListener('click', handleCardClick)
        card.addEventListener('click', handleCardClick)
    })
    
    // Кнопки корзины
    document.querySelectorAll('.cart-btn').forEach(btn => {
        btn.removeEventListener('click', handleCartClick)
        btn.addEventListener('click', handleCartClick)
    })
    
    // Кнопки изменения количества
    document.querySelectorAll('.qty-icon').forEach(icon => {
        icon.removeEventListener('click', handleQtyClick)
        icon.addEventListener('click', handleQtyClick)
    })
}

async function handleCardClick(e) {
    if (e.target.closest('.cart-btn')) return
    const productId = parseInt(this.getAttribute('data-id'))
    const product = allProducts.find(p => p.id === productId)
    if (product) await openProductModal(product)
}

async function handleCartClick(e) {
    e.stopPropagation()
    const productId = parseInt(this.getAttribute('data-id'))
    const price = parseFloat(this.getAttribute('data-price'))
    const currentQty = cartItems[productId] || 0
    
    if (currentQty === 0) {
        await updateCartInSupabase(productId, 1, price)
        showNotification('Товар добавлен в корзину', 'success')
    }
}

async function handleQtyClick(e) {
    e.stopPropagation()
    const productId = parseInt(this.getAttribute('data-id'))
    const action = this.getAttribute('data-action')
    const product = allProducts.find(p => p.id === productId)
    const currentQty = cartItems[productId] || 0
    
    let newQty = currentQty
    if (action === 'incr') {
        newQty = currentQty + 1
    } else if (action === 'decr') {
        newQty = currentQty - 1
        if (newQty < 0) newQty = 0
    }
    
    await updateCartInSupabase(productId, newQty, product?.price)
}

function renderFilterOptions() {
    // Десктопные фильтры
    const manufContainer = document.getElementById('manufacturerFilterGroup')
    const typeContainer = document.getElementById('typeFilterGroup')
    
    if (manufContainer) {
        manufContainer.innerHTML = manufacturers.map(m => `
            <label class="checkbox-item">
                <input type="checkbox" value="${m.id}" class="manuf-check" ${currentFilters.manufacturer_ids.includes(m.id) ? 'checked' : ''}>
                <span>${api.escapeHtml(m.name)}</span>
            </label>
        `).join('')
    }
    
    if (typeContainer) {
        typeContainer.innerHTML = productTypes.map(t => `
            <label class="checkbox-item">
                <input type="checkbox" value="${t}" class="type-check" ${currentFilters.types.includes(t) ? 'checked' : ''}>
                <span>${api.escapeHtml(t)}</span>
            </label>
        `).join('')
    }
    
    // Мобильные фильтры
    const manufContainerMobile = document.getElementById('manufacturerFilterGroupMobile')
    const typeContainerMobile = document.getElementById('typeFilterGroupMobile')
    
    if (manufContainerMobile) {
        manufContainerMobile.innerHTML = manufacturers.map(m => `
            <label class="checkbox-item">
                <input type="checkbox" value="${m.id}" class="manuf-check-mobile" ${currentFilters.manufacturer_ids.includes(m.id) ? 'checked' : ''}>
                <span>${api.escapeHtml(m.name)}</span>
            </label>
        `).join('')
    }
    
    if (typeContainerMobile) {
        typeContainerMobile.innerHTML = productTypes.map(t => `
            <label class="checkbox-item">
                <input type="checkbox" value="${t}" class="type-check-mobile" ${currentFilters.types.includes(t) ? 'checked' : ''}>
                <span>${api.escapeHtml(t)}</span>
            </label>
        `).join('')
    }
}

async function applyFilters() {
    // Собираем выбранные фильтры
    const selectedManufacturers = Array.from(document.querySelectorAll('.manuf-check:checked, .manuf-check-mobile:checked'))
        .map(cb => parseInt(cb.value))
    const selectedTypes = Array.from(document.querySelectorAll('.type-check:checked, .type-check-mobile:checked'))
        .map(cb => cb.value)
    
    currentFilters.manufacturer_ids = selectedManufacturers
    currentFilters.types = selectedTypes
    
    // Применяем фильтры
    await loadProducts()
    
    // Закрываем модалки
    if (typeof closeFilterModalDesktop === 'function') closeFilterModalDesktop()
    if (typeof closeFilterModalMobile === 'function') closeFilterModalMobile()
}

async function resetFilters() {
    currentFilters.manufacturer_ids = []
    currentFilters.types = []
    currentFilters.sort = 'default'
    await loadProducts()
    
    if (typeof closeFilterModalDesktop === 'function') closeFilterModalDesktop()
    if (typeof closeFilterModalMobile === 'function') closeFilterModalMobile()
}

async function applySort(sortValue) {
    currentFilters.sort = sortValue
    await loadProducts()
}

// Модалка товара
async function openProductModal(product) {
    // Загружаем полные данные с характеристиками
    const fullProduct = await api.getProductById(product.id)
    const specs = fullProduct.specs || []
    
    const isMobile = window.innerWidth <= 768
    
    if (isMobile) {
        openProductModalMobile(fullProduct, specs)
    } else {
        openProductModalDesktop(fullProduct, specs)
    }
}

function openProductModalDesktop(product, specs) {
    const fullStars = Math.floor(product.rating || 5)
    const stars = '★'.repeat(fullStars) + '☆'.repeat(5-fullStars)
    const stockStatus = product.in_stock ? "в наличии" : "под заказ"
    
    const specsHtml = specs.map(spec => `
        <div class="spec-item">
            <div class="spec-name">${api.escapeHtml(spec.spec_name)}</div>
            <div class="spec-value">${api.escapeHtml(spec.spec_value)}</div>
        </div>
    `).join('')
    
    const mainImage = product.images?.find(img => img.is_main)
    const imageUrl = mainImage ? api.getImageUrl('product', mainImage.image_url) : null
    
    document.getElementById('productModalContent').innerHTML = `
        <div class="product-modal-image">
            ${imageUrl ? `<img src="${imageUrl}" style="width:50%;height:60%;object-fit:contain;">` : 'Деталь'}
            <div class="stock-badge">${stockStatus}</div>
            <div class="image-dots">
                <div class="image-dot active"></div>
                <div class="image-dot"></div>
                <div class="image-dot"></div>
            </div>
        </div>
        <div class="product-modal-content">
            <div class="product-modal-title">${api.escapeHtml(product.name)}</div>
            <div class="product-modal-model">${api.escapeHtml(product.sku || '')}</div>
            <div class="specs-header">
                <div class="specs-title">Характеристики</div>
                <div class="product-rating">
                    <div class="stars">${stars}</div>
                    <div class="rating-value">${product.rating || 5}</div>
                </div>
            </div>
            <div class="specs-list">${specsHtml || '<div class="spec-item">Нет характеристик</div>'}</div>
            <div class="product-modal-actions">
                <button class="favorite-btn" data-id="${product.id}">
                    <span class="material-symbols-outlined">favorite_border</span>
                </button>
                <button class="add-to-cart-modal" data-id="${product.id}" data-price="${product.price}">
                    Добавить в корзину
                </button>
            </div>
        </div>
    `
    
    document.getElementById('productModal').classList.add('active')
    document.body.classList.add('modal-open')
    
    // Обработчики
    setTimeout(() => {
    // Кнопка добавления в корзину
    const addToCartBtn = document.querySelector('.add-to-cart-modal')
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            await updateCartInSupabase(product.id, (cartItems[product.id] || 0) + 1, product.price)
            closeProductModalDesktop()
            showNotification('Товар добавлен в корзину', 'success')
        })
    }
    
    // Кнопка добавления в избранное
    const favoriteBtn = document.querySelector('.favorite-btn')
    if (favoriteBtn) {
        // Удаляем старый обработчик, если есть
        const newFavoriteBtn = favoriteBtn.cloneNode(true)
        favoriteBtn.parentNode.replaceChild(newFavoriteBtn, favoriteBtn)
        
        newFavoriteBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            await toggleFavorite(product.id)
        })
    }
}, 50)
}

function openProductModalMobile(product, specs) {
    const fullStars = Math.floor(product.rating || 5)
    const stars = '★'.repeat(fullStars) + '☆'.repeat(5-fullStars)
    const stockStatus = product.in_stock ? "в наличии" : "под заказ"
    
    const specsHtml = specs.map(spec => `
        <div class="spec-item-mobile">
            <div class="spec-name-mobile">${api.escapeHtml(spec.spec_name)}</div>
            <div class="spec-value-mobile">${api.escapeHtml(spec.spec_value)}</div>
        </div>
    `).join('')
    
    const mainImage = product.images?.find(img => img.is_main)
    const imageUrl = mainImage ? api.getImageUrl('product', mainImage.image_url) : null
    
    document.getElementById('mobileModalInner').innerHTML = `
        <div class="product-modal-mobile-image">
            <div class="image-box">
                ${imageUrl ? `<img src="${imageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:16px;">` : '🔧 ⚙️'}
            </div>
            <div class="stock-badge-mobile">${stockStatus}</div>
            <div class="product-title-mobile">${api.escapeHtml(product.name)}</div>
            <div class="product-model-mobile">${api.escapeHtml(product.sku || '')}</div>
            <div class="image-dots-mobile">
                <div class="image-dot-mobile active"></div>
                <div class="image-dot-mobile"></div>
                <div class="image-dot-mobile"></div>
            </div>
        </div>
        <div class="product-modal-mobile-content">
            <div class="specs-header-mobile">
                <div class="specs-title-mobile">Характеристики</div>
                <div class="product-rating-mobile">
                    <div class="stars-mobile">${stars}</div>
                    <div class="rating-value-mobile">${product.rating || 5}</div>
                </div>
            </div>
            <div class="specs-list-mobile">${specsHtml || '<div class="spec-item-mobile">Нет характеристик</div>'}</div>
            <div class="product-modal-actions-mobile">
                <button class="favorite-btn-mobile" data-id="${product.id}">
                    <span class="material-symbols-outlined">favorite_border</span>
                </button>
                <button class="add-to-cart-mobile" data-id="${product.id}" data-price="${product.price}">
                    Добавить в корзину
                </button>
            </div>
        </div>
    `
    
    document.getElementById('productModalMobile').classList.add('active')
    document.body.classList.add('modal-open')
    
    setTimeout(() => {
    // Кнопка добавления в корзину
    const addToCartBtn = document.querySelector('.add-to-cart-mobile')
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            await updateCartInSupabase(product.id, (cartItems[product.id] || 0) + 1, product.price)
            closeProductModalMobile()
            showNotification('Товар добавлен в корзину', 'success')
        })
    }
    
    // Кнопка добавления в избранное
    const favoriteBtn = document.querySelector('.favorite-btn-mobile')
    if (favoriteBtn) {
        const newFavoriteBtn = favoriteBtn.cloneNode(true)
        favoriteBtn.parentNode.replaceChild(newFavoriteBtn, favoriteBtn)
        
        newFavoriteBtn.addEventListener('click', async (e) => {
            e.stopPropagation()
            await toggleFavorite(product.id)
        })
    }
}, 50)
}

function closeProductModalDesktop() {
    document.getElementById('productModal')?.classList.remove('active')
    document.body.classList.remove('modal-open')
}

function closeProductModalMobile() {
    document.getElementById('productModalMobile')?.classList.remove('active')
    document.body.classList.remove('modal-open')
}

// Утилиты
function showLoading() {
    const grid = document.getElementById('productsGrid')
    if (grid) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px;">⏳ Загрузка...</div>'
    }
}

function showError(message) {
    const grid = document.getElementById('productsGrid')
    if (grid) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:60px; background:white; border-radius:16px; color:#c00;">❌ ${message}</div>`
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.innerHTML = message
    notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        background: ${type === 'success' ? '#38AD02' : '#004AAD'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 2000;
        animation: slideIn 0.3s ease;
    `
    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 3000)
}

// Функции для открытия/закрытия модалок фильтра (десктоп)
function openFilterModalDesktop() {
    renderFilterOptions()
    const modal = document.getElementById('filterModal')
    if (modal) {
        modal.classList.add('active')
        document.body.classList.add('modal-open')
    }
}

function closeFilterModalDesktop() {
    const modal = document.getElementById('filterModal')
    if (modal) {
        modal.classList.remove('active')
        document.body.classList.remove('modal-open')
    }
}

// Функции для открытия/закрытия модалок фильтра (мобильные)
function openFilterModalMobile() {
    renderFilterOptions()
    const modal = document.getElementById('filterModalMobile')
    if (modal) {
        modal.classList.add('active')
        document.body.classList.add('modal-open')
    }
}

function closeFilterModalMobile() {
    const modal = document.getElementById('filterModalMobile')
    if (modal) {
        modal.classList.remove('active')
        document.body.classList.remove('modal-open')
    }
}

// Инициализация
if (document.getElementById('productsGrid')) {
    loadProducts()
    
    // Кнопка открытия фильтра
    const filterBtn = document.getElementById('filterBtn')
    if (filterBtn) {
        filterBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                openFilterModalMobile()
            } else {
                openFilterModalDesktop()
            }
        })
    }
    
    // Закрытие фильтра по крестику
    const closeFilterModalBtn = document.getElementById('closeFilterModalBtn')
    if (closeFilterModalBtn) {
        closeFilterModalBtn.addEventListener('click', closeFilterModalDesktop)
    }
    
    // Закрытие мобильного фильтра по drag handle
    const filterDragHandle = document.getElementById('filterDragHandle')
    if (filterDragHandle) {
        filterDragHandle.addEventListener('click', closeFilterModalMobile)
    }
    
    // Закрытие по клику на оверлей
    document.getElementById('filterModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('filterModal')) closeFilterModalDesktop()
    })
    
    document.getElementById('filterModalMobile')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('filterModalMobile')) closeFilterModalMobile()
    })
    
    // Кнопки применения фильтров
    document.getElementById('applyFilterBtn')?.addEventListener('click', applyFilters)
    document.getElementById('resetFilterBtn')?.addEventListener('click', resetFilters)
    document.getElementById('applyFilterBtnMobile')?.addEventListener('click', applyFilters)
    document.getElementById('resetFilterBtnMobile')?.addEventListener('click', resetFilters)
    
    // Сортировка
    const sortBtn = document.getElementById('sortBtn')
    const sortMenu = document.getElementById('sortMenu')
    
    if (sortBtn) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation()
            if (sortMenu) sortMenu.classList.toggle('show')
        })
    }
    
    document.addEventListener('click', (e) => {
        if (sortMenu && !sortBtn?.contains(e.target) && !sortMenu.contains(e.target)) {
            sortMenu.classList.remove('show')
        }
    })
    
    document.querySelectorAll('.sort-option').forEach(opt => {
        opt.addEventListener('click', () => {
            const sortValue = opt.getAttribute('data-sort')
            applySort(sortValue)
            if (sortMenu) sortMenu.classList.remove('show')
        })
    })
    
    // Кнопка "Назад"
    document.getElementById('backButton')?.addEventListener('click', () => {
        window.history.back()
    })
    
    // Закрытие модалок товара
    document.getElementById('closeProductModalBtn')?.addEventListener('click', closeProductModalDesktop)
    document.getElementById('productModal')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModal')) closeProductModalDesktop()
    })
    document.getElementById('dragHandle')?.addEventListener('click', closeProductModalMobile)
    document.getElementById('productModalMobile')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('productModalMobile')) closeProductModalMobile()
    })
}