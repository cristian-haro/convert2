/* ==========================================================================
   Convert2 by Cristian Haro - Modular JS Main Entry Point (with Lazy Loading & Rendering)
   ========================================================================= */

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
    'cuadrar-img': 'image',
    
    'extraer-texto': 'text',
    'ocr-local': 'text',
    'comparar-textos': 'text',
    
    'privacidad': 'layout',
    'inicio': 'layout'
};

const loadedTools = new Set();

// Actions for Global Drag and Drop Overlay
const pdfActions = [
    { tabId: 'unir-pdf', inputId: 'file-unir-pdf', title: 'Unir PDF', icon: 'fa-object-group', desc: 'Combina múltiples PDFs' },
    { tabId: 'separar-pdf', inputId: 'file-separar-pdf', title: 'Separar PDF', icon: 'fa-scissors', desc: 'Extrae páginas' },
    { tabId: 'organizar-pdf', inputId: 'file-organizar-pdf', title: 'Organizar PDF', icon: 'fa-folder-tree', desc: 'Reordena o rota páginas' },
    { tabId: 'compresor-pdf', inputId: 'file-compresor-pdf', title: 'Comprimir PDF', icon: 'fa-compress', desc: 'Reduce el tamaño del archivo' },
    { tabId: 'firmar-pdf', inputId: 'file-firmar-pdf', title: 'Firmar PDF', icon: 'fa-signature', desc: 'Añade firmas manuscritas' }
];

const imageActions = [
    { tabId: 'eliminar-fondo', inputId: 'file-eliminar-fondo', title: 'Eliminar Fondo', icon: 'fa-wand-magic-sparkles', desc: 'Quita el fondo con IA local' },
    { tabId: 'limpiar-exif', inputId: 'file-limpiar-exif', title: 'Limpiar EXIF', icon: 'fa-user-secret', desc: 'Elimina metadatos privados' },
    { tabId: 'compresor-img', inputId: 'file-compresor-img', title: 'Comprimir Imagen', icon: 'fa-minimize', desc: 'Reduce peso sin perder calidad' },
    { tabId: 'convertir-img', inputId: 'file-convertir-img', title: 'Convertir Imagen', icon: 'fa-image', desc: 'Cambia de formato en lote' },
    { tabId: 'recortar-img', inputId: 'file-recortar-img', title: 'Recortar y Redim.', icon: 'fa-crop-simple', desc: 'Ajusta tamaño y escala' },
    { tabId: 'cuadrar-img', inputId: 'file-cuadrar-img', title: 'Cuadrar Imagen', icon: 'fa-vector-square', desc: 'Añade márgenes difuminados o sólidos' }
];

const wordActions = [
    { tabId: 'docx-pdf', inputId: 'file-docx-pdf', title: 'Word a PDF', icon: 'fa-file-pdf', desc: 'Convierte documento DOCX a PDF' }
];

