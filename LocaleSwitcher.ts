// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
// --- INTERFACES & TYPES ---
import { showToast } from './ui';
import { setState } from './state';
import { t } from './i18n';

interface Locale {
  countryCode: string;
  countryName: string;
  currency: {
    code: string;
    symbol: string;
  };
}

interface Language {
    code: string;
    name: string;
}

// --- MODULE STATE ---
let locales: Locale[] = [];
let languages: Language[] = [];
let filteredLocales: Locale[] = [];

// Major currencies list (independent of country)
const MAJOR_CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' }
];

// Main state for the app
let selectedCountry: Locale | null = null;
let selectedLanguage: string | null = null;
let selectedCurrency: { code: string; symbol: string } | null = null;

// Temporary state for selections within the modal
let modalSelectedCountry: Locale | null = null;
let modalSelectedLanguage: string | null = null;
let modalSelectedCurrency: { code: string; symbol: string } | null = null;

let isModalOpen = false;

// --- DOM ELEMENT REFERENCES ---
const elements = {
    get modal() { return document.getElementById('locale-modal'); },
    get closeBtn() { return document.getElementById('close-locale-modal-btn') as HTMLButtonElement; },
    get cancelBtn() { return document.getElementById('cancel-locale-modal-btn') as HTMLButtonElement; },
    get confirmBtn() { return document.getElementById('confirm-locale-btn') as HTMLButtonElement; },
    get searchInput() { return document.getElementById('locale-search-input') as HTMLInputElement; },
    get countryList() { return document.getElementById('locale-modal-list') as HTMLUListElement; },
    get previewPanel() { return document.getElementById('locale-selection-preview'); },
    // Mobile button in menu
    get regionBtn() { return document.getElementById('settings-language-btn'); },
    // Desktop button in header
    get headerBtn() { return document.getElementById('header-locale-btn'); },
    get headerFlag() { return document.getElementById('header-locale-flag'); },
    get headerLanguage() { return document.getElementById('header-locale-language'); },
    get headerCountry() { return document.getElementById('header-locale-country'); },
    get headerInfo() { return document.getElementById('header-locale-info'); }
};

// --- UTILITIES ---

// FIX: Export 'countryCodeToFlag' to allow other modules to use it.
export function countryCodeToFlag(isoCode: string): string {
  if (!isoCode || isoCode.length !== 2 || !/^[A-Z]{2}$/.test(isoCode.toUpperCase())) {
    return '🏳️';
  }
  const base = 127397;
  return String.fromCodePoint(
    ...isoCode.toUpperCase().split('').map(char => base + char.charCodeAt(0))
  );
}

const debounce = <T extends (...args: any[]) => void>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
    let timeout: number | undefined;
    return function(this: ThisParameterType<T>, ...args: Parameters<T>) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), wait);
    };
};

// --- CORE LOGIC & EVENT DISPATCHING ---

function dispatchLocaleChangeEvent() {
  if (!selectedCountry || !selectedLanguage || !selectedCurrency) return;
  
  // Update global state
  setState({ currentCurrency: selectedCurrency });

  const event = new CustomEvent('locale-change', {
    detail: {
      country: selectedCountry.countryCode,
      language: selectedLanguage,
      currency: selectedCurrency,
    },
  });
  window.dispatchEvent(event);
}

export function setLocaleByCountryName(countryName: string) {
    if (!locales.length) return;
    let searchTerm = countryName.toLowerCase().trim();
    const abbreviations: { [key: string]: string } = { 'uk': 'united kingdom', 'usa': 'united states', 'uae': 'united arab emirates', 'us': 'united states', 'gb': 'united kingdom' };
    if (abbreviations[searchTerm]) searchTerm = abbreviations[searchTerm];
    
    const country = locales.find(l => l.countryName.toLowerCase() === searchTerm || l.countryCode.toLowerCase() === searchTerm);

    if (country && country.countryCode !== selectedCountry?.countryCode) {
        selectedCountry = country;
        // Preserve existing currency or use country default
        if (!selectedCurrency) {
            selectedCurrency = country.currency;
        }
        if (!selectedLanguage) {
            selectedLanguage = 'en';
            localStorage.setItem('vcanship_language', selectedLanguage);
        }
        localStorage.setItem('vcanship_country', selectedCountry.countryCode);
        localStorage.setItem('vcanship_currency', JSON.stringify(selectedCurrency));
        updateHeaderControls();
        dispatchLocaleChangeEvent();
        showToast(`Country set to ${country.countryName}. Currency: ${selectedCurrency.code}.`, 'info', 2000);
    }
}

