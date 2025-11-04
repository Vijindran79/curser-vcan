// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { State, setState, type EcomProduct } from './state';
import { switchPage, showToast } from "./ui";
import { t } from './i18n';
import { getEcommercePlatformLogo } from './utils';

const ECOM_STORAGE_KEY = 'vcanship_ecom_products';
const MOCK_PLATFORMS = ['Amazon', 'eBay', 'Shopify', 'Walmart', 'Etsy', 'Instagram', 'Facebook Marketplace', 'Google Shopping', 'TikTok Shop', 'Alibaba'];

let productImageBase64: string | null = null;
let specCounter = 0;

// --- DATA PERSISTENCE ---
function loadProductsFromStorage() {
    const storedProducts = localStorage.getItem(ECOM_STORAGE_KEY);
    if (storedProducts) {
        setState({ ecomProducts: JSON.parse(storedProducts) });
    } else {
        // If nothing is stored, initialize with an empty array.
        setState({ ecomProducts: [] });
    }
}

function saveProductsToStorage() {
    localStorage.setItem(ECOM_STORAGE_KEY, JSON.stringify(State.ecomProducts));
}

// --- VIEW ROUTING & RENDERING ---
function switchEcomView(view: 'dashboard' | 'form' | 'detail', productId: number | null = null) {
    setState({ ecomCurrentView: view, ecomViewingProductId: productId });
    renderCurrentEcomView();
}

function renderCurrentEcomView() {
    switch (State.ecomCurrentView) {
        case 'dashboard':
            renderDashboardView();
            break;
        case 'form':
            renderFormView();
            break;
        case 'detail':
            if (State.ecomViewingProductId !== null) {
                renderDetailView(State.ecomViewingProductId);
            }
            break;
    }
}

// --- CORE VIEWS ---
function renderDashboardView() {
    const container = document.getElementById('ecom-content-container');
    if (!container) return;
    
    container.innerHTML = `
        <div id="ecom-dashboard-view">
            <div class="ecom-view-header">
                <h2>${t('ecommerce.admin_dashboard')}</h2>
                <button id="ecom-add-new-product-btn" class="main-submit-btn">
                    <i class="fa-solid fa-plus"></i> ${t('ecommerce.add_new_product')}
                </button>
            </div>
            <div id="ecom-product-list-container"></div>
        </div>
    `;
    renderProductGrid();
}

function renderFormView(productToEdit?: EcomProduct) {
    const container = document.getElementById('ecom-content-container');
    if (!container) return;

    setState({ ecomEditingProductId: productToEdit?.id ?? null });

    container.innerHTML = `
        <div id="ecom-form-view">
            <button class="back-btn" id="ecom-back-to-dashboard-btn"><i class="fa-solid fa-arrow-left"></i> ${t('ecommerce.back_to_dashboard')}</button>
            <div class="ecom-wizard-layout">
                <div class="ecom-wizard-form-panel card">
                     <h3 id="ecom-form-title">${productToEdit ? t('ecommerce.edit_product') : t('ecommerce.add_new_product')}</h3>
                     <form id="ecom-product-form" novalidate>
                        <div class="form-section">
                            <h4>${t('ecommerce.core_details')}</h4>
                            <div class="input-wrapper"><label for="ecom-product-name">${t('ecommerce.product_name')}</label><input type="text" id="ecom-product-name" required></div>
                            <div class="input-wrapper"><label for="ecom-product-description">${t('ecommerce.description')}</label><textarea id="ecom-product-description" rows="4"></textarea></div>
                        </div>
                        <div class="form-section">
                           <h4>${t('ecommerce.image')}</h4>
                           <div id="ecom-image-drop-zone" class="image-drop-zone"><div id="ecom-image-drop-zone-idle"><i class="fa-solid fa-cloud-arrow-up"></i><p><strong>${t('ecommerce.click_to_upload')}</strong> ${t('ecommerce.or_drag_drop')}</p></div><img id="ecom-image-preview" class="hidden"></div>
                           <input type="file" id="ecom-image-input" accept="image/png, image/jpeg, image/webp" class="hidden">
                           <button type="button" id="ecom-remove-image-btn" class="link-btn hidden" style="margin-top: 0.5rem;">${t('ecommerce.remove_image')}</button>
                       </div>
                       <div class="form-section">
                            <h4>${t('ecommerce.pricing_stock')}</h4>
                             <div class="two-column" style="gap: 1.5rem;">
                                <div class="input-wrapper"><label for="ecom-product-price">${t('ecommerce.price')} (${State.currentCurrency.code})</label><input type="number" id="ecom-product-price" min="0" step="0.01" required></div>
                                <div class="input-wrapper"><label for="ecom-product-stock">${t('ecommerce.stock_quantity')}</label><input type="number" id="ecom-product-stock" min="0" required></div>
                            </div>
                        </div>
                        <div class="form-actions" style="margin-top: 2rem;">
                            <button type="submit" class="main-submit-btn">${t('ecommerce.save_product')}</button>
                        </div>
                    </form>
                </div>
                <div class="ecom-wizard-preview-panel">
                    <h3>${t('ecommerce.live_preview')}</h3>
                    <div id="ecom-live-preview-container"></div>
                </div>
            </div>
        </div>
    `;

    specCounter = 0;
    productImageBase64 = null;

    if (productToEdit) {
        (document.getElementById('ecom-product-name') as HTMLInputElement).value = productToEdit.name;
        (document.getElementById('ecom-product-description') as HTMLTextAreaElement).value = productToEdit.description;
        (document.getElementById('ecom-product-price') as HTMLInputElement).value = String(productToEdit.price);
        (document.getElementById('ecom-product-stock') as HTMLInputElement).value = String(productToEdit.stock);
        if (productToEdit.imageUrl) {
            productImageBase64 = productToEdit.imageUrl;
            updateImageView(productImageBase64);
        }
    }
    
    updateWizardPreview();
    attachFormListeners();
}

