// ⚠️  READ-ONLY — DO NOT EDIT — SERVICE LOCKED ⚠️
import { State } from './state';
import { DOMElements } from './dom';
// FIX: Import 'switchPage' from './ui' to resolve compilation errors where the function was used but not defined in the current scope.
import { switchPage } from './ui';
import { mountService } from './router';
import { renderLandingPage, renderHelpPage, renderApiHubPage, renderPrivacyPage, renderTermsPage } from './static_pages';
import { renderDashboard } from './dashboard';
import { renderAddressBook, renderAccountSettings } from './account';
import { initializeSidebar } from './sidebar';

interface Translations {
  [key: string]: string | Translations;
}

let translations: Translations = {};
let currentLanguage = 'en';
const rtlLanguages = ['ar']; // List of Right-to-Left languages

/**
 * A simple key-based translation function (shortened to 't' for convenience).
 * It supports nested keys like 'home.title' and can return strings, objects, or arrays.
 * @param key The key for the translation string (e.g., 'parcel.title').
 * @returns The translated string or the key itself if not found.
 */
export function t(key: string): any {
  const keys = key.split('.');
  let result: any = translations;
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }
  return result;
}

/**
 * Scans the document for elements with `data-i18n` attributes and populates them
 * with the corresponding translated text.
 */
export function translatePageAttributes() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (key) {
            const translation = t(key);
            if (typeof translation !== 'string') {
                console.warn(`Translation for key '${key}' is not a string.`);
                return;
            }
            if (element.hasAttribute('placeholder')) {
                element.setAttribute('placeholder', translation);
            } else if (element.hasAttribute('aria-label')) {
                element.setAttribute('aria-label', translation);
            } else {
                element.textContent = translation;
            }
        }
    });

    document.querySelectorAll('[data-i18n-html]').forEach(element => {
        const key = element.getAttribute('data-i18n-html');
        if (key) {
            const translation = t(key);
            if (typeof translation === 'string') {
                (element as HTMLElement).innerHTML = translation;
            }
        }
    });
}


/**
 * Fetches and loads the translation file for the given language.
 * @param lang The language code (e.g., 'en', 'es').
 */
async function loadTranslations(lang: string): Promise<void> {
  try {
    // FIX: Add mappings for languages without dedicated files to prevent errors.
    // 'zh-TW' (Traditional Chinese) falls back to 'zh' (Simplified Chinese).
    // 'th' (Thai) falls back to 'en' (English).
    let langFile = lang;
    if (lang === 'zh-TW') {
        langFile = 'zh';
    } else if (lang === 'th') {
        langFile = 'en';
    }

    // Add timeout to prevent hanging on slow networks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
      const response = await fetch(`./locales/${langFile}.json`, { 
        signal: controller.signal,
        cache: 'no-cache' // Ensure fresh translations
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Could not load translation file for ${lang}`);
      }
      
      const data = await response.json();
      
      // Validate that we got actual translation data
      if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        throw new Error(`Invalid or empty translation data for ${lang}`);
      }
      
      translations = data;
      currentLanguage = lang;
      document.documentElement.lang = lang;
      
      // Set text direction
      if (rtlLanguages.includes(lang)) {
          document.documentElement.dir = 'rtl';
      } else {
          document.documentElement.dir = 'ltr';
      }
      
      console.log(`[i18n] Successfully loaded translations for ${lang} (${Object.keys(data).length} keys)`);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error: any) {
    console.error(`[i18n] Failed to load ${lang}:`, error.message);
    
    // Fallback to English if the selected language fails to load
    if (lang !== 'en') {
        console.log('[i18n] Falling back to English translations');
        await loadTranslations('en');
    } else {
        // If even English fails, use minimal fallback
        console.error('[i18n] CRITICAL: Could not load English translations. Using minimal fallback.');
        translations = {
          app: { name: 'VCanship' },
          header: { track: 'Track' },
          error: { generic: 'An error occurred' }
        };
        currentLanguage = 'en';
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
    }
  }
}

/**
 * Updates static text elements in the main HTML that are not part of dynamic templates.
 */
export function updateStaticUIText() {
    translatePageAttributes();
}

/**
 * Initializes the i18n system.
 * It loads the initial language translations and sets up a listener for locale changes.
 */
export async function initializeI18n() {
  try {
      const savedLanguage = localStorage.getItem('vcanship_language') || 'en';
      console.log(`[i18n] Initializing with language: ${savedLanguage}`);
      
      await loadTranslations(savedLanguage);
      console.log('[i18n] Initialization successful');
      
  } catch (error: any) {
      console.error("[i18n] FATAL: Could not initialize i18n system:", error.message);
      console.error("[i18n] The app will continue with minimal translations.");
      
      // Ensure we have at least minimal translations loaded
      if (Object.keys(translations).length === 0) {
        translations = {
          app: { name: 'VCanship' },
          header: { track: 'Track', login: 'Login' },
          error: { generic: 'An error occurred' },
          common: { loading: 'Loading...', retry: 'Retry' }
        };
        currentLanguage = 'en';
      }
  }

  updateStaticUIText();

  window.addEventListener('locale-change', async (e) => {
    const detail = (e as CustomEvent).detail;
    if (detail.language && detail.language !== currentLanguage) {
      await loadTranslations(detail.language);
      
      // Re-render all static and dynamic parts of the UI
      updateStaticUIText();
      initializeSidebar(); 

      // Re-render the current page's content to apply new translations seamlessly
      const currentPage = State.currentPage;
      if (State.currentService) {
        mountService(State.currentService);
      } else {
        switch (currentPage) {
          case 'landing': renderLandingPage(); break;
          case 'help': renderHelpPage(); break;
          case 'api-hub': renderApiHubPage(); break;
          case 'privacy': renderPrivacyPage(); break;
          case 'terms': renderTermsPage(); break;
          case 'dashboard': renderDashboard(); break;
          case 'address-book': renderAddressBook(); break;
          case 'settings': renderAccountSettings(); break;
          default:
            console.warn(`Unhandled page re-render for translation on page: ${currentPage}`);
            break;
        }
      }
    }
  });
}
