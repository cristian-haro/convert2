import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export function init() {
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

}
