export const html = `
<section class="tab-panel" id="panel-recortar-img">
                <div class="panel-header">
                    <h2>Recortar y Redimensionar Imagen</h2>
                    <p>Modifica el tamaño en píxeles y recorta los bordes de tus imágenes de forma rápida.</p>
                </div>

                <div class="dropzone" id="dropzone-recortar">
                    <input type="file" id="file-recortar" accept="image/*" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-crop-simple dropzone-icon"></i>
                        <h3>Selecciona tu imagen</h3>
                        <p>Arrastra el archivo o haz clic para buscar</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-recortar" style="display: none;">
                    <div class="file-meta">
                        <div class="thumbnail-wrapper">
                            <img id="thumb-recortar" class="img-thumbnail" src="" alt="Vista previa">
                        </div>
                        <div class="file-details">
                            <span class="file-name" id="name-recortar">imagen.png</span>
                            <span class="file-size" id="size-recortar">0 KB</span>
                            <span class="file-resolution-text" id="res-recortar">0 x 0 píxeles</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-recortar"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="resize-crop-editor-layout">
                        <!-- Option 1: Resize -->
                        <div class="editor-option-card">
                            <h3><i class="fa-solid fa-up-right-and-down-left-from-center"></i> Redimensionar</h3>
                            <div class="range-inputs inline-editor-inputs">
                                <div class="input-group">
                                    <label for="resize-width">Ancho (px):</label>
                                    <input type="number" id="resize-width" min="1">
                                </div>
                                <div class="input-group">
                                    <label for="resize-height">Alto (px):</label>
                                    <input type="number" id="resize-height" min="1">
                                </div>
                            </div>
                            <label class="checkbox-wrapper">
                                <input type="checkbox" id="maintain-aspect" checked>
                                <span>Mantener relación de aspecto</span>
                            </label>
                        </div>

                        <!-- Option 2: Crop -->
                        <div class="editor-option-card">
                            <h3><i class="fa-solid fa-crop"></i> Recortar Bordes</h3>
                            <div class="range-inputs inline-editor-inputs-4">
                                <div class="input-group">
                                    <label for="crop-x">X de Inicio:</label>
                                    <input type="number" id="crop-x" min="0" value="0">
                                </div>
                                <div class="input-group">
                                    <label for="crop-y">Y de Inicio:</label>
                                    <input type="number" id="crop-y" min="0" value="0">
                                </div>
                                <div class="input-group">
                                    <label for="crop-width">Ancho Recorte:</label>
                                    <input type="number" id="crop-width" min="1">
                                </div>
                                <div class="input-group">
                                    <label for="crop-height">Alto Recorte:</label>
                                    <input type="number" id="crop-height" min="1">
                                </div>
                            </div>
                            <button class="btn btn-secondary-icon" id="btn-full-crop"><i
                                    class="fa-solid fa-arrows-to-eye"></i> Reiniciar al área total</button>
                        </div>
                    </div>
                </div>

                <div class="actions-panel" id="actions-recortar" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-recortar">
                        <i class="fa-solid fa-crop-simple"></i> Procesar y Descargar Imagen
                    </button>
                </div>
            </section>

            <!-- 11. Marca de Agua Panel -->
`;

