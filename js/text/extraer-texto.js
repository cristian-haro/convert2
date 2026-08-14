export const html = `
<section class="tab-panel" id="panel-extraer-texto">
                <div class="panel-header">
                    <h2>Extraer Texto (PDF & Word DOCX)</h2>
                    <p>Extrae todo el texto seleccionable de tu archivo PDF o documento de Microsoft Word (.docx) y
                        descárgalo como texto plano (.txt).</p>
                </div>

                <div class="dropzone" id="dropzone-extraer">
                    <input type="file" id="file-extraer" accept=".pdf, .docx" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-file-invoice dropzone-icon"></i>
                        <h3>Selecciona tu archivo PDF o DOCX</h3>
                        <p>Arrastra el documento o haz clic para buscar</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-extraer" style="display: none;">
                    <div class="file-meta">
                        <i class="fa-solid fa-file-lines file-type-icon" id="icon-type-extraer"></i>
                        <div class="file-details">
                            <span class="file-name" id="name-extraer">documento.pdf</span>
                            <span class="file-size" id="size-extraer">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-extraer"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options text-extraction-options">
                        <p class="info-warning"><i class="fa-solid fa-triangle-exclamation"></i> <strong>Nota:</strong>
                            Para PDFs, no funciona en imágenes escaneadas ("fotos" de páginas sin capa de texto real).
                            Los archivos Word \`.docx\` se leen en texto bruto.</p>
                    </div>
                </div>

                <div class="actions-panel" id="actions-extraer" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-extraer">
                        <i class="fa-solid fa-file-lines"></i> Extraer y Descargar Texto (.txt)
                    </button>
                </div>
            </section>

            <!-- 13. Word a PDF Panel [NEW] -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js')
    ]);

    // TOOL 12: EXTRAER TEXTO (TEXT EXTRACTOR) - PDF & DOCX [EXPANDED]
    // ----------------------------------------------------------------------
    let extractFile = null;

    setupDropzone('dropzone-extraer', 'file-extraer', (files) => {
        const file = files[0];
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') || ext === 'docx') {
            extractFile = file;
            
            // Adjust icon based on file type
            const iconEl = document.getElementById('icon-type-extraer');
            if (ext === 'docx') {
                iconEl.className = 'fa-solid fa-file-word file-type-icon';
                iconEl.style.color = '#3b82f6';
            } else {
                iconEl.className = 'fa-solid fa-file-pdf file-type-icon';
                iconEl.style.color = '#ef4444';
            }

            document.getElementById('dropzone-extraer').style.display = 'none';
            document.getElementById('preview-extraer').style.display = 'block';
            document.getElementById('actions-extraer').style.display = 'flex';
            
            document.getElementById('name-extraer').textContent = file.name;
            document.getElementById('size-extraer').textContent = formatBytes(file.size);
            showToast('Documento cargado correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo PDF o Word (.docx) válido.', 'warning');
        }
    });

    function resetExtractUI() {
        extractFile = null;
        document.getElementById('dropzone-extraer').style.display = 'block';
        document.getElementById('preview-extraer').style.display = 'none';
        document.getElementById('actions-extraer').style.display = 'none';
        document.getElementById('file-extraer').value = '';
    }

    document.getElementById('btn-remove-extraer').addEventListener('click', resetExtractUI);

    document.getElementById('btn-run-extraer').addEventListener('click', async () => {
        if (!extractFile) return;

        const ext = extractFile.name.split('.').pop().toLowerCase();
        showLoader('Extrayendo texto del documento...');

        if (ext === 'docx') {
            // DOCX Word File extraction using Mammoth.js
            try {
                const arrayBuffer = await extractFile.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                const fullText = result.value;

                if (!fullText || fullText.trim() === '') {
                    showToast('No se pudo extraer texto. Asegúrate de que el documento no esté vacío.', 'warning');
                    return;
                }

                const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
                const originalBase = extractFile.name.replace(/\.[^/.]+$/, "");
                downloadBlob(blob, `${originalBase}_texto.txt`);
                showToast('Texto de Word extraído con éxito!', 'success');
                resetExtractUI();
            } catch (error) {
                console.error(error);
                showToast('Error al extraer texto del archivo Word.', 'error');
            } finally {
                hideLoader();
            }
        } else {
            // PDF Document extraction using PDF.js
            try {
                const arrayBuffer = await extractFile.arrayBuffer();
                const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const totalPages = pdfDoc.numPages;
                let fullText = '';

                for (let i = 1; i <= totalPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    let lastY = -1;
                    let pageText = `\n--- Página ${i} ---\n`;
                    
                    textContent.items.forEach((item) => {
                        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                            pageText += '\n';
                        }
                        pageText += item.str + ' ';
                        lastY = item.transform[5];
                    });

                    fullText += pageText;
                }

                if (fullText.trim().replace(/--- Página \d+ ---/g, '').trim() === '') {
                    showToast('No se encontró texto extraíble en el PDF. ¿Es un PDF escaneado?', 'warning');
                    return;
                }

                const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
                const originalBase = extractFile.name.replace(/\.[^/.]+$/, "");
                downloadBlob(blob, `${originalBase}_texto.txt`);
                showToast('Texto de PDF extraído con éxito!', 'success');
                resetExtractUI();
            } catch (error) {
                console.error(error);
                showToast('Error al extraer texto del PDF.', 'error');
            } finally {
                hideLoader();
            }
        }
    });

    // ----------------------------------------------------------------------

}
