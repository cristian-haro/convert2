export const html = `
<section class="tab-panel" id="panel-rotar-pdf">
                <div class="panel-header">
                    <h2>Rotar Páginas de PDF</h2>
                    <p>Corrige la orientación de todas las páginas de tu archivo PDF girándolas 90°, 180° o 270°.</p>
                </div>

                <div class="dropzone" id="dropzone-rotar">
                    <input type="file" id="file-rotar" accept=".pdf" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-rotate dropzone-icon"></i>
                        <h3>Selecciona tu archivo PDF a rotar</h3>
                        <p>Arrastra el archivo o haz clic para buscar</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-rotar" style="display: none;">
                    <div class="file-meta">
                        <i class="fa-solid fa-file-pdf file-type-icon"></i>
                        <div class="file-details">
                            <span class="file-name" id="name-rotar">documento.pdf</span>
                            <span class="file-size" id="size-rotar">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-rotar"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options">
                        <h3>Ángulo de Rotación</h3>
                        <div class="rotation-choices">
                            <label class="choice-card">
                                <input type="radio" name="rot-angle" value="90" checked>
                                <span class="choice-box">
                                    <i class="fa-solid fa-rotate-right icon-90"></i>
                                    <strong>90°</strong>
                                    <span>Horario</span>
                                </span>
                            </label>
                            <label class="choice-card">
                                <input type="radio" name="rot-angle" value="180">
                                <span class="choice-box">
                                    <i class="fa-solid fa-arrow-down icon-180"></i>
                                    <strong>180°</strong>
                                    <span>Vertical</span>
                                </span>
                            </label>
                            <label class="choice-card">
                                <input type="radio" name="rot-angle" value="270">
                                <span class="choice-box">
                                    <i class="fa-solid fa-rotate-left icon-270"></i>
                                    <strong>270°</strong>
                                    <span>Antihorario</span>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                <div class="actions-panel" id="actions-rotar" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-rotar">
                        <i class="fa-solid fa-rotate"></i> Rotar y Descargar PDF
                    </button>
                </div>
            </section>

            <!-- 4. Imágenes a PDF Panel [NEW] -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js')
    ]);

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
