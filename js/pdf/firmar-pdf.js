export const html = `
<section class="tab-panel" id="panel-firmar-pdf">
                <div class="panel-header">
                    <h2>Firmar PDF</h2>
                    <p>Dibuja tu firma digital y colócala de manera interactiva sobre las páginas de tu archivo PDF.</p>
                </div>

                <div class="dropzone" id="dropzone-firmar">
                    <input type="file" id="file-firmar" accept=".pdf" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-signature dropzone-icon"></i>
                        <h3>Carga el PDF que deseas firmar</h3>
                        <p>Arrastra el archivo o haz clic para buscar</p>
                    </div>
                </div>

                <div class="signature-work-area" id="work-area-firmar" style="display: none;">
                    <div class="signature-editor-grid">
                        <!-- Left Panel: Drawing Signature -->
                        <div class="signature-box-card">
                            <h3>1. Dibuja tu Firma</h3>
                            <div class="canvas-sig-container">
                                <canvas id="canvas-signature-pad" width="300" height="150"></canvas>
                            </div>
                            <div class="sig-buttons">
                                <button class="btn btn-secondary-icon" id="btn-clear-sig"><i
                                        class="fa-solid fa-eraser"></i> Limpiar</button>
                                <button class="btn btn-primary-icon" id="btn-save-sig"><i
                                        class="fa-solid fa-circle-check"></i> Usar Firma</button>
                            </div>
                        </div>

                        <!-- Right Panel: Place signature on PDF -->
                        <div class="pdf-viewer-card">
                            <h3>2. Posiciona la Firma en el PDF</h3>
                            <div class="pdf-page-navigator">
                                <button class="btn-icon" id="btn-prev-page-sig"><i
                                        class="fa-solid fa-chevron-left"></i></button>
                                <span>Página <strong id="current-page-sig">1</strong> de <strong
                                        id="total-pages-sig">1</strong></span>
                                <button class="btn-icon" id="btn-next-page-sig"><i
                                        class="fa-solid fa-chevron-right"></i></button>
                            </div>

                            <div class="pdf-canvas-container">
                                <div class="canvas-relative-wrapper">
                                    <canvas id="canvas-pdf-preview"></canvas>
                                    <div class="signature-stamp-preview" id="sig-stamp-preview" style="display: none;">
                                        <i class="fa-solid fa-signature"></i>
                                    </div>
                                </div>
                            </div>
                            <p class="instruction-stamp-text"><i class="fa-solid fa-hand-pointer"></i> Haz clic en la
                                posición exacta del PDF donde quieres estampar tu firma.</p>
                        </div>
                    </div>

                    <div class="tool-options sig-options-meta">
                        <h3>Configuración del Sello</h3>
                        <div class="range-inputs">
                            <div class="input-group">
                                <label for="sig-scale">Tamaño de la Firma (%):</label>
                                <input type="number" id="sig-scale" min="10" max="200" value="100">
                            </div>
                        </div>
                    </div>

                    <div class="actions-panel">
                        <button class="btn btn-secondary" id="btn-cancel-firmar">Cancelar</button>
                        <button class="btn btn-primary" id="btn-run-firmar">
                            <i class="fa-solid fa-file-signature"></i> Aplicar Firma y Descargar
                        </button>
                    </div>
                </div>
            </section>

            <!-- 7. Proteger PDF Panel [NEW] -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export async function init() {
    await Promise.all([
        loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js')
    ]);

    // TOOL 6: FIRMAR PDF (SIGN PDF) [NEW]
    // ----------------------------------------------------------------------
    let signaturePdfFile = null;
    let signaturePdfDoc = null;
    let signatureTotalPages = 0;
    let signatureCurrentPage = 1;
    let signatureDataUrl = null;

    // Draw Signature Pad Logic
    const sigPad = document.getElementById('canvas-signature-pad');
    const sigCtx = sigPad.getContext('2d');
    let isDrawing = false;

    // Mouse events
    sigPad.addEventListener('mousedown', startDrawing);
    sigPad.addEventListener('mousemove', draw);
    sigPad.addEventListener('mouseup', stopDrawing);
    sigPad.addEventListener('mouseleave', stopDrawing);
    
    // Touch events
    sigPad.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = sigPad.getBoundingClientRect();
        startDrawing({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    });
    sigPad.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = sigPad.getBoundingClientRect();
        draw({
            clientX: touch.clientX,
            clientY: touch.clientY
        });
    });
    sigPad.addEventListener('touchend', stopDrawing);

    function getMousePos(e) {
        const rect = sigPad.getBoundingClientRect();
        // Handle client coord mapping
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    function startDrawing(e) {
        isDrawing = true;
        const pos = getMousePos(e);
        sigCtx.beginPath();
        sigCtx.moveTo(pos.x, pos.y);
        sigCtx.lineWidth = 3;
        sigCtx.lineCap = 'round';
        sigCtx.strokeStyle = '#000';
    }

    function draw(e) {
        if (!isDrawing) return;
        const pos = getMousePos(e);
        sigCtx.lineTo(pos.x, pos.y);
        sigCtx.stroke();
    }

    function stopDrawing() {
        isDrawing = false;
    }

    document.getElementById('btn-clear-sig').addEventListener('click', () => {
        sigCtx.clearRect(0, 0, sigPad.width, sigPad.height);
        signatureDataUrl = null;
        document.getElementById('sig-stamp-preview').style.display = 'none';
        showToast('Firma borrada', 'info');
    });

    document.getElementById('btn-save-sig').addEventListener('click', () => {
        // Simple check if canvas is empty
        const blank = document.createElement('canvas');
        blank.width = sigPad.width;
        blank.height = sigPad.height;
        if (sigPad.toDataURL() === blank.toDataURL()) {
            showToast('El lienzo de firma está vacío.', 'warning');
            return;
        }
        
        signatureDataUrl = sigPad.toDataURL('image/png');
        showToast('Firma guardada. Haz clic en el PDF para posicionarla.', 'success');
        
        // Show visual stamp preview on page if coordinates are already set
        if (stampCoords) {
            updateStampPreview();
        }
    });

    // Loading PDF file for Stamping
    setupDropzone('dropzone-firmar', 'file-firmar', async (files) => {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            showLoader('Cargando PDF para firmar...');
            try {
                const arrayBuffer = await file.arrayBuffer();
                signaturePdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                signatureTotalPages = signaturePdfDoc.numPages;
                signaturePdfFile = file;
                signatureCurrentPage = 1;

                document.getElementById('dropzone-firmar').style.display = 'none';
                document.getElementById('work-area-firmar').style.display = 'block';
                
                document.getElementById('total-pages-sig').textContent = signatureTotalPages;
                
                await renderSignaturePDFPage();
            } catch (error) {
                console.error(error);
                showToast('Error al abrir el PDF.', 'error');
            } finally {
                hideLoader();
            }
        }
    });

    const pdfPreviewCanvas = document.getElementById('canvas-pdf-preview');
    const pdfPreviewCtx = pdfPreviewCanvas.getContext('2d');
    let stampCoords = null; // Stored relative coordinates {x: 0..1, y: 0..1}

    async function renderSignaturePDFPage() {
        if (!signaturePdfDoc) return;
        
        showLoader('Cargando página...');
        try {
            const page = await signaturePdfDoc.getPage(signatureCurrentPage);
            const viewport = page.getViewport({ scale: 1.2 });
            
            pdfPreviewCanvas.width = viewport.width;
            pdfPreviewCanvas.height = viewport.height;

            await page.render({
                canvasContext: pdfPreviewCtx,
                viewport: viewport
            }).promise;

            document.getElementById('current-page-sig').textContent = signatureCurrentPage;
            
            // Hide preview marker on page change unless we keep it (let's clear it on page change)
            stampCoords = null;
            document.getElementById('sig-stamp-preview').style.display = 'none';
        } catch (err) {
            console.error(err);
            showToast('Error al renderizar la página.', 'error');
        } finally {
            hideLoader();
        }
    }

    document.getElementById('btn-prev-page-sig').addEventListener('click', async () => {
        if (signatureCurrentPage > 1) {
            signatureCurrentPage--;
            await renderSignaturePDFPage();
        }
    });

    document.getElementById('btn-next-page-sig').addEventListener('click', async () => {
        if (signatureCurrentPage < signatureTotalPages) {
            signatureCurrentPage++;
            await renderSignaturePDFPage();
        }
    });

    // Place Signature stamp on click
    pdfPreviewCanvas.addEventListener('click', (e) => {
        const rect = pdfPreviewCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        stampCoords = { x, y };
        
        updateStampPreview();
    });

    function updateStampPreview() {
        if (!stampCoords) return;
        const previewEl = document.getElementById('sig-stamp-preview');
        
        // Convert relative coordinates back to canvas dimensions
        const px = stampCoords.x * 100;
        const py = stampCoords.y * 100;
        
        previewEl.style.left = `${px}%`;
        previewEl.style.top = `${py}%`;
        
        // Size of the stamp
        const scaleVal = parseFloat(document.getElementById('sig-scale').value) || 100;
        const w = (100 * (scaleVal / 100)) * (pdfPreviewCanvas.width / 500); // Scaling relative to width
        const h = w / 2; // Keep drawn 2:1 aspect ratio of signature-pad
        
        previewEl.style.width = `${w}px`;
        previewEl.style.height = `${h}px`;
        previewEl.style.display = 'flex';
    }

    document.getElementById('sig-scale').addEventListener('input', updateStampPreview);

    function resetSignatureUI() {
        signaturePdfFile = null;
        signaturePdfDoc = null;
        signatureDataUrl = null;
        stampCoords = null;
        sigCtx.clearRect(0, 0, sigPad.width, sigPad.height);
        
        document.getElementById('dropzone-firmar').style.display = 'block';
        document.getElementById('work-area-firmar').style.display = 'none';
        document.getElementById('file-firmar').value = '';
    }

    document.getElementById('btn-cancel-firmar').addEventListener('click', resetSignatureUI);

    document.getElementById('btn-run-firmar').addEventListener('click', async () => {
        if (!signaturePdfFile || !stampCoords) {
            showToast('Por favor, dibuja la firma, guárdala y haz clic en el PDF para posicionarla.', 'warning');
            return;
        }
        if (!signatureDataUrl) {
            showToast('Por favor, haz clic en el botón "Usar Firma" primero.', 'warning');
            return;
        }

        showLoader('Estampando firma digital...');
        try {
            const arrayBuffer = await signaturePdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            
            // Embed drawing PNG
            const sigImage = await pdfDoc.embedPng(signatureDataUrl);
            
            // Target page (0-indexed)
            const page = pdfDoc.getPage(signatureCurrentPage - 1);
            const { width, height } = page.getSize();

            // Translate coordinates from canvas to PDF coordinates
            // PDF origin is at bottom-left corner
            const pdfX = stampCoords.x * width;
            const pdfY = height - (stampCoords.y * height);

            const scaleVal = parseFloat(document.getElementById('sig-scale').value) || 100;
            const factor = scaleVal / 100;
            const targetWidth = (width / 5) * factor; // Default width is 1/5th of page width
            const targetHeight = targetWidth / 2; // Match 2:1 pad aspect ratio

            // Draw centering the image around the coordinate
            page.drawImage(sigImage, {
                x: pdfX - (targetWidth / 2),
                y: pdfY - (targetHeight / 2),
                width: targetWidth,
                height: targetHeight
            });

            const signedBytes = await pdfDoc.save();
            const blob = new Blob([signedBytes], { type: 'application/pdf' });
            
            const originalBase = signaturePdfFile.name.replace(/\.[^/.]+$/, "");
            downloadBlob(blob, `${originalBase}_firmado.pdf`);
            showToast('PDF firmado con éxito!', 'success');
            resetSignatureUI();
        } catch (error) {
            console.error(error);
            showToast('Error al firmar el PDF.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
