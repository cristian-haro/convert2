import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export function init() {
    // TOOL 2: SEPARAR PDF (SPLIT PDF)
    // ----------------------------------------------------------------------
    let splitFile = null;
    let splitTotalPages = 0;

    setupDropzone('dropzone-separar', 'file-separar', async (files) => {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            showLoader('Analizando PDF...');
            try {
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                splitTotalPages = pdfDoc.getPageCount();
                splitFile = file;

                document.getElementById('dropzone-separar').style.display = 'none';
                document.getElementById('preview-separar').style.display = 'block';
                document.getElementById('actions-separar').style.display = 'flex';
                
                document.getElementById('name-separar').textContent = file.name;
                document.getElementById('size-separar').textContent = formatBytes(file.size);
                document.getElementById('total-pages-separar').textContent = splitTotalPages;
                
                const startInput = document.getElementById('page-start');
                const endInput = document.getElementById('page-end');
                startInput.value = 1;
                startInput.max = splitTotalPages;
                endInput.value = splitTotalPages;
                endInput.max = splitTotalPages;

                showToast('Archivo PDF cargado correctamente', 'success');
            } catch (error) {
                console.error(error);
                showToast('Error al leer el PDF. El archivo podría estar encriptado.', 'error');
            } finally {
                hideLoader();
            }
        } else {
            showToast('Por favor, selecciona un archivo PDF válido.', 'warning');
        }
    });

    function resetSplitUI() {
        splitFile = null;
        splitTotalPages = 0;
        document.getElementById('dropzone-separar').style.display = 'block';
        document.getElementById('preview-separar').style.display = 'none';
        document.getElementById('actions-separar').style.display = 'none';
        document.getElementById('file-separar').value = '';
    }

    document.getElementById('btn-remove-separar').addEventListener('click', resetSplitUI);

    document.getElementById('btn-run-separar').addEventListener('click', async () => {
        if (!splitFile) return;

        const startPage = parseInt(document.getElementById('page-start').value, 10);
        const endPage = parseInt(document.getElementById('page-end').value, 10);

        if (isNaN(startPage) || isNaN(endPage) || startPage < 1 || endPage < 1) {
            showToast('El rango de páginas no es válido.', 'warning');
            return;
        }
        if (startPage > splitTotalPages || endPage > splitTotalPages) {
            showToast(`El rango excede el total de páginas (${splitTotalPages}).`, 'warning');
            return;
        }
        if (startPage > endPage) {
            showToast('La página de inicio debe ser menor o igual a la de fin.', 'warning');
            return;
        }

        showLoader('Separando páginas de PDF...');
        try {
            const arrayBuffer = await splitFile.arrayBuffer();
            const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const splitPdf = await PDFLib.PDFDocument.create();

            const pageIndices = [];
            for (let i = startPage - 1; i <= endPage - 1; i++) {
                pageIndices.push(i);
            }

            const copiedPages = await splitPdf.copyPages(srcDoc, pageIndices);
            copiedPages.forEach((page) => splitPdf.addPage(page));

            const splitPdfBytes = await splitPdf.save();
            const blob = new Blob([splitPdfBytes], { type: 'application/pdf' });
            
            const originalBase = splitFile.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${originalBase}_paginas_${startPage}_${endPage}.pdf`);
            showToast('Páginas separadas con éxito!', 'success');
            resetSplitUI();
        } catch (error) {
            console.error(error);
            showToast('Error al separar las páginas del PDF.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
