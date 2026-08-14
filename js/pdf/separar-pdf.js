export const html = `
<section class="tab-panel" id="panel-separar-pdf">
                <div class="panel-header">
                    <h2>Separar PDF</h2>
                    <p>Extrae un rango específico de páginas de un documento PDF para crear un nuevo archivo.</p>
                </div>

                <div class="dropzone" id="dropzone-separar">
                    <input type="file" id="file-separar" accept=".pdf" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-file-pdf dropzone-icon"></i>
                        <h3>Selecciona tu archivo PDF</h3>
                        <p>Arrastra el archivo o haz clic para buscar</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-separar" style="display: none;">
                    <div class="file-meta">
                        <i class="fa-solid fa-file-pdf file-type-icon"></i>
                        <div class="file-details">
                            <span class="file-name" id="name-separar">documento.pdf</span>
                            <span class="file-size" id="size-separar">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-separar"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options">
                        <h3>Rango de Páginas a Extraer</h3>
                        <div class="range-inputs">
                            <div class="input-group">
                                <label for="page-start">Desde página:</label>
                                <input type="number" id="page-start" min="1" value="1">
                            </div>
                            <div class="input-group">
                                <label for="page-end">Hasta página:</label>
                                <input type="number" id="page-end" min="1" value="1">
                            </div>
                        </div>
                        <p class="info-text"><i class="fa-solid fa-circle-info"></i> El PDF tiene un total de <strong
                                id="total-pages-separar">0</strong> páginas.</p>
                    </div>
                </div>

                <div class="actions-panel" id="actions-separar" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-separar">
                        <i class="fa-solid fa-scissors"></i> Extraer y Descargar PDF
                    </button>
                </div>
            </section>

            <!-- 3. Rotar PDF Panel -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js')
    ]);

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
