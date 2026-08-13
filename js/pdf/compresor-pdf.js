import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export function init() {
    // TOOL 12c: COMPRIMIR PDF (PDF COMPRESSOR) [NEW]
    // ----------------------------------------------------------------------
    let compressPdfFile = null;

    setupDropzone('dropzone-compresor-pdf', 'file-compresor-pdf', (files) => {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            compressPdfFile = file;
            document.getElementById('dropzone-compresor-pdf').style.display = 'none';
            document.getElementById('preview-compresor-pdf').style.display = 'block';
            document.getElementById('actions-compresor-pdf').style.display = 'flex';
            
            document.getElementById('name-compresor-pdf').textContent = file.name;
            document.getElementById('size-compresor-pdf').textContent = formatBytes(file.size);
            showToast('PDF cargado para compresión', 'success');
        } else {
            showToast('Por favor, selecciona un PDF válido.', 'warning');
        }
    });

    document.getElementById('compress-pdf-quality').addEventListener('input', (e) => {
        document.getElementById('val-compress-pdf-quality').textContent = `${e.target.value}%`;
    });

    function resetCompressPdfUI() {
        compressPdfFile = null;
        document.getElementById('dropzone-compresor-pdf').style.display = 'block';
        document.getElementById('preview-compresor-pdf').style.display = 'none';
        document.getElementById('actions-compresor-pdf').style.display = 'none';
        document.getElementById('file-compresor-pdf').value = '';
    }

    document.getElementById('btn-remove-compresor-pdf').addEventListener('click', resetCompressPdfUI);

    document.getElementById('btn-run-compresor-pdf').addEventListener('click', async () => {
        if (!compressPdfFile) return;

        const dpi = parseInt(document.getElementById('compress-pdf-resolution').value, 10);
        const quality = parseInt(document.getElementById('compress-pdf-quality').value, 10) / 100;

        showLoader('Analizando PDF...');
        try {
            const arrayBuffer = await compressPdfFile.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPages = pdfDoc.numPages;
            
            const newDoc = await PDFLib.PDFDocument.create();

            for (let i = 1; i <= totalPages; i++) {
                showLoader(`Comprimiendo PDF (Página ${i} de ${totalPages})...`);
                
                const page = await pdfDoc.getPage(i);
                // 72 PDF points = 1 inch
                const scale = dpi / 72;
                const viewport = page.getViewport({ scale: scale });
                
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: context, viewport: viewport }).promise;

                // Compress page image as JPEG
                const jpegBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
                const imgBytes = await jpegBlob.arrayBuffer();
                const embeddedImage = await newDoc.embedJpg(imgBytes);

                // Add A4 or equivalent original dimension page
                const newPage = newDoc.addPage([viewport.width / scale, viewport.height / scale]);
                newPage.drawImage(embeddedImage, {
                    x: 0,
                    y: 0,
                    width: newPage.getWidth(),
                    height: newPage.getHeight()
                });
            }

            showLoader('Empaquetando PDF comprimido...');
            const compressedBytes = await newDoc.save();
            const blob = new Blob([compressedBytes], { type: 'application/pdf' });
            const originalBase = compressPdfFile.name.replace(/\.[^/.]+$/, "");

            downloadBlob(blob, `${originalBase}_comprimido.pdf`);
            showToast('¡PDF comprimido descargado!', 'success');
            resetCompressPdfUI();
        } catch (error) {
            console.error(error);
            showToast('Ocurrió un error al comprimir el PDF.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