// --- UI RENDERING & UPDATES ---

function updateHeaderControls() {
    if (!selectedCountry || !selectedCurrency || !selectedLanguage) return;

    if (elements.headerFlag) {
        elements.headerFlag.textContent = countryCodeToFlag(selectedCountry.countryCode);
    }
    
    // Get language name
    const currentLanguage = languages.find(l => l.code === selectedLanguage);
    const languageName = currentLanguage ? currentLanguage.name : 'English';
    
    if (elements.headerLanguage) {
        elements.headerLanguage.textContent = languageName;
    }
    if (elements.headerCountry) {
        elements.headerCountry.textContent = selectedCountry.countryName;
    }
    if (elements.headerInfo) {
        elements.headerInfo.textContent = `${selectedCurrency.code} (${selectedCurrency.symbol})`;
    }
}

function renderCountryList() {
    if (!elements.countryList) return;
    if (filteredLocales.length === 0) {
        elements.countryList.innerHTML = `<li class="helper-text" style="padding: 1rem; text-align: center;">No countries found.</li>`;
        return;
    }
    elements.countryList.innerHTML = filteredLocales.map(country => {
        const isSelected = modalSelectedCountry?.countryCode === country.countryCode;
        return `
            <li class="locale-modal-list-item ${isSelected ? 'selected' : ''}" 
                role="option" 
                id="country-${country.countryCode}" 
                data-country-code="${country.countryCode}"
                tabindex="0"
                aria-selected="${isSelected}">
                <span class="locale-flag">${countryCodeToFlag(country.countryCode)}</span>
                <span class="locale-country-name">${country.countryName}</span>
                <span class="locale-currency-code">${country.currency.code}</span>
            </li>
        `;
    }).join('');

    // Ensure list is scrollable and accessible
    if (elements.countryList) {
        elements.countryList.style.overflowY = 'auto';
        elements.countryList.style.maxHeight = '450px';
        elements.countryList.style.minHeight = '300px';
    }
}

function renderPreviewPanel() {
    if (!elements.previewPanel) return;
    if (!modalSelectedCountry) {
        elements.previewPanel.innerHTML = `<p class="helper-text">Select a country from the list to see options.</p>`;
        return;
    }
    
    // Use selected currency or default to country currency
    const currentCurrency = modalSelectedCurrency || modalSelectedCountry.currency;
    
    elements.previewPanel.innerHTML = `
        <div class="locale-preview-flag">${countryCodeToFlag(modalSelectedCountry.countryCode)}</div>
        <h4 class="locale-preview-name">${modalSelectedCountry.countryName}</h4>
        <div class="locale-preview-details" style="width: 100%;">
            <div class="input-wrapper" style="margin-bottom: 1rem;">
                <label for="modal-language-select">Language</label>
                <select id="modal-language-select" style="width: 100%;">
                    ${languages.map(lang => `<option value="${lang.code}">${lang.name}</option>`).join('')}
                </select>
            </div>
            <div class="input-wrapper">
                <label for="modal-currency-select">Currency <small style="color: var(--medium-gray); font-weight: normal;">(Independent of country)</small></label>
                <select id="modal-currency-select" style="width: 100%;">
                    ${MAJOR_CURRENCIES.map(curr => `
                        <option value="${curr.code}" data-symbol="${curr.symbol}">
                            ${curr.code} (${curr.symbol}) - ${curr.name}
                        </option>
                    `).join('')}
                </select>
                <small class="helper-text" style="margin-top: 0.5rem; display: block;">
                    💡 You can select any currency regardless of your country
                </small>
            </div>
        </div>
    `;

    const langSelect = document.getElementById('modal-language-select') as HTMLSelectElement;
    const currencySelect = document.getElementById('modal-currency-select') as HTMLSelectElement;
    
    langSelect.value = modalSelectedLanguage || 'en';
    currencySelect.value = currentCurrency.code;
    
    langSelect.addEventListener('change', () => {
        modalSelectedLanguage = langSelect.value;
        if (elements.confirmBtn) elements.confirmBtn.disabled = false;
    });
    
    currencySelect.addEventListener('change', () => {
        const selectedOption = currencySelect.options[currencySelect.selectedIndex];
        const symbol = selectedOption.getAttribute('data-symbol') || '';
        modalSelectedCurrency = {
            code: currencySelect.value,
            symbol: symbol
        };
        if (elements.confirmBtn) elements.confirmBtn.disabled = false;
    });
}

