import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export function init() {
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
