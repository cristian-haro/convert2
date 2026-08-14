/* ==========================================================================
   Convert2 by Cristian Haro - Modular JS Main Entry Point (with Lazy Loading & Rendering)
   ========================================================================== */

// Mapping of tabIds to their corresponding folders
const toolCategories = {
    'unir-pdf': 'pdf',
    'separar-pdf': 'pdf',
    'rotar-pdf': 'pdf',
    'imagenes-pdf': 'pdf',
    'pdf-imagenes': 'pdf',
    'firmar-pdf': 'pdf',
    'proteger-pdf': 'pdf',
    'docx-pdf': 'pdf',
    'pdf-docx': 'pdf',
    'organizar-pdf': 'pdf',
    'compresor-pdf': 'pdf',
    
    'convertir-img': 'image',
    'compresor-img': 'image',
    'recortar-img': 'image',
    'marca-agua': 'image',
    'eliminar-fondo': 'image',
    'limpiar-exif': 'image',
    
    'extraer-texto': 'text',
    'ocr-local': 'text',
    'comparar-textos': 'text',
    
    'privacidad': 'layout'
};

const loadedTools = new Set();

async function loadTool(tabId) {
    const category = toolCategories[tabId];
    if (!category) return;
    
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;
    
    // 1. Inject HTML template if not already in DOM
    let panel = document.getElementById(`panel-${tabId}`);
    if (!panel) {
        try {
            const module = await import(`./js/${category}/${tabId}.js`);
            if (module && module.html) {
                // Insert the HTML
                mainContent.insertAdjacentHTML('beforeend', module.html);
                panel = document.getElementById(`panel-${tabId}`);
                
                // Initialize the JS if not loaded and has an init function
                if (!loadedTools.has(tabId)) {
                    if (typeof module.init === 'function') {
                        module.init();
                    }
                    loadedTools.add(tabId);
                    console.log(`[LazyLoader] Successfully loaded SFC (HTML + JS): ${tabId}`);
                }
            }
        } catch (err) {
            console.error(`[LazyLoader] Failed to load SFC ${tabId}:`, err);
            return;
        }
    }
    
    // Activar panel visualmente
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    if (panel) {
        panel.classList.add('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // UI ELEMENTS & NAVIGATION (Synced between Desktop horizontal nav & Mobile sidebar)
    // ----------------------------------------------------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menu-toggle');

    // Tab switching
    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            const tabId = item.getAttribute('data-tab');
            if (!tabId) return;
            
            // Sync active class on both desktop & mobile nav items
            navItems.forEach(i => i.classList.remove('active'));
            document.querySelectorAll(`.nav-item[data-tab="${tabId}"]`).forEach(i => i.classList.add('active'));
            
            // Close mobile sidebar if open
            if (sidebar) sidebar.classList.remove('open');
            
            // Lazy render HTML and lazy load JS
            await loadTool(tabId);
        });
    });

    // Mobile sidebar toggle
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }

    // ----------------------------------------------------------------------
    // LOAD INITIAL ACTIVE TOOL
    // ----------------------------------------------------------------------
    const initialActive = document.querySelector('.nav-item.active');
    if (initialActive) {
        const tabId = initialActive.getAttribute('data-tab');
        loadTool(tabId);
    }
});
