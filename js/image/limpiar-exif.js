import { formatBytes, showToast, showLoader, hideLoader, downloadBlob, setupDropzone } from '../helpers.js';

export function init() {
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

}