const fallbackActions = [
    { tabId: 'unir-pdf', inputId: 'file-unir-pdf', title: 'Unir PDF', icon: 'fa-object-group', desc: 'Combina múltiples PDFs' },
    { tabId: 'convertir-img', inputId: 'file-convertir-img', title: 'Convertir Imagen', icon: 'fa-image', desc: 'Cambia de formato en lote' },
    { tabId: 'comparar-textos', inputId: 'file-comparar-textos', title: 'Comparar Textos', icon: 'fa-columns', desc: 'Compara diferencias visuales' }
];

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
    // GLOBAL DRAG AND DROP HANDLERS (UX INTELIGENTE)
    // ----------------------------------------------------------------------
    let dragCounter = 0;
    const dragOverlay = document.getElementById('global-drag-overlay');
    const dragGrid = document.getElementById('drag-actions-grid');
    const dragTitle = document.getElementById('drag-overlay-title');
    const dragSubtitle = document.getElementById('drag-overlay-subtitle');
    const btnCancelDrag = document.getElementById('btn-cancel-drag');

    function renderDragActions(fileType) {
        if (!dragGrid) return;
        dragGrid.innerHTML = '';
        
        let actions = fallbackActions;
        if (fileType === 'pdf') {
            if (dragTitle) dragTitle.textContent = 'Documento PDF Detectado';
            if (dragSubtitle) dragSubtitle.textContent = 'Suelta el archivo sobre la herramienta que desees utilizar';
            actions = pdfActions;
        } else if (fileType === 'image') {
            if (dragTitle) dragTitle.textContent = 'Imagen Detectada';
            if (dragSubtitle) dragSubtitle.textContent = 'Suelta el archivo sobre la herramienta que desees utilizar';
            actions = imageActions;
        } else if (fileType === 'word') {
            if (dragTitle) dragTitle.textContent = 'Documento de Word Detectado';
            if (dragSubtitle) dragSubtitle.textContent = 'Suelta el archivo sobre la herramienta que desees utilizar';
            actions = wordActions;
        } else {
            if (dragTitle) dragTitle.textContent = 'Archivo Detectado';
            if (dragSubtitle) dragSubtitle.textContent = 'Suelte el archivo sobre una de las categorías rápidas';
            actions = fallbackActions;
        }
        
        actions.forEach(action => {
            const card = document.createElement('div');
            card.className = 'drag-action-card';
            card.setAttribute('data-tab', action.tabId);
            card.setAttribute('data-input', action.inputId);
            
            card.innerHTML = `
                <i class="fa-solid ${action.icon}"></i>
                <h3>${action.title}</h3>
                <p>${action.desc}</p>
            `;
            
            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                card.classList.add('drag-target-hover');
            });
            
            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-target-hover');
            });
            
            card.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Hide overlay
                if (dragOverlay) {
                    dragOverlay.classList.remove('visible');
                    setTimeout(() => { dragOverlay.style.display = 'none'; }, 350);
                }
                dragCounter = 0;
                
                const files = e.dataTransfer.files;
                if (files && files.length > 0) {
                    // Sync nav items visually
                    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                    document.querySelectorAll(`.nav-item[data-tab="${action.tabId}"]`).forEach(i => i.classList.add('active'));
                    
                    // Load the tool and render its HTML
                    await loadTool(action.tabId);
                    
                    // Find input and inject files
                    const input = document.getElementById(action.inputId);
                    if (input) {
                        const dt = new DataTransfer();
                        for (let i = 0; i < files.length; i++) {
                            dt.items.add(files[i]);
                        }
                        input.files = dt.files;
                        input.dispatchEvent(new Event('change'));
                    }
                }
            });
            
            dragGrid.appendChild(card);
        });
    }

    if (dragOverlay) {
        document.addEventListener('dragenter', (e) => {
            if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                dragCounter++;
                if (dragCounter === 1) {
                    let fileType = 'unknown';
                    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
                        const type = e.dataTransfer.items[0].type;
                        if (type === 'application/pdf' || type.endsWith('/pdf')) {
                            fileType = 'pdf';
                        } else if (type.startsWith('image/')) {
                            fileType = 'image';
                        } else if (type.includes('wordprocessingml') || type.includes('msword') || type.includes('officedocument')) {
                            fileType = 'word';
                        }
                    }
                    
                    renderDragActions(fileType);
                    dragOverlay.style.display = 'flex';
                    dragOverlay.offsetWidth; // Force reflow
                    dragOverlay.classList.add('visible');
                }
            }
        });

        document.addEventListener('dragover', (e) => {
            if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
            }
        });

        document.addEventListener('dragleave', (e) => {
            if (e.dataTransfer.types.includes('Files')) {
                dragCounter--;
                if (dragCounter === 0) {
                    dragOverlay.classList.remove('visible');
                    setTimeout(() => {
                        if (dragCounter === 0) dragOverlay.style.display = 'none';
                    }, 350);
                }
            }
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            dragOverlay.classList.remove('visible');
            setTimeout(() => {
                dragOverlay.style.display = 'none';
            }, 350);
        });
    }

    if (btnCancelDrag && dragOverlay) {
        btnCancelDrag.addEventListener('click', () => {
            dragCounter = 0;
            dragOverlay.classList.remove('visible');
            setTimeout(() => {
                dragOverlay.style.display = 'none';
            }, 350);
        });
    }

    // Global Escape Key Listener for Accessibility (close overlay / sidebar)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (dragOverlay && dragOverlay.classList.contains('visible')) {
                dragCounter = 0;
                dragOverlay.classList.remove('visible');
                setTimeout(() => {
                    dragOverlay.style.display = 'none';
                }, 350);
            }
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        }
    });

    // ----------------------------------------------------------------------
    // LOAD INITIAL ACTIVE TOOL
    // ----------------------------------------------------------------------
    const initialActive = document.querySelector('.nav-item.active');
    if (initialActive) {
        const tabId = initialActive.getAttribute('data-tab');
        loadTool(tabId);
    }
});
