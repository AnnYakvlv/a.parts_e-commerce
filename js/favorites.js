// js/favorites.js - избранное из Supabase

let favoritesIds = []

// Загрузка избранного из Supabase
async function loadFavorites() {
    try {
        favoritesIds = await api.getFavorites()
        renderFavorites()
    } catch (error) {
        console.error('Ошибка загрузки избранного:', error)
        favoritesIds = []
    }
}

// Отрисовка избранного
async function renderFavorites() {
    const container = document.getElementById('favoritesContainer')
    if (!container) return
    
    if (favoritesIds.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px;"> Нет избранных товаров</div>'
        return
    }
    
    const products = await api.getProductsByIds(favoritesIds)
    
    container.innerHTML = products.map(product => {
    const mainImage = product.images?.find(img => img.is_main)
    const imageUrl = mainImage ? api.getImageUrl('product', mainImage.image_url) : null
    
    return `
        <div class="fav-product-card" data-id="${product.id}">
            <div class="fav-product-image">
                ${imageUrl ? `<img src="${imageUrl}" alt="${api.escapeHtml(product.name)}">` : '🔧 ⚙️'}
            </div>
            <div class="fav-product-title">${api.escapeHtml(product.name)}</div>
            <div class="fav-product-desc">${api.escapeHtml(product.description?.substring(0, 80) || '')}${product.description?.length > 80 ? '...' : ''}</div>
            <button class="fav-cart-btn" data-id="${product.id}" data-price="${product.price}">
                ${product.price.toFixed(2)} ₽
            </button>
        </div>
    `
}).join('')
    
    // Кнопки "В корзину"
    document.querySelectorAll('.fav-cart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation()
            const productId = parseInt(btn.dataset.id)
            const price = parseFloat(btn.dataset.price)
            await api.addToCart(productId, 1, price)
            alert('Товар добавлен в корзину')
        })
    })
    
    // Кнопки "Удалить из избранного"
    document.querySelectorAll('.fav-remove-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation()
            const productId = parseInt(btn.dataset.id)
            await api.removeFromFavorite(productId)
            await loadFavorites()
        })
    })
    
    // Клик по карточке
    document.querySelectorAll('.fav-product-card').forEach(card => {
        card.addEventListener('click', async (e) => {
            if (e.target.closest('button')) return
            const productId = parseInt(card.dataset.id)
            const product = await api.getProductById(productId)
            if (product && typeof openProductModal === 'function') {
                openProductModal(product)
            }
        })
    })
}

// Загружаем избранное при загрузке
if (document.getElementById('favoritesContainer')) {
    loadFavorites()
}