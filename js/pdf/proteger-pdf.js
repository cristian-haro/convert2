import { encryptPDF } from 'https://cdn.jsdelivr.net/npm/@pdfsmaller/pdf-encrypt-lite/+esm';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export function init() {
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
