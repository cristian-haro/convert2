export const html = `
<section class="tab-panel" id="panel-convertir-img">
                <div class="panel-header">
                    <h2>Convertir Formato de Imagen</h2>
                    <p>Convierte tus fotos e imágenes a otros formatos como PNG, JPG, WEBP, GIF, BMP, y crea **iconos
                        (.ICO)**.</p>
                </div>

                <div class="dropzone" id="dropzone-convertir">
                    <input type="file" id="file-convertir" accept="image/*" class="file-input">
                    <div class="dropzone-info">
                        <i class="fa-solid fa-image-portrait dropzone-icon"></i>
                        <h3>Selecciona la imagen de origen</h3>
                        <p>Soporta PNG, JPG, JPEG, GIF, BMP, WEBP</p>
                    </div>
                </div>

                <div class="file-preview-card" id="preview-convertir" style="display: none;">
                    <div class="file-meta">
                        <div class="thumbnail-wrapper">
                            <img id="thumb-convertir" class="img-thumbnail" src="" alt="Vista previa">
                        </div>
                        <div class="file-details">
                            <span class="file-name" id="name-convertir">imagen.png</span>
                            <span class="file-size" id="size-convertir">0 KB</span>
                        </div>
                        <button class="btn-remove" id="btn-remove-convertir"><i class="fa-solid fa-xmark"></i></button>
                    </div>

                    <div class="tool-options">
                        <h3>Configuración del Formato Destino</h3>
                        <div class="format-selection">
                            <label class="select-label" for="format-select">Formato:</label>
                            <div class="select-wrapper">
                                <select id="format-select">
                                    <option value="png">PNG (Transparencia)</option>
                                    <option value="jpeg">JPEG (Comprimido)</option>
                                    <option value="webp">WEBP (Optimizado web)</option>
                                    <option value="ico">ICO (Icono de Windows)</option>
                                    <option value="gif">GIF</option>
                                    <option value="bmp">BMP</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="actions-panel" id="actions-convertir" style="display: none;">
                    <button class="btn btn-primary" id="btn-run-convertir">
                        <i class="fa-solid fa-file-export"></i> Convertir y Descargar
                    </button>
                </div>
            </section>

            <!-- 9. Comprimir Imagen Panel [NEW] -->
`;

import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export function init() {
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

}
