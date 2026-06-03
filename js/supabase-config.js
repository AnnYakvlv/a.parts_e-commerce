
console.log('Загрузка supabase-config.js...')

const SUPABASE_URL = 'https://dfnlekkrosjimworqejb.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_5V_kUtJwvtSm8BvUS51XZg_OWQNNoSH'


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
console.log('Supabase клиент создан')


function getImageUrl(bucket, path) {
    if (!path) return null
    let cleanPath = path
    if (cleanPath.startsWith('product/')) {
        cleanPath = cleanPath.substring(8)
    }
    if (cleanPath.startsWith('products/')) {
        cleanPath = cleanPath.substring(9)
    }
    const { data } = supabaseClient.storage.from(bucket).getPublicUrl(cleanPath)
    return data.publicUrl
}

function getGuestUserId() {
    let guestId = localStorage.getItem('guest_user_id')
    if (!guestId) {
        guestId = 'guest_' + Math.random().toString(36).substr(2, 9)
        localStorage.setItem('guest_user_id', guestId)
    }
    return guestId
}


const auth = {
    async getCurrentUser() {
        const { data } = await supabaseClient.auth.getUser()
        return data.user
    },
    

    async isAuthenticated() {
        const { data } = await supabaseClient.auth.getSession()
        return !!data.session
    },
    

    async signIn(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        })
        if (error) throw error
        return data
    },
    

    async signUp(email, password, userData = {}) {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: userData.full_name || '',
                    phone: userData.phone || ''
                }
            }
        })
        if (error) throw error
        return data
    },
    

    async signOut() {
        const { error } = await supabaseClient.auth.signOut()
        if (error) throw error
        localStorage.removeItem('cart')
        localStorage.removeItem('guest_user_id')
    },
    

    async getProfile() {
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) return null
        
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()
        
        if (error) {
            if (error.code === 'PGRST116') {
                const { data: newProfile, error: insertError } = await supabaseClient
                    .from('profiles')
                    .insert({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name || '' })
                    .select()
                    .single()
                if (!insertError) return { ...user, ...newProfile }
            }
            return { ...user, full_name: user.user_metadata?.full_name || '', phone: '' }
        }
        return { ...user, ...data }
    },
    

    async updateProfile(updates) {
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (!user) throw new Error('Не авторизован')
        
        const { error } = await supabaseClient
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
        
        if (error) throw error
    }
}


async function getCart() {
    const isAuth = await auth.isAuthenticated()
    let userId
    
    if (isAuth) {
        const user = await auth.getCurrentUser()
        userId = user.id
    } else {
        userId = getGuestUserId()
    }
    
    const { data, error } = await supabaseClient
        .from('carts')
        .select(`
            *,
            product:products(
                *,
                images:product_images(*)
            )
        `)
        .eq('user_id', userId)
    
    if (error) throw error
    return data || []
}

async function addToCart(productId, quantity = 1, price) {
    const isAuth = await auth.isAuthenticated()
    let userId
    
    if (isAuth) {
        const user = await auth.getCurrentUser()
        userId = user.id
    } else {
        userId = getGuestUserId()
    }
    
    const { data: existing } = await supabaseClient
        .from('carts')
        .select('id, quantity')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle()
    
    if (existing) {
        await supabaseClient
            .from('carts')
            .update({ quantity: existing.quantity + quantity, updated_at: new Date() })
            .eq('id', existing.id)
    } else {
        await supabaseClient
            .from('carts')
            .insert({ user_id: userId, product_id: productId, quantity, price_at_add: price })
    }
}

async function updateCartQuantity(productId, quantity) {
    const isAuth = await auth.isAuthenticated()
    let userId
    
    if (isAuth) {
        const user = await auth.getCurrentUser()
        userId = user.id
    } else {
        userId = getGuestUserId()
    }
    
    if (quantity <= 0) {
        await supabaseClient
            .from('carts')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId)
    } else {
        await supabaseClient
            .from('carts')
            .update({ quantity, updated_at: new Date() })
            .eq('user_id', userId)
            .eq('product_id', productId)
    }
}

async function clearCart() {
    const isAuth = await auth.isAuthenticated()
    let userId
    
    if (isAuth) {
        const user = await auth.getCurrentUser()
        userId = user.id
    } else {
        userId = getGuestUserId()
    }
    
    await supabaseClient
        .from('carts')
        .delete()
        .eq('user_id', userId)
}


async function getFavorites() {
    const isAuth = await auth.isAuthenticated()
    if (!isAuth) return []
    
    const user = await auth.getCurrentUser()
    const { data, error } = await supabaseClient
        .from('favorites')
        .select('product_id')
        .eq('user_id', user.id)
    
    if (error) throw error
    return data.map(f => f.product_id)
}

