import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export function init() {
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
