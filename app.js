/* ==========================================================================
   Convert2 by Cristian Haro - JavaScript Application Logic
   ========================================================================== */

import { encryptPDF } from 'https://cdn.jsdelivr.net/npm/@pdfsmaller/pdf-encrypt-lite/+esm';
import { removeBackground } from 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';

// Configure PDFJS Global Worker
if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------------------------
    // UI ELEMENTS & NAVIGATION
    // ----------------------------------------------------------------------
    const navItems = document.querySelectorAll('.nav-item');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const loaderOverlay = document.getElementById('loader-overlay');
    const loaderText = document.getElementById('loader-text');
    const toastContainer = document.getElementById('toast-container');

    // Tab switching
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('data-tab');
            if (!tabId) return;
            
            navItems.forEach(i => i.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            // Sync active class on both desktop & mobile nav items
            document.querySelectorAll(`.nav-item[data-tab="${tabId}"]`).forEach(i => i.classList.add('active'));
            document.getElementById(`panel-${tabId}`).classList.add('active');
            
            // Close mobile sidebar if open
            sidebar.classList.remove('open');
        });
    });

    // Mobile sidebar toggle
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024) {
            if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        }
    });

    // ----------------------------------------------------------------------
    // GLOBAL HELPERS
    // ----------------------------------------------------------------------
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function showLoader(message = 'Procesando archivo...') {
        loaderText.textContent = message;
        loaderOverlay.style.display = 'flex';
    }

    function hideLoader() {
        loaderOverlay.style.display = 'none';
    }

    function showToast(text, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-circle-xmark';
        if (type === 'warning') icon = 'fa-triangle-exclamation';
        
        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <div class="toast-text">${text}</div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove toast after 4s
        setTimeout(() => {
            toast.classList.add('removing');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 4000);
    }

    // Helper to download files
    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Helper to convert images (like WEBP, GIF, BMP) to embeddable PNG/JPEG bytes
    async function getEmbeddableImageBytes(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
            return { bytes: new Uint8Array(await file.arrayBuffer()), type: ext === 'png' ? 'png' : 'jpg' };
        }
        // Draw other formats to a canvas to convert to PNG
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    blob.arrayBuffer().then((ab) => {
                        resolve({ bytes: new Uint8Array(ab), type: 'png' });
                    });
                }, 'image/png');
            };
            img.src = URL.createObjectURL(file);
        });
    }

    // ----------------------------------------------------------------------
    // DRAG AND DROP ZONE MANAGER
    // ----------------------------------------------------------------------
    function setupDropzone(dropzoneId, inputId, onFileSelect) {
        const dropzone = document.getElementById(dropzoneId);
        const input = document.getElementById(inputId);

        dropzone.addEventListener('click', () => input.click());

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                onFileSelect(e.dataTransfer.files);
            }
        });

        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                onFileSelect(e.target.files);
            }
        });
    }

    // ----------------------------------------------------------------------
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
    // TOOL 8: CONVERTIR IMAGEN (IMAGE CONVERTER)
    // ----------------------------------------------------------------------
    let convertImageFile = null;

    setupDropzone('dropzone-convertir', 'file-convertir', (files) => {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            convertImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('thumb-convertir').src = e.target.result;
            };
            reader.readAsDataURL(file);

            document.getElementById('dropzone-convertir').style.display = 'none';
            document.getElementById('preview-convertir').style.display = 'block';
            document.getElementById('actions-convertir').style.display = 'flex';
            
            document.getElementById('name-convertir').textContent = file.name;
            document.getElementById('size-convertir').textContent = formatBytes(file.size);
            showToast('Imagen cargada correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo de imagen válido.', 'warning');
        }
    });

    function resetConvertImageUI() {
        convertImageFile = null;
        document.getElementById('dropzone-convertir').style.display = 'block';
        document.getElementById('preview-convertir').style.display = 'none';
        document.getElementById('actions-convertir').style.display = 'none';
        document.getElementById('file-convertir').value = '';
        document.getElementById('thumb-convertir').src = '';
    }

    document.getElementById('btn-remove-convertir').addEventListener('click', resetConvertImageUI);

    // Canvas to ICO binary builder
    function canvasToIco(canvas) {
        return new Promise((resolve) => {
            canvas.toBlob((pngBlob) => {
                pngBlob.arrayBuffer().then((pngBuffer) => {
                    const pngSize = pngBuffer.byteLength;
                    const buffer = new ArrayBuffer(22 + pngSize);
                    const view = new DataView(buffer);
                    
                    view.setUint16(0, 0, true); 
                    view.setUint16(2, 1, true); 
                    view.setUint16(4, 1, true); 
                    
                    const width = canvas.width >= 256 ? 0 : canvas.width;
                    const height = canvas.height >= 256 ? 0 : canvas.height;
                    view.setUint8(6, width); 
                    view.setUint8(7, height); 
                    view.setUint8(8, 0); 
                    view.setUint8(9, 0); 
                    view.setUint16(10, 1, true); 
                    view.setUint16(12, 32, true); 
                    view.setUint32(14, pngSize, true); 
                    view.setUint32(18, 22, true); 
                    
                    const destArray = new Uint8Array(buffer, 22);
                    const srcArray = new Uint8Array(pngBuffer);
                    destArray.set(srcArray);
                    
                    resolve(new Blob([buffer], { type: 'image/x-icon' }));
                });
            }, 'image/png');
        });
    }

    document.getElementById('btn-run-convertir').addEventListener('click', () => {
        if (!convertImageFile) return;

        const targetFormat = document.getElementById('format-select').value;
        showLoader(`Convirtiendo imagen a ${targetFormat.toUpperCase()}...`);

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.drawImage(img, 0, 0);
                    
                    const originalBase = convertImageFile.name.replace(/\.[^/.]+$/, "");
                    const outputFilename = `${originalBase}_convertido.${targetFormat}`;

                    if (targetFormat === 'ico') {
                        const icoBlob = await canvasToIco(canvas);
                        downloadBlob(icoBlob, outputFilename);
                        showToast('Imagen convertida a ICO!', 'success');
                        resetConvertImageUI();
                        hideLoader();
                    } else {
                        let mimeType = `image/${targetFormat}`;
                        if (targetFormat === 'jpeg') mimeType = 'image/jpeg';
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                downloadBlob(blob, outputFilename);
                                showToast(`Imagen convertida a ${targetFormat.toUpperCase()}!`, 'success');
                                resetConvertImageUI();
                            } else {
                                showToast('Error al exportar.', 'error');
                            }
                            hideLoader();
                        }, mimeType, 0.95);
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error al procesar la imagen.', 'error');
                    hideLoader();
                }
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(convertImageFile);
    });

    // ----------------------------------------------------------------------
    // TOOL 9: COMPRIMIR IMAGEN (IMAGE COMPRESSOR) [NEW]
    // ----------------------------------------------------------------------
    let compressImageFile = null;

    setupDropzone('dropzone-compresor', 'file-compresor', (files) => {
        const file = files[0];
        // Compress targets JPG, PNG or WEBP
        if (file.type.startsWith('image/')) {
            compressImageFile = file;
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('thumb-compresor').src = e.target.result;
            };
            reader.readAsDataURL(file);

            document.getElementById('dropzone-compresor').style.display = 'none';
            document.getElementById('preview-compresor').style.display = 'block';
            document.getElementById('actions-compresor').style.display = 'flex';
            
            document.getElementById('name-compresor').textContent = file.name;
            document.getElementById('size-compresor').textContent = formatBytes(file.size);
            
            document.getElementById('original-size-display').textContent = formatBytes(file.size);
            
            updateCompressionEstimate();
            showToast('Imagen cargada', 'success');
        } else {
            showToast('Por favor, selecciona una imagen válida.', 'warning');
        }
    });

    const qualitySlider = document.getElementById('compress-quality');
    const qualityValEl = document.getElementById('quality-value-display');

    qualitySlider.addEventListener('input', (e) => {
        qualityValEl.textContent = `${e.target.value}%`;
        updateCompressionEstimate();
    });

    // Real-time canvas compression to update target estimate size label
    function updateCompressionEstimate() {
        if (!compressImageFile) return;
        const quality = parseFloat(qualitySlider.value) / 100;
        
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            
            // JPEGs and WEBPs are compressible natively
            const format = compressImageFile.type === 'image/png' ? 'image/jpeg' : compressImageFile.type;
            
            canvas.toBlob((blob) => {
                if (blob) {
                    document.getElementById('estimate-size-display').textContent = formatBytes(blob.size);
                }
            }, format, quality);
        };
        img.src = URL.createObjectURL(compressImageFile);
    }

    function resetCompressUI() {
        compressImageFile = null;
        document.getElementById('dropzone-compresor').style.display = 'block';
        document.getElementById('preview-compresor').style.display = 'none';
        document.getElementById('actions-compresor').style.display = 'none';
        document.getElementById('file-compresor').value = '';
        document.getElementById('thumb-compresor').src = '';
    }

    document.getElementById('btn-remove-compresor').addEventListener('click', resetCompressUI);

    document.getElementById('btn-run-compresor').addEventListener('click', () => {
        if (!compressImageFile) return;

        const quality = parseFloat(qualitySlider.value) / 100;
        showLoader('Comprimiendo imagen...');

        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);

                // Convert PNG to JPEG if needed, PNG doesn't support quality lossy compression natively
                const format = compressImageFile.type === 'image/png' ? 'image/jpeg' : compressImageFile.type;
                const ext = format === 'image/jpeg' ? 'jpg' : 'webp';

                canvas.toBlob((blob) => {
                    if (blob) {
                        const originalBase = compressImageFile.name.replace(/\.[^/.]+$/, "");
                        downloadBlob(blob, `${originalBase}_comprimido.${ext}`);
                        showToast('Imagen comprimida con éxito!', 'success');
                        resetCompressUI();
                    } else {
                        showToast('Error al comprimir.', 'error');
                    }
                    hideLoader();
                }, format, quality);
            } catch (err) {
                console.error(err);
                showToast('Error al comprimir la imagen.', 'error');
                hideLoader();
            }
        };
        img.src = URL.createObjectURL(compressImageFile);
    });

    // ----------------------------------------------------------------------
    // TOOL 10: RECORTAR Y REDIMENSIONAR [NEW]
    // ----------------------------------------------------------------------
    let cropImageFile = null;
    let originalImageWidth = 0;
    let originalImageHeight = 0;

    setupDropzone('dropzone-recortar', 'file-recortar', (files) => {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            cropImageFile = file;
            
            const img = new Image();
            img.onload = () => {
                originalImageWidth = img.naturalWidth;
                originalImageHeight = img.naturalHeight;
                
                // Show metadata in UI
                document.getElementById('name-recortar').textContent = file.name;
                document.getElementById('size-recortar').textContent = formatBytes(file.size);
                document.getElementById('res-recortar').textContent = `${originalImageWidth} x ${originalImageHeight} píxeles`;
                
                // Populate inputs
                document.getElementById('resize-width').value = originalImageWidth;
                document.getElementById('resize-height').value = originalImageHeight;
                
                document.getElementById('crop-x').value = 0;
                document.getElementById('crop-y').value = 0;
                document.getElementById('crop-width').value = originalImageWidth;
                document.getElementById('crop-height').value = originalImageHeight;

                document.getElementById('dropzone-recortar').style.display = 'none';
                document.getElementById('preview-recortar').style.display = 'block';
                document.getElementById('actions-recortar').style.display = 'flex';
                
                // Show thumbnail
                document.getElementById('thumb-recortar').src = img.src;
                showToast('Imagen cargada correctamente', 'success');
            };
            img.src = URL.createObjectURL(file);
        } else {
            showToast('Por favor, selecciona un archivo de imagen válido.', 'warning');
        }
    });

    // Aspect Ratio Lock logic
    const resizeWidthInput = document.getElementById('resize-width');
    const resizeHeightInput = document.getElementById('resize-height');
    const aspectCheckbox = document.getElementById('maintain-aspect');

    resizeWidthInput.addEventListener('input', () => {
        if (aspectCheckbox.checked && originalImageWidth > 0) {
            const ratio = originalImageHeight / originalImageWidth;
            resizeHeightInput.value = Math.round(parseFloat(resizeWidthInput.value) * ratio) || '';
        }
    });

    resizeHeightInput.addEventListener('input', () => {
        if (aspectCheckbox.checked && originalImageHeight > 0) {
            const ratio = originalImageWidth / originalImageHeight;
            resizeWidthInput.value = Math.round(parseFloat(resizeHeightInput.value) * ratio) || '';
        }
    });

    document.getElementById('btn-full-crop').addEventListener('click', () => {
        document.getElementById('crop-x').value = 0;
        document.getElementById('crop-y').value = 0;
        document.getElementById('crop-width').value = originalImageWidth;
        document.getElementById('crop-height').value = originalImageHeight;
        showToast('Área de recorte restablecida al total', 'info');
    });

    function resetCropUI() {
        cropImageFile = null;
        originalImageWidth = 0;
        originalImageHeight = 0;
        
        document.getElementById('dropzone-recortar').style.display = 'block';
        document.getElementById('preview-recortar').style.display = 'none';
        document.getElementById('actions-recortar').style.display = 'none';
        document.getElementById('file-recortar').value = '';
        document.getElementById('thumb-recortar').src = '';
    }

    document.getElementById('btn-remove-recortar').addEventListener('click', resetCropUI);

    document.getElementById('btn-run-recortar').addEventListener('click', () => {
        if (!cropImageFile) return;

        const targetWidth = parseInt(resizeWidthInput.value, 10);
        const targetHeight = parseInt(resizeHeightInput.value, 10);

        const cropX = parseInt(document.getElementById('crop-x').value, 10);
        const cropY = parseInt(document.getElementById('crop-y').value, 10);
        const cropWidth = parseInt(document.getElementById('crop-width').value, 10);
        const cropHeight = parseInt(document.getElementById('crop-height').value, 10);

        if (isNaN(targetWidth) || isNaN(targetHeight) || targetWidth <= 0 || targetHeight <= 0) {
            showToast('Los valores de redimensionamiento no son válidos.', 'warning');
            return;
        }
        if (isNaN(cropX) || isNaN(cropY) || isNaN(cropWidth) || isNaN(cropHeight) || cropWidth <= 0 || cropHeight <= 0) {
            showToast('Los valores de recorte no son válidos.', 'warning');
            return;
        }

        showLoader('Redimensionando y recortando...');

        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');

                // Draw sub-rectangle (crop box) stretching/fitting into destination width/height
                ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, targetWidth, targetHeight);

                const ext = cropImageFile.name.split('.').pop();
                const outputMime = cropImageFile.type;
                const originalBase = cropImageFile.name.replace(/\.[^/.]+$/, "");

                canvas.toBlob((blob) => {
                    if (blob) {
                        downloadBlob(blob, `${originalBase}_procesado.${ext}`);
                        showToast('Imagen procesada con éxito!', 'success');
                        resetCropUI();
                    } else {
                        showToast('Error al exportar.', 'error');
                    }
                    hideLoader();
                }, outputMime, 0.95);
            } catch (err) {
                console.error(err);
                showToast('Error al procesar la imagen.', 'error');
                hideLoader();
            }
        };
        img.src = URL.createObjectURL(cropImageFile);
    });

    // ----------------------------------------------------------------------
    // TOOL 11: MARCA DE AGUA (IMAGE WATERMARK)
    // ----------------------------------------------------------------------
    let watermarkImageFile = null;

    setupDropzone('dropzone-marca', 'file-marca', (files) => {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            watermarkImageFile = file;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('thumb-marca').src = e.target.result;
            };
            reader.readAsDataURL(file);

            document.getElementById('dropzone-marca').style.display = 'none';
            document.getElementById('preview-marca').style.display = 'block';
            document.getElementById('actions-marca').style.display = 'flex';
            
            document.getElementById('name-marca').textContent = file.name;
            document.getElementById('size-marca').textContent = formatBytes(file.size);
            showToast('Imagen cargada correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo de imagen válido.', 'warning');
        }
    });

    function resetWatermarkUI() {
        watermarkImageFile = null;
        document.getElementById('dropzone-marca').style.display = 'block';
        document.getElementById('preview-marca').style.display = 'none';
        document.getElementById('actions-marca').style.display = 'none';
        document.getElementById('file-marca').value = '';
        document.getElementById('thumb-marca').src = '';
    }

    document.getElementById('btn-remove-marca').addEventListener('click', resetWatermarkUI);

    document.getElementById('btn-run-marca').addEventListener('click', () => {
        if (!watermarkImageFile) return;

        const text = document.getElementById('watermark-text').value.trim();
        if (!text) {
            showToast('Por favor, escribe un texto para la marca de agua.', 'warning');
            return;
        }

        showLoader('Aplicando marca de agua...');

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.drawImage(img, 0, 0);
                    
                    const fontSize = Math.max(16, Math.floor(canvas.width / 12));
                    ctx.font = `bold ${fontSize}px 'Outfit', 'Arial', sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.39)';
                    
                    const x = canvas.width / 2;
                    const y = canvas.height / 2;
                    ctx.fillText(text, x, y);
                    
                    const outputFormat = watermarkImageFile.type;
                    const originalBase = watermarkImageFile.name.replace(/\.[^/.]+$/, "");
                    const ext = watermarkImageFile.name.split('.').pop();
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            downloadBlob(blob, `${originalBase}_watermark.${ext}`);
                            showToast('Marca de agua aplicada con éxito!', 'success');
                            resetWatermarkUI();
                        } else {
                            showToast('Error al exportar la imagen.', 'error');
                        }
                        hideLoader();
                    }, outputFormat, 0.95);
                } catch (err) {
                    console.error(err);
                    showToast('Error al procesar la imagen.', 'error');
                    hideLoader();
                }
            };
            img.src = e.target.result;
        };

        reader.readAsDataURL(watermarkImageFile);
    });

    // ----------------------------------------------------------------------
    // TOOL 12: EXTRAER TEXTO (TEXT EXTRACTOR) - PDF & DOCX [EXPANDED]
    // ----------------------------------------------------------------------
    let extractFile = null;

    setupDropzone('dropzone-extraer', 'file-extraer', (files) => {
        const file = files[0];
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') || ext === 'docx') {
            extractFile = file;
            
            // Adjust icon based on file type
            const iconEl = document.getElementById('icon-type-extraer');
            if (ext === 'docx') {
                iconEl.className = 'fa-solid fa-file-word file-type-icon';
                iconEl.style.color = '#3b82f6';
            } else {
                iconEl.className = 'fa-solid fa-file-pdf file-type-icon';
                iconEl.style.color = '#ef4444';
            }

            document.getElementById('dropzone-extraer').style.display = 'none';
            document.getElementById('preview-extraer').style.display = 'block';
            document.getElementById('actions-extraer').style.display = 'flex';
            
            document.getElementById('name-extraer').textContent = file.name;
            document.getElementById('size-extraer').textContent = formatBytes(file.size);
            showToast('Documento cargado correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo PDF o Word (.docx) válido.', 'warning');
        }
    });

    function resetExtractUI() {
        extractFile = null;
        document.getElementById('dropzone-extraer').style.display = 'block';
        document.getElementById('preview-extraer').style.display = 'none';
        document.getElementById('actions-extraer').style.display = 'none';
        document.getElementById('file-extraer').value = '';
    }

    document.getElementById('btn-remove-extraer').addEventListener('click', resetExtractUI);

    document.getElementById('btn-run-extraer').addEventListener('click', async () => {
        if (!extractFile) return;

        const ext = extractFile.name.split('.').pop().toLowerCase();
        showLoader('Extrayendo texto del documento...');

        if (ext === 'docx') {
            // DOCX Word File extraction using Mammoth.js
            try {
                const arrayBuffer = await extractFile.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                const fullText = result.value;

                if (!fullText || fullText.trim() === '') {
                    showToast('No se pudo extraer texto. Asegúrate de que el documento no esté vacío.', 'warning');
                    return;
                }

                const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
                const originalBase = extractFile.name.replace(/\.[^/.]+$/, "");
                downloadBlob(blob, `${originalBase}_texto.txt`);
                showToast('Texto de Word extraído con éxito!', 'success');
                resetExtractUI();
            } catch (error) {
                console.error(error);
                showToast('Error al extraer texto del archivo Word.', 'error');
            } finally {
                hideLoader();
            }
        } else {
            // PDF Document extraction using PDF.js
            try {
                const arrayBuffer = await extractFile.arrayBuffer();
                const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const totalPages = pdfDoc.numPages;
                let fullText = '';

                for (let i = 1; i <= totalPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    let lastY = -1;
                    let pageText = `\n--- Página ${i} ---\n`;
                    
                    textContent.items.forEach((item) => {
                        if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                            pageText += '\n';
                        }
                        pageText += item.str + ' ';
                        lastY = item.transform[5];
                    });

                    fullText += pageText;
                }

                if (fullText.trim().replace(/--- Página \d+ ---/g, '').trim() === '') {
                    showToast('No se encontró texto extraíble en el PDF. ¿Es un PDF escaneado?', 'warning');
                    return;
                }

                const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
                const originalBase = extractFile.name.replace(/\.[^/.]+$/, "");
                downloadBlob(blob, `${originalBase}_texto.txt`);
                showToast('Texto de PDF extraído con éxito!', 'success');
                resetExtractUI();
            } catch (error) {
                console.error(error);
                showToast('Error al extraer texto del PDF.', 'error');
            } finally {
                hideLoader();
            }
        }
    });

    // ----------------------------------------------------------------------
    // TOOL 13: WORD A PDF (DOCX TO PDF) [NEW]
    // ----------------------------------------------------------------------
    let docxPdfFile = null;

    setupDropzone('dropzone-docx-pdf', 'file-docx-pdf', (files) => {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.docx')) {
            docxPdfFile = file;
            document.getElementById('dropzone-docx-pdf').style.display = 'none';
            document.getElementById('preview-docx-pdf').style.display = 'block';
            document.getElementById('actions-docx-pdf').style.display = 'flex';
            
            document.getElementById('name-docx-pdf').textContent = file.name;
            document.getElementById('size-docx-pdf').textContent = formatBytes(file.size);
            showToast('Documento Word cargado correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo Word (.docx) válido.', 'warning');
        }
    });

    function resetDocxPdfUI() {
        docxPdfFile = null;
        document.getElementById('dropzone-docx-pdf').style.display = 'block';
        document.getElementById('preview-docx-pdf').style.display = 'none';
        document.getElementById('actions-docx-pdf').style.display = 'none';
        document.getElementById('file-docx-pdf').value = '';
    }

    document.getElementById('btn-remove-docx-pdf').addEventListener('click', resetDocxPdfUI);

    document.getElementById('btn-run-docx-pdf').addEventListener('click', async () => {
        if (!docxPdfFile) return;

        showLoader('Convirtiendo Word a PDF...');
        try {
            const arrayBuffer = await docxPdfFile.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            
            // Format the HTML so that it renders beautifully inside the PDF
            const rawHtml = result.value;
            const styledHtml = `
                <div style="
                    font-family: 'Outfit', 'Helvetica Neue', Arial, sans-serif;
                    color: #1f2937;
                    padding: 40px 60px;
                    line-height: 1.6;
                    font-size: 14px;
                    background-color: #ffffff;
                ">
                    ${rawHtml}
                </div>
            `;

            const opt = {
                margin:       [0.5, 0.5, 0.5, 0.5], // half inch margin all around
                filename:     docxPdfFile.name.replace(/\.[^/.]+$/, "") + '.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            // Call html2pdf.js bundle
            await html2pdf().set(opt).from(styledHtml).save();
            showToast('Documento convertido a PDF con éxito!', 'success');
            resetDocxPdfUI();
        } catch (error) {
            console.error(error);
            showToast('Ocurrió un error al convertir el archivo Word a PDF.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------
    // TOOL 14: PDF A WORD (PDF TO DOCX) [NEW]
    // ----------------------------------------------------------------------
    let pdfDocxFile = null;

    setupDropzone('dropzone-pdf-docx', 'file-pdf-docx', (files) => {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            pdfDocxFile = file;
            document.getElementById('dropzone-pdf-docx').style.display = 'none';
            document.getElementById('preview-pdf-docx').style.display = 'block';
            document.getElementById('actions-pdf-docx').style.display = 'flex';
            
            document.getElementById('name-pdf-docx').textContent = file.name;
            document.getElementById('size-pdf-docx').textContent = formatBytes(file.size);
            showToast('Archivo PDF cargado correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo PDF válido.', 'warning');
        }
    });

    function resetPdfDocxUI() {
        pdfDocxFile = null;
        document.getElementById('dropzone-pdf-docx').style.display = 'block';
        document.getElementById('preview-pdf-docx').style.display = 'none';
        document.getElementById('actions-pdf-docx').style.display = 'none';
        document.getElementById('file-pdf-docx').value = '';
    }

    document.getElementById('btn-remove-pdf-docx').addEventListener('click', resetPdfDocxUI);

    document.getElementById('btn-run-pdf-docx').addEventListener('click', async () => {
        if (!pdfDocxFile) return;

        showLoader('Convirtiendo PDF a Word...');
        try {
            const arrayBuffer = await pdfDocxFile.arrayBuffer();
            const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPages = pdfDoc.numPages;
            
            const paragraphs = [];

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                
                let lastY = -1;
                let lineText = '';

                // Add page header in the Word file
                paragraphs.push(new docx.Paragraph({
                    children: [
                        new docx.TextRun({
                            text: `--- Página ${i} ---`,
                            bold: true,
                            color: '8b5cf6', // accent purple
                            font: 'Calibri',
                            size: 24 // 12pt (docx sizes are half-points, so 24 = 12pt)
                        })
                    ],
                    spacing: { before: 240, after: 120 }
                }));

                textContent.items.forEach((item) => {
                    // Check if new line
                    if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                        if (lineText.trim() !== '') {
                            paragraphs.push(new docx.Paragraph({
                                children: [
                                    new docx.TextRun({
                                        text: lineText.trim(),
                                        font: 'Calibri',
                                        size: 22 // 11pt
                                    })
                                ],
                                spacing: { after: 100 }
                            }));
                        }
                        lineText = '';
                    }
                    lineText += item.str + ' ';
                    lastY = item.transform[5];
                });

                // Add last line of the page
                if (lineText.trim() !== '') {
                    paragraphs.push(new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: lineText.trim(),
                                font: 'Calibri',
                                size: 22
                            })
                        ],
                        spacing: { after: 100 }
                    }));
                }
            }

            if (paragraphs.length <= totalPages) {
                showToast('No se encontró texto extraíble en el PDF para convertir.', 'warning');
                return;
            }

            // Construct DOCX document via docx library
            const doc = new docx.Document({
                sections: [{
                    properties: {},
                    children: paragraphs
                }]
            });

            const docxBlob = await docx.Packer.toBlob(doc);
            const originalBase = pdfDocxFile.name.replace(/\.[^/.]+$/, "");
            
            downloadBlob(docxBlob, `${originalBase}_convertido.docx`);
            showToast('Documento Word (.docx) descargado con éxito!', 'success');
            resetPdfDocxUI();
        } catch (error) {
            console.error(error);
            showToast('Error al convertir el PDF a Word.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------
    // TOOL 11b: ELIMINAR FONDO DE IMAGEN (BACKGROUND REMOVAL) [NEW]
    // ----------------------------------------------------------------------
    let bgRemovalFile = null;
    let bgRemovalOriginalUrl = null;
    let bgRemovalResultBlob = null;
    let bgRemovalResultUrl = null;

    setupDropzone('dropzone-eliminar-fondo', 'file-eliminar-fondo', (files) => {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            bgRemovalFile = file;
            
            // Clean up any old object URLs
            cleanBgRemovalUrls();

            // Set image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('thumb-eliminar-fondo').src = e.target.result;
            };
            reader.readAsDataURL(file);

            document.getElementById('dropzone-eliminar-fondo').style.display = 'none';
            document.getElementById('preview-eliminar-fondo').style.display = 'block';
            document.getElementById('actions-eliminar-fondo').style.display = 'flex';
            
            document.getElementById('name-eliminar-fondo').textContent = file.name;
            document.getElementById('size-eliminar-fondo').textContent = formatBytes(file.size);
            
            // Hide progress container initially
            document.getElementById('progress-container-eliminar-fondo').style.display = 'none';
            document.getElementById('progress-bar-eliminar-fondo').style.width = '0%';
            document.getElementById('progress-percentage-eliminar-fondo').textContent = '0%';
            
            // Hide comparison and secondary button
            document.getElementById('result-comparison-eliminar-fondo').style.display = 'none';
            document.getElementById('btn-reset-eliminar-fondo').style.display = 'none';
            
            // Reset main button text
            const runButton = document.getElementById('btn-run-eliminar-fondo');
            runButton.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Eliminar Fondo y Descargar';
            
            showToast('Imagen cargada correctamente', 'success');
        } else {
            showToast('Por favor, selecciona un archivo de imagen válido.', 'warning');
        }
    });

    function cleanBgRemovalUrls() {
        if (bgRemovalOriginalUrl) {
            URL.revokeObjectURL(bgRemovalOriginalUrl);
            bgRemovalOriginalUrl = null;
        }
        if (bgRemovalResultUrl) {
            URL.revokeObjectURL(bgRemovalResultUrl);
            bgRemovalResultUrl = null;
        }
        bgRemovalResultBlob = null;
    }

    function resetBgRemovalUI() {
        bgRemovalFile = null;
        cleanBgRemovalUrls();
        
        document.getElementById('dropzone-eliminar-fondo').style.display = 'block';
        document.getElementById('preview-eliminar-fondo').style.display = 'none';
        document.getElementById('actions-eliminar-fondo').style.display = 'none';
        document.getElementById('file-eliminar-fondo').value = '';
        document.getElementById('progress-container-eliminar-fondo').style.display = 'none';
        document.getElementById('progress-bar-eliminar-fondo').style.width = '0%';
        document.getElementById('progress-percentage-eliminar-fondo').textContent = '0%';
        
        document.getElementById('result-comparison-eliminar-fondo').style.display = 'none';
        document.getElementById('btn-reset-eliminar-fondo').style.display = 'none';
        document.getElementById('img-orig-eliminar-fondo').src = '';
        document.getElementById('img-res-eliminar-fondo').src = '';
    }

    document.getElementById('btn-remove-eliminar-fondo').addEventListener('click', resetBgRemovalUI);
    document.getElementById('btn-reset-eliminar-fondo').addEventListener('click', resetBgRemovalUI);

    document.getElementById('btn-run-eliminar-fondo').addEventListener('click', async () => {
        if (!bgRemovalFile) return;

        // If background removal has already run, this button works as a fast download button
        if (bgRemovalResultBlob) {
            const originalBase = bgRemovalFile.name.replace(/\.[^/.]+$/, "");
            downloadBlob(bgRemovalResultBlob, `${originalBase}_sin_fondo.png`);
            showToast('Imagen descargada con éxito', 'success');
            return;
        }

        const runButton = document.getElementById('btn-run-eliminar-fondo');
        const removeButton = document.getElementById('btn-remove-eliminar-fondo');
        const progressContainer = document.getElementById('progress-container-eliminar-fondo');
        const progressBar = document.getElementById('progress-bar-eliminar-fondo');
        const progressPercentage = document.getElementById('progress-percentage-eliminar-fondo');
        const progressLabel = document.getElementById('progress-label-eliminar-fondo');

        // Disable UI controls while processing
        runButton.disabled = true;
        removeButton.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressPercentage.textContent = '0%';
        
        showLoader('Eliminando fondo de la imagen...');

        try {
            const config = {
                progress: (key, current, total) => {
                    const percentage = total ? Math.round((current / total) * 100) : 0;
                    progressBar.style.width = `${percentage}%`;
                    progressPercentage.textContent = `${percentage}%`;
                    
                    if (key.includes('model') || key.includes('onnx') || key.includes('wasm')) {
                        progressLabel.innerHTML = `<span>Descargando modelo de IA...</span><span id="progress-percentage-eliminar-fondo">${percentage}%</span>`;
                    } else {
                        progressLabel.innerHTML = `<span>Descargando recursos...</span><span id="progress-percentage-eliminar-fondo">${percentage}%</span>`;
                    }
                }
            };

            // Run the background removal process
            const resultBlob = await removeBackground(bgRemovalFile, config);

            // Store result blob and create object URL
            bgRemovalResultBlob = resultBlob;
            bgRemovalResultUrl = URL.createObjectURL(resultBlob);
            bgRemovalOriginalUrl = URL.createObjectURL(bgRemovalFile);

            // Set comparison images
            document.getElementById('img-orig-eliminar-fondo').src = bgRemovalOriginalUrl;
            document.getElementById('img-res-eliminar-fondo').src = bgRemovalResultUrl;

            // Show comparison view
            document.getElementById('result-comparison-eliminar-fondo').style.display = 'grid';
            
            // Hide progress bar since we are done
            progressContainer.style.display = 'none';

            // Once finished, download the processed image as PNG automatically
            const originalBase = bgRemovalFile.name.replace(/\.[^/.]+$/, "");
            downloadBlob(resultBlob, `${originalBase}_sin_fondo.png`);

            // Update action buttons
            document.getElementById('btn-reset-eliminar-fondo').style.display = 'inline-flex';
            runButton.innerHTML = '<i class="fa-solid fa-download"></i> Descargar Imagen';

            showToast('¡Fondo eliminado con éxito y descargado!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Ocurrió un error al procesar la imagen.', 'error');
        } finally {
            runButton.disabled = false;
            removeButton.disabled = false;
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------
    // TOOL 12b: ORGANIZAR PDF (PDF PAGE ORGANIZER) [NEW]
    // ----------------------------------------------------------------------
    let organizeFile = null;
    let organizePagesList = []; // array of { id, base64Image, rotation: 0, originalIndex }
    let organizePageIdCounter = 0;

    setupDropzone('dropzone-organizar-pdf', 'file-organizar-pdf', async (files) => {
        const file = files[0];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            showLoader('Leyendo páginas de PDF...');
            try {
                organizeFile = file;
                organizePagesList = [];
                organizePageIdCounter = 0;
                
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const numPages = pdfDoc.numPages;

                for (let i = 1; i <= numPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    // Render page preview in a tiny canvas (~150px width)
                    const viewport = page.getViewport({ scale: 150 / page.getViewport({ scale: 1 }).width });
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    const base64Image = canvas.toDataURL('image/jpeg', 0.85);

                    organizePagesList.push({
                        id: organizePageIdCounter++,
                        base64Image: base64Image,
                        rotation: 0,
                        originalIndex: i - 1
                    });
                }

                document.getElementById('dropzone-organizar-pdf').style.display = 'none';
                document.getElementById('preview-organizar-pdf').style.display = 'block';
                document.getElementById('actions-organizar-pdf').style.display = 'flex';
                
                document.getElementById('name-organizar-pdf').textContent = file.name;
                document.getElementById('size-organizar-pdf').textContent = formatBytes(file.size);
                
                updateOrganizeUI();
                showToast('Páginas de PDF cargadas', 'success');
            } catch (error) {
                console.error(error);
                showToast('Error al leer el PDF.', 'error');
            } finally {
                hideLoader();
            }
        } else {
            showToast('Por favor, selecciona un PDF válido.', 'warning');
        }
    });

    function resetOrganizeUI() {
        organizeFile = null;
        organizePagesList = [];
        document.getElementById('dropzone-organizar-pdf').style.display = 'block';
        document.getElementById('preview-organizar-pdf').style.display = 'none';
        document.getElementById('actions-organizar-pdf').style.display = 'none';
        document.getElementById('file-organizar-pdf').value = '';
        document.getElementById('organizer-grid-pdf').innerHTML = '';
    }

    document.getElementById('btn-remove-organizar-pdf').addEventListener('click', resetOrganizeUI);

    function updateOrganizeUI() {
        const grid = document.getElementById('organizer-grid-pdf');
        grid.innerHTML = '';

        organizePagesList.forEach((page, index) => {
            const card = document.createElement('div');
            card.className = 'pdf-page-card';
            card.setAttribute('data-id', page.id);
            card.setAttribute('draggable', 'true');
            card.innerHTML = `
                <span class="pdf-page-number">${index + 1}</span>
                <img src="${page.base64Image}" alt="Página ${index + 1}" style="transform: rotate(${page.rotation}deg);">
                <div class="pdf-page-actions">
                    <button class="btn-icon btn-rotate" title="Rotar 90°"><i class="fa-solid fa-rotate-right"></i></button>
                    <button class="btn-icon btn-danger-hover btn-delete" title="Eliminar"><i class="fa-solid fa-trash-can"></i></button>
                </div>
            `;

            // Drag and Drop Event Listeners
            card.addEventListener('dragstart', () => card.classList.add('dragging'));
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                // Reconstruct page list based on DOM order
                const newOrder = [...grid.querySelectorAll('.pdf-page-card')].map(c => {
                    const pageId = parseInt(c.getAttribute('data-id'), 10);
                    return organizePagesList.find(p => p.id === pageId);
                });
                organizePagesList = newOrder;
                // Re-number labels in UI
                grid.querySelectorAll('.pdf-page-card').forEach((c, idx) => {
                    c.querySelector('.pdf-page-number').textContent = idx + 1;
                });
            });

            // Action listeners
            card.querySelector('.btn-rotate').addEventListener('click', () => {
                page.rotation = (page.rotation + 90) % 360;
                card.querySelector('img').style.transform = `rotate(${page.rotation}deg)`;
            });

            card.querySelector('.btn-delete').addEventListener('click', () => {
                organizePagesList = organizePagesList.filter(p => p.id !== page.id);
                card.remove();
                // Re-number labels in UI
                grid.querySelectorAll('.pdf-page-card').forEach((c, idx) => {
                    c.querySelector('.pdf-page-number').textContent = idx + 1;
                });
                if (organizePagesList.length === 0) {
                    showToast('Se eliminaron todas las páginas', 'warning');
                    resetOrganizeUI();
                }
            });

            grid.appendChild(card);
        });

        // Grid DragOver reordering
        grid.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingCard = document.querySelector('.pdf-page-card.dragging');
            if (!draggingCard) return;
            const afterElement = getDragAfterElement(grid, e.clientX, e.clientY);
            if (afterElement == null) {
                grid.appendChild(draggingCard);
            } else {
                grid.insertBefore(draggingCard, afterElement);
            }
        });
    }

    function getDragAfterElement(container, x, y) {
        const draggableElements = [...container.querySelectorAll('.pdf-page-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const centerX = box.left + box.width / 2;
            const centerY = box.top + box.height / 2;
            const distance = Math.hypot(x - centerX, y - centerY);
            if (distance < closest.distance) {
                return { distance: distance, element: child };
            } else {
                return closest;
            }
        }, { distance: Number.POSITIVE_INFINITY }).element;
    }

    document.getElementById('btn-run-organizar-pdf').addEventListener('click', async () => {
        if (!organizeFile || organizePagesList.length === 0) return;

        showLoader('Generando nuevo PDF...');
        try {
            const srcBuffer = await organizeFile.arrayBuffer();
            const srcDoc = await PDFLib.PDFDocument.load(srcBuffer);
            const newDoc = await PDFLib.PDFDocument.create();

            for (const pageState of organizePagesList) {
                const [copiedPage] = await newDoc.copyPages(srcDoc, [pageState.originalIndex]);
                const originalRotation = copiedPage.getRotation().angle;
                copiedPage.setRotation(PDFLib.degrees((originalRotation + pageState.rotation) % 360));
                newDoc.addPage(copiedPage);
            }

            const newBytes = await newDoc.save();
            const blob = new Blob([newBytes], { type: 'application/pdf' });
            const originalBase = organizeFile.name.replace(/\.[^/.]+$/, "");
            
            downloadBlob(blob, `${originalBase}_organizado.pdf`);
            showToast('¡PDF reordenado con éxito!', 'success');
            resetOrganizeUI();
        } catch (error) {
            console.error(error);
            showToast('Error al generar el PDF.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------
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
    // TOOL 12d: LIMPIAR EXIF (METADATA STRIPPER) [NEW]
    // ----------------------------------------------------------------------
    let cleanExifFile = null;
    let cleanExifBuffer = null;

    setupDropzone('dropzone-limpiar-exif', 'file-limpiar-exif', async (files) => {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            cleanExifFile = file;
            
            // Set image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('thumb-limpiar-exif').src = e.target.result;
            };
            reader.readAsDataURL(file);

            document.getElementById('dropzone-limpiar-exif').style.display = 'none';
            document.getElementById('preview-limpiar-exif').style.display = 'block';
            document.getElementById('actions-limpiar-exif').style.display = 'flex';
            
            document.getElementById('name-limpiar-exif').textContent = file.name;
            document.getElementById('size-limpiar-exif').textContent = formatBytes(file.size);
            
            // Analyze Metadata content
            cleanExifBuffer = await file.arrayBuffer();
            analyzeMetadata(file.name, file.type, cleanExifBuffer);
        } else {
            showToast('Por favor, selecciona una imagen JPEG o PNG.', 'warning');
        }
    });

    function analyzeMetadata(filename, type, buffer) {
        const listEl = document.getElementById('meta-list-limpiar-exif');
        listEl.innerHTML = '';
        
        const ext = filename.split('.').pop().toLowerCase();
        
        let hasExif = false;
        let hasGps = false;
        
        // Basic scan using TextDecoder
        const dec = new TextDecoder('utf-8', { fatal: false });
        const textSection = dec.decode(new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 15000))));
        
        if (ext === 'jpg' || ext === 'jpeg' || type === 'image/jpeg') {
            hasExif = textSection.toLowerCase().includes('exif');
            hasGps = textSection.toLowerCase().includes('gps');
        } else if (ext === 'png' || type === 'image/png') {
            hasExif = textSection.includes('tEXt') || textSection.includes('zTXt') || textSection.includes('iTXt') || textSection.includes('iCCP');
        }

        listEl.innerHTML += `<li><strong>Formato:</strong> ${type.toUpperCase()}</li>`;
        listEl.innerHTML += `<li><strong>Metadatos Generales:</strong> ${hasExif ? '<span style="color:var(--danger-color);">Detectados</span>' : '<span style="color:var(--success-color);">Ninguno</span>'}</li>`;
        if (type.includes('jpeg')) {
            listEl.innerHTML += `<li><strong>Información de Geolocalización (GPS):</strong> ${hasGps ? '<span style="color:var(--danger-color);">Detectada</span>' : '<span style="color:var(--success-color);">Ninguna</span>'}</li>`;
        }
    }

    function resetCleanExifUI() {
        cleanExifFile = null;
        cleanExifBuffer = null;
        document.getElementById('dropzone-limpiar-exif').style.display = 'block';
        document.getElementById('preview-limpiar-exif').style.display = 'none';
        document.getElementById('actions-limpiar-exif').style.display = 'none';
        document.getElementById('file-limpiar-exif').value = '';
    }

    document.getElementById('btn-remove-limpiar-exif').addEventListener('click', resetCleanExifUI);

    function stripJpegMetadata(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        if (view.getUint16(0) !== 0xFFD8) {
            throw new Error("No es un archivo JPEG válido");
        }
        
        const length = arrayBuffer.byteLength;
        let offset = 2;
        const segments = [];
        
        // Push SOI
        segments.push(arrayBuffer.slice(0, 2));
        
        while (offset < length) {
            if (view.getUint8(offset) !== 0xFF) {
                segments.push(arrayBuffer.slice(offset));
                break;
            }
            
            const marker = view.getUint8(offset + 1);
            if (marker === 0xD9) { // EOI
                segments.push(arrayBuffer.slice(offset, offset + 2));
                break;
            }
            if (marker === 0xDA) { // SOS - Image scan starts here
                segments.push(arrayBuffer.slice(offset));
                break;
            }
            
            const segmentLength = view.getUint16(offset + 2) + 2; // segment size + marker (2 bytes)
            
            // Skip: APP1 (0xE1 = EXIF/GPS), APP2 (0xE2 = Profiles), APP13 (0xED = IPTC), COM (0xFE = Comments)
            if (marker === 0xE1 || marker === 0xE2 || marker === 0xED || marker === 0xFE) {
                // Skiping segment bytes
            } else {
                segments.push(arrayBuffer.slice(offset, offset + segmentLength));
            }
            offset += segmentLength;
        }
        
        return new Blob(segments, { type: 'image/jpeg' });
    }

    function stripPngMetadata(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        if (view.getUint32(0) !== 0x89504E47 || view.getUint32(4) !== 0x0D0A1A0A) {
            throw new Error("No es un archivo PNG válido");
        }
        
        const length = arrayBuffer.byteLength;
        let offset = 8;
        const segments = [];
        
        // Push PNG signature
        segments.push(arrayBuffer.slice(0, 8));
        
        while (offset < length) {
            const chunkLength = view.getUint32(offset);
            const chunkTypeBytes = new Uint8Array(arrayBuffer, offset + 4, 4);
            const chunkType = String.fromCharCode(...chunkTypeBytes);
            const totalChunkLength = 4 + 4 + chunkLength + 4; // Length (4) + Type (4) + Data + CRC (4)
            
            // Skip non-critical tags: tEXt, zTXt, iTXt, pHYs, tIME, iCCP, gAMA, cHRM
            const criticalChunks = ['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS'];
            if (criticalChunks.includes(chunkType)) {
                segments.push(arrayBuffer.slice(offset, offset + totalChunkLength));
            }
            
            offset += totalChunkLength;
        }
        
        return new Blob(segments, { type: 'image/png' });
    }

    document.getElementById('btn-run-limpiar-exif').addEventListener('click', () => {
        if (!cleanExifBuffer) return;

        showLoader('Eliminando metadatos ocultos...');
        try {
            const type = cleanExifFile.type;
            let resultBlob;
            
            if (type === 'image/jpeg' || cleanExifFile.name.toLowerCase().endsWith('.jpg') || cleanExifFile.name.toLowerCase().endsWith('.jpeg')) {
                resultBlob = stripJpegMetadata(cleanExifBuffer);
            } else if (type === 'image/png' || cleanExifFile.name.toLowerCase().endsWith('.png')) {
                resultBlob = stripPngMetadata(cleanExifBuffer);
            } else {
                showToast('Tipo de archivo no soportado para limpieza', 'warning');
                return;
            }

            const originalBase = cleanExifFile.name.replace(/\.[^/.]+$/, "");
            downloadBlob(resultBlob, `${originalBase}_limpio.${cleanExifFile.name.split('.').pop()}`);
            showToast('¡Imagen libre de metadatos descargada!', 'success');
            resetCleanExifUI();
        } catch (error) {
            console.error(error);
            showToast('Ocurrió un error al limpiar el archivo.', 'error');
        } finally {
            hideLoader();
        }
    });

    // ----------------------------------------------------------------------
    // TOOL 12e: OCR LOCAL (TESSERACT OCR) [NEW]
    // ----------------------------------------------------------------------
    let ocrFile = null;
    let ocrPdfPages = null;

    setupDropzone('dropzone-ocr-local', 'file-ocr-local', async (files) => {
        const file = files[0];
        ocrFile = file;
        ocrPdfPages = null;

        // Hide result view initially
        document.getElementById('ocr-result-box').style.display = 'none';
        document.getElementById('ocr-progress-container').style.display = 'none';
        
        document.getElementById('dropzone-ocr-local').style.display = 'none';
        document.getElementById('preview-ocr-local').style.display = 'block';
        document.getElementById('actions-ocr-local').style.display = 'flex';
        
        document.getElementById('name-ocr-local').textContent = file.name;
        document.getElementById('size-ocr-local').textContent = formatBytes(file.size);
        
        const ext = file.name.split('.').pop().toLowerCase();
        
        if (ext === 'pdf' || file.type === 'application/pdf') {
            showLoader('Leyendo PDF...');
            try {
                const arrayBuffer = await file.arrayBuffer();
                ocrPdfPages = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                
                // Show PDF Icon instead of thumbnail
                const thumbWrapper = document.getElementById('thumb-wrapper-ocr');
                thumbWrapper.innerHTML = `<i class="fa-solid fa-file-pdf" style="font-size: 2.2rem; color: #ef4444;"></i>`;
                showToast('PDF cargado para OCR', 'success');
            } catch (err) {
                console.error(err);
                showToast('Error al leer PDF.', 'error');
            } finally {
                hideLoader();
            }
        } else if (file.type.startsWith('image/')) {
            // Display Image preview
            const reader = new FileReader();
            reader.onload = (e) => {
                const thumbWrapper = document.getElementById('thumb-wrapper-ocr');
                thumbWrapper.innerHTML = `<img id="thumb-ocr-local" class="img-thumbnail" src="${e.target.result}" alt="Vista previa">`;
            };
            reader.readAsDataURL(file);
            showToast('Imagen cargada para OCR', 'success');
        } else {
            showToast('Archivo no soportado para OCR.', 'warning');
            resetOcrUI();
        }
    });

    function resetOcrUI() {
        ocrFile = null;
        ocrPdfPages = null;
        document.getElementById('dropzone-ocr-local').style.display = 'block';
        document.getElementById('preview-ocr-local').style.display = 'none';
        document.getElementById('actions-ocr-local').style.display = 'none';
        document.getElementById('ocr-result-box').style.display = 'none';
        document.getElementById('file-ocr-local').value = '';
    }

    document.getElementById('btn-remove-ocr-local').addEventListener('click', resetOcrUI);

    document.getElementById('btn-run-ocr-local').addEventListener('click', async () => {
        if (!ocrFile) return;

        const runButton = document.getElementById('btn-run-ocr-local');
        const removeButton = document.getElementById('btn-remove-ocr-local');
        const progressContainer = document.getElementById('ocr-progress-container');
        const progressBar = document.getElementById('ocr-progress-bar');
        const progressLabel = document.getElementById('ocr-progress-label');
        const ocrResultBox = document.getElementById('ocr-result-box');
        const ocrOutput = document.getElementById('ocr-text-output');
        const lang = document.getElementById('ocr-lang-select').value;

        runButton.disabled = true;
        removeButton.disabled = true;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressLabel.textContent = 'Iniciando motor OCR...';
        ocrResultBox.style.display = 'none';

        try {
            let fullText = '';
            
            // Helper function to run Tesseract on an image source (Blob or Canvas)
            const performOcr = async (source) => {
                const worker = await Tesseract.createWorker({
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            const pct = Math.round(m.progress * 100);
                            progressBar.style.width = `${pct}%`;
                            progressLabel.textContent = `Reconociendo: ${pct}%`;
                        } else {
                            progressLabel.textContent = m.status;
                        }
                    }
                });
                await worker.loadLanguage(lang);
                await worker.initialize(lang);
                const { data: { text } } = await worker.recognize(source);
                await worker.terminate();
                return text;
            };

            if (ocrPdfPages) {
                const total = ocrPdfPages.numPages;
                
                for (let i = 1; i <= total; i++) {
                    progressLabel.textContent = `Renderizando página ${i} de ${total}...`;
                    const page = await ocrPdfPages.getPage(i);
                    // Render page at high scale for OCR accuracy (DPI 150)
                    const viewport = page.getViewport({ scale: 150 / 72 });
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    await page.render({ canvasContext: context, viewport: viewport }).promise;
                    
                    progressLabel.textContent = `Procesando OCR página ${i} de ${total}...`;
                    const pageText = await performOcr(canvas);
                    fullText += `--- Página ${i} ---\n${pageText}\n\n`;
                }
            } else {
                fullText = await performOcr(ocrFile);
            }

            ocrOutput.value = fullText;
            ocrResultBox.style.display = 'block';
            progressContainer.style.display = 'none';
            showToast('¡Reconocimiento de texto completado!', 'success');
        } catch (error) {
            console.error(error);
            showToast('Ocurrió un error al procesar el texto.', 'error');
            progressContainer.style.display = 'none';
        } finally {
            runButton.disabled = false;
            removeButton.disabled = false;
        }
    });

    document.getElementById('btn-copy-ocr').addEventListener('click', () => {
        const text = document.getElementById('ocr-text-output').value;
        navigator.clipboard.writeText(text);
        showToast('Texto copiado al portapapeles', 'info');
    });

    document.getElementById('btn-download-ocr').addEventListener('click', () => {
        const text = document.getElementById('ocr-text-output').value;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const name = ocrFile.name.replace(/\.[^/.]+$/, "") + '_ocr.txt';
        downloadBlob(blob, name);
        showToast('Archivo de texto descargado', 'success');
    });

    // ----------------------------------------------------------------------
    // TOOL 12f: COMPARADOR DE TEXTOS (DIFF CHECKER) [NEW]
    // ----------------------------------------------------------------------
    setupDiffDragAndDrop('diff-text-1', 'diff-drop-1');
    setupDiffDragAndDrop('diff-text-2', 'diff-drop-2');

    function setupDiffDragAndDrop(textareaId, overlayId) {
        const textarea = document.getElementById(textareaId);
        const overlay = document.getElementById(overlayId);

        textarea.addEventListener('dragenter', (e) => {
            e.preventDefault();
            overlay.style.display = 'flex';
        });

        textarea.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        overlay.addEventListener('dragleave', () => {
            overlay.style.display = 'none';
        });

        overlay.addEventListener('drop', (e) => {
            e.preventDefault();
            overlay.style.display = 'none';
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                const reader = new FileReader();
                reader.onload = (evt) => {
                    textarea.value = evt.target.result;
                };
                reader.readAsText(file);
                showToast(`Cargado: ${file.name}`, 'info');
            }
        });
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    document.getElementById('btn-run-diff').addEventListener('click', () => {
        const text1 = document.getElementById('diff-text-1').value;
        const text2 = document.getElementById('diff-text-2').value;
        const mode = document.getElementById('diff-view-mode').value;
        const resultView = document.getElementById('diff-result-view');
        const outputEl = document.getElementById('diff-rendered-output');

        if (!text1.trim() && !text2.trim()) {
            showToast('Por favor introduce texto en las cajas para comparar.', 'warning');
            return;
        }

        showLoader('Calculando diferencias...');
        try {
            const diff = Diff.diffLines(text1, text2);
            outputEl.innerHTML = '';

            if (mode === 'split') {
                // Side-by-Side Split View
                let leftHtml = '';
                let rightHtml = '';
                let leftLineNum = 1;
                let rightLineNum = 1;

                diff.forEach(part => {
                    const lines = part.value.split('\n');
                    if (lines[lines.length - 1] === '') lines.pop(); // remove trailing line break split

                    if (part.removed) {
                        lines.forEach(line => {
                            leftHtml += `<div class="diff-line diff-removed"><span class="diff-line-number">${leftLineNum++}</span><span class="diff-line-content">- ${escapeHtml(line)}</span></div>`;
                            rightHtml += `<div class="diff-line diff-empty-line"><span class="diff-line-number"></span><span class="diff-line-content"></span></div>`;
                        });
                    } else if (part.added) {
                        lines.forEach(line => {
                            leftHtml += `<div class="diff-line diff-empty-line"><span class="diff-line-number"></span><span class="diff-line-content"></span></div>`;
                            rightHtml += `<div class="diff-line diff-added"><span class="diff-line-number">${rightLineNum++}</span><span class="diff-line-content">+ ${escapeHtml(line)}</span></div>`;
                        });
                    } else {
                        lines.forEach(line => {
                            leftHtml += `<div class="diff-line"><span class="diff-line-number">${leftLineNum++}</span><span class="diff-line-content">  ${escapeHtml(line)}</span></div>`;
                            rightHtml += `<div class="diff-line"><span class="diff-line-number">${rightLineNum++}</span><span class="diff-line-content">  ${escapeHtml(line)}</span></div>`;
                        });
                    }
                });

                outputEl.innerHTML = `
                    <div class="diff-split-container">
                        <div class="diff-split-column">
                            <div style="font-weight:700; font-size:0.8rem; text-transform:uppercase; border-bottom:1px solid var(--border-color); padding-bottom:4px; margin-bottom:8px; color:var(--color-text-muted);">Texto Original</div>
                            ${leftHtml}
                        </div>
                        <div class="diff-split-column">
                            <div style="font-weight:700; font-size:0.8rem; text-transform:uppercase; border-bottom:1px solid var(--border-color); padding-bottom:4px; margin-bottom:8px; color:var(--color-text-muted);">Texto Modificado</div>
                            ${rightHtml}
                        </div>
                    </div>
                `;
            } else {
                // Unified single column view
                let unifiedHtml = '';
                let leftLineNum = 1;
                let rightLineNum = 1;

                diff.forEach(part => {
                    const lines = part.value.split('\n');
                    if (lines[lines.length - 1] === '') lines.pop();

                    if (part.removed) {
                        lines.forEach(line => {
                            unifiedHtml += `<div class="diff-line diff-removed"><span class="diff-line-number">${leftLineNum++}</span><span class="diff-line-number">-</span><span class="diff-line-content">- ${escapeHtml(line)}</span></div>`;
                        });
                    } else if (part.added) {
                        lines.forEach(line => {
                            unifiedHtml += `<div class="diff-line diff-added"><span class="diff-line-number">-</span><span class="diff-line-number">${rightLineNum++}</span><span class="diff-line-content">+ ${escapeHtml(line)}</span></div>`;
                        });
                    } else {
                        lines.forEach(line => {
                            unifiedHtml += `<div class="diff-line"><span class="diff-line-number">${leftLineNum++}</span><span class="diff-line-number">${rightLineNum++}</span><span class="diff-line-content">  ${escapeHtml(line)}</span></div>`;
                        });
                    }
                });

                outputEl.innerHTML = `
                    <div class="diff-unified-container">
                        ${unifiedHtml}
                    </div>
                `;
            }

            resultView.style.display = 'block';
            showToast('Diferencias calculadas con éxito', 'success');
        } catch (error) {
            console.error(error);
            showToast('Error al comparar los textos.', 'error');
        } finally {
            hideLoader();
        }
    });
});

