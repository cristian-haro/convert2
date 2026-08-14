export const html = `
<section class="tab-panel" id="panel-pdf-imagenes">
                <div class="panel-header">
                    <h2>PDF a Imágenes</h2>
                    <p>Extrae cada página de tu PDF como una imagen individual y descárgalas agrupadas en un archivo
                        ZIP.</p>
                </div>

                <div class="dropzone" id="dropzone-pdf-to-img">
                    <input type="file" id="file-pdf-to-img" accept=".pdf" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-file-image dropzone-icon"></i>
                        <h3>Selecciona tu archivo PDF</h3>
                        <p>Arrastra el archivo o haz clic para buscar</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-pdf-to-img" style="display: none;">
                    <div class="file-meta">
                        <i class="fa-solid fa-file-pdf file-type-icon"></i>
                        <div class="file-details">
                            <span class="file-name" id="name-pdf-to-img">documento.pdf</span>
                            <span class="file-size" id="size-pdf-to-img">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-pdf-to-img"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options">
                        <h3>Formato de las Imágenes de Salida</h3>
                        <div class="format-selection">
                            <label class="select-label" for="format-pdf-to-img">Formato:</label>
                            <div class="select-wrapper">
                                <select id="format-pdf-to-img">
                                    <option value="png">PNG (Sin pérdida de calidad)</option>
                                    <option value="jpeg">JPEG (Comprimido y ligero)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="actions-panel" id="actions-pdf-to-img" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-pdf-to-img">
                        <i class="fa-solid fa-file-zipper"></i> Convertir y Descargar ZIP
                    </button>
                </div>
            </section>

            <!-- 6. Firmar PDF Panel [NEW] -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js')
    ]);

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
