// js/poisk.js - поиск в навбаре

const navbarSearchInput = document.getElementById('navbarSearchInput')
if (navbarSearchInput) {
    navbarSearchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const query = navbarSearchInput.value.trim()
            if (query) {
                window.location.href = `product.html?search=${encodeURIComponent(query)}`
            } else {
                alert('Введите название товара для поиска')
            }
        }
    })
}