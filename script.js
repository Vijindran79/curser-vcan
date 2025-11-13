import { seaCarriers, airCarriers } from './data.js';

const createCarrierCard = (carrier) => {
    const card = document.createElement('div');
    card.className = 'group flex flex-col justify-between bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden';

    const logoContainer = document.createElement('div');
    logoContainer.className = 'flex-grow flex items-center justify-center p-6 h-36';
    
    const logo = document.createElement('img');
    logo.src = carrier.logoUrl;
    logo.alt = `${carrier.name} Logo`;
    logo.className = 'max-h-full max-w-full object-contain';
    logoContainer.appendChild(logo);

    const infoContainer = document.createElement('div');
    infoContainer.className = 'p-4 border-t border-slate-100 bg-slate-50/70 w-full text-center';

    const name = document.createElement('h3');
    name.className = 'text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600';
    name.textContent = carrier.name;
    
    const downloadButton = document.createElement('button');
    downloadButton.className = 'mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:pointer-events-none';
    downloadButton.innerHTML = `<i data-lucide="download" class="w-4 h-4"></i><span class="button-text">Download</span>`;

    const spinner = document.createElement('span');
    spinner.className = 'animate-spin hidden h-4 w-4 border-2 border-current border-r-transparent rounded-full';
    downloadButton.prepend(spinner);

    downloadButton.addEventListener('click', async () => {
        spinner.classList.remove('hidden');
        downloadButton.querySelector('.button-text').textContent = 'Downloading...';
        downloadButton.disabled = true;

        try {
            const response = await fetch(carrier.logoUrl);
            if (!response.ok) throw new Error('Network response was not ok.');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            
            const fileExtension = (carrier.logoUrl.split('.').pop() || 'png').split('?')[0];
            const fileName = `${carrier.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_logo.${fileExtension}`;
            a.download = fileName;
            
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Download failed:', error);
            window.open(carrier.logoUrl, '_blank');
        } finally {
            spinner.classList.add('hidden');
            downloadButton.querySelector('.button-text').textContent = 'Download';
            downloadButton.disabled = false;
        }
    });

    infoContainer.appendChild(name);
    infoContainer.appendChild(downloadButton);

    card.appendChild(logoContainer);
    card.appendChild(infoContainer);

    return card;
};

const renderCarriers = (carriers, containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    carriers.forEach(carrier => {
        const card = createCarrierCard(carrier);
        container.appendChild(card);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    renderCarriers(seaCarriers, 'sea-carriers-grid');
    renderCarriers(airCarriers, 'air-carriers-grid');
    lucide.createIcons();
});
