/* ==========================================================================
   Convert2 by Cristian Haro - Modular JS Main Entry Point (with Lazy Loading)
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
    'comparar-textos': 'text'
};

const loadedTools = new Set();

async function loadTool(tabId) {
    const category = toolCategories[tabId];
    if (!category || loadedTools.has(tabId)) return;
    
    try {
        const module = await import(`./js/${category}/${tabId}.js`);
        if (module && typeof module.init === 'function') {
            module.init();
            loadedTools.add(tabId);
            console.log(`[LazyLoader] Successfully loaded tool: ${tabId}`);
        }
    } catch (err) {
        console.error(`[LazyLoader] Failed to load tool ${tabId}:`, err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // UI ELEMENTS & NAVIGATION (Synced between Desktop horizontal nav & Mobile sidebar)
    // ----------------------------------------------------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menu-toggle');

    // Tab switching
    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            const tabId = item.getAttribute('data-tab');
            if (!tabId) return;
            
            // Switch layouts visually first (Fast UI responsiveness)
            navItems.forEach(i => i.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            // Sync active class on both desktop & mobile nav items
            document.querySelectorAll(`.nav-item[data-tab="${tabId}"]`).forEach(i => i.classList.add('active'));
            const panel = document.getElementById(`panel-${tabId}`);
            if (panel) panel.classList.add('active');
            
            // Close mobile sidebar if open
            if (sidebar) sidebar.classList.remove('open');
            
            // Lazy load the tool if not loaded
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
