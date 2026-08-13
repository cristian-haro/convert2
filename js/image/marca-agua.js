import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export function init() {
    // TOOL 11: MARCA DE AGUA (IMAGE WATERMARK)
    // ----------------------------------------------------------------------
    let watermarkImageFile = null;

    setupDropzone('dropzone-marca', 'file-marca', (files) => {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            watermarkImageFile = file;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('thumb-marca').src = e.target.result;
            };
            reader.readAsDataURL(file);

            document.getElementById('dropzone-marca').style.display = 'none';
            document.getElementById('preview-marca').style.display = 'block';
            document.getElementById('actions-marca').style.display = 'flex';
            
            document.getElementById('name-marca').textContent = file.name;
            document.getElementById('size-marca').textContent = formatBytes(file.size);
            showToast('Imagen cargada correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo de imagen válido.', 'warning');
        }
    });

    function resetWatermarkUI() {
        watermarkImageFile = null;
        document.getElementById('dropzone-marca').style.display = 'block';
        document.getElementById('preview-marca').style.display = 'none';
        document.getElementById('actions-marca').style.display = 'none';
        document.getElementById('file-marca').value = '';
        document.getElementById('thumb-marca').src = '';
    }

    document.getElementById('btn-remove-marca').addEventListener('click', resetWatermarkUI);

    document.getElementById('btn-run-marca').addEventListener('click', () => {
        if (!watermarkImageFile) return;

        const text = document.getElementById('watermark-text').value.trim();
        if (!text) {
            showToast('Por favor, escribe un texto para la marca de agua.', 'warning');
            return;
        }

        showLoader('Aplicando marca de agua...');

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.drawImage(img, 0, 0);
                    
                    const fontSize = Math.max(16, Math.floor(canvas.width / 12));
                    ctx.font = `bold ${fontSize}px 'Outfit', 'Arial', sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.39)';
                    
                    const x = canvas.width / 2;
                    const y = canvas.height / 2;
                    ctx.fillText(text, x, y);
                    
                    const outputFormat = watermarkImageFile.type;
                    const originalBase = watermarkImageFile.name.replace(/\.[^/.]+$/, "");
                    const ext = watermarkImageFile.name.split('.').pop();
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            downloadBlob(blob, `${originalBase}_watermark.${ext}`);
                            showToast('Marca de agua aplicada con éxito!', 'success');
                            resetWatermarkUI();
                        } else {
                            showToast('Error al exportar la imagen.', 'error');
                        }
                        hideLoader();
                    }, outputFormat, 0.95);
                } catch (err) {
                    console.error(err);
                    showToast('Error al procesar la imagen.', 'error');
                    hideLoader();
                }
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(watermarkImageFile);
    });

    // ----------------------------------------------------------------------

}
