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
