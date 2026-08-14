export const html = `
<section class="tab-panel" id="panel-compresor-pdf">
                <div class="panel-header">
                    <h2>Comprimir Archivo PDF</h2>
                    <p>Optimiza y reduce el peso de tus PDFs ajustando la resolución y calidad de sus páginas de manera
                        local.</p>
                </div>

                <div class="dropzone" id="dropzone-compresor-pdf">
                    <input type="file" id="file-compresor-pdf" accept=".pdf" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-compress dropzone-icon"></i>
                        <h3>Selecciona tu archivo PDF</h3>
                        <p>Arrastra el archivo o haz clic para buscar</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-compresor-pdf" style="display: none;">
                    <div class="file-meta">
                        <i class="fa-solid fa-file-pdf file-type-icon"></i>
                        <div class="file-details">
                            <span class="file-name" id="name-compresor-pdf">documento.pdf</span>
                            <span class="file-size" id="size-compresor-pdf">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-compresor-pdf"><i
                                class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options">
                        <h3>Opciones de Compresión</h3>
                        <div class="option-grid-2col"
                            style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 1rem;">
                            <div class="input-group">
                                <label for="compress-pdf-resolution">Resolución máxima (DPI):</label>
                                <div class="select-wrapper">
                                    <select id="compress-pdf-resolution">
                                        <option value="72">Baja (72 DPI) - Tamaño mínimo</option>
                                        <option value="150" selected>Media (150 DPI) - Recomendado</option>
                                        <option value="300">Alta (300 DPI) - Impresión</option>
                                    </select>
                                </div>
                            </div>
                            <div class="input-group">
                                <label for="compress-pdf-quality"
                                    style="display: flex; justify-content: space-between;"><span>Calidad de
                                        compresión:</span> <span id="val-compress-pdf-quality">60%</span></label>
                                <input type="range" id="compress-pdf-quality" min="10" max="100" value="60"
                                    class="input-slider" style="margin-top: 0.5rem; width: 100%;">
                            </div>
                        </div>
                        <p class="info-warning"
                            style="margin-top: 1.5rem; background: rgba(245, 158, 11, 0.1); border-left: 4px solid var(--warning-color); padding: 10px 14px; border-radius: var(--border-radius-sm); font-size: 0.88rem; color: var(--color-text);">
                            <i class="fa-solid fa-triangle-exclamation"
                                style="color: var(--warning-color); margin-right: 6px;"></i> <strong>Nota:</strong> Este
                            proceso comprime el PDF convirtiendo las páginas en imágenes optimizadas en el cliente. El
                            texto del archivo resultante será plano (no seleccionable).</p>
                    </div>
                </div>

                <div class="actions-panel" id="actions-compresor-pdf" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-compresor-pdf">
                        <i class="fa-solid fa-compress"></i> Comprimir y Descargar PDF
                    </button>
                </div>
            </section>

            <!-- 12d. Limpiar EXIF Panel [NEW] -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js')
    ]);

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
