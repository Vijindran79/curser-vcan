// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { DOMElements } from './dom';
import { State } from './state';
import { showToast } from './ui';
import { t } from './i18n';

// Saved addresses - now integrated with Firestore
export interface SavedAddress {
    id: string;
    label: string;
    name: string;
    company?: string;
    street: string;
    city: string;
    postcode: string;
    country: string;
    phone?: string;
    email?: string;
    isDefault: boolean;
    userId: string;
    createdAt: string;
}

let addressBookCache: SavedAddress[] = [];

// --- ADDRESS BOOK ---

// Load saved addresses from Firestore
export async function loadSavedAddresses(): Promise<SavedAddress[]> {
    if (!State.currentUser) return [];
    
    try {
        const firebase = (window as any).firebase;
        if (!firebase) return [];
        
        const db = firebase.firestore();
        const snapshot = await db.collection('savedAddresses')
            .where('userId', '==', State.currentUser.uid)
            .orderBy('isDefault', 'desc')
            .orderBy('createdAt', 'desc')
            .get();
        
        addressBookCache = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        })) as SavedAddress[];
        
        return addressBookCache;
    } catch (error) {
        console.error('Error loading addresses:', error);
        return [];
    }
}

// Save address to Firestore
export async function saveAddress(address: Partial<SavedAddress>): Promise<boolean> {
    if (!State.currentUser) {
        showToast('Please log in to save addresses', 'error');
        return false;
    }
    
    try {
        const firebase = (window as any).firebase;
        if (!firebase) return false;
        
        const db = firebase.firestore();
        const addressData = {
            ...address,
            userId: State.currentUser.uid,
            createdAt: address.createdAt || new Date().toISOString(),
        };
        
        if (address.id) {
            // Update existing
            await db.collection('savedAddresses').doc(address.id).update(addressData);
        } else {
            // Create new
            await db.collection('savedAddresses').add(addressData);
        }
        
        return true;
    } catch (error) {
        console.error('Error saving address:', error);
        return false;
    }
}

// Delete address from Firestore
export async function deleteAddress(addressId: string): Promise<boolean> {
    try {
        const firebase = (window as any).firebase;
        if (!firebase) return false;
        
        const db = firebase.firestore();
        await db.collection('savedAddresses').doc(addressId).delete();
        return true;
    } catch (error) {
        console.error('Error deleting address:', error);
        return false;
    }
}

