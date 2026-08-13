import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone, getEmbeddableImageBytes } from '../helpers.js';

export function init() {
    // TOOL 1: UNIR PDF (MERGE PDF)
    // ----------------------------------------------------------------------
    let mergeFilesList = [];

    setupDropzone('dropzone-unir', 'file-unir', (files) => {
        for (let file of files) {
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                if (!mergeFilesList.some(f => f.name === file.name && f.size === file.size)) {
                    mergeFilesList.push(file);
                }
            } else {
                showToast(`El archivo "${file.name}" no es un PDF válido`, 'warning');
            }
        }
        updateMergeUI();
    });

    function updateMergeUI() {
        const listContainer = document.getElementById('list-container-unir');
        const listEl = document.getElementById('files-list-unir');
        const countEl = document.getElementById('count-unir');
        const actionsEl = document.getElementById('actions-unir');
        const dropzoneEl = document.getElementById('dropzone-unir');

        listEl.innerHTML = '';
        countEl.textContent = mergeFilesList.length;

        if (mergeFilesList.length > 0) {
            listContainer.style.display = 'block';
            actionsEl.style.display = 'flex';
            dropzoneEl.style.padding = '2rem 1rem';
            
            mergeFilesList.forEach((file, index) => {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.innerHTML = `
                    <div class="file-info-group">
                        <i class="fa-solid fa-file-pdf file-item-icon"></i>
                        <span class="file-item-name" title="${file.name}">${file.name}</span>
                        <span class="file-item-size">${formatBytes(file.size)}</span>
                    </div>
                    <div class="file-order-controls">
                        <button class="btn-icon btn-up" title="Mover arriba" ${index === 0 ? 'disabled' : ''}>
                            <i class="fa-solid fa-chevron-up"></i>
                        </button>
                        <button class="btn-icon btn-down" title="Mover abajo" ${index === mergeFilesList.length - 1 ? 'disabled' : ''}>
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                        <button class="btn-icon btn-danger-hover btn-delete" title="Quitar de la lista">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                `;

                li.querySelector('.btn-up').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (index > 0) {
                        const temp = mergeFilesList[index];
                        mergeFilesList[index] = mergeFilesList[index - 1];
                        mergeFilesList[index - 1] = temp;
                        updateMergeUI();
                    }
                });

                li.querySelector('.btn-down').addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (index < mergeFilesList.length - 1) {
                        const temp = mergeFilesList[index];
                        mergeFilesList[index] = mergeFilesList[index + 1];
                        mergeFilesList[index + 1] = temp;
                        updateMergeUI();
                    }
                });

                li.querySelector('.btn-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    mergeFilesList.splice(index, 1);
                    updateMergeUI();
                    showToast('Archivo quitado', 'info');
                });

                listEl.appendChild(li);
            });
        } else {
            listContainer.style.display = 'none';
            actionsEl.style.display = 'none';
            dropzoneEl.style.padding = '3.5rem 2rem';
        }
    }

    document.getElementById('btn-run-unir').addEventListener('click', async () => {
        if (mergeFilesList.length < 2) {
            showToast('Por favor, agrega al menos 2 archivos PDF para unir.', 'warning');
            return;
        }

        showLoader('Uniendo archivos PDF...');
        try {
            const mergedPdf = await PDFLib.PDFDocument.create();
            
            for (const file of mergeFilesList) {
                const arrayBuffer = await file.arrayBuffer();
                const srcDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
                copiedPages.forEach((page) => mergedPdf.addPage(page));
            }

            const mergedPdfBytes = await mergedPdf.save();
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            
            downloadBlob(blob, 'PDF_unido.pdf');
            showToast('PDFs unidos y descargados con éxito!', 'success');
            
            mergeFilesList = [];
            updateMergeUI();
        } catch (error) {
            console.error(error);
            showToast('Ocurrió un error al unir los PDFs. Verifica que los archivos no estén encriptados.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------

}
