export const html = `
<section class="tab-panel" id="panel-docx-pdf">
                <div class="panel-header">
                    <h2>Convertir Word a PDF</h2>
                    <p>Convierte tus documentos de Microsoft Word (.docx) a archivos PDF de forma local en tu navegador.
                    </p>
                </div>

                <div class="dropzone" id="dropzone-docx-pdf">
                    <input type="file" id="file-docx-pdf" accept=".docx" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-file-pdf dropzone-icon"></i>
                        <h3>Selecciona tu archivo Word (.docx)</h3>
                        <p>Arrastra el documento o haz clic para buscar</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-docx-pdf" style="display: none;">
                    <div class="file-meta">
                        <i class="fa-solid fa-file-word file-type-icon" style="color: #3b82f6;"></i>
                        <div class="file-details">
                            <span class="file-name" id="name-docx-pdf">documento.docx</span>
                            <span class="file-size" id="size-docx-pdf">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-docx-pdf"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options text-extraction-options">
                        <p class="info-text"><i class="fa-solid fa-circle-info"></i> El archivo se convertirá localmente
                            en tu navegador. Los estilos más complejos y tablas pueden no alinearse perfectamente.</p>
                    </div>
                </div>

                <div class="actions-panel" id="actions-docx-pdf" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-docx-pdf">
                        <i class="fa-solid fa-file-pdf"></i> Convertir y Descargar PDF
                    </button>
                </div>
            </section>

            <!-- 14. PDF a Word Panel [NEW] -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')
    ]);

    // TOOL 13: WORD A PDF (DOCX TO PDF) [NEW]
    // ----------------------------------------------------------------------
    let docxPdfFile = null;

    setupDropzone('dropzone-docx-pdf', 'file-docx-pdf', (files) => {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.docx')) {
            docxPdfFile = file;
            document.getElementById('dropzone-docx-pdf').style.display = 'none';
            document.getElementById('preview-docx-pdf').style.display = 'block';
            document.getElementById('actions-docx-pdf').style.display = 'flex';
            
            document.getElementById('name-docx-pdf').textContent = file.name;
            document.getElementById('size-docx-pdf').textContent = formatBytes(file.size);
            showToast('Documento Word cargado correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo Word (.docx) válido.', 'warning');
        }
    });

    function resetDocxPdfUI() {
        docxPdfFile = null;
        document.getElementById('dropzone-docx-pdf').style.display = 'block';
        document.getElementById('preview-docx-pdf').style.display = 'none';
        document.getElementById('actions-docx-pdf').style.display = 'none';
        document.getElementById('file-docx-pdf').value = '';
    }

    document.getElementById('btn-remove-docx-pdf').addEventListener('click', resetDocxPdfUI);

    document.getElementById('btn-run-docx-pdf').addEventListener('click', async () => {
        if (!docxPdfFile) return;

        showLoader('Convirtiendo Word a PDF...');
        try {
            const arrayBuffer = await docxPdfFile.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            
            // Format the HTML so that it renders beautifully inside the PDF
            const rawHtml = result.value;
            const styledHtml = `
                <div style="
                    font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif;
                    color: #1f2937;
                    padding: 40px 60px;
                    line-height: 1.6;
                    font-size: 14px;
                    background-color: #ffffff;
                ">
                    ${rawHtml}
                </div>
            `;

            const opt = {
                margin:       [0.5, 0.5, 0.5, 0.5], // half inch margin all around
                filename:     docxPdfFile.name.replace(/\.[^/.]+$/, "") + '.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            // Call html2pdf.js bundle
            await html2pdf().set(opt).from(styledHtml).save();
            showToast('Documento convertido a PDF con éxito!', 'success');
            resetDocxPdfUI();
        } catch (error) {
            console.error(error);
            showToast('Ocurrió un error al convertir el archivo Word a PDF.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
