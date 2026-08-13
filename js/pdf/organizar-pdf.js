import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export function init() {
    // TOOL 12b: ORGANIZAR PDF (PDF PAGE ORGANIZER) [NEW]
    // ----------------------------------------------------------------------
    let organizeFile = null;
    let organizePagesList = []; // array of { id, base64Image, rotation: 0, originalIndex }
    let organizePageIdCounter = 0;

    setupDropzone('dropzone-organizar-pdf', 'file-organizar-pdf', async (files) => {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            showLoader('Leyendo páginas de PDF...');
            try {
                organizeFile = file;
                organizePagesList = [];
                organizePageIdCounter = 0;
                
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const numPages = pdfDoc.numPages;

                for (let i = 1; i <= numPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    // Render page preview in a tiny canvas (~150px width)
                    const viewport = page.getViewport({ scale: 150 / page.getViewport({ scale: 1 }).width });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    const base64Image = canvas.toDataURL('image/jpeg', 0.85);

                    organizePagesList.push({
                        id: organizePageIdCounter++,
                        base64Image: base64Image,
                        rotation: 0,
                        originalIndex: i - 1
                    });
                }

                document.getElementById('dropzone-organizar-pdf').style.display = 'none';
                document.getElementById('preview-organizar-pdf').style.display = 'block';
                document.getElementById('actions-organizar-pdf').style.display = 'flex';
                
                document.getElementById('name-organizar-pdf').textContent = file.name;
                document.getElementById('size-organizar-pdf').textContent = formatBytes(file.size);
                
                updateOrganizeUI();
                showToast('Páginas de PDF cargadas', 'success');
            } catch (error) {
                console.error(error);
                showToast('Error al leer el PDF.', 'error');
            } finally {
                hideLoader();
            }
        } else {
            showToast('Por favor, selecciona un PDF válido.', 'warning');
        }
    });

    function resetOrganizeUI() {
        organizeFile = null;
        organizePagesList = [];
        document.getElementById('dropzone-organizar-pdf').style.display = 'block';
        document.getElementById('preview-organizar-pdf').style.display = 'none';
        document.getElementById('actions-organizar-pdf').style.display = 'none';
        document.getElementById('file-organizar-pdf').value = '';
        document.getElementById('organizer-grid-pdf').innerHTML = '';
    }

    document.getElementById('btn-remove-organizar-pdf').addEventListener('click', resetOrganizeUI);

    function updateOrganizeUI() {
        const grid = document.getElementById('organizer-grid-pdf');
        grid.innerHTML = '';

        organizePagesList.forEach((page, index) => {
            const card = document.createElement('div');
            card.className = 'pdf-page-card';
            card.setAttribute('data-id', page.id);
            card.setAttribute('draggable', 'true');
            card.innerHTML = `
                <span class="pdf-page-number">${index + 1}</span>
                <img src="${page.base64Image}" alt="Página ${index + 1}" style="transform: rotate(${page.rotation}deg);">
                <div class="pdf-page-actions">
                    <button class="btn-icon btn-rotate" title="Rotar 90°"><i class="fa-solid fa-rotate-right"></i></button>
                    <button class="btn-icon btn-danger-hover btn-delete" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;

            // Drag and Drop Event Listeners
            card.addEventListener('dragstart', () => card.classList.add('dragging'));
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                // Reconstruct page list based on DOM order
                const newOrder = [...grid.querySelectorAll('.pdf-page-card')].map(c => {
                    const pageId = parseInt(c.getAttribute('data-id'), 10);
                    return organizePagesList.find(p => p.id === pageId);
                });
                organizePagesList = newOrder;
                // Re-number labels in UI
                grid.querySelectorAll('.pdf-page-card').forEach((c, idx) => {
                    c.querySelector('.pdf-page-number').textContent = idx + 1;
                });
            });

            // Action listeners
            card.querySelector('.btn-rotate').addEventListener('click', () => {
                page.rotation = (page.rotation + 90) % 360;
                card.querySelector('img').style.transform = `rotate(${page.rotation}deg)`;
            });

            card.querySelector('.btn-delete').addEventListener('click', () => {
                organizePagesList = organizePagesList.filter(p => p.id !== page.id);
                card.remove();
                // Re-number labels in UI
                grid.querySelectorAll('.pdf-page-card').forEach((c, idx) => {
                    c.querySelector('.pdf-page-number').textContent = idx + 1;
                });
                if (organizePagesList.length === 0) {
                    showToast('Se eliminaron todas las páginas', 'warning');
                    resetOrganizeUI();
                }
            });

            grid.appendChild(card);
        });

        // Grid DragOver reordering
        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingCard = document.querySelector('.pdf-page-card.dragging');
            if (!draggingCard) return;
            const afterElement = getDragAfterElement(grid, e.clientX, e.clientY);
            if (afterElement == null) {
                grid.appendChild(draggingCard);
            } else {
                grid.insertBefore(draggingCard, afterElement);
            }
        });
    }

    function getDragAfterElement(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.pdf-page-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const centerX = box.left + box.width / 2;
            const centerY = box.top + box.height / 2;
            const distance = Math.hypot(x - centerX, y - centerY);
            if (distance < closest.distance) {
                return { distance: distance, element: child };
            } else {
                return closest;
            }
        }, { distance: Number.POSITIVE_INFINITY }).element;
    }

    document.getElementById('btn-run-organizar-pdf').addEventListener('click', async () => {
        if (!organizeFile || organizePagesList.length === 0) return;

        showLoader('Generando nuevo PDF...');
        try {
            const srcBuffer = await organizeFile.arrayBuffer();
            const srcDoc = await PDFLib.PDFDocument.load(srcBuffer);
            const newDoc = await PDFLib.PDFDocument.create();

            for (const pageState of organizePagesList) {
                const [copiedPage] = await newDoc.copyPages(srcDoc, [pageState.originalIndex]);
                const originalRotation = copiedPage.getRotation().angle;
                copiedPage.setRotation(PDFLib.degrees((originalRotation + pageState.rotation) % 360));
                newDoc.addPage(copiedPage);
            }

            const newBytes = await newDoc.save();
            const blob = new Blob([newBytes], { type: 'application/pdf' });
            const originalBase = organizeFile.name.replace(/\.[^/.]+$/, "");
            
            downloadBlob(blob, `${originalBase}_organizado.pdf`);
            showToast('¡PDF reordenado con éxito!', 'success');
            resetOrganizeUI();
        } catch (error) {
            console.error(error);
            showToast('Error al generar el PDF.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