export async function renderAddressBook() {
    const page = DOMElements.pageAddressBook;
    if (!page) return;
    
    // Show loading state
    page.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 2rem; color: #F97316;"></i></div>';
    
    // Load addresses from Firestore
    const addresses = await loadSavedAddresses();

    const addressesHtml = addresses.length > 0
        ? addresses.map(addr => `
            <div class="address-card">
                <div class="address-card-header">
                    <h4>${addr.label} ${addr.isDefault ? `<span class="default-badge">${t('account.address_book.default_badge')}</span>` : ''}</h4>
                    <div class="address-card-actions">
                        <button class="secondary-btn edit-address-btn" data-id="${addr.id}">${t('account.address_book.edit')}</button>
                        <button class="secondary-btn delete-address-btn" data-id="${addr.id}">${t('account.address_book.delete')}</button>
                    </div>
                </div>
                <div class="address-card-body">
                    <p>${addr.name}</p>
                    <p>${addr.street}, ${addr.city}, ${addr.postcode}</p>
                    <p>${addr.country}</p>
                </div>
            </div>
        `).join('')
        : `
        <div class="address-empty-state-card">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="empty-state-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            <h3>${t('account.address_book.empty_state_title')}</h3>
            <p>${t('account.address_book.empty_state_desc')}</p>
            <button id="add-address-from-empty-btn" class="main-submit-btn">${t('account.address_book.empty_state_cta')}</button>
        </div>
        `;

    page.innerHTML = `
        <div class="service-page-header">
            <h2 data-i18n="account.address_book.title">Address Book</h2>
            <p class="subtitle" data-i18n="account.address_book.subtitle">Manage your saved addresses for faster bookings.</p>
        </div>
        <div class="account-grid">
            <div class="address-list">
                ${addressesHtml}
            </div>
            <div class="form-container">
                <h3 id="address-form-title">${t('account.address_book.form_title_add')}</h3>
                <form id="address-form">
                    <input type="hidden" id="address-id">
                    <div class="input-wrapper">
                        <label for="address-label">Label *</label>
                        <input type="text" id="address-label" placeholder="e.g., Home, Office, Warehouse" required>
                    </div>
                    <div class="input-wrapper">
                        <label for="address-name">Contact Name *</label>
                        <input type="text" id="address-name" required>
                    </div>
                    <div class="input-wrapper">
                        <label for="address-company">Company</label>
                        <input type="text" id="address-company" placeholder="Optional">
                    </div>
                    <div class="input-wrapper">
                        <label for="address-street">Street Address *</label>
                        <input type="text" id="address-street" required>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                        <div class="input-wrapper">
                            <label for="address-city">City *</label>
                            <input type="text" id="address-city" required>
                        </div>
                        <div class="input-wrapper">
                            <label for="address-postcode">Postcode *</label>
                            <input type="text" id="address-postcode" required>
                        </div>
                    </div>
                    <div class="input-wrapper">
                        <label for="address-country">Country *</label>
                        <input type="text" id="address-country" required>
                    </div>
                    <div class="input-wrapper">
                        <label for="address-phone">Phone</label>
                        <input type="tel" id="address-phone" placeholder="Optional">
                    </div>
                    <div class="form-actions">
                        <button type="button" id="cancel-edit-btn" class="secondary-btn hidden">${t('account.address_book.cancel')}</button>
                        <button type="submit" class="main-submit-btn">${t('account.address_book.save')}</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    attachAddressBookListeners();
}

async function handleAddressFormSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const id = (form.querySelector('#address-id') as HTMLInputElement).value;
    
    const addressData: Partial<SavedAddress> = {
        id: id || undefined,
        label: (form.querySelector('#address-label') as HTMLInputElement).value,
        name: (form.querySelector('#address-name') as HTMLInputElement).value,
        street: (form.querySelector('#address-street') as HTMLInputElement).value,
        city: (form.querySelector('#address-city') as HTMLInputElement).value,
        postcode: (form.querySelector('#address-postcode') as HTMLInputElement).value || '',
        country: (form.querySelector('#address-country') as HTMLInputElement).value,
        phone: (form.querySelector('#address-phone') as HTMLInputElement)?.value || '',
        company: (form.querySelector('#address-company') as HTMLInputElement)?.value || '',
        isDefault: id ? addressBookCache.find(a => a.id === id)!.isDefault : false,
        userId: State.currentUser?.uid || State.currentUser?.email || '',
        createdAt: id ? addressBookCache.find(a => a.id === id)!.createdAt : new Date().toISOString(),
    };

    const success = await saveAddress(addressData);
    
    if (success) {
        showToast(id ? t('toast.address_updated') : t('toast.address_added'), 'success');
        renderAddressBook(); // Re-render the whole page
    } else {
        showToast('Failed to save address. Please try again.', 'error');
    }
}

function handleEditAddress(id: string) {
    const address = addressBookCache.find(addr => addr.id === id);
    if (!address) return;

    const form = document.getElementById('address-form') as HTMLFormElement;
    (form.querySelector('#address-id') as HTMLInputElement).value = id;
    (form.querySelector('#address-label') as HTMLInputElement).value = address.label;
    (form.querySelector('#address-name') as HTMLInputElement).value = address.name;
    (form.querySelector('#address-street') as HTMLInputElement).value = address.street;
    (form.querySelector('#address-city') as HTMLInputElement).value = address.city;
    (form.querySelector('#address-postcode') as HTMLInputElement).value = address.postcode;
    (form.querySelector('#address-country') as HTMLInputElement).value = address.country;
    if (form.querySelector('#address-phone')) {
        (form.querySelector('#address-phone') as HTMLInputElement).value = address.phone || '';
    }
    if (form.querySelector('#address-company')) {
        (form.querySelector('#address-company') as HTMLInputElement).value = address.company || '';
    }
    
    (document.getElementById('address-form-title') as HTMLElement).textContent = t('account.address_book.form_title_edit');
    (document.getElementById('cancel-edit-btn') as HTMLElement).classList.remove('hidden');
    form.scrollIntoView({ behavior: 'smooth' });
}

async function handleDeleteAddress(id: string) {
    if (confirm(t('confirm.delete_address'))) {
        const success = await deleteAddress(id);
        if (success) {
            showToast(t('toast.address_deleted'), 'success');
            renderAddressBook();
        } else {
            showToast('Failed to delete address. Please try again.', 'error');
        }
    }
}

function cancelEdit() {
    (document.getElementById('address-form') as HTMLFormElement).reset();
    (document.getElementById('address-id') as HTMLInputElement).value = '';
    (document.getElementById('address-form-title') as HTMLElement).textContent = t('account.address_book.form_title_add');
    (document.getElementById('cancel-edit-btn') as HTMLElement).classList.add('hidden');
}


function attachAddressBookListeners() {
    document.getElementById('address-form')?.addEventListener('submit', handleAddressFormSubmit);
    document.querySelectorAll('.edit-address-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleEditAddress((e.currentTarget as HTMLElement).dataset.id!));
    });
    document.querySelectorAll('.delete-address-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleDeleteAddress((e.currentTarget as HTMLElement).dataset.id!));
    });
    document.getElementById('cancel-edit-btn')?.addEventListener('click', cancelEdit);
    document.getElementById('add-address-from-empty-btn')?.addEventListener('click', () => {
        const form = document.getElementById('address-form');
        const firstInput = document.getElementById('address-label');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth' });
            firstInput?.focus();
        }
    });
}


// --- ACCOUNT SETTINGS ---

export function renderAccountSettings() {
    const page = DOMElements.pageSettings;
    if (!page || !State.currentUser) return;
    
    page.innerHTML = `
         <div class="service-page-header">
            <h2 data-i18n="account.settings.title">Account Settings</h2>
            <p class="subtitle" data-i18n="account.settings.subtitle">Manage your profile and communication preferences.</p>
        </div>
        <div class="form-container">
            <form id="settings-form">
                <div class="form-section">
                    <h3 data-i18n="account.settings.profile_title">Profile Information</h3>
                    <div class="input-wrapper">
                        <label for="settings-name" data-i18n="account.settings.name_label">Full Name</label>
                        <input type="text" id="settings-name" value="${State.currentUser.name}" required>
                    </div>
                     <div class="input-wrapper">
                        <label for="settings-email" data-i18n="account.settings.email_label">Email Address</label>
                        <input type="email" id="settings-email" value="${State.currentUser.email}" required>
                    </div>
                </div>
                 <div class="form-section">
                    <h3 data-i18n="account.settings.password_title">Change Password</h3>
                    <div class="input-wrapper"><label for="current-password" data-i18n="account.settings.current_password_label">Current Password</label><input type="password" id="current-password"></div>
                    <div class="input-wrapper"><label for="new-password" data-i18n="account.settings.new_password_label">New Password</label><input type="password" id="new-password"></div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="main-submit-btn" data-i18n="account.settings.save">Save Changes</button>
                </div>
            </form>
        </div>
    `;

    document.getElementById('settings-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast(t('toast.settings_saved'), 'success');
    });
}


// --- INITIALIZATION ---

export function initializeAccountPages() {
    const pageObservers = [
        { el: DOMElements.pageAddressBook, renderFn: renderAddressBook },
        { el: DOMElements.pageSettings, renderFn: renderAccountSettings }
    ];

    pageObservers.forEach(({ el, renderFn }) => {
        if (el) {
            const observer = new MutationObserver((mutations) => {
                if (mutations.some(m => m.attributeName === 'class' && (m.target as HTMLElement).classList.contains('active'))) {
                    if (State.isLoggedIn) {
                        renderFn();
                    } else {
                        el.innerHTML = `<div class="form-container"><p>${t('errors.login_required')}</p></div>`;
                    }
                }
            });
            observer.observe(el, { attributes: true });
        }
    });
}
