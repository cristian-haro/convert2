export const html = `
<section class="tab-panel" id="panel-compresor-pdf">
    <div class="panel-header">
        <h2>Comprimir Archivo PDF</h2>
        <p>Optimiza y reduce el peso de tus PDFs ajustando la resolución y calidad de sus páginas de manera local, de forma individual o en lote.</p>
    </div>

    <div class="dropzone" id="dropzone-compresor-pdf">
        <input type="file" id="file-compresor-pdf" multiple accept=".pdf,application/pdf" class="file-input">
        <div class="dropzone-info">
            <i class="fa-solid fa-compress dropzone-icon"></i>
            <h3>Selecciona o arrastra tus archivos PDF</h3>
            <p>Procesa un solo PDF o múltiples PDFs a la vez</p>
        </div>
    </div>

    <div class="file-preview-card" id="preview-compresor-pdf" style="display: none;">
        <div class="files-list-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;">
            <h3 style="margin: 0; font-size: 1rem;">PDFs seleccionados (<span id="count-compresor-pdf">0</span>)</h3>
            <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-secondary" id="btn-add-more-compresor-pdf" style="padding: 6px 14px; font-size: 0.85rem;">
                    <i class="fa-solid fa-plus"></i> Añadir más
                </button>
                <button type="button" class="btn btn-secondary" id="btn-clear-compresor-pdf" style="padding: 6px 14px; font-size: 0.85rem;">
                    <i class="fa-solid fa-trash-can"></i> Vaciar
                </button>
            </div>
        </div>

        <ul class="files-list" id="files-list-compresor-pdf" style="max-height: 260px; overflow-y: auto; margin-bottom: 1.5rem;"></ul>

        <div class="tool-options">
            <h3>Opciones de Compresión</h3>
            <div class="option-grid-2col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem;">
                <div class="input-group">
                    <label for="compress-pdf-resolution">Resolución máxima (DPI):</label>
                    <div class="select-wrapper">
                        <select id="compress-pdf-resolution">
                            <option value="72">Baja (72 DPI) - Tamaño mínimo</option>
                            <option value="150" selected>Media (150 DPI) - Recomendado</option>
                            <option value="300">Alta (300 DPI) - Impresión</option>
                        </select>
                    </div>
                </div>
                <div class="input-group">
                    <label for="compress-pdf-quality" style="display: flex; justify-content: space-between;">
                        <span>Calidad de compresión:</span>
                        <span id="val-compress-pdf-quality">60%</span>
                    </label>
                    <input type="range" id="compress-pdf-quality" min="10" max="100" value="60" class="input-slider" style="margin-top: 0.5rem; width: 100%;">
                </div>
            </div>
            <p class="info-warning" style="margin-top: 1.5rem; background: rgba(245, 158, 11, 0.1); border-left: 4px solid var(--warning-color); padding: 10px 14px; border-radius: var(--border-radius-sm); font-size: 0.88rem; color: var(--color-text);">
                <i class="fa-solid fa-triangle-exclamation" style="color: var(--warning-color); margin-right: 6px;"></i> <strong>Nota:</strong> Este proceso comprime el PDF optimizando las páginas como imágenes en el cliente. El texto del archivo resultante será plano (no seleccionable).
            </p>
        </div>
    </div>

    <div class="actions-panel" id="actions-compresor-pdf" style="display: none;">
        <button class="btn btn-primary" id="btn-run-compresor-pdf">
            <i class="fa-solid fa-compress"></i> <span id="btn-compresor-pdf-label">Comprimir y Descargar PDF</span>
        </button>
    </div>
</section>
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')
    ]);

    // TOOL 12c: COMPRIMIR PDF (PDF COMPRESSOR & BATCH PROCESSING)
    // ----------------------------------------------------------------------
    let compressPdfFilesList = [];

    function isPdfFile(file) {
        if (!file) return false;
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    }

    setupDropzone('dropzone-compresor-pdf', 'file-compresor-pdf', (files) => {
        let addedCount = 0;
        for (const file of files) {
            if (isPdfFile(file)) {
                if (!compressPdfFilesList.some(f => f.name === file.name && f.size === file.size)) {
                    compressPdfFilesList.push(file);
                    addedCount++;
                }
            } else {
                showToast(`El archivo "${file.name}" no es un PDF válido.`, 'warning');
            }
        }
        if (addedCount > 0) {
            showToast(`${addedCount} archivo(s) PDF añadido(s)`, 'success');
        }
        updateCompressPdfUI();
    });

    const qualityInput = document.getElementById('compress-pdf-quality');
    const qualityValEl = document.getElementById('val-compress-pdf-quality');
    if (qualityInput && qualityValEl) {
        qualityInput.addEventListener('input', (e) => {
            qualityValEl.textContent = `${e.target.value}%`;
        });
    }

    const btnAddMore = document.getElementById('btn-add-more-compresor-pdf');
    if (btnAddMore) {
        btnAddMore.addEventListener('click', () => {
            const input = document.getElementById('file-compresor-pdf');
            if (input) input.click();
        });
    }

    const btnClear = document.getElementById('btn-clear-compresor-pdf');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            resetCompressPdfUI();
            showToast('Lista de PDFs vaciada', 'info');
        });
    }

    function resetCompressPdfUI() {
        compressPdfFilesList = [];
        updateCompressPdfUI();
        const input = document.getElementById('file-compresor-pdf');
        if (input) input.value = '';
    }

    function updateCompressPdfUI() {
        const previewEl = document.getElementById('preview-compresor-pdf');
        const actionsEl = document.getElementById('actions-compresor-pdf');
        const listEl = document.getElementById('files-list-compresor-pdf');
        const countEl = document.getElementById('count-compresor-pdf');
        const btnLabel = document.getElementById('btn-compresor-pdf-label');
        const dropzoneEl = document.getElementById('dropzone-compresor-pdf');

        if (!previewEl || !actionsEl || !listEl || !countEl) return;

        listEl.innerHTML = '';
        countEl.textContent = compressPdfFilesList.length;

        if (compressPdfFilesList.length > 0) {
            previewEl.style.display = 'block';
            actionsEl.style.display = 'flex';
            if (dropzoneEl) dropzoneEl.style.padding = '1.8rem 1rem';

            if (btnLabel) {
                if (compressPdfFilesList.length === 1) {
                    btnLabel.textContent = 'Comprimir y Descargar PDF';
                } else {
                    btnLabel.textContent = `Comprimir ${compressPdfFilesList.length} PDFs en Lote (ZIP)`;
                }
            }

            compressPdfFilesList.forEach((file, index) => {
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
                    compressPdfFilesList.splice(index, 1);
                    updateCompressPdfUI();
                });

                listEl.appendChild(li);
            });
        } else {
            previewEl.style.display = 'none';
            actionsEl.style.display = 'none';
            if (dropzoneEl) dropzoneEl.style.padding = '3.5rem 2rem';
        }
    }

    async function compressSinglePdf(file, dpi, quality, docIndex, totalDocs) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdfDoc.numPages;
        const newDoc = await PDFLib.PDFDocument.create();

        for (let i = 1; i <= totalPages; i++) {
            showLoader(`PDF (${docIndex + 1}/${totalDocs}): Comprimiendo pág. ${i} de ${totalPages}...`);
            const page = await pdfDoc.getPage(i);
            const scale = dpi / 72;
            const viewport = page.getViewport({ scale: scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
            const imgBytes = await jpegBlob.arrayBuffer();
            const embeddedImage = await newDoc.embedJpg(imgBytes);

            const newPage = newDoc.addPage([viewport.width / scale, viewport.height / scale]);
            newPage.drawImage(embeddedImage, {
                x: 0,
                y: 0,
                width: newPage.getWidth(),
                height: newPage.getHeight()
            });
        }

        const compressedBytes = await newDoc.save();
        return new Blob([compressedBytes], { type: 'application/pdf' });
    }

    document.getElementById('btn-run-compresor-pdf').addEventListener('click', async () => {
        if (compressPdfFilesList.length === 0) return;

        const dpi = parseInt(document.getElementById('compress-pdf-resolution').value, 10);
        const quality = parseInt(document.getElementById('compress-pdf-quality').value, 10) / 100;
        const totalDocs = compressPdfFilesList.length;

        try {
            if (totalDocs === 1) {
                const file = compressPdfFilesList[0];
                showLoader(`Comprimiendo PDF: ${file.name}...`);
                const blob = await compressSinglePdf(file, dpi, quality, 0, 1);
                const originalBase = file.name.replace(/\.[^/.]+$/, "");
                downloadBlob(blob, `${originalBase}_comprimido.pdf`);
                showToast('¡PDF comprimido descargado con éxito!', 'success');
                resetCompressPdfUI();
            } else {
                const zip = new JSZip();

                for (let i = 0; i < totalDocs; i++) {
                    const file = compressPdfFilesList[i];
                    showLoader(`Comprimiendo PDF (${i + 1} de ${totalDocs}): ${file.name}...`);
                    const blob = await compressSinglePdf(file, dpi, quality, i, totalDocs);
                    const originalBase = file.name.replace(/\.[^/.]+$/, "");
                    let zipName = `${originalBase}_comprimido.pdf`;
                    if (zip.file(zipName)) {
                        zipName = `${originalBase}_${i + 1}_comprimido.pdf`;
                    }
                    zip.file(zipName, blob);
                }

                showLoader('Empaquetando archivo ZIP con los PDFs comprimidos...');
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(zipBlob, 'PDFs_comprimidos.zip');
                showToast(`¡${totalDocs} PDFs comprimidos y descargados en ZIP!`, 'success');
                resetCompressPdfUI();
            }
        } catch (error) {
            console.error('Error al comprimir PDF:', error);
            showToast('Ocurrió un error al comprimir el PDF.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------
}