// --- MODAL MANAGEMENT ---

function openLocaleModal() {
    if (!elements.modal) return;
    modalSelectedCountry = selectedCountry;
    modalSelectedLanguage = selectedLanguage;
    modalSelectedCurrency = selectedCurrency || (selectedCountry ? selectedCountry.currency : null);

    elements.modal.classList.add('active');
    isModalOpen = true;

    // Translate modal UI
    const titleEl = document.getElementById('locale-modal-title');
    const descEl = elements.modal.querySelector('.modal-desc');
    if (titleEl) titleEl.textContent = t('modals.locale.title');
    if (descEl) descEl.textContent = t('modals.locale.description');
    if (elements.cancelBtn) elements.cancelBtn.textContent = t('modals.locale.cancel');
    if (elements.confirmBtn) elements.confirmBtn.textContent = t('modals.locale.confirm');
    if (elements.searchInput) elements.searchInput.placeholder = t('modals.locale.search_placeholder');
    
    // Render lists
    renderCountryList();
    renderPreviewPanel();
    
    // Ensure country list is scrollable and clickable
    if (elements.countryList) {
        elements.countryList.style.overflowY = 'auto';
        elements.countryList.style.maxHeight = '450px';
        elements.countryList.style.minHeight = '300px';
        elements.countryList.style.position = 'relative';
        elements.countryList.style.zIndex = '1';
        
        // Force layout recalculation
        elements.countryList.offsetHeight;
    }
    
    if (elements.confirmBtn) elements.confirmBtn.disabled = true;
    
    // Small delay to ensure modal is visible before focusing
    setTimeout(() => {
        elements.searchInput?.focus();
        
        // Scroll to selected country if exists
        if (modalSelectedCountry && elements.countryList) {
            const selectedItem = elements.countryList.querySelector(`[data-country-code="${modalSelectedCountry.countryCode}"]`);
            if (selectedItem) {
                selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    }, 100);
}

function closeLocaleModal() {
    if (!elements.modal) return;
    elements.modal.classList.remove('active');
    isModalOpen = false;
}

// --- EVENT HANDLERS ---

const handleSearch = debounce(() => {
    if (!elements.searchInput) return;
    const term = elements.searchInput.value.toLowerCase();
    filteredLocales = locales.filter(l =>
        l.countryName.toLowerCase().includes(term) ||
        l.countryCode.toLowerCase().includes(term)
    );
    renderCountryList();
}, 200);

function handleCountryPreview(e: Event) {
    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>('.locale-modal-list-item');
    if (!item) return;
    
    const countryCode = item.dataset.countryCode;
    if (!countryCode) return;
    
    const country = locales.find(l => l.countryCode === countryCode);
    if (country) {
        modalSelectedCountry = country;
        // Preserve current currency selection when changing country
        // Only set currency if user hasn't manually selected one yet
        if (!modalSelectedCurrency) {
            modalSelectedCurrency = country.currency;
        }
        
        // Re-render to show selected state
        renderCountryList();
        renderPreviewPanel();
        
        if (elements.confirmBtn) elements.confirmBtn.disabled = false;
        
        // Visual feedback
        item.classList.add('selected');
    }
}

function handleConfirmSelection() {
    if (!modalSelectedCountry || !modalSelectedLanguage || !modalSelectedCurrency) return;
    
    selectedCountry = modalSelectedCountry;
    selectedLanguage = modalSelectedLanguage;
    selectedCurrency = modalSelectedCurrency;
    
    localStorage.setItem('vcanship_country', selectedCountry.countryCode);
    localStorage.setItem('vcanship_language', selectedLanguage);
    localStorage.setItem('vcanship_currency', JSON.stringify(selectedCurrency));

    updateHeaderControls();
    dispatchLocaleChangeEvent();
    closeLocaleModal();
    
    showToast(`Currency set to ${selectedCurrency.code} (${selectedCurrency.symbol})`, 'success', 2000);
}

function attachEventListeners() {
    // Listener for the desktop header button
    elements.headerBtn?.addEventListener('click', openLocaleModal);

    // Listener for the mobile menu button
    document.body.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('#settings-language-btn')) {
            openLocaleModal();
        }
    });

    elements.searchInput?.addEventListener('input', handleSearch);
    
    // Enhanced click handler for country list - use event delegation
    // Attach to document to ensure it works even after re-rendering
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const item = target.closest('.locale-modal-list-item');
        if (item && elements.countryList?.contains(item)) {
            handleCountryPreview(e);
        }
    }, true);
    
    // Keyboard navigation for country list
    elements.countryList?.addEventListener('keydown', (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('locale-modal-list-item')) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCountryPreview(e);
            }
        }
    });
    
    elements.confirmBtn?.addEventListener('click', handleConfirmSelection);
    elements.closeBtn?.addEventListener('click', closeLocaleModal);
    elements.cancelBtn?.addEventListener('click', closeLocaleModal);
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen) {
            closeLocaleModal();
        }
    });
}