function renderDetailView(productId: number) {
    const container = document.getElementById('ecom-content-container');
    const product = State.ecomProducts.find(p => p.id === productId);
    if (!container || !product) {
        showToast(t('ecommerce.product_not_found'), 'error');
        switchEcomView('dashboard');
        return;
    }

    const imageContent = product.imageUrl 
        ? `<img src="${product.imageUrl}" alt="${product.name}" class="ecom-product-detail-image">`
        : `<div class="ecom-product-detail-image-placeholder"><i class="fa-solid fa-image"></i></div>`;

    container.innerHTML = `
        <div id="ecom-detail-view">
             <button class="back-btn" id="ecom-back-to-dashboard-btn"><i class="fa-solid fa-arrow-left"></i> ${t('ecommerce.back_to_dashboard')}</button>
             <div class="ecom-product-detail-layout">
                ${imageContent}
                <div class="ecom-product-detail-info">
                    <p class="ecom-product-category">${product.category}</p>
                    <h2 id="detail-product-name">${product.name}</h2>
                    <p class="ecom-product-detail-price" id="detail-product-price">${State.currentCurrency.symbol}${product.price.toFixed(2)}</p>
                    <p class="ecom-product-detail-stock"><strong>${product.stock}</strong> ${t('ecommerce.units_in_stock')}</p>
                    <p class="ecom-product-detail-description" id="detail-product-desc">${product.description}</p>
                    
                    <div class="ecom-mock-actions">
                         <button class="secondary-btn" id="mock-translate-btn">${t('ecommerce.translate')}</button>
                         <button class="secondary-btn" id="mock-currency-btn">${t('ecommerce.convert_currency')}</button>
                    </div>
                </div>
             </div>
        </div>
    `;
}


