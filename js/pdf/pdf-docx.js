import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export function init() {
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
