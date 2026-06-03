// js/cart.js - полная версия со всей логикой модального окна

let cartItems = []
let promoDiscount = 0
let appliedPromoCode = null

// Загрузка корзины из Supabase
async function loadCartFromSupabase() {
    try {
        const cart = await api.getCart()
        cartItems = cart.map(item => {
            const product = item.product
            const mainImage = product?.images?.find(img => img.is_main)
            const imageUrl = mainImage ? api.getImageUrl('product', mainImage.image_url) : null
            
            return {
                id: item.product_id,
                name: product?.name || 'Товар',
                description: product?.description || '',
                price: item.price_at_add || product?.price || 0,
                quantity: item.quantity,
                selected: true,
                imageUrl: imageUrl
            }
        })
    } catch (error) {
        console.error('Ошибка загрузки корзины:', error)
        cartItems = []
    }
}

// Обновление количества в корзине
async function updateCartQuantity(productId, newQuantity, price) {
    try {
        await api.updateCartQuantity(productId, newQuantity)
        await loadCartFromSupabase()
        renderCart()
    } catch (error) {
        console.error('Ошибка обновления корзины:', error)
    }
}

function calculateTotals() {
    const selectedItems = cartItems.filter(item => item.selected === true)
    const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const discount = promoDiscount
    const totalPay = subtotal - discount > 0 ? subtotal - discount : 0
    return { subtotal, discount, totalPay }
}

function updateSummaryOnly() {
    const { subtotal, discount, totalPay } = calculateTotals()
    const subtotalElem = document.querySelector('.summary-subtotal-value')
    const discountElem = document.querySelector('.summary-discount-value')
    const totalElem = document.querySelector('.summary-grand-value')
    if (subtotalElem) subtotalElem.innerText = `${subtotal.toFixed(2)} ₽`
    if (discountElem) discountElem.innerText = `${discount.toFixed(2)} ₽`
    if (totalElem) totalElem.innerText = `${totalPay.toFixed(2)} ₽`
}

function escapeHtml(str) {
    if (!str) return ''
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;'
        if (m === '<') return '&lt;'
        if (m === '>') return '&gt;'
        return m
    })
}

async function handleCheckboxChange(e) {
    const itemId = parseInt(e.target.getAttribute('data-id'))
    const item = cartItems.find(i => i.id === itemId)
    if (item) {
        item.selected = e.target.checked
        updateSummaryOnly()
    }
}

async function handleRemoveClick(e) {
    const itemId = parseInt(e.target.getAttribute('data-id'))
    await updateCartQuantity(itemId, 0, 0)
}

async function handleQtyClick(e) {
    const itemId = parseInt(e.target.getAttribute('data-id'))
    const delta = parseInt(e.target.getAttribute('data-delta'))
    const item = cartItems.find(i => i.id === itemId)
    if (item) {
        let newQty = item.quantity + delta
        if (newQty < 1) newQty = 1
        if (newQty > 99) newQty = 99
        await updateCartQuantity(itemId, newQty, item.price)
    }
}

function handlePromoApply() {
    const promoInput = document.getElementById('promoCodeInput')
    const code = promoInput ? promoInput.value.trim().toUpperCase() : ''
    const { subtotal } = calculateTotals()
    
    if (code === 'DISCOUNT10') {
        promoDiscount = subtotal * 0.1
        appliedPromoCode = code
        alert('Промокод DISCOUNT10 применён! Скидка 10%')
    } else if (code === 'FIX500') {
        promoDiscount = 500
        appliedPromoCode = code
        alert('Промокод FIX500 применён! Скидка 500 ₽')
    } else if (code === '') {
        promoDiscount = 0
        appliedPromoCode = null
        alert('Промокод сброшен')
    } else {
        alert('Неверный промокод. Попробуйте DISCOUNT10 или FIX500')
        return
    }
    
    updateSummaryOnly()
    if (promoInput && appliedPromoCode) promoInput.value = appliedPromoCode
    else if (promoInput && !appliedPromoCode) promoInput.value = ''
}

function attachCartEvents() {
    document.querySelectorAll('.item-select-checkbox').forEach(cb => {
        cb.removeEventListener('change', handleCheckboxChange)
        cb.addEventListener('change', handleCheckboxChange)
    })
    document.querySelectorAll('.remove-item-btn').forEach(btn => {
        btn.removeEventListener('click', handleRemoveClick)
        btn.addEventListener('click', handleRemoveClick)
    })
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.removeEventListener('click', handleQtyClick)
        btn.addEventListener('click', handleQtyClick)
    })
}

