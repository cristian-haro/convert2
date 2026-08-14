export const html = `
<section class="tab-panel" id="panel-eliminar-fondo">
                <div class="panel-header">
                    <h2>Eliminar Fondo de Imagen</h2>
                    <p>Remueve el fondo de tus imágenes de forma automática y 100% local usando inteligencia artificial
                        en tu navegador.</p>
                </div>

                <div class="dropzone" id="dropzone-eliminar-fondo">
                    <input type="file" id="file-eliminar-fondo" accept="image/*" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-wand-magic-sparkles dropzone-icon"></i>
                        <h3>Selecciona la imagen de origen</h3>
                        <p>Soporta PNG, JPG, JPEG, WEBP, BMP</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-eliminar-fondo" style="display: none;">
                    <div class="file-meta">
                        <div class="thumbnail-wrapper">
                            <img id="thumb-eliminar-fondo" class="img-thumbnail" src="" alt="Vista previa">
                        </div>
                        <div class="file-details">
                            <span class="file-name" id="name-eliminar-fondo">imagen.png</span>
                            <span class="file-size" id="size-eliminar-fondo">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-eliminar-fondo"><i
                                class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options">
                        <h3>Opciones de Procesamiento</h3>
                        <p class="info-text"><i class="fa-solid fa-circle-info"></i> El primer procesamiento descargará
                            un modelo de IA de aproximadamente 80 MB de forma local. Las siguientes ejecuciones serán
                            instantáneas.</p>

                        <div class="progress-container-local" id="progress-container-eliminar-fondo"
                            style="display: none;">
                            <div class="progress-bar-label-local" id="progress-label-eliminar-fondo">
                                <span>Descargando modelo de IA...</span>
                                <span id="progress-percentage-eliminar-fondo">0%</span>
                            </div>
                            <div class="progress-bar-track-local">
                                <div class="progress-bar-fill-local" id="progress-bar-eliminar-fondo"></div>
                            </div>
                        </div>

                        <!-- Comparativa de resultados -->
                        <div class="result-comparison-layout" id="result-comparison-eliminar-fondo"
                            style="display: none;">
                            <div class="comparison-box">
                                <span class="comparison-label">Original</span>
                                <div class="comparison-img-wrapper">
                                    <img id="img-orig-eliminar-fondo" src="" alt="Original">
                                </div>
                            </div>
                            <div class="comparison-box">
                                <span class="comparison-label">Sin Fondo</span>
                                <div class="comparison-img-wrapper transparency-grid">
                                    <img id="img-res-eliminar-fondo" src="" alt="Resultado sin fondo">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="actions-panel" id="actions-eliminar-fondo" style="display: none; gap: 10px;">
                    <button class="btn btn-secondary" id="btn-reset-eliminar-fondo" style="display: none;">
                        <i class="fa-solid fa-arrow-rotate-left"></i> Procesar otra
                    </button>
                    <button class="btn btn-primary" id="btn-run-eliminar-fondo">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> Eliminar Fondo y Descargar
                    </button>
                </div>
            </section>

            <!-- 12. Extraer Texto Panel [EXPANDED] -->
`;

