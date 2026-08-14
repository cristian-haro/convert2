export const html = `
<section class="tab-panel" id="panel-proteger-pdf">
                <div class="panel-header">
                    <h2>Proteger / Desproteger PDF</h2>
                    <p>Añade una contraseña de apertura a tu PDF para restringir el acceso o elimínala si ya no la
                        necesitas.</p>
                </div>

                <div class="dropzone" id="dropzone-proteger">
                    <input type="file" id="file-proteger" accept=".pdf" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-lock dropzone-icon"></i>
                        <h3>Selecciona tu archivo PDF</h3>
                        <p>Arrastra el archivo o haz clic para buscar</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-proteger" style="display: none;">
                    <div class="file-meta">
                        <i class="fa-solid fa-file-pdf file-type-icon"></i>
                        <div class="file-details">
                            <span class="file-name" id="name-proteger">documento.pdf</span>
                            <span class="file-size" id="size-proteger">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-proteger"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options">
                        <h3>Acción de Seguridad</h3>
                        <div class="security-modes">
                            <label class="choice-card">
                                <input type="radio" name="sec-mode" value="encrypt" checked>
                                <span class="choice-box">
                                    <i class="fa-solid fa-shield-halved"></i>
                                    <strong>Proteger PDF</strong>
                                    <span>Añadir Contraseña</span>
                                </span>
                            </label>
                            <label class="choice-card">
                                <input type="radio" name="sec-mode" value="decrypt">
                                <span class="choice-box">
                                    <i class="fa-solid fa-unlock-keyhole"></i>
                                    <strong>Desproteger PDF</strong>
                                    <span>Eliminar Contraseña</span>
                                </span>
                            </label>
                        </div>

                        <div class="security-inputs-wrapper">
                            <div class="input-group" id="group-sec-password">
                                <label for="sec-password" id="label-sec-password">Contraseña de Apertura:</label>
                                <input type="password" id="sec-password" placeholder="Ingresa la contraseña..."
                                    class="text-input-field">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="actions-panel" id="actions-proteger" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-proteger">
                        <i class="fa-solid fa-shield-check"></i> Aplicar Seguridad y Descargar
                    </button>
                </div>
            </section>

            <!-- 8. Convertir Imagen Panel -->
`;

import { loadScript } from '../helpers.js';
import { encryptPDF } from 'https://cdn.jsdelivr.net/npm/@pdfsmaller/pdf-encrypt-lite/+esm';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export async function init() {
    await loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js');

    // TOOL 7: PROTEGER / DESPROTEGER PDF [NEW]
    // ----------------------------------------------------------------------
    let protectPdfFile = null;

    setupDropzone('dropzone-proteger', 'file-proteger', (files) => {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            protectPdfFile = file;
            document.getElementById('dropzone-proteger').style.display = 'none';
            document.getElementById('preview-proteger').style.display = 'block';
            document.getElementById('actions-proteger').style.display = 'flex';
            
            document.getElementById('name-proteger').textContent = file.name;
            document.getElementById('size-proteger').textContent = formatBytes(file.size);
            showToast('Archivo PDF cargado', 'success');
        } else {
            showToast('Por favor, selecciona un archivo PDF válido.', 'warning');
        }
    });

    function resetProtectUI() {
        protectPdfFile = null;
        document.getElementById('dropzone-proteger').style.display = 'block';
        document.getElementById('preview-proteger').style.display = 'none';
        document.getElementById('actions-proteger').style.display = 'none';
        document.getElementById('file-proteger').value = '';
        document.getElementById('sec-password').value = '';
    }

    document.getElementById('btn-remove-proteger').addEventListener('click', resetProtectUI);

    // Toggle label texts based on selected security mode
    const secModes = document.querySelectorAll('input[name="sec-mode"]');
    secModes.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const mode = e.target.value;
            const label = document.getElementById('label-sec-password');
            if (mode === 'encrypt') {
                label.textContent = 'Contraseña de Apertura a Establecer:';
            } else {
                label.textContent = 'Contraseña de Apertura Actual (para desencriptar):';
            }
        });
    });

    document.getElementById('btn-run-proteger').addEventListener('click', async () => {
        if (!protectPdfFile) return;

        const mode = document.querySelector('input[name="sec-mode"]:checked').value;
        const password = document.getElementById('sec-password').value;

        if (!password) {
            showToast('Por favor, ingresa la contraseña correspondiente.', 'warning');
            return;
        }

        const arrayBuffer = await protectPdfFile.arrayBuffer();
        const originalBase = protectPdfFile.name.replace(/\.[^/.]+$/, "");

        if (mode === 'encrypt') {
            showLoader('Encriptando PDF...');
            try {
                // Read file to Uint8Array bytes
                const bytes = new Uint8Array(arrayBuffer);
                // Encrypt bytes via standard RC4
                const encryptedBytes = await encryptPDF(bytes, password);
                const blob = new Blob([encryptedBytes], { type: 'application/pdf' });
                
                downloadBlob(blob, `${originalBase}_protegido.pdf`);
                showToast('Contraseña establecida con éxito!', 'success');
                resetProtectUI();
            } catch (error) {
                console.error(error);
                showToast('Error al encriptar el PDF.', 'error');
            } finally {
                hideLoader();
            }
        } else {
            showLoader('Desencriptando PDF...');
            try {
                // Decrypt using pdf-lib load parameters
                const decryptedDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
                    password: password
                });
                
                const decryptedBytes = await decryptedDoc.save();
                const blob = new Blob([decryptedBytes], { type: 'application/pdf' });
                
                downloadBlob(blob, `${originalBase}_desprotegido.pdf`);
                showToast('Contraseña eliminada con éxito!', 'success');
                resetProtectUI();
            } catch (error) {
                console.error(error);
                showToast('Error al desencriptar. Verifica que la contraseña ingresada sea la correcta.', 'error');
            } finally {
                hideLoader();
            }
        }
    });

    // ----------------------------------------------------------------------

}
