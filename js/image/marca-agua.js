export const html = `
<section class="tab-panel" id="panel-marca-agua">
                <div class="panel-header">
                    <h2>Marca de Agua en Imagen</h2>
                    <p>Aplica un texto personalizado como marca de agua en el centro de tu imagen con transparencia.</p>
                </div>

                <div class="dropzone" id="dropzone-marca">
                    <input type="file" id="file-marca" accept="image/*" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-stamp dropzone-icon"></i>
                        <h3>Selecciona la imagen de origen</h3>
                        <p>Soporta PNG, JPG, JPEG, WEBP, GIF, BMP</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-marca" style="display: none;">
                    <div class="file-meta">
                        <div class="thumbnail-wrapper">
                            <img id="thumb-marca" class="img-thumbnail" src="" alt="Vista previa">
                        </div>
                        <div class="file-details">
                            <span class="file-name" id="name-marca">imagen.png</span>
                            <span class="file-size" id="size-marca">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-marca"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options">
                        <h3>Configuración de la Marca de Agua</h3>
                        <div class="input-group full-width">
                            <label for="watermark-text">Texto de la Marca de Agua:</label>
                            <input type="text" id="watermark-text" value="CONFIDENCIAL"
                                placeholder="Escribe el texto aquí...">
                        </div>
                        <p class="info-text"><i class="fa-solid fa-circle-info"></i> El texto se aplicará de forma
                            centrada en color negro con transparencia.</p>
                    </div>
                </div>

                <div class="actions-panel" id="actions-marca" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-marca">
                        <i class="fa-solid fa-stamp"></i> Aplicar Marca de Agua y Descargar
                    </button>
                </div>
            </section>

            <!-- 11b. Eliminar Fondo Panel [NEW] -->
`;

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
