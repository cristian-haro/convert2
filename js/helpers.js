// Helpers and utilities for Convert2
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function showLoader(message = 'Procesando archivo...') {
    const overlay = document.getElementById('loader-overlay');
    const text = document.getElementById('loader-text');
    if (overlay && text) {
        text.textContent = message;
        overlay.style.display = 'flex';
    }
}

export function hideLoader() {
    const overlay = document.getElementById('loader-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

export function showToast(text, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-xmark';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div class="toast-text">${text}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 4000);
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function isHeicFile(file) {
    if (!file) return false;
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();
    return type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
}

export async function convertHeicToBlob(file, toType = 'image/jpeg', quality = 0.92) {
    if (typeof window !== 'undefined' && !window.heic2any) {
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.4/heic2any.min.js');
    }
    const result = await window.heic2any({
        blob: file,
        toType: toType,
        quality: quality
    });
    return Array.isArray(result) ? result[0] : result;
}

export async function loadImageElement(fileOrBlob) {
    let sourceBlob = fileOrBlob;
    if (isHeicFile(fileOrBlob)) {
        sourceBlob = await convertHeicToBlob(fileOrBlob, 'image/jpeg', 0.95);
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(sourceBlob);
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}

export async function getEmbeddableImageBytes(file) {
    if (isHeicFile(file)) {
        const convertedBlob = await convertHeicToBlob(file, 'image/jpeg', 0.95);
        return {
            bytes: new Uint8Array(await convertedBlob.arrayBuffer()),
            type: 'jpg'
        };
    }
    const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
        return { bytes: new Uint8Array(await file.arrayBuffer()), type: ext === 'png' ? 'png' : 'jpg' };
    }
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    reject(new Error('Failed to create image blob'));
                    return;
                }
                resolve({ bytes: new Uint8Array(await blob.arrayBuffer()), type: 'png' });
            }, 'image/png');
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for embedding'));
        };
        img.src = url;
    });
}

export function setupDropzone(dropzoneId, inputId, onFileSelect) {
    const dropzone = document.getElementById(dropzoneId);
    const input = document.getElementById(inputId);
    if (!dropzone || !input) return;

    dropzone.addEventListener('click', () => input.click());

    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            onFileSelect(e.target.files);
        }
    });

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
}

const loadedScripts = new Set();

export function loadScript(url) {
    if (loadedScripts.has(url)) return Promise.resolve();
    
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
        loadedScripts.add(url);
        return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => {
            loadedScripts.add(url);
            // Auto configure PDF.js worker
            if (url.includes('pdf.min.js') && window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            }
            resolve();
        };
        script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
        document.head.appendChild(script);
    });
}
