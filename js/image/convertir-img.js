export const html = `
<section class="tab-panel" id="panel-convertir-img">
    <div class="panel-header">
        <h2>Convertir Formato de Imagen</h2>
        <p>Convierte tus fotos e imágenes (incluyendo <strong>HEIC/HEIF</strong> de iPhone/móvil) a PNG, JPG, WEBP, GIF, BMP o crea <strong>iconos (.ICO)</strong> de forma individual o en lote.</p>
    </div>

    <div class="dropzone" id="dropzone-convertir">
        <input type="file" id="file-convertir" multiple accept="image/*,.heic,.heif" class="file-input">
        <div class="dropzone-info">
            <i class="fa-solid fa-images dropzone-icon"></i>
            <h3>Selecciona o arrastra tus imágenes aquí</h3>
            <p>Soporta PNG, JPG, JPEG, WEBP, HEIC/HEIF, GIF, BMP (procesamiento individual o en lote)</p>
        </div>
    </div>

    <div class="file-preview-card" id="preview-convertir" style="display: none;">
        <div class="files-list-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px;">
            <h3 style="margin: 0; font-size: 1rem;">Imágenes seleccionadas (<span id="count-convertir">0</span>)</h3>
            <div style="display: flex; gap: 8px;">
                <button type="button" class="btn btn-secondary" id="btn-add-more-convertir" style="padding: 6px 14px; font-size: 0.85rem;">
                    <i class="fa-solid fa-plus"></i> Añadir más
                </button>
                <button type="button" class="btn btn-secondary" id="btn-clear-convertir" style="padding: 6px 14px; font-size: 0.85rem;">
                    <i class="fa-solid fa-trash-can"></i> Vaciar
                </button>
            </div>
        </div>

        <ul class="files-list" id="files-list-convertir" style="max-height: 320px; overflow-y: auto; margin-bottom: 1.5rem;"></ul>

        <div class="tool-options">
            <h3>Configuración del Formato Destino</h3>
            <div class="format-selection">
                <label class="select-label" for="format-select">Formato destino:</label>
                <div class="select-wrapper">
                    <select id="format-select">
                        <option value="png">PNG (Transparencia / Sin pérdida)</option>
                        <option value="jpeg">JPEG (Comprimido / Foto)</option>
                        <option value="webp">WEBP (Optimizado web)</option>
                        <option value="ico">ICO (Icono de Windows)</option>
                        <option value="gif">GIF (Imagen simple)</option>
                        <option value="bmp">BMP (Bitmap estándar)</option>
                    </select>
                </div>
            </div>
        </div>
    </div>

    <div class="actions-panel" id="actions-convertir" style="display: none;">
        <button class="btn btn-primary" id="btn-run-convertir">
            <i class="fa-solid fa-file-export"></i> <span id="btn-convertir-label">Convertir y Descargar</span>
        </button>
    </div>
</section>
`;

import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, isHeicFile, convertHeicToBlob, loadImageElement, loadScript } from '../helpers.js';

