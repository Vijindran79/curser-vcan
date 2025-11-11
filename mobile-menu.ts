import { getAllServicesConfig } from './sidebar';
import { mountService } from './router';
import { Page, Service } from './state';

function createStyles(): HTMLStyleElement {
	const style = document.createElement('style');
	style.textContent = `
	/* Mobile burger + drawer */
	@media (max-width: 992px) {
		.sidebar { display: none !important; }
	}
	.mobile-burger {
	  position: fixed;
	  top: 16px;
	  left: 16px;
	  width: 48px;
	  height: 48px;
	  background: rgba(255,255,255,0.95);
	  backdrop-filter: blur(10px);
	  -webkit-backdrop-filter: blur(10px);
	  border-radius: 12px;
	  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
	  z-index: 50;
	  display: flex;
	  align-items: center;
	  justify-content: center;
	  cursor: pointer;
	}
	.mobile-burger .lines {
	  width: 22px;
	  height: 2px;
	  background: #111;
	  position: relative;
	  border-radius: 2px;
	}
	.mobile-burger .lines::before,
	.mobile-burger .lines::after {
	  content: "";
	  position: absolute;
	  left: 0;
	  width: 22px;
	  height: 2px;
	  background: #111;
	  border-radius: 2px;
	}
	.mobile-burger .lines::before { top: -7px; }
	.mobile-burger .lines::after  { top: 7px; }

	.mobile-drawer {
	  position: fixed;
	  top: 0;
	  left: -280px;
	  width: 280px;
	  height: 100vh;
	  background: #fff;
	  box-shadow: 4px 0 20px rgba(0,0,0,0.2);
	  transition: left 0.3s ease-out;
	  z-index: 60;
	  overflow-y: auto;
	  -webkit-overflow-scrolling: touch;
	}
	@media (min-width: 768px) {
	  .mobile-drawer { width: 320px; left: -320px; }
	}
	.mobile-drawer.open { left: 0; }
	.mobile-drawer .section {
	  padding: 12px 16px;
	  border-bottom: 1px solid rgba(0,0,0,0.06);
	}
	.mobile-drawer .section h4 {
	  margin: 8px 0;
	  font-size: 14px;
	  color: #111;
	  font-weight: 700;
	  letter-spacing: 0.4px;
	  text-transform: uppercase;
	}
	.mobile-drawer .link {
	  display: flex;
	  align-items: center;
	  gap: 10px;
	  padding: 10px 8px;
	  border-radius: 8px;
	  color: #111;
	  text-decoration: none;
	  cursor: pointer;
	}
	.mobile-drawer .link:hover {
	  background: rgba(0,0,0,0.04);
	}
	.mobile-overlay {
	  position: fixed;
	  inset: 0;
	  background: rgba(0,0,0,0.35);
	  z-index: 55;
	  display: none;
	}
	.mobile-overlay.open { display: block; }
	`;
	return style;
}

function groupServices() {
	const all = getAllServicesConfig();
	return {
		globalShipping: all.filter(s => ['fcl','lcl','airfreight','railway','inland','bulk','parcel','baggage'].includes(s.id)),
		tools: [
			{ id: 'tracking' as Page, name: 'Track Shipments', icon: 'fa-solid fa-map-location-dot' },
			{ id: 'landing' as Page, name: 'Get Quote', icon: 'fa-solid fa-calculator' },
			{ id: 'dashboard' as Page, name: 'Booking History', icon: 'fa-solid fa-clock-rotate-left' },
		],
		account: [
			{ id: 'dashboard' as Page, name: 'Profile', icon: 'fa-solid fa-user' },
			{ id: 'subscription' as Page, name: 'Subscriptions', icon: 'fa-solid fa-bolt' },
			{ id: 'settings' as Page, name: 'Settings', icon: 'fa-solid fa-gear' },
		],
		ecom: [
			{ id: 'Amazon', name: 'Amazon', icon: 'fa-brands fa-amazon' },
			{ id: 'eBay', name: 'eBay', icon: 'fa-brands fa-ebay' },
			{ id: 'TikTok Shop', name: 'TikTok Shop', icon: 'fa-brands fa-tiktok' },
			{ id: 'Shopify', name: 'Shopify', icon: 'fa-brands fa-shopify' },
		]
	};
}