async function addToFavorite(productId) {
    const isAuth = await auth.isAuthenticated()
    if (!isAuth) throw new Error('Требуется авторизация')
    
    const user = await auth.getCurrentUser()
    const { error } = await supabaseClient
        .from('favorites')
        .insert({ user_id: user.id, product_id: productId })
    
    if (error && error.code !== '23505') throw error
}

async function removeFromFavorite(productId) {
    const isAuth = await auth.isAuthenticated()
    if (!isAuth) throw new Error('Требуется авторизация')
    
    const user = await auth.getCurrentUser()
    const { error } = await supabaseClient
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', productId)
    
    if (error) throw error
}


const api = {
    async getCategories() {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true })
        if (error) throw error
        return data
    },
    
    async getRootCategories() {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('*')
            .is('parent_id', null)
            .order('sort_order', { ascending: true })
        if (error) throw error
        return data
    },
    
    async getSubcategories(parentId) {
        const { data, error } = await supabaseClient
            .from('categories')
            .select('*')
            .eq('parent_id', parentId)
            .order('sort_order', { ascending: true })
        if (error) throw error
        return data
    },
    

    async getProducts(filters = {}) {
        let query = supabaseClient
            .from('products')
            .select(`
                *,
                manufacturer:manufacturers(id, name, slug, country),
                images:product_images(*)
            `)
        
        if (filters.category_id) {
            query = query.or(`category_id.eq.${filters.category_id},subcategory_id.eq.${filters.category_id}`)
        }
        if (filters.subcategory_id) {
            query = query.eq('subcategory_id', filters.subcategory_id)
        }
        if (filters.manufacturer_ids && filters.manufacturer_ids.length) {
            query = query.in('manufacturer_id', filters.manufacturer_ids)
        } else if (filters.manufacturer_id) {
            query = query.eq('manufacturer_id', filters.manufacturer_id)
        }
        if (filters.types && filters.types.length) {
            query = query.in('type', filters.types)
        }
        if (filters.search) {
            query = query.ilike('name', `%${filters.search}%`)
        }
        
        if (filters.sort === 'cheap') {
            query = query.order('price', { ascending: true })
        } else if (filters.sort === 'expensive') {
            query = query.order('price', { ascending: false })
        } else if (filters.sort === 'new') {
            query = query.order('created_at', { ascending: false })
        } else if (filters.sort === 'popular') {
            query = query.order('popularity', { ascending: false })
        } else {
            query = query.order('id', { ascending: true })
        }
        
        const { data, error } = await query
        if (error) throw error
        return data
    },
    
    async getProductById(id) {
        const { data, error } = await supabaseClient
            .from('products')
            .select(`
                *,
                manufacturer:manufacturers(*),
                images:product_images(*),
                specs:product_specs(*)
            `)
            .eq('id', id)
            .single()
        if (error) throw error
        return data
    },
    
    async getProductsByIds(ids) {
        if (!ids.length) return []
        const { data, error } = await supabaseClient
            .from('products')
            .select(`
                *,
                manufacturer:manufacturers(*),
                images:product_images(*)
            `)
            .in('id', ids)
        if (error) throw error
        return data
    },
    

    async getManufacturers() {
        const { data, error } = await supabaseClient
            .from('manufacturers')
            .select('*')
            .order('name')
        if (error) throw error
        return data
    },
    

    async getProductTypes() {
        const { data, error } = await supabaseClient
            .from('products')
            .select('type')
            .not('type', 'is', null)
        if (error) throw error
        const types = [...new Set(data.map(p => p.type).filter(t => t && t.trim()))]
        return types.sort()
    },
    

    getCart,
    addToCart,
    updateCartQuantity,
    clearCart,
    

    async searchByVin(vinCode) {
        const { data, error } = await supabaseClient
            .from('vin_compatibility')
            .select('product_id, car_brand, car_model')
            .eq('vin_code', vinCode.toUpperCase())
        if (error) throw error
        
        if (!data || !data.length) return []
        
        const productIds = data.map(item => item.product_id)
        const products = await this.getProductsByIds(productIds)
        
        return products.map(product => ({
            ...product,
            matched_car: data.find(d => d.product_id === product.id)
        }))
    },
    

    async getBlogPosts() {
        const { data, error } = await supabaseClient
            .from('blog_posts')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .limit(2)
        if (error) throw error
        return data || []
    },
    

    async getProductSpecs(productId) {
        const { data, error } = await supabaseClient
            .from('product_specs')
            .select('*')
            .eq('product_id', productId)
            .order('sort_order', { ascending: true })
        if (error) throw error
        return data || []
    },
    

    getFavorites,
    addToFavorite,
    removeFromFavorite,
    

    auth,
    

    getImageUrl,
    escapeHtml(str) {
        if (!str) return ''
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;'
            if (m === '<') return '&lt;'
            if (m === '>') return '&gt;'
            return m
        })
    }
}

window.api = api
console.log('API готов, аутентификация подключена')
