export const html = `
<section class="tab-panel" id="panel-pdf-imagenes">
    <div class="panel-header">
        <h2>PDF a Imágenes</h2>
        <p>Extrae cada página de tus documentos PDF como imágenes individuales (PNG, JPEG, WEBP) y descárgalas organizadas en ZIP, de forma individual o en lote.</p>
    </div>

    <div class="dropzone" id="dropzone-pdf-to-img">
        <input type="file" id="file-pdf-to-img" multiple accept=".pdf,application/pdf" class="file-input">
        <div class="dropzone-info">
            <i class="fa-solid fa-file-image dropzone-icon"></i>
            <h3>Selecciona o arrastra tus archivos PDF</h3>
            <p>Procesa un solo PDF o múltiples PDFs a la vez</p>
        </div>
    </div>

    <div class="file-preview-card" id="preview-pdf-to-img" style="display: none;">
        <div class="files-list-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;">
            <h3 style="margin: 0; font-size: 1rem;">PDFs seleccionados (<span id="count-pdf-to-img">0</span>)</h3>
            <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-secondary" id="btn-add-more-pdf-to-img" style="padding: 6px 14px; font-size: 0.85rem;">
                    <i class="fa-solid fa-plus"></i> Añadir más
                </button>
                <button type="button" class="btn btn-secondary" id="btn-clear-pdf-to-img" style="padding: 6px 14px; font-size: 0.85rem;">
                    <i class="fa-solid fa-trash-can"></i> Vaciar
                </button>
            </div>
        </div>

        <ul class="files-list" id="files-list-pdf-to-img" style="max-height: 280px; overflow-y: auto; margin-bottom: 1.5rem;"></ul>

        <div class="tool-options">
            <h3>Formato de las Imágenes de Salida</h3>
            <div class="format-selection">
                <label class="select-label" for="format-pdf-to-img">Formato:</label>
                <div class="select-wrapper">
                    <select id="format-pdf-to-img">
                        <option value="png">PNG (Sin pérdida de calidad)</option>
                        <option value="jpeg">JPEG (Comprimido y ligero)</option>
                        <option value="webp">WEBP (Optimizado moderno)</option>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <div class="actions-panel" id="actions-pdf-to-img" style="display: none;">
        <button class="btn btn-primary" id="btn-run-pdf-to-img">
            <i class="fa-solid fa-file-zipper"></i> <span id="btn-pdf-to-img-label">Convertir y Descargar ZIP</span>
        </button>
    </div>
</section>
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')
    ]);

    // TOOL 5: PDF A IMÁGENES (PDF TO IMAGES & BATCH PROCESSING)
    // ----------------------------------------------------------------------
    let pdfFilesList = [];

    function isPdfFile(file) {
        if (!file) return false;
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    }

    setupDropzone('dropzone-pdf-to-img', 'file-pdf-to-img', (files) => {
        let addedCount = 0;
        for (const file of files) {
            if (isPdfFile(file)) {
                if (!pdfFilesList.some(f => f.name === file.name && f.size === file.size)) {
                    pdfFilesList.push(file);
                    addedCount++;
                }
            } else {
                showToast(`El archivo "${file.name}" no es un PDF válido.`, 'warning');
            }
        }
        if (addedCount > 0) {
            showToast(`${addedCount} archivo(s) PDF añadido(s)`, 'success');
        }
        updatePdfToImgUI();
    });

    const btnAddMore = document.getElementById('btn-add-more-pdf-to-img');
    if (btnAddMore) {
        btnAddMore.addEventListener('click', () => {
            const input = document.getElementById('file-pdf-to-img');
            if (input) input.click();
        });
    }

    const btnClear = document.getElementById('btn-clear-pdf-to-img');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            resetPdfToImgUI();
            showToast('Lista de PDFs vaciada', 'info');
        });
    }

    function resetPdfToImgUI() {
        pdfFilesList = [];
        updatePdfToImgUI();
        const input = document.getElementById('file-pdf-to-img');
        if (input) input.value = '';
    }

    function updatePdfToImgUI() {
        const previewEl = document.getElementById('preview-pdf-to-img');
        const actionsEl = document.getElementById('actions-pdf-to-img');
        const listEl = document.getElementById('files-list-pdf-to-img');
        const countEl = document.getElementById('count-pdf-to-img');
        const btnLabel = document.getElementById('btn-pdf-to-img-label');
        const dropzoneEl = document.getElementById('dropzone-pdf-to-img');

        if (!previewEl || !actionsEl || !listEl || !countEl) return;

        listEl.innerHTML = '';
        countEl.textContent = pdfFilesList.length;

        if (pdfFilesList.length > 0) {
            previewEl.style.display = 'block';
            actionsEl.style.display = 'flex';
            if (dropzoneEl) dropzoneEl.style.padding = '1.8rem 1rem';

            if (btnLabel) {
                if (pdfFilesList.length === 1) {
                    btnLabel.textContent = 'Convertir y Descargar ZIP';
                } else {
                    btnLabel.textContent = `Convertir ${pdfFilesList.length} PDFs a Imágenes (ZIP)`;
                }
            }

            pdfFilesList.forEach((file, index) => {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.innerHTML = `
                    <div class="file-info-group">
                        <i class="fa-solid fa-file-pdf file-item-icon"></i>
                        <span class="file-item-name" title="${file.name}">${file.name}</span>
                        <span class="file-item-size">${formatBytes(file.size)}</span>
                    </div>
                    <div class="file-order-controls">
                        <button type="button" class="btn-icon btn-danger-hover btn-delete" title="Quitar">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;

                li.querySelector('.btn-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    pdfFilesList.splice(index, 1);
                    updatePdfToImgUI();
                });

                listEl.appendChild(li);
            });
        } else {
            previewEl.style.display = 'none';
            actionsEl.style.display = 'none';
            if (dropzoneEl) dropzoneEl.style.padding = '3.5rem 2rem';
        }
    }

    document.getElementById('btn-run-pdf-to-img').addEventListener('click', async () => {
        if (pdfFilesList.length === 0) return;

        const format = document.getElementById('format-pdf-to-img').value;
        const mimeType = format === 'png' ? 'image/png' : (format === 'webp' ? 'image/webp' : 'image/jpeg');
        const totalPdfs = pdfFilesList.length;

        try {
            const masterZip = new JSZip();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            for (let docIdx = 0; docIdx < totalPdfs; docIdx++) {
                const file = pdfFilesList[docIdx];
                showLoader(`Procesando PDF (${docIdx + 1} de ${totalPdfs}): ${file.name}...`);

                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const totalPages = pdfDoc.numPages;
                const originalBase = file.name.replace(/\.[^/.]+$/, "");

                // Folder in ZIP if multiple PDFs
                const folder = totalPdfs > 1 ? masterZip.folder(originalBase) : masterZip;

                for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                    showLoader(`PDF ${docIdx + 1}/${totalPdfs} - Renderizando página ${pageNum} de ${totalPages}...`);
                    const page = await pdfDoc.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 2.0 });
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({
                        canvasContext: ctx,
                        viewport: viewport
                    }).promise;

                    const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.95));
                    folder.file(`pagina_${pageNum}.${format}`, blob);
                }
            }

            showLoader('Generando archivo ZIP...');
            const zipBlob = await masterZip.generateAsync({ type: 'blob' });

            const outputName = totalPdfs === 1 
                ? `${pdfFilesList[0].name.replace(/\.[^/.]+$/, "")}_paginas_${format}.zip`
                : `PDFs_a_imagenes_${format}.zip`;

            downloadBlob(zipBlob, outputName);
            showToast('¡Páginas extraídas y empaquetadas en ZIP con éxito!', 'success');
            resetPdfToImgUI();
        } catch (error) {
            console.error('Error al convertir PDFs a imágenes:', error);
            showToast('Error al convertir las páginas del PDF. Verifica que no tenga contraseña.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------
}

