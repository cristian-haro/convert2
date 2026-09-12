export const html = `
<section class="tab-panel" id="panel-compresor-img">
    <div class="panel-header">
        <h2>Comprimir Imagen</h2>
        <p>Reduce el peso de tus imágenes (JPG, PNG, WEBP y <strong>HEIC</strong>) ajustando el nivel de calidad, de forma individual o en lote.</p>
    </div>

    <div class="dropzone" id="dropzone-compresor">
        <input type="file" id="file-compresor" multiple accept="image/*,.heic,.heif" class="file-input">
        <div class="dropzone-info">
            <i class="fa-solid fa-minimize dropzone-icon"></i>
            <h3>Selecciona o arrastra tus imágenes</h3>
            <p>Soporta JPG, JPEG, PNG, WEBP, HEIC/HEIF (individual o en lote)</p>
        </div>
    </div>

    <div class="file-preview-card" id="preview-compresor" style="display: none;">
        <div class="files-list-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;">
            <h3 style="margin: 0; font-size: 1rem;">Imágenes seleccionadas (<span id="count-compresor">0</span>)</h3>
            <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-secondary" id="btn-add-more-compresor" style="padding: 6px 14px; font-size: 0.85rem;">
                    <i class="fa-solid fa-plus"></i> Añadir más
                </button>
                <button type="button" class="btn btn-secondary" id="btn-clear-compresor" style="padding: 6px 14px; font-size: 0.85rem;">
                    <i class="fa-solid fa-trash-can"></i> Vaciar
                </button>
            </div>
        </div>

        <ul class="files-list" id="files-list-compresor" style="max-height: 260px; overflow-y: auto; margin-bottom: 1.5rem;"></ul>

        <div class="tool-options">
            <h3>Nivel de Calidad</h3>
            <div class="range-inputs slider-layout">
                <div class="slider-wrapper">
                    <input type="range" id="compress-quality" min="10" max="100" value="80" class="input-slider">
                    <span class="slider-value" id="quality-value-display">80%</span>
                </div>
            </div>
        </div>
    </div>

    <div class="actions-panel" id="actions-compresor" style="display: none;">
        <button class="btn btn-primary" id="btn-run-compresor">
            <i class="fa-solid fa-minimize"></i> <span id="btn-compresor-label">Comprimir y Descargar</span>
        </button>
    </div>
</section>
`;

import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, isHeicFile, convertHeicToBlob, loadImageElement, loadScript } from '../helpers.js';

