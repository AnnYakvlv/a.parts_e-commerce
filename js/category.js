// js/category.js - полностью замените содержимое

// Загрузка категорий из Supabase
async function loadCategories() {
    try {
        const categories = await api.getCategories()
        
        // Группируем по parent_id
        const categoriesMap = new Map()
        const rootCategories = []
        
        categories.forEach(cat => {
            categoriesMap.set(cat.id, { ...cat, children: [] })
        })
        
        categories.forEach(cat => {
            if (cat.parent_id) {
                const parent = categoriesMap.get(cat.parent_id)
                if (parent) parent.children.push(categoriesMap.get(cat.id))
            } else {
                rootCategories.push(categoriesMap.get(cat.id))
            }
        })
        
        renderAccordion(rootCategories)
        
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error)
        const accordionList = document.querySelector('.accordion-list')
        if (accordionList) {
            accordionList.innerHTML = '<div style="padding:20px; text-align:center;">Ошибка загрузки категорий</div>'
        }
    }
}

function renderAccordion(categories) {
    const accordionList = document.querySelector('.accordion-list')
    if (!accordionList) return
    
    accordionList.innerHTML = ''
    
    categories.forEach(category => {
        const accordionItem = document.createElement('div')
        accordionItem.className = 'accordion-item'
        
        accordionItem.innerHTML = `
            <button class="accordion-header" aria-expanded="false">
                <span class="header-text">${api.escapeHtml(category.name)}</span>
                <span class="material-symbols-outlined" aria-hidden="true">arrow_forward_ios</span>
            </button>
            <div class="accordion-content">
                <div class="accordion-inner">
                    <ul class="subcategories">
                        ${category.children.map(child => `
                            <li>
                                <a href="product.html?category_id=${child.id}">
                                    ${api.escapeHtml(child.name)}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        `
        
        accordionList.appendChild(accordionItem)
    })
    
    // Инициализируем аккордеон
    initializeAccordion()
}

function initializeAccordion() {
    const accordionItems = document.querySelectorAll('.accordion-item')
    
    accordionItems.forEach(item => {
        const header = item.querySelector('.accordion-header')
        if (header) {
            // Удаляем старый обработчик, чтобы не дублировать
            const newHeader = header.cloneNode(true)
            header.parentNode.replaceChild(newHeader, header)
            
            newHeader.addEventListener('click', () => {
                const isOpen = item.classList.contains('open')
                if (isOpen) {
                    item.classList.remove('open')
                    newHeader.setAttribute('aria-expanded', 'false')
                } else {
                    item.classList.add('open')
                    newHeader.setAttribute('aria-expanded', 'true')
                }
            })
        }
    })
}

// Загружаем категории при загрузке страницы
if (document.querySelector('.accordion-list')) {
    loadCategories()
}