export function init() {
    // TOOL 8: CONVERTIR IMAGEN (IMAGE CONVERTER & BATCH PROCESSING)
    // ----------------------------------------------------------------------
    let convertFilesList = [];

    function isSupportedImage(file) {
        if (!file) return false;
        if (isHeicFile(file)) return true;
        if (file.type && file.type.startsWith('image/')) return true;
        const ext = (file.name || '').split('.').pop().toLowerCase();
        return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'heic', 'heif', 'ico', 'svg', 'tiff', 'tif'].includes(ext);
    }

    setupDropzone('dropzone-convertir', 'file-convertir', (files) => {
        let addedCount = 0;
        for (const file of files) {
            if (isSupportedImage(file)) {
                if (!convertFilesList.some(f => f.name === file.name && f.size === file.size)) {
                    convertFilesList.push(file);
                    addedCount++;
                }
            } else {
                showToast(`El archivo "${file.name}" no es una imagen compatible.`, 'warning');
            }
        }
        if (addedCount > 0) {
            showToast(`${addedCount} imagen(es) añadida(s) correctamente`, 'success');
        }
        updateConvertUI();
    });

    const btnAddMore = document.getElementById('btn-add-more-convertir');
    if (btnAddMore) {
        btnAddMore.addEventListener('click', () => {
            const input = document.getElementById('file-convertir');
            if (input) input.click();
        });
    }

    const btnClear = document.getElementById('btn-clear-convertir');
    if (btnClear) {
        btnClear.addEventListener('click', () => {
            resetConvertImageUI();
            showToast('Lista de imágenes vaciada', 'info');
        });
    }

    function resetConvertImageUI() {
        convertFilesList = [];
        updateConvertUI();
        const input = document.getElementById('file-convertir');
        if (input) input.value = '';
    }

    function updateConvertUI() {
        const previewEl = document.getElementById('preview-convertir');
        const actionsEl = document.getElementById('actions-convertir');
        const listEl = document.getElementById('files-list-convertir');
        const countEl = document.getElementById('count-convertir');
        const btnLabel = document.getElementById('btn-convertir-label');
        const dropzoneEl = document.getElementById('dropzone-convertir');

        if (!previewEl || !actionsEl || !listEl || !countEl) return;

        listEl.innerHTML = '';
        countEl.textContent = convertFilesList.length;

        if (convertFilesList.length > 0) {
            previewEl.style.display = 'block';
            actionsEl.style.display = 'flex';
            if (dropzoneEl) dropzoneEl.style.padding = '1.8rem 1rem';

            if (btnLabel) {
                if (convertFilesList.length === 1) {
                    btnLabel.textContent = 'Convertir y Descargar Imagen';
                } else {
                    btnLabel.textContent = `Convertir ${convertFilesList.length} Imágenes en Lote (ZIP)`;
                }
            }

            convertFilesList.forEach((file, index) => {
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
                    // Asynchronously load thumbnail for HEIC
                    convertHeicToBlob(file, 'image/jpeg', 0.6).then(blob => {
                        imgThumb.src = URL.createObjectURL(blob);
                    }).catch(err => {
                        console.warn('Could not generate HEIC preview thumbnail:', err);
                    });
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
                    convertFilesList.splice(index, 1);
                    updateConvertUI();
                });

                listEl.appendChild(li);
            });
        } else {
            previewEl.style.display = 'none';
            actionsEl.style.display = 'none';
            if (dropzoneEl) dropzoneEl.style.padding = '3.5rem 2rem';
        }
    }

    // Canvas to ICO binary builder
    function canvasToIco(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob((pngBlob) => {
                pngBlob.arrayBuffer().then((pngBuffer) => {
                    const pngSize = pngBuffer.byteLength;
                    const buffer = new ArrayBuffer(22 + pngSize);
                    const view = new DataView(buffer);
                    
                    view.setUint16(0, 0, true); 
                    view.setUint16(2, 1, true); 
                    view.setUint16(4, 1, true); 
                    
                    const width = canvas.width >= 256 ? 0 : canvas.width;
                    const height = canvas.height >= 256 ? 0 : canvas.height;
                    view.setUint8(6, width); 
                    view.setUint8(7, height); 
                    view.setUint8(8, 0); 
                    view.setUint8(9, 0); 
                    view.setUint16(10, 1, true); 
                    view.setUint16(12, 32, true); 
                    view.setUint32(14, pngSize, true); 
                    view.setUint32(18, 22, true); 
                    
                    const destArray = new Uint8Array(buffer, 22);
                    const srcArray = new Uint8Array(pngBuffer);
                    destArray.set(srcArray);
                    
                    resolve(new Blob([buffer], { type: 'image/x-icon' }));
                });
            }, 'image/png');
        });
    }

    async function convertSingleFileToBlob(file, targetFormat) {
        const img = await loadImageElement(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        if (targetFormat === 'ico') {
            return await canvasToIco(canvas);
        }

        let mimeType = `image/${targetFormat}`;
        if (targetFormat === 'jpeg') mimeType = 'image/jpeg';

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error(`No se pudo generar la imagen en formato ${targetFormat}`));
                }
            }, mimeType, 0.95);
        });
    }

    document.getElementById('btn-run-convertir').addEventListener('click', async () => {
        if (convertFilesList.length === 0) return;

        const targetFormat = document.getElementById('format-select').value;
        const total = convertFilesList.length;

        try {
            if (total === 1) {
                const file = convertFilesList[0];
                showLoader(`Convirtiendo ${file.name} a ${targetFormat.toUpperCase()}...`);
                const blob = await convertSingleFileToBlob(file, targetFormat);
                const originalBase = file.name.replace(/\.[^/.]+$/, "");
                const outputFilename = `${originalBase}_convertido.${targetFormat}`;
                downloadBlob(blob, outputFilename);
                showToast(`¡Imagen convertida a ${targetFormat.toUpperCase()} con éxito!`, 'success');
                resetConvertImageUI();
            } else {
                await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
                const zip = new JSZip();

                for (let i = 0; i < total; i++) {
                    const file = convertFilesList[i];
                    showLoader(`Convirtiendo (${i + 1} de ${total}): ${file.name}...`);
                    const blob = await convertSingleFileToBlob(file, targetFormat);
                    const originalBase = file.name.replace(/\.[^/.]+$/, "");
                    // Evitar colisión de nombres duplicados en el zip
                    let zipFilename = `${originalBase}.${targetFormat}`;
                    if (zip.file(zipFilename)) {
                        zipFilename = `${originalBase}_${i + 1}.${targetFormat}`;
                    }
                    zip.file(zipFilename, blob);
                }

                showLoader('Empaquetando archivo ZIP con todas las imágenes convertidas...');
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                downloadBlob(zipBlob, `imagenes_convertidas_${targetFormat}.zip`);
                showToast(`¡${total} imágenes convertidas y descargadas en ZIP!`, 'success');
                resetConvertImageUI();
            }
        } catch (err) {
            console.error('Error durante la conversión en lote:', err);
            showToast('Error al procesar las imágenes. Revisa el formato de origen.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------
}