// --- INITIALIZATION ---

export async function initializeLocaleSwitcher() {
    try {
        const [localesResponse, languagesResponse] = await Promise.all([
            fetch('./locales.json'),
            fetch('./languages.json')
        ]);
        if (!localesResponse.ok) throw new Error(`HTTP error! status: ${localesResponse.status}`);
        if (!languagesResponse.ok) throw new Error(`HTTP error! status: ${languagesResponse.status}`);
        
        locales = await localesResponse.json();
        languages = await languagesResponse.json();
        filteredLocales = [...locales];

        attachEventListeners();

        let initialCountryCode = localStorage.getItem('vcanship_country');
        if (!initialCountryCode) {
            try {
                const geoResponse = await fetch('https://ipapi.co/json/');
                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    if (locales.some(l => l.countryCode === geoData.country_code)) {
                        initialCountryCode = geoData.country_code;
                        showToast(`Welcome! Your region has been set to ${geoData.country_name}.`, 'info');
                    }
                }
            } catch (geoError) {
                console.warn('Could not detect user country.', geoError);
            }
        }

        if (!initialCountryCode) initialCountryCode = 'GB'; 

        const savedLanguage = localStorage.getItem('vcanship_language');
        const savedCurrencyStr = localStorage.getItem('vcanship_currency');
        
        const initialCountry = locales.find(l => l.countryCode === initialCountryCode) || locales[0];

        selectedCountry = initialCountry;
        selectedLanguage = (savedLanguage && languages.some(l => l.code === savedLanguage))
            ? savedLanguage
            : 'en';
        
        // Load saved currency or default to country currency
        if (savedCurrencyStr) {
            try {
                const savedCurrency = JSON.parse(savedCurrencyStr);
                if (MAJOR_CURRENCIES.some(c => c.code === savedCurrency.code)) {
                    selectedCurrency = savedCurrency;
                } else {
                    selectedCurrency = initialCountry.currency;
                }
            } catch {
                selectedCurrency = initialCountry.currency;
            }
        } else {
            selectedCurrency = initialCountry.currency;
        }
        
        localStorage.setItem('vcanship_country', selectedCountry.countryCode);
        localStorage.setItem('vcanship_language', selectedLanguage);
        localStorage.setItem('vcanship_currency', JSON.stringify(selectedCurrency));

        updateHeaderControls();
        dispatchLocaleChangeEvent();

    } catch (error) {
        console.error('Failed to initialize Locale Switcher:', error);
    }
}