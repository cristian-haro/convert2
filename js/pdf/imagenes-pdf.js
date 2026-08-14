export const html = `
<section class="tab-panel" id="panel-imagenes-pdf">
                <div class="panel-header">
                    <h2>Imágenes a PDF</h2>
                    <p>Une múltiples fotos e imágenes y conviértelas en un único documento PDF ordenado.</p>
                </div>

                <div class="dropzone" id="dropzone-img-to-pdf">
                    <input type="file" id="file-img-to-pdf" multiple accept="image/*" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-images dropzone-icon"></i>
                        <h3>Arrastra tus imágenes aquí</h3>
                        <p>Soporta PNG, JPG, JPEG, BMP, WEBP</p>
                    </div>
                </div>

                <div class="files-list-container" id="list-container-img-to-pdf" style="display: none;">
                    <h3>Imágenes seleccionadas (<span id="count-img-to-pdf">0</span>)</h3>
                    <ul class="files-list" id="files-list-img-to-pdf"></ul>
                </div>

                <div class="actions-panel" id="actions-img-to-pdf" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-img-to-pdf">
                        <i class="fa-solid fa-file-pdf"></i> Generar y Descargar PDF
                    </button>
                </div>
            </section>

            <!-- 5. PDF a Imágenes Panel [NEW] -->
`;

import { loadScript } from '../helpers.js';
import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export async function init() {
    await loadScript('https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js');

    // TOOL 4: IMÁGENES A PDF (IMAGES TO PDF) [NEW]
    // ----------------------------------------------------------------------
    let imgToPdfList = [];

    setupDropzone('dropzone-img-to-pdf', 'file-img-to-pdf', (files) => {
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                if (!imgToPdfList.some(f => f.name === file.name && f.size === file.size)) {
                    imgToPdfList.push(file);
                }
            } else {
                showToast(`El archivo "${file.name}" no es una imagen válida`, 'warning');
            }
        }
        updateImgToPdfUI();
    });

    function updateImgToPdfUI() {
        const listContainer = document.getElementById('list-container-img-to-pdf');
        const listEl = document.getElementById('files-list-img-to-pdf');
        const countEl = document.getElementById('count-img-to-pdf');
        const actionsEl = document.getElementById('actions-img-to-pdf');
        const dropzoneEl = document.getElementById('dropzone-img-to-pdf');

        listEl.innerHTML = '';
        countEl.textContent = imgToPdfList.length;

        if (imgToPdfList.length > 0) {
            listContainer.style.display = 'block';
            actionsEl.style.display = 'flex';
            dropzoneEl.style.padding = '2rem 1rem';
            
            imgToPdfList.forEach((file, index) => {
                const li = document.createElement('li');
                li.className = 'file-item';
                
                // Show thumbnail dynamically
                const thumbWrapper = document.createElement('div');
                thumbWrapper.className = 'thumbnail-wrapper';
                const imgThumb = document.createElement('img');
                imgThumb.className = 'img-thumbnail';
                imgThumb.src = URL.createObjectURL(file);
                thumbWrapper.appendChild(imgThumb);
                
                li.innerHTML = `
                    <div class="file-info-group">
                        <span class="file-item-name" title="${file.name}">${file.name}</span>
                        <span class="file-item-size">${formatBytes(file.size)}</span>
                    </div>
                    <div class="file-order-controls">
                        <button class="btn-icon btn-up" title="Mover arriba" ${index === 0 ? 'disabled' : ''}>
                            <i class="fa-solid fa-chevron-up"></i>
                        </button>
                        <button class="btn-icon btn-down" title="Mover abajo" ${index === imgToPdfList.length - 1 ? 'disabled' : ''}>
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <button class="btn-icon btn-danger-hover btn-delete" title="Quitar">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;
                
                li.querySelector('.file-info-group').prepend(thumbWrapper);

                li.querySelector('.btn-up').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (index > 0) {
                        const temp = imgToPdfList[index];
                        imgToPdfList[index] = imgToPdfList[index - 1];
                        imgToPdfList[index - 1] = temp;
                        updateImgToPdfUI();
                    }
                });

                li.querySelector('.btn-down').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (index < imgToPdfList.length - 1) {
                        const temp = imgToPdfList[index];
                        imgToPdfList[index] = imgToPdfList[index + 1];
                        imgToPdfList[index + 1] = temp;
                        updateImgToPdfUI();
                    }
                });

                li.querySelector('.btn-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    imgToPdfList.splice(index, 1);
                    updateImgToPdfUI();
                });

                listEl.appendChild(li);
            });
        } else {
            listContainer.style.display = 'none';
            actionsEl.style.display = 'none';
            dropzoneEl.style.padding = '3.5rem 2rem';
        }
    }

    document.getElementById('btn-run-img-to-pdf').addEventListener('click', async () => {
        if (imgToPdfList.length === 0) return;

        showLoader('Generando PDF desde imágenes...');
        try {
            const pdfDoc = await PDFLib.PDFDocument.create();

            for (const file of imgToPdfList) {
                const imgData = await getEmbeddableImageBytes(file);
                let embeddedImage;
                
                if (imgData.type === 'png') {
                    embeddedImage = await pdfDoc.embedPng(imgData.bytes);
                } else {
                    embeddedImage = await pdfDoc.embedJpg(imgData.bytes);
                }

                const { width, height } = embeddedImage.scale(1.0);
                const page = pdfDoc.addPage([width, height]);
                page.drawImage(embeddedImage, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            downloadBlob(blob, 'Imagenes_a_PDF.pdf');
            showToast('PDF generado correctamente!', 'success');
            
            imgToPdfList = [];
            updateImgToPdfUI();
        } catch (error) {
            console.error(error);
            showToast('Error al construir el PDF desde las imágenes.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
