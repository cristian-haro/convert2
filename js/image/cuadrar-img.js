import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export const html = `
<section class="tab-panel" id="panel-cuadrar-img">
    <div class="panel-header">
        <h2>Ajustar Lienzo / Cuadrar Imagen</h2>
        <p>Adapta tus fotos a proporciones cuadradas (1:1) o formatos de redes sociales sin estirarlas ni recortar al sujeto, añadiendo fondos difuminados o sólidos.</p>
    </div>

    <!-- Dropzone Input -->
    <div class="dropzone" id="dropzone-cuadrar-img">
        <input type="file" id="file-cuadrar-img" accept="image/*" class="file-input">
        <div class="dropzone-info">
            <i class="fa-solid fa-vector-square dropzone-icon"></i>
            <h3>Selecciona tu imagen</h3>
            <p>Arrastra la foto o haz clic para buscar</p>
        </div>
    </div>

    <!-- Interactive Workspace Panel -->
    <div class="file-preview-card" id="preview-cuadrar-img" style="display: none;">
        <div class="file-meta" style="margin-bottom: 1.5rem;">
            <div class="file-details">
                <span class="file-name" id="name-cuadrar-img">imagen.png</span>
                <span class="file-size" id="size-cuadrar-img">0 KB</span>
            </div>
            <button class="btn-remove" id="btn-remove-cuadrar-img"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="tool-workspace" style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 2rem; align-items: start;">
            <!-- Live Preview Canvas -->
            <div class="canvas-preview-container" style="background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); padding: 1.5rem; display: flex; align-items: center; justify-content: center; min-height: 400px; position: relative; overflow: hidden;">
                <canvas id="canvas-cuadrar-preview" style="max-width: 100%; max-height: 420px; border-radius: var(--border-radius-sm); box-shadow: var(--box-shadow); display: block;"></canvas>
            </div>

            <!-- Settings Sidebar -->
            <div class="tool-options" style="margin: 0; padding: 1.75rem; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--border-radius-lg);">
                <h3 style="margin-top: 0; margin-bottom: 1.5rem; font-size: 1.15rem; font-weight: 600; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; color: var(--color-text);">Configuración del Lienzo</h3>

                <!-- Ratio Selection -->
                <div class="input-group" style="margin-bottom: 1.25rem;">
                    <label for="cuadrar-ratio" style="font-size: 0.9rem; font-weight: 500; display: block; margin-bottom: 0.5rem; color: var(--color-text-muted);">Proporción del Lienzo:</label>
                    <div class="select-wrapper">
                        <select id="cuadrar-ratio">
                            <option value="1:1" selected>Cuadrado Instagram (1:1)</option>
                            <option value="9:16">Stories / Reels (9:16)</option>
                            <option value="4:5">Instagram Retrato (4:5)</option>
                            <option value="16:9">Panorámico (16:9)</option>
                            <option value="4:3">Estándar (4:3)</option>
                        </select>
                    </div>
                </div>

                <!-- Background Style selection -->
                <div class="input-group" style="margin-bottom: 1.25rem;">
                    <label for="cuadrar-bg-mode" style="font-size: 0.9rem; font-weight: 500; display: block; margin-bottom: 0.5rem; color: var(--color-text-muted);">Estilo del Fondo:</label>
                    <div class="select-wrapper">
                        <select id="cuadrar-bg-mode">
                            <option value="blur" selected>Fondo Difuminado (Bordes Blur)</option>
                            <option value="color">Color Sólido</option>
                            <option value="transparent">Fondo Transparente</option>
                        </select>
                    </div>
                </div>

                <!-- Custom Fill Color Color Picker (hidden by default) -->
                <div class="input-group" id="group-cuadrar-color" style="display: none; margin-bottom: 1.25rem;">
                    <label for="cuadrar-color-val" style="font-size: 0.9rem; font-weight: 500; display: block; margin-bottom: 0.5rem; color: var(--color-text-muted);">Color de Relleno:</label>
                    <div style="display: flex; gap: 12px; align-items: center;">
                         <input type="color" id="cuadrar-color-val" value="#ffffff" style="border: none; width: 48px; height: 42px; border-radius: 6px; cursor: pointer; background: none; padding: 0;">
                         <input type="text" id="cuadrar-color-text" value="#ffffff" placeholder="#ffffff" style="flex: 1; text-align: center; text-transform: uppercase; font-family: monospace;">
                    </div>
                </div>

                <!-- Blur intensity Slider -->
                <div class="input-group" id="group-cuadrar-blur" style="margin-bottom: 1.75rem;">
                    <label for="cuadrar-blur-val" style="font-size: 0.9rem; font-weight: 500; display: flex; justify-content: space-between; margin-bottom: 0.5rem; color: var(--color-text-muted);">
                        <span>Intensidad de Desenfoque:</span>
                        <span id="label-cuadrar-blur" style="font-weight: 600; color: var(--accent-color);">20px</span>
                    </label>
                    <div class="range-slider">
                        <input type="range" id="cuadrar-blur-val" min="5" max="60" value="20" step="1">
                    </div>
                </div>

                <!-- Trigger Action Button -->
                <button class="btn btn-primary" id="btn-run-cuadrar" style="width: 100%;">
                    <i class="fa-solid fa-download"></i> Descargar Imagen Ajustada
                </button>
            </div>
        </div>
    </div>
</section>
`;

