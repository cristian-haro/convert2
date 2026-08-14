export const html = `
<section class="tab-panel" id="panel-pdf-docx">
                <div class="panel-header">
                    <h2>Convertir PDF a Word</h2>
                    <p>Extrae el texto de tu PDF y genera un archivo Word editable (.docx) de forma totalmente privada.
                    </p>
                </div>

                <div class="dropzone" id="dropzone-pdf-docx">
                    <input type="file" id="file-pdf-docx" accept=".pdf" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-file-word dropzone-icon"></i>
                        <h3>Selecciona tu archivo PDF</h3>
                        <p>Arrastra el archivo o haz clic para buscar</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-pdf-docx" style="display: none;">
                    <div class="file-meta">
                        <i class="fa-solid fa-file-pdf file-type-icon"></i>
                        <div class="file-details">
                            <span class="file-name" id="name-pdf-docx">documento.pdf</span>
                            <span class="file-size" id="size-pdf-docx">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-pdf-docx"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options text-extraction-options">
                        <p class="info-warning"><i class="fa-solid fa-triangle-exclamation"></i> <strong>Nota:</strong>
                            Esta herramienta extrae el texto del PDF y crea párrafos editables en formato de documento
                            Word. No conserva imágenes ni tablas complejas.</p>
                    </div>
                </div>

                <div class="actions-panel" id="actions-pdf-docx" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-pdf-docx">
                        <i class="fa-solid fa-file-word"></i> Convertir y Descargar Word (.docx)
                    </button>
                </div>
            </section>

            <!-- 12b. Organizar PDF Panel [NEW] -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'),
        loadScript('https://cdn.jsdelivr.net/npm/docx@8.2.0/build/index.umd.js')
    ]);

    // TOOL 14: PDF A WORD (PDF TO DOCX) [NEW]
    // ----------------------------------------------------------------------
    let pdfDocxFile = null;

    setupDropzone('dropzone-pdf-docx', 'file-pdf-docx', (files) => {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            pdfDocxFile = file;
            document.getElementById('dropzone-pdf-docx').style.display = 'none';
            document.getElementById('preview-pdf-docx').style.display = 'block';
            document.getElementById('actions-pdf-docx').style.display = 'flex';
            
            document.getElementById('name-pdf-docx').textContent = file.name;
            document.getElementById('size-pdf-docx').textContent = formatBytes(file.size);
            showToast('Archivo PDF cargado correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo PDF válido.', 'warning');
        }
    });

    function resetPdfDocxUI() {
        pdfDocxFile = null;
        document.getElementById('dropzone-pdf-docx').style.display = 'block';
        document.getElementById('preview-pdf-docx').style.display = 'none';
        document.getElementById('actions-pdf-docx').style.display = 'none';
        document.getElementById('file-pdf-docx').value = '';
    }

    document.getElementById('btn-remove-pdf-docx').addEventListener('click', resetPdfDocxUI);

    document.getElementById('btn-run-pdf-docx').addEventListener('click', async () => {
        if (!pdfDocxFile) return;

        showLoader('Convirtiendo PDF a Word...');
        try {
            const arrayBuffer = await pdfDocxFile.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPages = pdfDoc.numPages;
            
            const paragraphs = [];

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                
                let lastY = -1;
                let lineText = '';

                // Add page header in the Word file
                paragraphs.push(new docx.Paragraph({
                    children: [
                        new docx.TextRun({
                            text: `--- Página ${i} ---`,
                            bold: true,
                            color: '8b5cf6', // accent purple
                            font: 'Calibri',
                            size: 24 // 12pt (docx sizes are half-points, so 24 = 12pt)
                        })
                    ],
                    spacing: { before: 240, after: 120 }
                }));

                textContent.items.forEach((item) => {
                    // Check if new line
                    if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                        if (lineText.trim() !== '') {
                            paragraphs.push(new docx.Paragraph({
                                children: [
                                    new docx.TextRun({
                                        text: lineText.trim(),
                                        font: 'Calibri',
                                        size: 22 // 11pt
                                    })
                                ],
                                spacing: { after: 100 }
                            }));
                        }
                        lineText = '';
                    }
                    lineText += item.str + ' ';
                    lastY = item.transform[5];
                });

                // Add last line of the page
                if (lineText.trim() !== '') {
                    paragraphs.push(new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: lineText.trim(),
                                font: 'Calibri',
                                size: 22
                            })
                        ],
                        spacing: { after: 100 }
                    }));
                }
            }

            if (paragraphs.length <= totalPages) {
                showToast('No se encontró texto extraíble en el PDF para convertir.', 'warning');
                return;
            }

            // Construct DOCX document via docx library
            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: paragraphs
                }]
            });

            const docxBlob = await docx.Packer.toBlob(doc);
            const originalBase = pdfDocxFile.name.replace(/\.[^/.]+$/, "");
            
            downloadBlob(docxBlob, `${originalBase}_convertido.docx`);
            showToast('Documento Word (.docx) descargado con éxito!', 'success');
            resetPdfDocxUI();
        } catch (error) {
            console.error(error);
            showToast('Error al convertir el PDF a Word.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