function buildDrawerContent(drawer: HTMLElement) {
	const { globalShipping, tools, account, ecom } = groupServices();
	const section = (title: string, items: { id: any, name: string, icon: string }[], kind: 'service'|'page'='service') => {
		const wrap = document.createElement('div');
		wrap.className = 'section';
		const h = document.createElement('h4');
		h.textContent = title;
		wrap.appendChild(h);
		items.forEach(item => {
			const a = document.createElement('a');
			a.className = 'link';
			a.innerHTML = `<i class="${item.icon}"></i><span>${item.name}</span>`;
			a.addEventListener('click', (e) => {
				e.preventDefault();
				if (kind === 'service') {
					mountService(item.id as Service);
				} else {
					mountService(item.id as Page);
				}
				close();
			});
			wrap.appendChild(a);
		});
		return wrap;
	};
	drawer.innerHTML = '';
	drawer.appendChild(section('Global Shipping', globalShipping.map(s => ({ id: s.id, name: s.name, icon: s.icon }))));
	drawer.appendChild(section('Tools', tools, 'page'));
	drawer.appendChild(section('Account', account, 'page'));
	const ecomWrap = document.createElement('div');
	ecomWrap.className = 'section';
	const h4 = document.createElement('h4'); h4.textContent = 'E-commerce Hub'; ecomWrap.appendChild(h4);
	ecom.forEach(item => {
		const a = document.createElement('a');
		a.className = 'link';
		a.innerHTML = `<i class="${item.icon}"></i><span>${item.name}</span>`;
		ecomWrap.appendChild(a);
	});
	drawer.appendChild(ecomWrap);
}

let isOpen = false;
let drawerEl: HTMLElement | null = null;
let overlayEl: HTMLElement | null = null;

function open() {
	if (!drawerEl || !overlayEl) return;
	drawerEl.classList.add('open');
	overlayEl.classList.add('open');
	isOpen = true;
}
function close() {
	if (!drawerEl || !overlayEl) return;
	drawerEl.classList.remove('open');
	overlayEl.classList.remove('open');
	isOpen = false;
}

export function initializeMobileBurgerMenu() {
	// Only on small screens
	if (window.innerWidth > 992) return;

	// Add styles once
	if (!document.getElementById('mobile-menu-styles')) {
		const styles = createStyles();
		styles.id = 'mobile-menu-styles';
		document.head.appendChild(styles);
	}

	// Create burger
	let burger = document.getElementById('mobile-burger');
	if (!burger) {
		burger = document.createElement('button');
		burger.id = 'mobile-burger';
		burger.className = 'mobile-burger';
		burger.setAttribute('aria-label', 'Menu');
		burger.innerHTML = `<div class="lines"></div>`;
		document.body.appendChild(burger);
	}

	// Create drawer
	drawerEl = document.getElementById('mobile-drawer');
	if (!drawerEl) {
		drawerEl = document.createElement('nav');
		drawerEl.id = 'mobile-drawer';
		drawerEl.className = 'mobile-drawer';
		document.body.appendChild(drawerEl);
	}
	buildDrawerContent(drawerEl);

	// Create overlay
	overlayEl = document.getElementById('mobile-drawer-overlay');
	if (!overlayEl) {
		overlayEl = document.createElement('div');
		overlayEl.id = 'mobile-drawer-overlay';
		overlayEl.className = 'mobile-overlay';
		document.body.appendChild(overlayEl);
	}

	// Wire events
	burger.addEventListener('click', () => isOpen ? close() : open());
	overlayEl.addEventListener('click', close);

	// Swipe to close
	let startX = 0;
	drawerEl.addEventListener('touchstart', (e: TouchEvent) => { startX = e.touches[0].clientX; }, { passive: true });
	drawerEl.addEventListener('touchmove', (e: TouchEvent) => {
		const dx = e.touches[0].clientX - startX;
		if (dx < -40) close();
	}, { passive: true });

	// Close on route changes
	window.addEventListener('hashchange', close);
}