// --- COMPONENTS & HELPERS ---
function renderProductGrid() {
    const container = document.getElementById('ecom-product-list-container');
    if (!container) return;

    if (State.ecomProducts.length > 0) {
        container.innerHTML = `<div id="ecom-products-grid">${State.ecomProducts.map(createProductCard).join('')}</div>`;
    } else {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 3rem;">
                <h3>${t('ecommerce.no_products')}</h3>
                <p>${t('ecommerce.start_advertising')}</p>
                <button id="ecom-add-new-from-empty-btn" class="main-submit-btn" style="margin-top: 1rem;">${t('ecommerce.add_first_product')}</button>
            </div>`;
    }
}

function createProductCard(product: EcomProduct): string {
    const imageContent = product.imageUrl 
        ? `<img src="${product.imageUrl}" alt="${product.name}" class="ecom-product-image">`
        : `<div class="ecom-product-image-placeholder"><i class="fa-solid fa-image"></i></div>`;

    const renderSyndicationStatus = (p: EcomProduct) => {
        const statuses = p.syndicationStatus ? Object.values(p.syndicationStatus) : [];
        const liveCount = statuses.filter(s => s === 'live').length;
        const totalCount = MOCK_PLATFORMS.length;
        
        // Get platform logo or fallback icon
        const getPlatformIcon = (platform: string) => {
            const logoUrl = getEcommercePlatformLogo(platform);
            
            if (logoUrl) {
                return `<img src="${logoUrl}" alt="${platform}" class="platform-logo" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fa-solid fa-store\\'></i>';">`;
            }
            
            // Fallback to Font Awesome icon if logo not found
            const iconMap: { [key: string]: string } = {
                'Amazon': '<i class="fa-brands fa-amazon"></i>',
                'eBay': '<i class="fa-brands fa-ebay"></i>',
                'Shopify': '<i class="fa-brands fa-shopify"></i>',
                'Walmart': '<i class="fa-solid fa-store"></i>',
                'Etsy': '<i class="fa-brands fa-etsy"></i>',
                'Instagram': '<i class="fa-brands fa-instagram"></i>',
                'Facebook Marketplace': '<i class="fa-brands fa-facebook"></i>',
                'Google Shopping': '<i class="fa-brands fa-google"></i>',
                'TikTok Shop': '<i class="fa-brands fa-tiktok"></i>',
                'Alibaba': '<i class="fa-solid fa-store"></i>'
            };
            return iconMap[platform] || '<i class="fa-solid fa-store"></i>';
        };
        
        return `
            <div class="ecom-syndication-status">
                <h5>${t('ecommerce.syndication_status')} (${liveCount}/${totalCount} ${t('ecommerce.live')})</h5>
                <div class="ecom-platform-list">
                ${MOCK_PLATFORMS.map(platform => {
                    const platformIcon = getPlatformIcon(platform);
                    return `
                        <div class="ecom-platform-status">
                            <span class="status-dot ${p.syndicationStatus?.[platform] || 'pending'}"></span>
                            <span class="platform-icon">${platformIcon}</span>
                            <span>${platform}</span>
                        </div>
                    `;
                }).join('')}
                </div>
            </div>`;
    };
    
    return `
        <div class="ecom-product-card" data-product-id="${product.id}">
            <div class="ecom-product-card-image-wrapper" data-action="view-detail">
                ${imageContent}
            </div>
            <div class="ecom-product-card-body">
                <h4 class="ecom-product-title" data-action="view-detail">${product.name || t('ecommerce.untitled_product')}</h4>
                ${renderSyndicationStatus(product)}
                <div class="ecom-product-card-footer">
                    <div class="ecom-stock-controls">
                        <button class="secondary-btn" data-action="decrease-stock">-</button>
                        <input type="number" value="${product.stock}" class="ecom-stock-input" min="0">
                        <button class="secondary-btn" data-action="increase-stock">+</button>
                    </div>
                    <div class="ecom-product-actions">
                        <button class="secondary-btn" data-action="edit-product">${t('ecommerce.edit')}</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateWizardPreview() {
    const livePreviewContainer = document.getElementById('ecom-live-preview-container');
    if (!livePreviewContainer) return;

    const data = getWizardData();
    const productForPreview: EcomProduct = { ...data, id: 0, status: 'Draft', syndicationStatus: {} };
    livePreviewContainer.innerHTML = createProductCard(productForPreview);
}

// --- CORE LOGIC ---
function handleFormSubmit(e: Event) {
    e.preventDefault();
    const productData = getWizardData();
    const isEditing = State.ecomEditingProductId !== null;

    if (!productData.name || productData.price <= 0) {
        showToast(t('ecommerce.product_name_price_required'), 'error');
        return;
    }

    let product: EcomProduct;
    if (isEditing) {
        const existingProduct = State.ecomProducts.find(p => p.id === State.ecomEditingProductId)!;
        product = { ...existingProduct, ...productData };
        setState({ ecomProducts: State.ecomProducts.map(p => p.id === product.id ? product : p) });
    } else {
        const syndicationStatus = MOCK_PLATFORMS.reduce((acc, platform) => ({ ...acc, [platform]: 'pending' }), {});
        product = { ...productData, id: Date.now(), status: 'Live', syndicationStatus };
        setState({ ecomProducts: [...State.ecomProducts, product] });
        simulateSyndication(product.id);
    }
    
    saveProductsToStorage();
    showToast(isEditing ? t('ecommerce.product_updated') : t('ecommerce.product_added'), 'success');
    switchEcomView('dashboard');
}

function simulateSyndication(productId: number) {
    const productIndex = State.ecomProducts.findIndex(p => p.id === productId);
    if (productIndex === -1) return;

    MOCK_PLATFORMS.forEach(platform => {
        setTimeout(() => {
            const currentProducts = [...State.ecomProducts];
            currentProducts[productIndex].syndicationStatus[platform] = 'syndicating';
            setState({ ecomProducts: currentProducts });
            saveProductsToStorage();
            if (State.ecomCurrentView === 'dashboard') renderProductGrid();
        }, Math.random() * 2000 + 500);

        setTimeout(() => {
            const currentProducts = [...State.ecomProducts];
            currentProducts[productIndex].syndicationStatus[platform] = Math.random() > 0.1 ? 'live' : 'failed';
            setState({ ecomProducts: currentProducts });
            saveProductsToStorage();
            if (State.ecomCurrentView === 'dashboard') renderProductGrid();
        }, Math.random() * 4000 + 2000);
    });
}

function handleStockUpdate(productId: number, change: number | 'input', value?: number) {
    const products = [...State.ecomProducts];
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) return;
    
    if (change === 'input') {
        products[productIndex].stock = value !== undefined ? Math.max(0, value) : 0;
    } else {
        products[productIndex].stock = Math.max(0, products[productIndex].stock + change);
    }

    setState({ ecomProducts: products });
    saveProductsToStorage();
    
    // Visually update only the changed input to avoid full re-render
    const input = document.querySelector(`.ecom-product-card[data-product-id="${productId}"] .ecom-stock-input`) as HTMLInputElement;
    if (input) input.value = String(products[productIndex].stock);
}


// --- EVENT LISTENERS ---
function attachFormListeners() {
    document.getElementById('ecom-product-form')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('ecom-product-form')?.addEventListener('input', updateWizardPreview);
    
    const imageInput = document.getElementById('ecom-image-input') as HTMLInputElement;
    const dropZone = document.getElementById('ecom-image-drop-zone');
    const removeBtn = document.getElementById('ecom-remove-image-btn');
    
    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) { showToast(t('ecommerce.invalid_file_type'), 'error'); return; }
        const reader = new FileReader();
        reader.onloadend = () => {
            productImageBase64 = reader.result as string;
            updateImageView(productImageBase64);
            updateWizardPreview();
        };
        reader.readAsDataURL(file);
    };

    imageInput?.addEventListener('change', () => imageInput.files?.[0] && handleFile(imageInput.files[0]));
    dropZone?.addEventListener('click', () => imageInput.click());
    dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone?.addEventListener('drop', e => { e.preventDefault(); e.dataTransfer?.files?.[0] && handleFile(e.dataTransfer.files[0]); });
    removeBtn?.addEventListener('click', () => { productImageBase64 = null; imageInput.value = ''; updateImageView(null); updateWizardPreview(); });
}

function attachMainListeners() {
    const page = document.getElementById('page-ecommerce');
    if (!page) return;

    page.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.dataset.action || target.parentElement?.dataset.action || target.id;
        const card = target.closest<HTMLElement>('.ecom-product-card');
        const productId = card ? parseInt(card.dataset.productId || '0', 10) : 0;
        
        switch (action) {
            case 'ecom-add-new-product-btn':
            case 'ecom-add-new-from-empty-btn':
                switchEcomView('form');
                break;
            case 'ecom-back-to-dashboard-btn':
                switchEcomView('dashboard');
                break;
            case 'edit-product':
                const productToEdit = State.ecomProducts.find(p => p.id === productId);
                if (productToEdit) renderFormView(productToEdit);
                break;
            case 'view-detail':
                switchEcomView('detail', productId);
                break;
            case 'increase-stock':
                handleStockUpdate(productId, 1);
                break;
            case 'decrease-stock':
                handleStockUpdate(productId, -1);
                break;
            case 'mock-translate-btn':
                (document.getElementById('detail-product-name') as HTMLElement).textContent = "Nombre del Producto (Traducido)";
                (document.getElementById('detail-product-desc') as HTMLElement).textContent = "Esta es una descripción del producto simulada y traducida para demostrar la funcionalidad de localización.";
                showToast(t('ecommerce.content_translated'), 'info');
                break;
            case 'mock-currency-btn':
                const product = State.ecomProducts.find(p => p.id === State.ecomViewingProductId);
                if(product) {
                    const priceInEur = product.price * 0.93; // Mock conversion rate
                    (document.getElementById('detail-product-price') as HTMLElement).textContent = `€${priceInEur.toFixed(2)}`;
                    showToast(t('ecommerce.price_converted'), 'info');
                }
                break;
        }
    });

    page.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.classList.contains('ecom-stock-input')) {
            const card = target.closest<HTMLElement>('.ecom-product-card');
            const productId = card ? parseInt(card.dataset.productId || '0', 10) : 0;
            handleStockUpdate(productId, 'input', parseInt(target.value, 10));
        }
    });
}

function renderEcomPageShell() {
    const page = document.getElementById('page-ecommerce');
    if (!page) return;
    page.innerHTML = `
        <div class="ecom-page-container">
            <button class="back-btn" id="ecom-back-to-main-dashboard">${t('ecommerce.back_to_main_dashboard')}</button>
            
            <div class="service-page-header">
                <h2>${t('ecommerce.title')}</h2>
                <p class="subtitle">${t('ecommerce.subtitle')}</p>
            </div>
            
            <!-- Pro Subscription Banner -->
            ${State.subscriptionTier !== 'pro' ? `
            <div class="pro-subscription-banner" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 24px; margin: 20px 0; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 24px;">🚀</span>
                        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Supercharge Your E-Commerce with Real-Time Shipping Rates</h3>
                    </div>
                    <p style="margin: 0; opacity: 0.95; font-size: 14px;">Upgrade to Pro for $9.99/month and get unlimited real-time shipping quotes to automate your fulfillment!</p>
                </div>
                <button onclick="switchPage('subscription')" style="background: white; color: #667eea; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap; font-size: 14px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    Upgrade Now →
                </button>
            </div>
            ` : ''}
            
            <!-- Marketplace Integrations -->
            <div style="background: #f8f9fa; padding: 16px; margin: 20px 0; border-radius: 8px; text-align: center;">
                <p style="margin: 0 0 12px 0; font-size: 13px; color: #666; font-weight: 500;">CONNECT YOUR MARKETPLACES</p>
                <div style="display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap;">
                    <div style="text-align: center;">
                        <div style="width: 70px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <span style="font-weight: 700; color: #FF9900; font-size: 18px;">Amazon</span>
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="width: 70px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <span style="font-weight: 700; color: #E53238; font-size: 18px;">eBay</span>
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="width: 70px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <span style="font-weight: 700; color: #96bf48; font-size: 16px;">Shopify</span>
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="width: 70px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <span style="font-weight: 700; color: #0071CE; font-size: 14px;">Walmart</span>
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="width: 70px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <span style="font-weight: 700; color: #F56400; font-size: 18px;">Etsy</span>
                        </div>
                    </div>
                    <div style="text-align: center;">
                        <div style="width: 70px; height: 50px; display: flex; align-items: center; justify-content: center; background: white; border-radius: 6px; padding: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
                            <span style="font-weight: 700; color: #FF0050; font-size: 14px;">TikTok Shop</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="ecom-content-container"></div>
        </div>
    `;
    document.getElementById('ecom-back-to-main-dashboard')?.addEventListener('click', () => switchPage('dashboard'));
}


// --- HELPERS ---
function getWizardData() {
    return {
        name: (document.getElementById('ecom-product-name') as HTMLInputElement).value,
        description: (document.getElementById('ecom-product-description') as HTMLTextAreaElement).value,
        price: parseFloat((document.getElementById('ecom-product-price') as HTMLInputElement).value) || 0,
        stock: parseInt((document.getElementById('ecom-product-stock') as HTMLInputElement).value, 10) || 0,
        imageUrl: productImageBase64 || '',
        // These fields are not in the simplified form but are part of the state
        category: 'Demo Category',
        brand: 'Demo Brand',
        specifications: [],
        productType: 'physical' as 'physical',
    };
}

function updateImageView(imageBase64: string | null) {
    const preview = document.getElementById('ecom-image-preview') as HTMLImageElement;
    const idleView = document.getElementById('ecom-image-drop-zone-idle');
    const removeBtn = document.getElementById('ecom-remove-image-btn');
    if (!preview || !idleView || !removeBtn) return;
    if (imageBase64) {
        preview.src = imageBase64;
        preview.classList.remove('hidden');
        idleView.classList.add('hidden');
        removeBtn.classList.remove('hidden');
    } else {
        preview.src = '';
        preview.classList.add('hidden');
        idleView.classList.remove('hidden');
        removeBtn.classList.add('hidden');
    }
}

// --- INITIALIZATION ---
export function startEcom() {
    setState({ currentService: 'ecommerce' });
    switchPage('ecommerce');
    loadProductsFromStorage();
    renderEcomPageShell();
    attachMainListeners();
    
    // Handle initial view based on entry point
    const initialView = State.ecomInitialView;
    if (initialView === 'add-product') {
        switchEcomView('form');
    } else {
        switchEcomView('dashboard');
    }
    setState({ ecomInitialView: null }); // Reset for next time
}