import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export function init() {
    // TOOL 11b: ELIMINAR FONDO DE IMAGEN (BACKGROUND REMOVAL) [NEW]
    // ----------------------------------------------------------------------
    let bgRemovalFile = null;
    let bgRemovalOriginalUrl = null;
    let bgRemovalResultBlob = null;
    let bgRemovalResultUrl = null;

    setupDropzone('dropzone-eliminar-fondo', 'file-eliminar-fondo', (files) => {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            bgRemovalFile = file;
            
            // Clean up any old object URLs
            cleanBgRemovalUrls();

            // Set image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('thumb-eliminar-fondo').src = e.target.result;
            };
            reader.readAsDataURL(file);

            document.getElementById('dropzone-eliminar-fondo').style.display = 'none';
            document.getElementById('preview-eliminar-fondo').style.display = 'block';
            document.getElementById('actions-eliminar-fondo').style.display = 'flex';
            
            document.getElementById('name-eliminar-fondo').textContent = file.name;
            document.getElementById('size-eliminar-fondo').textContent = formatBytes(file.size);
            
            // Hide progress container initially
            document.getElementById('progress-container-eliminar-fondo').style.display = 'none';
            document.getElementById('progress-bar-eliminar-fondo').style.width = '0%';
            document.getElementById('progress-percentage-eliminar-fondo').textContent = '0%';
            
            // Hide comparison and secondary button
            document.getElementById('result-comparison-eliminar-fondo').style.display = 'none';
            document.getElementById('btn-reset-eliminar-fondo').style.display = 'none';
            
            // Reset main button text
            const runButton = document.getElementById('btn-run-eliminar-fondo');
            runButton.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Eliminar Fondo y Descargar';
            
            showToast('Imagen cargada correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo de imagen válido.', 'warning');
        }
    });

    function cleanBgRemovalUrls() {
        if (bgRemovalOriginalUrl) {
            URL.revokeObjectURL(bgRemovalOriginalUrl);
            bgRemovalOriginalUrl = null;
        }
        if (bgRemovalResultUrl) {
            URL.revokeObjectURL(bgRemovalResultUrl);
            bgRemovalResultUrl = null;
        }
        bgRemovalResultBlob = null;
    }

    function resetBgRemovalUI() {
        bgRemovalFile = null;
        cleanBgRemovalUrls();
        
        document.getElementById('dropzone-eliminar-fondo').style.display = 'block';
        document.getElementById('preview-eliminar-fondo').style.display = 'none';
        document.getElementById('actions-eliminar-fondo').style.display = 'none';
        document.getElementById('file-eliminar-fondo').value = '';
        document.getElementById('progress-container-eliminar-fondo').style.display = 'none';
        document.getElementById('progress-bar-eliminar-fondo').style.width = '0%';
        document.getElementById('progress-percentage-eliminar-fondo').textContent = '0%';
        
        document.getElementById('result-comparison-eliminar-fondo').style.display = 'none';
        document.getElementById('btn-reset-eliminar-fondo').style.display = 'none';
        document.getElementById('img-orig-eliminar-fondo').src = '';
        document.getElementById('img-res-eliminar-fondo').src = '';
    }

    document.getElementById('btn-remove-eliminar-fondo').addEventListener('click', resetBgRemovalUI);
    document.getElementById('btn-reset-eliminar-fondo').addEventListener('click', resetBgRemovalUI);

    document.getElementById('btn-run-eliminar-fondo').addEventListener('click', async () => {
        if (!bgRemovalFile) return;

        // If background removal has already run, this button works as a fast download button
        if (bgRemovalResultBlob) {
            const originalBase = bgRemovalFile.name.replace(/\.[^/.]+$/, "");
            downloadBlob(bgRemovalResultBlob, `${originalBase}_sin_fondo.png`);
            showToast('Imagen descargada con éxito', 'success');
            return;
        }

        const runButton = document.getElementById('btn-run-eliminar-fondo');
        const removeButton = document.getElementById('btn-remove-eliminar-fondo');
        const progressContainer = document.getElementById('progress-container-eliminar-fondo');
        const progressBar = document.getElementById('progress-bar-eliminar-fondo');
        const progressPercentage = document.getElementById('progress-percentage-eliminar-fondo');
        const progressLabel = document.getElementById('progress-label-eliminar-fondo');

        // Disable UI controls while processing
        runButton.disabled = true;
        removeButton.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0%';
        
        showLoader('Eliminando fondo de la imagen...');

        try {
            const config = {
                progress: (key, current, total) => {
                    const percentage = total ? Math.round((current / total) * 100) : 0;
                    progressBar.style.width = `${percentage}%`;
                    progressPercentage.textContent = `${percentage}%`;
                    
                    if (key.includes('model') || key.includes('onnx') || key.includes('wasm')) {
                        progressLabel.innerHTML = `<span>Descargando modelo de IA...</span><span id="progress-percentage-eliminar-fondo">${percentage}%</span>`;
                    } else {
                        progressLabel.innerHTML = `<span>Descargando recursos...</span><span id="progress-percentage-eliminar-fondo">${percentage}%</span>`;
                    }
                }
            };

            // Run the background removal process
            const resultBlob = await removeBackground(bgRemovalFile, config);

            // Store result blob and create object URL
            bgRemovalResultBlob = resultBlob;
            bgRemovalResultUrl = URL.createObjectURL(resultBlob);
            bgRemovalOriginalUrl = URL.createObjectURL(bgRemovalFile);

            // Set comparison images
            document.getElementById('img-orig-eliminar-fondo').src = bgRemovalOriginalUrl;
            document.getElementById('img-res-eliminar-fondo').src = bgRemovalResultUrl;

            // Show comparison view
            document.getElementById('result-comparison-eliminar-fondo').style.display = 'grid';
            
            // Hide progress bar since we are done
            progressContainer.style.display = 'none';

            // Once finished, download the processed image as PNG automatically
            const originalBase = bgRemovalFile.name.replace(/\.[^/.]+$/, "");
            downloadBlob(resultBlob, `${originalBase}_sin_fondo.png`);

            // Update action buttons
            document.getElementById('btn-reset-eliminar-fondo').style.display = 'inline-flex';
            runButton.innerHTML = '<i class="fa-solid fa-download"></i> Descargar Imagen';

            showToast('¡Fondo eliminado con éxito y descargado!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Ocurrió un error al procesar la imagen.', 'error');
        } finally {
            runButton.disabled = false;
            removeButton.disabled = false;
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
