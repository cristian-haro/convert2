import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export function init() {
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
