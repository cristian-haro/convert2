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

export async function getEmbeddableImageBytes(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
        return { bytes: new Uint8Array(await file.arrayBuffer()), type: ext === 'png' ? 'png' : 'jpg' };
    }
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(async (blob) => {
                resolve({ bytes: new Uint8Array(await blob.arrayBuffer()), type: 'png' });
            }, 'image/png');
        };
        img.src = URL.createObjectURL(file);
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
