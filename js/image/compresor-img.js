export const html = `
<section class="tab-panel" id="panel-compresor-img">
                <div class="panel-header">
                    <h2>Comprimir Imagen</h2>
                    <p>Reduce el tamaño de almacenamiento de tus imágenes (JPG/WEBP) ajustando su nivel de calidad.</p>
                </div>

                <div class="dropzone" id="dropzone-compresor">
                    <input type="file" id="file-compresor" accept="image/jpeg, image/png, image/webp"
                        class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-minimize dropzone-icon"></i>
                        <h3>Selecciona tu imagen</h3>
                        <p>Soporta JPG, JPEG, PNG y WEBP</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-compresor" style="display: none;">
                    <div class="file-meta">
                        <div class="thumbnail-wrapper">
                            <img id="thumb-compresor" class="img-thumbnail" src="" alt="Vista previa">
                        </div>
                        <div class="file-details">
                            <span class="file-name" id="name-compresor">imagen.jpg</span>
                            <span class="file-size" id="size-compresor">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-compresor"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options">
                        <h3>Nivel de Calidad</h3>
                        <div class="range-inputs slider-layout">
                            <div class="slider-wrapper">
                                <input type="range" id="compress-quality" min="10" max="100" value="80"
                                    class="input-slider">
                                <span class="slider-value" id="quality-value-display">80%</span>
                            </div>
                        </div>
                        <div class="compress-meta-info">
                            <p class="info-text"><i class="fa-solid fa-chart-simple"></i> Tamaño original: <span
                                    id="original-size-display">0 KB</span></p>
                            <p class="info-text text-accent-highlight"><i class="fa-solid fa-circle-down"></i> Tamaño
                                estimado comprimido: <span id="estimate-size-display">0 KB</span></p>
                        </div>
                    </div>
                </div>

                <div class="actions-panel" id="actions-compresor" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-compresor">
                        <i class="fa-solid fa-minimize"></i> Comprimir y Descargar
                    </button>
                </div>
            </section>

            <!-- 10. Recortar y Redimensionar Panel [NEW] -->
`;

import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export function init() {
    // TOOL 9: COMPRIMIR IMAGEN (IMAGE COMPRESSOR) [NEW]
    // ----------------------------------------------------------------------
    let compressImageFile = null;

    setupDropzone('dropzone-compresor', 'file-compresor', (files) => {
        const file = files[0];
        // Compress targets JPG, PNG or WEBP
        if (file.type.startsWith('image/')) {
            compressImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('thumb-compresor').src = e.target.result;
            };
            reader.readAsDataURL(file);

            document.getElementById('dropzone-compresor').style.display = 'none';
            document.getElementById('preview-compresor').style.display = 'block';
            document.getElementById('actions-compresor').style.display = 'flex';
            
            document.getElementById('name-compresor').textContent = file.name;
            document.getElementById('size-compresor').textContent = formatBytes(file.size);
            
            document.getElementById('original-size-display').textContent = formatBytes(file.size);
            
            updateCompressionEstimate();
            showToast('Imagen cargada', 'success');
        } else {
            showToast('Por favor, selecciona una imagen válida.', 'warning');
        }
    });

    const qualitySlider = document.getElementById('compress-quality');
    const qualityValEl = document.getElementById('quality-value-display');

    qualitySlider.addEventListener('input', (e) => {
        qualityValEl.textContent = `${e.target.value}%`;
        updateCompressionEstimate();
    });

    // Real-time canvas compression to update target estimate size label
    function updateCompressionEstimate() {
        if (!compressImageFile) return;
        const quality = parseFloat(qualitySlider.value) / 100;
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            
            // JPEGs and WEBPs are compressible natively
            const format = compressImageFile.type === 'image/png' ? 'image/jpeg' : compressImageFile.type;
            
            canvas.toBlob((blob) => {
                if (blob) {
                    document.getElementById('estimate-size-display').textContent = formatBytes(blob.size);
                }
            }, format, quality);
        };
        img.src = URL.createObjectURL(compressImageFile);
    }

    function resetCompressUI() {
        compressImageFile = null;
        document.getElementById('dropzone-compresor').style.display = 'block';
        document.getElementById('preview-compresor').style.display = 'none';
        document.getElementById('actions-compresor').style.display = 'none';
        document.getElementById('file-compresor').value = '';
        document.getElementById('thumb-compresor').src = '';
    }

    document.getElementById('btn-remove-compresor').addEventListener('click', resetCompressUI);

    document.getElementById('btn-run-compresor').addEventListener('click', () => {
        if (!compressImageFile) return;

        const quality = parseFloat(qualitySlider.value) / 100;
        showLoader('Comprimiendo imagen...');

        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);

                // Convert PNG to JPEG if needed, PNG doesn't support quality lossy compression natively
                const format = compressImageFile.type === 'image/png' ? 'image/jpeg' : compressImageFile.type;
                const ext = format === 'image/jpeg' ? 'jpg' : 'webp';

                canvas.toBlob((blob) => {
                    if (blob) {
                        const originalBase = compressImageFile.name.replace(/\.[^/.]+$/, "");
                        downloadBlob(blob, `${originalBase}_comprimido.${ext}`);
                        showToast('Imagen comprimida con éxito!', 'success');
                        resetCompressUI();
                    } else {
                        showToast('Error al comprimir.', 'error');
                    }
                    hideLoader();
                }, format, quality);
            } catch (err) {
                console.error(err);
                showToast('Error al comprimir la imagen.', 'error');
                hideLoader();
            }
        };
        img.src = URL.createObjectURL(compressImageFile);
    });

    // ----------------------------------------------------------------------

}