export function init() {
    const dropzone = document.getElementById('dropzone-cuadrar-img');
    const fileInput = document.getElementById('file-cuadrar-img');
    const previewContainer = document.getElementById('preview-cuadrar-img');
    const removeBtn = document.getElementById('btn-remove-cuadrar-img');
    
    const canvas = document.getElementById('canvas-cuadrar-preview');
    const ratioSelect = document.getElementById('cuadrar-ratio');
    const bgModeSelect = document.getElementById('cuadrar-bg-mode');
    
    const groupColor = document.getElementById('group-cuadrar-color');
    const colorVal = document.getElementById('cuadrar-color-val');
    const colorText = document.getElementById('cuadrar-color-text');
    
    const groupBlur = document.getElementById('group-cuadrar-blur');
    const blurVal = document.getElementById('cuadrar-blur-val');
    const blurLabel = document.getElementById('label-cuadrar-blur');
    
    const runBtn = document.getElementById('btn-run-cuadrar');
    
    const nameLabel = document.getElementById('name-cuadrar-img');
    const sizeLabel = document.getElementById('size-cuadrar-img');

    let originalImage = null;
    let originalFileName = '';

    setupDropzone('dropzone-cuadrar-img', 'file-cuadrar-img', handleFiles);

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            showToast('El archivo seleccionado debe ser una imagen.', 'error');
            return;
        }

        originalFileName = file.name;
        nameLabel.textContent = file.name;
        sizeLabel.textContent = formatBytes(file.size);

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                dropzone.style.display = 'none';
                previewContainer.style.display = 'block';
                drawCanvas();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function drawCanvas() {
        if (!originalImage || !canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = originalImage.width;
        const h = originalImage.height;

        // Parse ratios
        const ratio = ratioSelect.value;
        let ratioW = 1, ratioH = 1;
        
        if (ratio === '1:1') { ratioW = 1; ratioH = 1; }
        else if (ratio === '9:16') { ratioW = 9; ratioH = 16; }
        else if (ratio === '4:5') { ratioW = 4; ratioH = 5; }
        else if (ratio === '16:9') { ratioW = 16; ratioH = 9; }
        else if (ratio === '4:3') { ratioW = 4; ratioH = 3; }

        // Calculate size of target canvas (bounding box)
        let canvasW, canvasH;
        if (w / h > ratioW / ratioH) {
            // Image is wider than ratio
            canvasW = w;
            canvasH = w * (ratioH / ratioW);
        } else {
            // Image is taller than ratio
            canvasH = h;
            canvasW = h * (ratioW / ratioH);
        }

        canvas.width = canvasW;
        canvas.height = canvasH;

        // Draw background
        const mode = bgModeSelect.value;
        if (mode === 'transparent') {
            ctx.clearRect(0, 0, canvasW, canvasH);
        } else if (mode === 'color') {
            ctx.fillStyle = colorVal.value;
            ctx.fillRect(0, 0, canvasW, canvasH);
        } else if (mode === 'blur') {
            // Draw background copy to fill
            const scale = Math.max(canvasW / w, canvasH / h);
            const fillW = w * scale;
            const fillH = h * scale;
            const fillX = (canvasW - fillW) / 2;
            const fillY = (canvasH - fillH) / 2;
            
            const blurAmt = parseInt(blurVal.value);
            ctx.filter = `blur(${blurAmt}px)`;
            
            // Draw slightly larger to avoid black blur bleeding on outer edges
            ctx.drawImage(originalImage, fillX - blurAmt * 2, fillY - blurAmt * 2, fillW + blurAmt * 4, fillH + blurAmt * 4);
            ctx.filter = 'none';
        }

        // Draw centered fit image
        const fitScale = Math.min(canvasW / w, canvasH / h);
        const fitW = w * fitScale;
        const fitH = h * fitScale;
        const fitX = (canvasW - fitW) / 2;
        const fitY = (canvasH - fitH) / 2;

        ctx.drawImage(originalImage, fitX, fitY, fitW, fitH);
    }

    // Toggle option groupings dynamically based on styles
    if (bgModeSelect) {
        bgModeSelect.addEventListener('change', () => {
            const mode = bgModeSelect.value;
            if (mode === 'color') {
                groupColor.style.display = 'block';
                groupBlur.style.display = 'none';
            } else if (mode === 'blur') {
                groupColor.style.display = 'none';
                groupBlur.style.display = 'block';
            } else {
                groupColor.style.display = 'none';
                groupBlur.style.display = 'none';
            }
            drawCanvas();
        });
    }

    if (ratioSelect) ratioSelect.addEventListener('change', drawCanvas);
    if (blurVal) {
        blurVal.addEventListener('input', () => {
            blurLabel.textContent = `${blurVal.value}px`;
            drawCanvas();
        });
    }

    // Color Pickers linking text & hex values
    if (colorVal && colorText) {
        colorVal.addEventListener('input', () => {
            colorText.value = colorVal.value;
            drawCanvas();
        });
        colorText.addEventListener('input', () => {
            let val = colorText.value.trim();
            if (!val.startsWith('#')) val = '#' + val;
            if (/^#[0-9A-F]{6}$/i.test(val)) {
                colorVal.value = val;
                drawCanvas();
            }
        });
    }

    // Download Handler
    if (runBtn) {
        runBtn.addEventListener('click', () => {
            if (!originalImage || !canvas) return;
            showLoader('Generando imagen de lienzo...');
            
            const mode = bgModeSelect.value;
            const isTransparent = (mode === 'transparent');
            const format = isTransparent ? 'image/png' : 'image/jpeg';
            const ext = isTransparent ? 'png' : 'jpg';

            try {
                canvas.toBlob((blob) => {
                    hideLoader();
                    if (blob) {
                        const nameParts = originalFileName.split('.');
                        nameParts.pop();
                        const baseName = nameParts.join('.');
                        downloadBlob(blob, `${baseName}_lienzo.${ext}`);
                        showToast('Imagen descargada con éxito', 'success');
                    } else {
                        showToast('Error al generar la imagen.', 'error');
                    }
                }, format, 0.95);
            } catch (err) {
                console.error(err);
                hideLoader();
                showToast('Error en el canvas de dibujo.', 'error');
            }
        });
    }

    // Remove file handler
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            originalImage = null;
            originalFileName = '';
            fileInput.value = '';
            previewContainer.style.display = 'none';
            dropzone.style.display = 'flex';
        });
    }
}