export function init() {
    // TOOL 9: COMPRIMIR IMAGEN (IMAGE COMPRESSOR & BATCH PROCESSING)
    // ----------------------------------------------------------------------
    let compressFilesList = [];

    function isSupportedImage(file) {
        if (!file) return false;
        if (isHeicFile(file)) return true;
        if (file.type && file.type.startsWith('image/')) return true;
        const ext = (file.name || '').split('.').pop().toLowerCase();
        return ['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif'].includes(ext);
    }

    setupDropzone('dropzone-compresor', 'file-compresor', (files) => {
        let addedCount = 0;
        for (const file of files) {
            if (isSupportedImage(file)) {
                if (!compressFilesList.some(f => f.name === file.name && f.size === file.size)) {
                    compressFilesList.push(file);
                    addedCount++;
                }
            } else {
                showToast(`El archivo "${file.name}" no es compatible para comprimir.`, 'warning');
            }
        }
        if (addedCount > 0) {
            showToast(`${addedCount} imagen(es) añadida(s)`, 'success');
        }
        updateCompressUI();
    });

    const qualitySlider = document.getElementById('compress-quality');
    const qualityValEl = document.getElementById('quality-value-display');

    if (qualitySlider && qualityValEl) {
        qualitySlider.addEventListener('input', (e) => {
            qualityValEl.textContent = `${e.target.value}%`;
        });
    }

    const btnAddMore = document.getElementById('btn-add-more-compresor');
    if (btnAddMore) {
        btnAddMore.addEventListener('click', () => {
            const input = document.getElementById('file-compresor');
            if (input) input.click();
        });
    }

    const btnClear = document.getElementById('btn-clear-compresor');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            resetCompressUI();
            showToast('Lista vaciada', 'info');
        });
    }

    function resetCompressUI() {
        compressFilesList = [];
        updateCompressUI();
        const input = document.getElementById('file-compresor');
        if (input) input.value = '';
    }

    function updateCompressUI() {
        const previewEl = document.getElementById('preview-compresor');
        const actionsEl = document.getElementById('actions-compresor');
        const listEl = document.getElementById('files-list-compresor');
        const countEl = document.getElementById('count-compresor');
        const btnLabel = document.getElementById('btn-compresor-label');
        const dropzoneEl = document.getElementById('dropzone-compresor');

        if (!previewEl || !actionsEl || !listEl || !countEl) return;

        listEl.innerHTML = '';
        countEl.textContent = compressFilesList.length;

        if (compressFilesList.length > 0) {
            previewEl.style.display = 'block';
            actionsEl.style.display = 'flex';
            if (dropzoneEl) dropzoneEl.style.padding = '1.8rem 1rem';

            if (btnLabel) {
                if (compressFilesList.length === 1) {
                    btnLabel.textContent = 'Comprimir y Descargar Imagen';
                } else {
                    btnLabel.textContent = `Comprimir ${compressFilesList.length} Imágenes en Lote (ZIP)`;
                }
            }

            compressFilesList.forEach((file, index) => {
                const li = document.createElement('li');
                li.className = 'file-item';

                const thumbWrapper = document.createElement('div');
                thumbWrapper.className = 'thumbnail-wrapper';
                const imgThumb = document.createElement('img');
                imgThumb.className = 'img-thumbnail';
                imgThumb.alt = file.name;

                const isHeic = isHeicFile(file);
                if (isHeic) {
                    imgThumb.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="%238b5cf6" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                    convertHeicToBlob(file, 'image/jpeg', 0.6).then(blob => {
                        imgThumb.src = URL.createObjectURL(blob);
                    }).catch(e => console.warn(e));
                } else {
                    imgThumb.src = URL.createObjectURL(file);
                }
                thumbWrapper.appendChild(imgThumb);

                const heicBadge = isHeic ? '<span style="background: rgba(139, 92, 246, 0.2); color: #a78bfa; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; margin-left: 6px; border: 1px solid rgba(139, 92, 246, 0.4);">HEIC</span>' : '';

                li.innerHTML = `
                    <div class="file-info-group">
                        <span class="file-item-name" title="${file.name}">${file.name} ${heicBadge}</span>
                        <span class="file-item-size">${formatBytes(file.size)}</span>
                    </div>
                    <div class="file-order-controls">
                        <button type="button" class="btn-icon btn-danger-hover btn-delete" title="Quitar">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;

                li.querySelector('.file-info-group').prepend(thumbWrapper);

                li.querySelector('.btn-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    compressFilesList.splice(index, 1);
                    updateCompressUI();
                });

                listEl.appendChild(li);
            });
        } else {
            previewEl.style.display = 'none';
            actionsEl.style.display = 'none';
            if (dropzoneEl) dropzoneEl.style.padding = '3.5rem 2rem';
        }
    }

    async function compressSingleFile(file, quality) {
        const img = await loadImageElement(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const format = (file.type === 'image/webp') ? 'image/webp' : 'image/jpeg';
        const ext = format === 'image/webp' ? 'webp' : 'jpg';

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error('Error al comprimir'));
            }, format, quality);
        });

        return { blob, ext };
    }

    document.getElementById('btn-run-compresor').addEventListener('click', async () => {
        if (compressFilesList.length === 0) return;

        const quality = parseFloat(document.getElementById('compress-quality').value) / 100;
        const total = compressFilesList.length;

        try {
            if (total === 1) {
                const file = compressFilesList[0];
                showLoader(`Comprimiendo ${file.name}...`);
                const { blob, ext } = await compressSingleFile(file, quality);
                const originalBase = file.name.replace(/\.[^/.]+$/, "");
                downloadBlob(blob, `${originalBase}_comprimido.${ext}`);
                showToast('¡Imagen comprimida con éxito!', 'success');
                resetCompressUI();
            } else {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
                const zip = new JSZip();

                for (let i = 0; i < total; i++) {
                    const file = compressFilesList[i];
                    showLoader(`Comprimiendo (${i + 1} de ${total}): ${file.name}...`);
                    const { blob, ext } = await compressSingleFile(file, quality);
                    const originalBase = file.name.replace(/\.[^/.]+$/, "");
                    let zipName = `${originalBase}_comprimido.${ext}`;
                    if (zip.file(zipName)) {
                        zipName = `${originalBase}_${i + 1}_comprimido.${ext}`;
                    }
                    zip.file(zipName, blob);
                }

                showLoader('Empaquetando archivo ZIP...');
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(zipBlob, 'imagenes_comprimidas.zip');
                showToast(`¡${total} imágenes comprimidas y empaquetadas en ZIP!`, 'success');
                resetCompressUI();
            }
        } catch (err) {
            console.error('Error al comprimir:', err);
            showToast('Error al comprimir las imágenes.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------
}

