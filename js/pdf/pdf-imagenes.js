import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export function init() {
    // TOOL 5: PDF A IMÁGENES (PDF TO IMAGES) [NEW]
    // ----------------------------------------------------------------------
    let pdfToImgFile = null;

    setupDropzone('dropzone-pdf-to-img', 'file-pdf-to-img', (files) => {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            pdfToImgFile = file;
            document.getElementById('dropzone-pdf-to-img').style.display = 'none';
            document.getElementById('preview-pdf-to-img').style.display = 'block';
            document.getElementById('actions-pdf-to-img').style.display = 'flex';
            
            document.getElementById('name-pdf-to-img').textContent = file.name;
            document.getElementById('size-pdf-to-img').textContent = formatBytes(file.size);
            showToast('Archivo PDF cargado correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo PDF válido.', 'warning');
        }
    });

    function resetPdfToImgUI() {
        pdfToImgFile = null;
        document.getElementById('dropzone-pdf-to-img').style.display = 'block';
        document.getElementById('preview-pdf-to-img').style.display = 'none';
        document.getElementById('actions-pdf-to-img').style.display = 'none';
        document.getElementById('file-pdf-to-img').value = '';
    }

    document.getElementById('btn-remove-pdf-to-img').addEventListener('click', resetPdfToImgUI);

    document.getElementById('btn-run-pdf-to-img').addEventListener('click', async () => {
        if (!pdfToImgFile) return;

        const format = document.getElementById('format-pdf-to-img').value;
        showLoader('Rendireccionando páginas a imágenes...');
        try {
            const arrayBuffer = await pdfToImgFile.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPages = pdfDoc.numPages;

            const zip = new JSZip();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdfDoc.getPage(i);
                // Render at high scale/resolution
                const viewport = page.getViewport({ scale: 2.0 });
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: ctx,
                    viewport: viewport
                }).promise;

                // Canvas to Blob
                const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
                const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.95));
                zip.file(`pagina_${i}.${format}`, blob);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const originalBase = pdfToImgFile.name.replace(/\.[^/.]+$/, "");
            downloadBlob(zipBlob, `${originalBase}_paginas_imagenes.zip`);
            showToast('Imágenes extraídas y empaquetadas en ZIP con éxito!', 'success');
            resetPdfToImgUI();
        } catch (error) {
            console.error(error);
            showToast('Error al convertir las páginas del PDF.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
