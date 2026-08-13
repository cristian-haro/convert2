import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export function init() {
    // TOOL 3: ROTAR PDF (ROTATE PDF)
    // ----------------------------------------------------------------------
    let rotateFile = null;

    setupDropzone('dropzone-rotar', 'file-rotar', async (files) => {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            rotateFile = file;
            document.getElementById('dropzone-rotar').style.display = 'none';
            document.getElementById('preview-rotar').style.display = 'block';
            document.getElementById('actions-rotar').style.display = 'flex';
            
            document.getElementById('name-rotar').textContent = file.name;
            document.getElementById('size-rotar').textContent = formatBytes(file.size);
            showToast('Archivo PDF cargado correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo PDF válido.', 'warning');
        }
    });

    function resetRotateUI() {
        rotateFile = null;
        document.getElementById('dropzone-rotar').style.display = 'block';
        document.getElementById('preview-rotar').style.display = 'none';
        document.getElementById('actions-rotar').style.display = 'none';
        document.getElementById('file-rotar').value = '';
    }

    document.getElementById('btn-remove-rotar').addEventListener('click', resetRotateUI);

    document.getElementById('btn-run-rotar').addEventListener('click', async () => {
        if (!rotateFile) return;

        const rotationAngle = parseInt(document.querySelector('input[name="rot-angle"]:checked').value, 10);
        showLoader(`Rotando PDF ${rotationAngle}°...`);

        try {
            const arrayBuffer = await rotateFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();

            pages.forEach((page) => {
                const currentRotation = page.getRotation().angle;
                const newRotation = (currentRotation + rotationAngle) % 360;
                page.setRotation(PDFLib.degrees(newRotation));
            });

            const rotatedPdfBytes = await pdfDoc.save();
            const blob = new Blob([rotatedPdfBytes], { type: 'application/pdf' });
            
            const originalBase = rotateFile.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${originalBase}_rotado_${rotationAngle}.pdf`);
            showToast('PDF rotado con éxito!', 'success');
            resetRotateUI();
        } catch (error) {
            console.error(error);
            showToast('Error al rotar el PDF.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