import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export function init() {
    // TOOL 10: RECORTAR Y REDIMENSIONAR [NEW]
    // ----------------------------------------------------------------------
    let cropImageFile = null;
    let originalImageWidth = 0;
    let originalImageHeight = 0;

    setupDropzone('dropzone-recortar', 'file-recortar', (files) => {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            cropImageFile = file;
            
            const img = new Image();
            img.onload = () => {
                originalImageWidth = img.naturalWidth;
                originalImageHeight = img.naturalHeight;
                
                // Show metadata in UI
                document.getElementById('name-recortar').textContent = file.name;
                document.getElementById('size-recortar').textContent = formatBytes(file.size);
                document.getElementById('res-recortar').textContent = `${originalImageWidth} x ${originalImageHeight} píxeles`;
                
                // Populate inputs
                document.getElementById('resize-width').value = originalImageWidth;
                document.getElementById('resize-height').value = originalImageHeight;
                
                document.getElementById('crop-x').value = 0;
                document.getElementById('crop-y').value = 0;
                document.getElementById('crop-width').value = originalImageWidth;
                document.getElementById('crop-height').value = originalImageHeight;

                document.getElementById('dropzone-recortar').style.display = 'none';
                document.getElementById('preview-recortar').style.display = 'block';
                document.getElementById('actions-recortar').style.display = 'flex';
                
                // Show thumbnail
                document.getElementById('thumb-recortar').src = img.src;
                showToast('Imagen cargada correctamente', 'success');
            };
            img.src = URL.createObjectURL(file);
        } else {
            showToast('Por favor, selecciona un archivo de imagen válido.', 'warning');
        }
    });

    // Aspect Ratio Lock logic
    const resizeWidthInput = document.getElementById('resize-width');
    const resizeHeightInput = document.getElementById('resize-height');
    const aspectCheckbox = document.getElementById('maintain-aspect');

    resizeWidthInput.addEventListener('input', () => {
        if (aspectCheckbox.checked && originalImageWidth > 0) {
            const ratio = originalImageHeight / originalImageWidth;
            resizeHeightInput.value = Math.round(parseFloat(resizeWidthInput.value) * ratio) || '';
        }
    });

    resizeHeightInput.addEventListener('input', () => {
        if (aspectCheckbox.checked && originalImageHeight > 0) {
            const ratio = originalImageWidth / originalImageHeight;
            resizeWidthInput.value = Math.round(parseFloat(resizeHeightInput.value) * ratio) || '';
        }
    });

    document.getElementById('btn-full-crop').addEventListener('click', () => {
        document.getElementById('crop-x').value = 0;
        document.getElementById('crop-y').value = 0;
        document.getElementById('crop-width').value = originalImageWidth;
        document.getElementById('crop-height').value = originalImageHeight;
        showToast('Área de recorte restablecida al total', 'info');
    });

    function resetCropUI() {
        cropImageFile = null;
        originalImageWidth = 0;
        originalImageHeight = 0;
        
        document.getElementById('dropzone-recortar').style.display = 'block';
        document.getElementById('preview-recortar').style.display = 'none';
        document.getElementById('actions-recortar').style.display = 'none';
        document.getElementById('file-recortar').value = '';
        document.getElementById('thumb-recortar').src = '';
    }

    document.getElementById('btn-remove-recortar').addEventListener('click', resetCropUI);

    document.getElementById('btn-run-recortar').addEventListener('click', () => {
        if (!cropImageFile) return;

        const targetWidth = parseInt(resizeWidthInput.value, 10);
        const targetHeight = parseInt(resizeHeightInput.value, 10);

        const cropX = parseInt(document.getElementById('crop-x').value, 10);
        const cropY = parseInt(document.getElementById('crop-y').value, 10);
        const cropWidth = parseInt(document.getElementById('crop-width').value, 10);
        const cropHeight = parseInt(document.getElementById('crop-height').value, 10);

        if (isNaN(targetWidth) || isNaN(targetHeight) || targetWidth <= 0 || targetHeight <= 0) {
            showToast('Los valores de redimensionamiento no son válidos.', 'warning');
            return;
        }
        if (isNaN(cropX) || isNaN(cropY) || isNaN(cropWidth) || isNaN(cropHeight) || cropWidth <= 0 || cropHeight <= 0) {
            showToast('Los valores de recorte no son válidos.', 'warning');
            return;
        }

        showLoader('Redimensionando y recortando...');

        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');

                // Draw sub-rectangle (crop box) stretching/fitting into destination width/height
                ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

                const ext = cropImageFile.name.split('.').pop();
                const outputMime = cropImageFile.type;
                const originalBase = cropImageFile.name.replace(/\.[^/.]+$/, "");

                canvas.toBlob((blob) => {
                    if (blob) {
                        downloadBlob(blob, `${originalBase}_procesado.${ext}`);
                        showToast('Imagen procesada con éxito!', 'success');
                        resetCropUI();
                    } else {
                        showToast('Error al exportar.', 'error');
                    }
                    hideLoader();
                }, outputMime, 0.95);
            } catch (err) {
                console.error(err);
                showToast('Error al procesar la imagen.', 'error');
                hideLoader();
            }
        };
        img.src = URL.createObjectURL(cropImageFile);
    });

    // ----------------------------------------------------------------------

}