function attachPromoEvents() {
    const applyBtn = document.getElementById('applyPromoBtn')
    const promoInput = document.getElementById('promoCodeInput')
    if (applyBtn && promoInput) {
        applyBtn.removeEventListener('click', handlePromoApply)
        applyBtn.addEventListener('click', handlePromoApply)
    }
}

async function renderCart() {
    const cartLayout = document.getElementById('cartLayout')
    if (!cartLayout) return
    
    await loadCartFromSupabase()
    
    if (cartItems.length === 0) {
        cartLayout.innerHTML = `<div class="empty-cart-message">🛒 Корзина пуста. Добавьте товары из каталога.</div>`
        return
    }
    
    const { subtotal, discount, totalPay } = calculateTotals()
    const isMobile = window.innerWidth <= 768
    
    const itemsHtml = cartItems.map(item => {
        if (isMobile) {
            return `
                <div class="cart-item-card" data-item-id="${item.id}">
                    <div class="cart-item-row">
                        <div class="cart-checkbox">
                            <input type="checkbox" class="item-select-checkbox" ${item.selected ? 'checked' : ''} data-id="${item.id}">
                        </div>
                        <div class="cart-item-img">
                            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${escapeHtml(item.name)}">` : '🔧'}
                        </div>
                        <div class="cart-item-details">
                            <div class="cart-item-name">${escapeHtml(item.name)}</div>
                            <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} ₽</div>
                            <div class="cart-item-qty">
                                <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
                                <span class="qty-value">${item.quantity}</span>
                                <button class="qty-btn" data-id="${item.id}" data-delta="+1">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            `
        }
        
        return `
            <div class="cart-item-card" data-item-id="${item.id}">
                <div class="cart-item-row">
                    <div class="cart-checkbox">
                        <input type="checkbox" class="item-select-checkbox" ${item.selected ? 'checked' : ''} data-id="${item.id}">
                    </div>
                    <div class="cart-item-img">
                        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${escapeHtml(item.name)}">` : '🔧'}
                    </div>
                    <div class="cart-item-info">
                        <div>
                            <div class="cart-item-name">${escapeHtml(item.name)}</div>
                            <div class="cart-item-desc">${escapeHtml(item.description?.substring(0, 100) || '')}</div>
                        </div>
                        <button class="remove-item-btn" data-id="${item.id}">Удалить</button>
                    </div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn" data-id="${item.id}" data-delta="+1">+</button>
                    </div>
                    <div class="cart-item-price">${(item.price * item.quantity).toFixed(2)} ₽</div>
                </div>
            </div>
        `
    }).join('')
    
    const leftColumn = `<div class="cart-items-column">${itemsHtml}</div>`
    const rightPanel = `
        <div class="cart-summary-card">
            <div class="summary-title">Применить промокод</div>
            <div class="promo-code-group">
                <div class="promo-input-wrapper">
                    <input type="text" id="promoCodeInput" class="promo-input" placeholder="Введите промокод" value="${appliedPromoCode ? appliedPromoCode : ''}">
                    <button class="promo-apply-btn" id="applyPromoBtn">Применить</button>
                </div>
            </div>
            <div class="summary-row">
                <span>Всего</span>
                <span class="summary-subtotal-value">${subtotal.toFixed(2)} ₽</span>
            </div>
            <div class="summary-row discount-row">
                <span>Скидка</span>
                <span class="summary-discount-value">${discount.toFixed(2)} ₽</span>
            </div>
            <div class="summary-row grand-total-row">
                <span class="grand-total-label">К оплате</span>
                <span class="grand-total-value summary-grand-value">${totalPay.toFixed(2)} ₽</span>
            </div>
            <button class="checkout-btn" id="checkoutBtn">Перейти к оформлению</button>
        </div>
    `
    
    cartLayout.innerHTML = leftColumn + rightPanel
    attachCartEvents()
    attachPromoEvents()
}

// ========== ФУНКЦИИ ДЛЯ МОДАЛЬНОГО ОКНА ОПЛАТЫ ==========
function openPaymentModal() {
    const modal = document.getElementById('paymentModal')
    if (modal) {
        modal.classList.add('active')
        document.body.classList.add('modal-open')
    }
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal')
    if (modal) {
        modal.classList.remove('active')
        document.body.classList.remove('modal-open')
    }
}

function formatCardNumber(value) {
    let cleaned = value.replace(/\s/g, '')
    if (cleaned.length > 16) cleaned = cleaned.slice(0, 16)
    if (cleaned.length > 4) {
        cleaned = cleaned.match(/.{1,4}/g).join(' ')
    }
    return cleaned
}

function formatCardDate(value) {
    let cleaned = value.replace(/[^0-9]/g, '')
    if (cleaned.length >= 2) {
        cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
    }
    return cleaned.slice(0, 5)
}

function validatePaymentForm() {
    const cardholder = document.getElementById('cardholderName')?.value.trim()
    const cardNumber = document.getElementById('cardNumber')?.value.replace(/\s/g, '')
    const cardDate = document.getElementById('cardDate')?.value
    const cardCvc = document.getElementById('cardCvc')?.value
    
    if (!cardholder || cardholder.length < 3) {
        alert('Введите корректное имя держателя карты')
        return false
    }
    if (!cardNumber || !/^\d{16}$/.test(cardNumber)) {
        alert('Введите корректный номер карты (16 цифр)')
        return false
    }
    if (!cardDate || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardDate)) {
        alert('Введите корректную дату (ММ/ГГ)')
        return false
    }
    if (!cardCvc || !/^\d{3}$/.test(cardCvc)) {
        alert('Введите корректный CVC код (3 цифры)')
        return false
    }
    return true
}

async function processPayment() {
    if (!validatePaymentForm()) return
    
    alert('✅ Заказ успешно оформлен!')
    await api.clearCart()
    cartItems = []
    closePaymentModal()
    renderCart()
}

function initPaymentModal() {
    const modal = document.getElementById('paymentModal')
    const closeBtn = document.getElementById('closePaymentModalBtn')
    const dragHandle = document.getElementById('paymentDragHandle')
    const payBtn = document.getElementById('payOrderBtn')
    const changeAddressBtn = document.getElementById('changeAddressBtn')
    const changeAddressCourierBtn = document.getElementById('changeAddressCourierBtn')
    
    // Переключение между самовывозом и доставкой
    const pickupTab = document.querySelector('[data-delivery="pickup"]')
    const courierTab = document.querySelector('[data-delivery="courier"]')
    const pickupContent = document.getElementById('pickupContent')
    const courierContent = document.getElementById('courierContent')
    
    if (pickupTab && courierTab) {
        pickupTab.addEventListener('click', () => {
            pickupTab.classList.add('active')
            courierTab.classList.remove('active')
            if (pickupContent) pickupContent.style.display = 'block'
            if (courierContent) courierContent.style.display = 'none'
        })
        
        courierTab.addEventListener('click', () => {
            courierTab.classList.add('active')
            pickupTab.classList.remove('active')
            if (pickupContent) pickupContent.style.display = 'none'
            if (courierContent) courierContent.style.display = 'block'
        })
    }
    
    // Закрытие модалки
    if (closeBtn) closeBtn.addEventListener('click', closePaymentModal)
    if (dragHandle) dragHandle.addEventListener('click', closePaymentModal)
    
    // Закрытие по клику на оверлей
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closePaymentModal()
        })
    }
    
    // Кнопки "Изменить адрес"
    if (changeAddressBtn) {
        changeAddressBtn.addEventListener('click', () => alert('Функция изменения адреса в разработке'))
    }
    if (changeAddressCourierBtn) {
        changeAddressCourierBtn.addEventListener('click', () => alert('Функция изменения адреса в разработке'))
    }
    
    // Форматирование полей карты
    const cardNumberInput = document.getElementById('cardNumber')
    const cardDateInput = document.getElementById('cardDate')
    const cardCvcInput = document.getElementById('cardCvc')
    
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            e.target.value = formatCardNumber(e.target.value)
        })
    }
    
    if (cardDateInput) {
        cardDateInput.addEventListener('input', (e) => {
            e.target.value = formatCardDate(e.target.value)
        })
    }
    
    if (cardCvcInput) {
        cardCvcInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3)
        })
    }
    
    // Кнопка "Оплатить"
    if (payBtn) payBtn.addEventListener('click', processPayment)
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
if (document.getElementById('cartLayout')) {
    renderCart()
    initPaymentModal()
    
    // Открытие модалки по кнопке "Перейти к оформлению"
    document.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'checkoutBtn') {
            if (cartItems.length === 0) {
                alert('Корзина пуста, добавьте товары')
            } else {
                openPaymentModal()
            }
        }
    })
}