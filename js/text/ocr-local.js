export const html = `
<section class="tab-panel" id="panel-ocr-local">
                <div class="panel-header">
                    <h2>OCR Local - Reconocimiento de Texto</h2>
                    <p>Extrae texto editable de imágenes u hojas de documentos PDF escaneados de forma 100% local en tu
                        navegador.</p>
                </div>

                <div class="dropzone" id="dropzone-ocr-local">
                    <input type="file" id="file-ocr-local" accept="image/*, .pdf" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-eye dropzone-icon"></i>
                        <h3>Selecciona tu imagen o PDF</h3>
                        <p>Arrastra el archivo o haz clic para buscar</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-ocr-local" style="display: none;">
                    <div class="file-meta">
                        <div class="thumbnail-wrapper" id="thumb-wrapper-ocr">
                            <img id="thumb-ocr-local" class="img-thumbnail" src="" alt="Vista previa">
                        </div>
                        <div class="file-details">
                            <span class="file-name" id="name-ocr-local">documento.png</span>
                            <span class="file-size" id="size-ocr-local">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-ocr-local"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options">
                        <h3>Configuración del OCR</h3>
                        <div class="option-grid-2col"
                            style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem; align-items: end;">
                            <div class="input-group">
                                <label for="ocr-lang-select">Idioma del documento:</label>
                                <div class="select-wrapper">
                                    <select id="ocr-lang-select">
                                        <option value="spa" selected>Español</option>
                                        <option value="eng">Inglés (English)</option>
                                    </select>
                                </div>
                            </div>
                            <div class="input-group" id="ocr-progress-container" style="display: none;">
                                <div class="progress-bar-label-local" id="ocr-progress-label">Procesando OCR: 0%</div>
                                <div class="progress-bar-track-local"
                                    style="margin-top: 0.5rem; background: rgba(255,255,255,0.08); border-radius: 9999px; height: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
                                    <div class="progress-bar-fill-local" id="ocr-progress-bar"
                                        style="width: 0%; height: 100%; background: var(--accent-gradient); transition: width 0.1s ease;">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Extracted text area -->
                        <div class="ocr-text-result" id="ocr-result-box"
                            style="display: none; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
                            <label for="ocr-text-output" style="font-weight: 600; font-size: 0.95rem;">Texto
                                Extraído:</label>
                            <textarea id="ocr-text-output" rows="10"
                                style="width: 100%; font-family: inherit; font-size: 0.9rem; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: var(--border-radius-md); background: rgba(0,0,0,0.25); color: var(--color-text); margin-top: 0.5rem; resize: vertical; outline: none;"></textarea>
                            <div style="display: flex; gap: 10px; margin-top: 0.75rem;">
                                <button class="btn btn-secondary" id="btn-copy-ocr"
                                    style="padding: 0.5rem 1rem; font-size: 0.85rem;"><i class="fa-solid fa-copy"></i>
                                    Copiar Texto</button>
                                <button class="btn btn-secondary" id="btn-download-ocr"
                                    style="padding: 0.5rem 1rem; font-size: 0.85rem;"><i
                                        class="fa-solid fa-download"></i> Descargar (.txt)</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="actions-panel" id="actions-ocr-local" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-ocr-local">
                        <i class="fa-solid fa-play"></i> Ejecutar Reconocimiento de Texto
                    </button>
                </div>
            </section>

            <!-- 12f. Comparar Textos Panel [NEW] -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js')
    ]);

    // TOOL 12e: OCR LOCAL (TESSERACT OCR) [NEW]
    // ----------------------------------------------------------------------
    let ocrFile = null;
    let ocrPdfPages = null;

    setupDropzone('dropzone-ocr-local', 'file-ocr-local', async (files) => {
        const file = files[0];
        ocrFile = file;
        ocrPdfPages = null;

        // Hide result view initially
        document.getElementById('ocr-result-box').style.display = 'none';
        document.getElementById('ocr-progress-container').style.display = 'none';
        
        document.getElementById('dropzone-ocr-local').style.display = 'none';
        document.getElementById('preview-ocr-local').style.display = 'block';
        document.getElementById('actions-ocr-local').style.display = 'flex';
        
        document.getElementById('name-ocr-local').textContent = file.name;
        document.getElementById('size-ocr-local').textContent = formatBytes(file.size);
        
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (ext === 'pdf' || file.type === 'application/pdf') {
            showLoader('Leyendo PDF...');
            try {
                const arrayBuffer = await file.arrayBuffer();
                ocrPdfPages = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                
                // Show PDF Icon instead of thumbnail
                const thumbWrapper = document.getElementById('thumb-wrapper-ocr');
                thumbWrapper.innerHTML = `<i class="fa-solid fa-file-pdf" style="font-size: 2.2rem; color: #ef4444;"></i>`;
                showToast('PDF cargado para OCR', 'success');
            } catch (err) {
                console.error(err);
                showToast('Error al leer PDF.', 'error');
            } finally {
                hideLoader();
            }
        } else if (file.type.startsWith('image/')) {
            // Display Image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const thumbWrapper = document.getElementById('thumb-wrapper-ocr');
                thumbWrapper.innerHTML = `<img id="thumb-ocr-local" class="img-thumbnail" src="${e.target.result}" alt="Vista previa">`;
            };
            reader.readAsDataURL(file);
            showToast('Imagen cargada para OCR', 'success');
        } else {
            showToast('Archivo no soportado para OCR.', 'warning');
            resetOcrUI();
        }
    });

    function resetOcrUI() {
        ocrFile = null;
        ocrPdfPages = null;
        document.getElementById('dropzone-ocr-local').style.display = 'block';
        document.getElementById('preview-ocr-local').style.display = 'none';
        document.getElementById('actions-ocr-local').style.display = 'none';
        document.getElementById('ocr-result-box').style.display = 'none';
        document.getElementById('file-ocr-local').value = '';
    }

    document.getElementById('btn-remove-ocr-local').addEventListener('click', resetOcrUI);

    document.getElementById('btn-run-ocr-local').addEventListener('click', async () => {
        if (!ocrFile) return;

        const runButton = document.getElementById('btn-run-ocr-local');
        const removeButton = document.getElementById('btn-remove-ocr-local');
        const progressContainer = document.getElementById('ocr-progress-container');
        const progressBar = document.getElementById('ocr-progress-bar');
        const progressLabel = document.getElementById('ocr-progress-label');
        const ocrResultBox = document.getElementById('ocr-result-box');
        const ocrOutput = document.getElementById('ocr-text-output');
        const lang = document.getElementById('ocr-lang-select').value;

        runButton.disabled = true;
        removeButton.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressLabel.textContent = 'Iniciando motor OCR...';
        ocrResultBox.style.display = 'none';

        try {
            let fullText = '';
            
            // Helper function to run Tesseract on an image source (Blob or Canvas)
            const performOcr = async (source) => {
                const worker = await Tesseract.createWorker({
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const pct = Math.round(m.progress * 100);
                            progressBar.style.width = `${pct}%`;
                            progressLabel.textContent = `Reconociendo: ${pct}%`;
                        } else {
                            progressLabel.textContent = m.status;
                        }
                    }
                });
                await worker.loadLanguage(lang);
                await worker.initialize(lang);
                const { data: { text } } = await worker.recognize(source);
                await worker.terminate();
                return text;
            };

            if (ocrPdfPages) {
                const total = ocrPdfPages.numPages;
                
                for (let i = 1; i <= total; i++) {
                    progressLabel.textContent = `Renderizando página ${i} de ${total}...`;
                    const page = await ocrPdfPages.getPage(i);
                    // Render page at high scale for OCR accuracy (DPI 150)
                    const viewport = page.getViewport({ scale: 150 / 72 });
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    progressLabel.textContent = `Procesando OCR página ${i} de ${total}...`;
                    const pageText = await performOcr(canvas);
                    fullText += `--- Página ${i} ---\n${pageText}\n\n`;
                }
            } else {
                fullText = await performOcr(ocrFile);
            }

            ocrOutput.value = fullText;
            ocrResultBox.style.display = 'block';
            progressContainer.style.display = 'none';
            showToast('¡Reconocimiento de texto completado!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Ocurrió un error al procesar el texto.', 'error');
            progressContainer.style.display = 'none';
        } finally {
            runButton.disabled = false;
            removeButton.disabled = false;
        }
    });

    document.getElementById('btn-copy-ocr').addEventListener('click', () => {
        const text = document.getElementById('ocr-text-output').value;
        navigator.clipboard.writeText(text);
        showToast('Texto copiado al portapapeles', 'info');
    });

    document.getElementById('btn-download-ocr').addEventListener('click', () => {
        const text = document.getElementById('ocr-text-output').value;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const name = ocrFile.name.replace(/\.[^/.]+$/, "") + '_ocr.txt';
        downloadBlob(blob, name);
        showToast('Archivo de texto descargado', 'success');
    });

    // ----------------------------------------------------------------------

}
