// Global variables
let currentFiles = [];
let processedFiles = [];
let currentTool = '';
let currentSlideIndex = 0;
let imageDataUrls = [];

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    
    if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

// Initialize theme on page load
initTheme();

// Theme toggle event listener and global initialization
document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('dn');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        toggle.checked = savedTheme === 'dark';
        // Apply theme based on saved preference
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    } else {
        // Set toggle based on current theme
        toggle.checked = document.documentElement.classList.contains('dark');
    }
    
    // Listen for toggle changes
    toggle.addEventListener('change', function() {
        const theme = this.checked ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    });
    
    // Initialize global drag and drop functionality
    setupGlobalDragDrop();
});

// Utility Functions
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

function showToast(message, type = 'success', duration = 3000) {
    // Determine which container to use based on whether the tool modal is open
    const isToolOpen = !document.getElementById('tool-modal').classList.contains('hidden');
    const containerId = isToolOpen ? 'tool-toast-container' : 'toast-container';
    const container = document.getElementById(containerId);
    
    const toast = document.createElement('div');
    const toastId = 'toast-' + Date.now();
    toast.id = toastId;
    toast.className = `toast bg-white dark:bg-gray-800 border-l-4 ${
        type === 'success' ? 'border-green-500' : 
        type === 'error' ? 'border-red-500' : 
        type === 'warning' ? 'border-yellow-500' :
        'border-blue-500'
    } p-4 rounded-lg shadow-lg transform translate-x-full opacity-0 transition-all duration-300 ease-out`;
    
    // Add additional styles for better visibility
    if (isToolOpen) {
        toast.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        toast.style.fontWeight = '500';
        toast.style.zIndex = '9999';
    }
    
    const iconClass = type === 'success' ? 'fa-check-circle text-green-500' :
                     type === 'error' ? 'fa-exclamation-circle text-red-500' :
                     type === 'warning' ? 'fa-exclamation-triangle text-yellow-500' :
                     'fa-info-circle text-blue-500';
    
    toast.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center flex-1">
                <i class="fas ${iconClass} mr-3 text-lg"></i>
                <span class="text-sm font-medium text-gray-900 dark:text-white">${message}</span>
            </div>
            <button onclick="dismissToast('${toastId}')" class="ml-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <i class="fas fa-times text-sm"></i>
            </button>
        </div>
        <div class="absolute bottom-0 left-0 h-1 bg-gradient-to-r ${
            type === 'success' ? 'from-green-500 to-green-400' :
            type === 'error' ? 'from-red-500 to-red-400' :
            type === 'warning' ? 'from-yellow-500 to-yellow-400' :
            'from-blue-500 to-blue-400'
        } rounded-bl-lg transition-all duration-${duration} ease-linear" style="width: 100%; animation: toast-progress ${duration}ms linear;"></div>
    `;
    
    container.appendChild(toast);
    
    // Show toast with animation
    requestAnimationFrame(() => {
        if (window.innerWidth <= 640) {
            // Mobile devices - use opacity animation instead of transform
            toast.classList.remove('opacity-0');
            toast.classList.add('opacity-100');
            // Ensure toast is properly positioned on mobile
            toast.style.transform = 'translateX(0)';
            toast.style.left = '0';
            toast.style.right = '0';
            toast.style.width = '100%';
            toast.style.maxWidth = '100%';
        } else {
            // Desktop devices - use transform animation but ensure proper positioning
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
            // Ensure toast is properly positioned on desktop
            toast.style.transform = 'translateX(0)';
            toast.style.left = '0';
            toast.style.right = '0';
            toast.style.width = '100%';
            toast.style.maxWidth = '100%';
        }
    });
    
    // Auto-remove toast
    const timeoutId = setTimeout(() => {
        dismissToast(toastId);
    }, duration);
    
    // Store timeout ID for manual dismissal
    toast.dataset.timeoutId = timeoutId;
}

function dismissToast(toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
        // Clear timeout if manually dismissed
        if (toast.dataset.timeoutId) {
            clearTimeout(toast.dataset.timeoutId);
        }
        
        if (window.innerWidth <= 640) {
            // Mobile devices - use opacity animation
            toast.classList.remove('opacity-100');
            toast.classList.add('opacity-0');
            // Ensure toast stays in position during dismissal
            toast.style.transform = 'translateX(0)';
        } else {
            // Desktop devices - use opacity animation to prevent sliding off-screen
            toast.classList.remove('opacity-100');
            toast.classList.add('opacity-0');
            // Ensure toast stays in position during dismissal
            toast.style.transform = 'translateX(0)';
        }
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

function showProgress(show = true, message = 'Processing...') {
    const container = document.getElementById('progress-container');
    const bar = document.getElementById('progress-bar');
    const text = container.querySelector('.progress-text');
    
    if (show) {
        container.classList.remove('hidden');
        bar.style.width = '0%';
        bar.style.transition = 'width 0.3s ease-out';
        if (text) text.textContent = message;
        
        // Add pulse animation to container
        container.classList.add('animate-pulse');
        setTimeout(() => container.classList.remove('animate-pulse'), 500);
    } else {
        // Smooth hide animation
        container.style.opacity = '0';
        setTimeout(() => {
            container.classList.add('hidden');
            container.style.opacity = '1';
        }, 300);
    }
}

function updateProgress(percentage, message = null) {
    const bar = document.getElementById('progress-bar');
    const container = document.getElementById('progress-container');
    const text = container.querySelector('.progress-text');
    
    const clampedPercentage = Math.min(100, Math.max(0, percentage));
    bar.style.width = `${clampedPercentage}%`;
    
    // Update message if provided
    if (message && text) {
        text.textContent = message;
    }
    
    // Add completion animation
    if (clampedPercentage === 100) {
        bar.classList.add('animate-pulse');
        setTimeout(() => {
            bar.classList.remove('animate-pulse');
            showProgress(false);
        }, 500);
    }
    
    // Update progress bar color based on percentage
    if (clampedPercentage < 30) {
        bar.className = bar.className.replace(/bg-\w+-\d+/g, '') + ' bg-red-500';
    } else if (clampedPercentage < 70) {
        bar.className = bar.className.replace(/bg-\w+-\d+/g, '') + ' bg-yellow-500';
    } else {
        bar.className = bar.className.replace(/bg-\w+-\d+/g, '') + ' bg-green-500';
    }
}

// Enhanced File handling functions with improved drag-and-drop
function handleFileSelect(event, callback) {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.target.files || event.dataTransfer.files;
    if (files && files.length > 0) {
        const fileArray = Array.from(files);
        const validFiles = filterValidFiles(fileArray);
        
        if (validFiles.length !== fileArray.length) {
            const invalidCount = fileArray.length - validFiles.length;
            showToast(`${invalidCount} file(s) skipped - invalid format for current tool`, 'warning');
        }
        
        if (validFiles.length > 0) {
            callback(validFiles);
            showToast(`${validFiles.length} file(s) added successfully!`);
        }
        
        // Clear the input to allow re-selection of the same file
        if (event.target.type === 'file') {
            event.target.value = '';
        }
    }
}

function filterValidFiles(files) {
    if (!currentTool) return files;
    
    return files.filter(file => {
        switch (currentTool) {
            case 'image-to-pdf':
            case 'image-compressor':
            case 'image-resizer':
            case 'format-converter':
            case 'batch-processor':
                return file.type.startsWith('image/');
            case 'pdf-to-images':
                return file.type === 'application/pdf';
            default:
                return file.type.startsWith('image/') || file.type === 'application/pdf';
        }
    });
}

function setupFileDropZone(element, callback) {
    element.addEventListener('dragenter', (e) => {
        e.preventDefault();
        element.classList.add('drag-over');
    });
    
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('drag-over');
    });
    
    element.addEventListener('dragleave', (e) => {
        e.preventDefault();
        // Only remove drag-over if we're leaving the element entirely
        if (!element.contains(e.relatedTarget)) {
            element.classList.remove('drag-over');
        }
    });
    
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        handleFileSelect(e, callback);
    });
}

// Global drag and drop functionality
function setupGlobalDragDrop() {
    let dragCounter = 0;
    
    document.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (currentTool && dragCounter === 1) {
            showGlobalDropOverlay();
        }
    });
    
    document.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            hideGlobalDropOverlay();
        }
    });
    
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        hideGlobalDropOverlay();
        
        if (currentTool && !e.target.closest('.file-drop-zone')) {
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                const validFiles = filterValidFiles(files);
                if (validFiles.length > 0) {
                    currentFiles = [...currentFiles, ...validFiles];
                    updateFileList(currentFiles);
                    showToast(`${validFiles.length} file(s) added via drag & drop!`);
                }
                if (validFiles.length !== files.length) {
                    const invalidCount = files.length - validFiles.length;
                    showToast(`${invalidCount} file(s) skipped - invalid format`, 'warning');
                }
            }
        }
    });
}

function showGlobalDropOverlay() {
    let overlay = document.getElementById('global-drop-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'global-drop-overlay';
        overlay.className = 'fixed inset-0 bg-blue-600/20 backdrop-blur-sm z-50 flex items-center justify-center transition-all duration-300';
        overlay.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border-4 border-dashed border-blue-500 text-center max-w-md mx-4 transform scale-95 hover:scale-100 transition-transform">
                <i class="fas fa-cloud-upload-alt text-6xl text-blue-500 mb-4 animate-bounce"></i>
                <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Drop Files Here</h3>
                <p class="text-gray-600 dark:text-gray-300">Release to add files to <span class="font-semibold text-blue-600">${getToolDisplayName()}</span></p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.style.opacity = '1', 10);
}

function hideGlobalDropOverlay() {
    const overlay = document.getElementById('global-drop-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

function getToolDisplayName() {
    const names = {
        'image-to-pdf': 'Image to PDF Converter',
        'pdf-to-images': 'PDF to Images Converter',
        'image-compressor': 'Image Compressor',
        'image-resizer': 'Image Resizer',
        'format-converter': 'Format Converter',
        'batch-processor': 'Batch Processor'
    };
    return names[currentTool] || 'Current Tool';
}

// Image Slider Functions - Removed to fix errors
function createImageSlider(files) {
    return new Promise((resolve) => {
        // Simply resolve with empty string as we've removed the slider functionality
        resolve('');
    });
}

// Tool management
function openTool(toolName) {
    currentTool = toolName;
    const modal = document.getElementById('tool-modal');
    const title = document.getElementById('tool-title');
    const content = document.getElementById('tool-content');
    
    // Set title
    const titles = {
        'image-to-pdf': 'Image to PDF Converter',
        'pdf-to-images': 'PDF to Images Converter',
        'image-compressor': 'Image Compressor',
        'image-resizer': 'Image Resizer',
        'format-converter': 'Format Converter',
        'batch-processor': 'Batch Processor'
    };
    
    title.textContent = titles[toolName] || 'Tool Workspace';
    
    // Load tool content
    content.innerHTML = getToolContent(toolName);
    
    // Show modal
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Initialize tool
    setTimeout(() => initializeTool(toolName), 100);
    
    // Show success toast for better UX
    showToast(`Opening ${titles[toolName]}...`, 'success', 2000);
}

function closeTool() {
    const modal = document.getElementById('tool-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    
    // Reset state
    currentFiles = [];
    processedFiles = [];
    currentTool = '';
    currentSlideIndex = 0;
    imageDataUrls = [];
}

function getToolContent(toolName) {
    const commonFileInput = `
        <div class="file-drop-zone rounded-xl p-8 text-center mb-6">
            <div class="file-input-wrapper">
                <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                <p class="text-lg font-medium mb-2">Drag & drop files here</p>
                <p class="text-gray-500 mb-4">or click to browse</p>
                <button type="button" onclick="document.getElementById('file-input').click()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Choose Files
                </button>
                <input type="file" id="file-input" multiple accept="image/*,.pdf" class="hidden">
            </div>
        </div>
        <div id="file-preview" class="hidden mb-6">
            <h3 class="text-lg font-semibold mb-4">Selected Files</h3>
            <div id="file-list" class="space-y-2 mb-4"></div>
            <div id="image-preview-grid" class="image-preview-grid"></div>
        </div>
    `;
    
    const controls = {
        'batch-processor': `
            <div class="mb-6">
                <h3 class="text-lg font-semibold mb-4">Individual Image Settings</h3>
                <div id="batch-images" class="grid gap-6 md:grid-cols-2">
                    </div>
            </div>
        `,
        'pdf-to-images': `
            <div class="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium mb-2">Output Format</label>
                    <select id="pdf-extract-format" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                        <option value="webp">WebP</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Quality</label>
                    <input type="range" id="pdf-extract-quality" min="10" max="100" value="90" class="w-full">
                    <div class="text-center text-sm text-gray-500 mt-1">
                        <span id="pdf-extract-quality-value">90</span>%
                    </div>
                </div>
            </div>
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">DPI (Resolution)</label>
                <select id="pdf-extract-dpi" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                    <option value="96">96 DPI (Screen Resolution)</option>
                    <option value="150">150 DPI (Medium Quality)</option>
                    <option value="300">300 DPI (High Quality)</option>
                </select>
            </div>
        `,
        'image-to-pdf': `
            <div class="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium mb-2">Page Layout</label>
                    <select id="pdf-layout" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                        <option value="portrait">Portrait</option>
                        <option value="landscape">Landscape</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Page Size</label>
                    <select id="pdf-size" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                        <option value="a4">A4</option>
                        <option value="letter">Letter</option>
                        <option value="legal">Legal</option>
                    </select>
                </div>
            </div>
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">Margin (px)</label>
                <input type="range" id="pdf-margin" min="0" max="50" value="10" class="w-full">
                <div class="text-center text-sm text-gray-500 mt-1">
                    <span id="margin-value">10</span>px
                </div>
            </div>
        `,
        'image-compressor': `
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">Quality</label>
                <input type="range" id="quality-slider" min="10" max="100" value="80" class="w-full">
                <div class="text-center text-sm text-gray-500 mt-1">
                    <span id="quality-value">80</span>%
                </div>
            </div>
            <div id="compression-stats" class="hidden bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <div class="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div class="text-sm text-gray-500">Original</div>
                        <div id="original-size" class="font-bold">-</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-500">Compressed</div>
                        <div id="compressed-size" class="font-bold">-</div>
                    </div>
                    <div>
                        <div class="text-sm text-gray-500">Saved</div>
                        <div id="saved-percentage" class="font-bold text-green-600">-</div>
                    </div>
                </div>
            </div>
        `,
        'image-resizer': `
            <div class="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label class="block text-sm font-medium mb-2">Width (px)</label>
                    <input type="number" id="resize-width" placeholder="800" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Height (px)</label>
                    <input type="number" id="resize-height" placeholder="600" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                </div>
            </div>
            <div class="mb-6">
                <label class="flex items-center">
                    <input type="checkbox" id="maintain-aspect" checked class="mr-2">
                    <span class="text-sm">Maintain aspect ratio</span>
                </label>
            </div>
        `,
        'format-converter': `
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">Output Format</label>
                <select id="output-format" class="w-full p-3 border dark:border-gray-600 rounded-lg dark:bg-gray-700">
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                    <option value="avif">AVIF</option>
                    <option value="bmp">BMP</option>
                    <option value="tiff">TIFF</option>
                </select>
            </div>
            <div class="mb-6">
                <label class="block text-sm font-medium mb-2">Quality</label>
                <input type="range" id="convert-quality" min="10" max="100" value="90" class="w-full">
                <div class="text-center text-sm text-gray-500 mt-1">
                    <span id="convert-quality-value">90</span>%
                </div>
            </div>
        `
    };
    
    return `
        ${commonFileInput}
        ${controls[toolName] || ''}
        <div class="flex space-x-4">
            <button id="process-btn" class="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                <i class="fas fa-cog mr-2"></i>
                Process Files
            </button>
            <button id="download-btn" class="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hidden" disabled>
                <i class="fas fa-download mr-2"></i>
                Download All
            </button>
        </div>
        <div id="results" class="mt-6 hidden">
            <h3 class="text-lg font-semibold mb-4">Processed Files</h3>
            <div id="results-list" class="space-y-2"></div>
        </div>
    `;
}

function initializeTool(toolName) {
    const fileInput = document.getElementById('file-input');
    const fileDropZone = document.querySelector('.file-drop-zone');
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    // Setup file input
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            handleFileSelect(e, updateFileList);
        });
    }
    
    // Setup drop zone
    if (fileDropZone) {
        setupFileDropZone(fileDropZone, updateFileList);
    }
    
    // Setup process button
    if (processBtn) {
        processBtn.addEventListener('click', () => processFiles(toolName));
    }
    
    // Setup download button
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadAllFiles);
    }
    
    // Setup tool-specific controls
    setupToolControls(toolName);
}

function setupToolControls(toolName) {
    switch (toolName) {
        case 'image-compressor':
            const qualitySlider = document.getElementById('quality-slider');
            const qualityValue = document.getElementById('quality-value');
            if (qualitySlider && qualityValue) {
                qualitySlider.addEventListener('input', (e) => {
                    qualityValue.textContent = e.target.value;
                });
            }
            break;
            
        case 'image-to-pdf':
            const marginSlider = document.getElementById('pdf-margin');
            const marginValue = document.getElementById('margin-value');
            if (marginSlider && marginValue) {
                marginSlider.addEventListener('input', (e) => {
                    marginValue.textContent = e.target.value;
                });
            }
            break;
            
        case 'pdf-to-images':
            const pdfExtractQualitySlider = document.getElementById('pdf-extract-quality');
            const pdfExtractQualityValue = document.getElementById('pdf-extract-quality-value');
            if (pdfExtractQualitySlider && pdfExtractQualityValue) {
                pdfExtractQualitySlider.addEventListener('input', (e) => {
                    pdfExtractQualityValue.textContent = e.target.value;
                });
            }
            break;
            
        case 'format-converter':
            const convertQualitySlider = document.getElementById('convert-quality');
            const convertQualityValue = document.getElementById('convert-quality-value');
            if (convertQualitySlider && convertQualityValue) {
                convertQualitySlider.addEventListener('input', (e) => {
                    convertQualityValue.textContent = e.target.value;
                });
            }
            break;
            
        case 'image-resizer':
            const widthInput = document.getElementById('resize-width');
            const heightInput = document.getElementById('resize-height');
            const maintainAspect = document.getElementById('maintain-aspect');
            
            if (widthInput && heightInput && maintainAspect) {
                let aspectRatio = 1;
                
                widthInput.addEventListener('input', (e) => {
                    if (maintainAspect.checked && currentFiles.length > 0) {
                        const newHeight = Math.round(e.target.value / aspectRatio);
                        heightInput.value = newHeight;
                    }
                });
                
                heightInput.addEventListener('input', (e) => {
                    if (maintainAspect.checked && currentFiles.length > 0) {
                        const newWidth = Math.round(e.target.value * aspectRatio);
                        widthInput.value = newWidth;
                    }
                });
            }
            break;
    }
}

async function updateFileList(files) {
    currentFiles = files;
    const filePreview = document.getElementById('file-preview');
    const fileList = document.getElementById('file-list');
    const processBtn = document.getElementById('process-btn');
    const imagePreviewGrid = document.getElementById('image-preview-grid');
    
    if (files.length > 0) {
        filePreview.classList.remove('hidden');
        fileList.innerHTML = '';
        
        // Get image files
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        
        // Create file list with enhanced styling and animations
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item flex items-start justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 transition-all duration-200 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500';
            fileItem.style.opacity = '0';
            fileItem.style.transform = 'translateY(10px)';
            
            const fileIcon = getFileIcon(file.type);
            const fileTypeClass = file.type.startsWith('image/') ? 'text-green-600' : 
                                 file.type === 'application/pdf' ? 'text-red-600' : 'text-blue-600';
            
            fileItem.innerHTML = `
                <div class="flex items-start flex-1 min-w-0">
                    <div class="flex-shrink-0 w-12 h-12 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center mr-4 shadow-sm">
                        <i class="fas ${fileIcon} ${fileTypeClass} text-lg"></i>
                    </div>
                    <div class="flex-1 min-w-0 overflow-hidden">
                        <div class="font-medium text-gray-900 dark:text-white break-words leading-tight">${file.name}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap items-center mt-1 gap-1">
                            <span>${formatFileSize(file.size)}</span>
                            <span class="hidden sm:inline">•</span>
                            <span class="capitalize">${file.type.split('/')[1] || 'Unknown'}</span>
                            ${file.lastModified ? `<span class="hidden sm:inline">•</span><span>${new Date(file.lastModified).toLocaleDateString()}</span>` : ''}
                        </div>
                    </div>
                </div>
                <button onclick="removeFile(${index})" class="btn-enhanced flex-shrink-0 ml-4 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            fileList.appendChild(fileItem);
            
            // Animate in
            setTimeout(() => {
                fileItem.style.opacity = '1';
                fileItem.style.transform = 'translateY(0)';
            }, index * 50);
        });
        
        // Create enhanced image preview grid
        imagePreviewGrid.innerHTML = '';
        let imageLoadCount = 0;
        
        files.forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'image-preview-item group relative overflow-hidden';
                    previewItem.style.opacity = '0';
                    previewItem.style.transform = 'scale(0.9)';
                    
                    previewItem.innerHTML = `
                        <div class="relative w-full h-full">
                            <img src="${e.target.result}" alt="${file.name}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300"></div>
                            <button class="remove-btn absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:scale-110 flex items-center justify-center" onclick="event.stopPropagation(); removeFile(${index})">
                                <i class="fas fa-times text-xs"></i>
                            </button>
                            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                <div class="file-name text-white text-sm font-medium truncate">${file.name}</div>
                                <div class="text-white/80 text-xs mt-1">${formatFileSize(file.size)}</div>
                            </div>
                        </div>
                    `;
                    
                    imagePreviewGrid.appendChild(previewItem);
                    
                    // Animate in with stagger
                    setTimeout(() => {
                        previewItem.style.opacity = '1';
                        previewItem.style.transform = 'scale(1)';
                    }, imageLoadCount * 100);
                    
                    imageLoadCount++;
                };
                reader.readAsDataURL(file);
            }
        });
        
        // Generate batch processor controls if needed
        if (currentTool === 'batch-processor') {
            generateBatchControls(imageFiles);
        }
        
        processBtn.disabled = false;
    } else {
        filePreview.classList.add('hidden');
        processBtn.disabled = true;
    }
}

function generateBatchControls(imageFiles) {
    const batchContainer = document.getElementById('batch-images');
    if (!batchContainer) return;
    
    batchContainer.innerHTML = '';
    
    imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const controlCard = document.createElement('div');
            controlCard.className = 'bg-white dark:bg-gray-700 rounded-lg p-4 border dark:border-gray-600';
            controlCard.innerHTML = `
                <div class="flex flex-col space-y-4">
                    <div class="flex items-center space-x-3">
                        <img src="${e.target.result}" alt="${file.name}" class="w-16 h-16 object-cover rounded-lg">
                        <div class="flex-1 min-w-0">
                            <h4 class="text-sm font-medium truncate">${file.name}</h4>
                            <p class="text-xs text-gray-500">${formatFileSize(file.size)}</p>
                        </div>
                        <button onclick="removeBatchFile(${index})" class="text-red-500 hover:text-red-700 p-1">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="space-y-3">
                        <div>
                            <label class="block text-xs font-medium mb-1">Output Format</label>
                            <select id="batch-format-${index}" class="w-full p-2 text-sm border dark:border-gray-600 rounded dark:bg-gray-600">
                                <option value="jpeg">JPEG</option>
                                <option value="png">PNG</option>
                                <option value="webp">WebP</option>
                                <option value="avif">AVIF</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-xs font-medium mb-1">Quality: <span id="batch-quality-value-${index}">80</span>%</label>
                            <input type="range" id="batch-quality-${index}" min="10" max="100" value="80" class="w-full" 
                                   oninput="document.getElementById('batch-quality-value-${index}').textContent = this.value">
                        </div>
                    </div>
                </div>
            `;
            batchContainer.appendChild(controlCard);
        };
        reader.readAsDataURL(file);
    });
}

function removeBatchFile(index) {
    removeFile(index);
}

function removeFile(index) {
    currentFiles.splice(index, 1);
    updateFileList(currentFiles);
}

function getFileIcon(mimeType) {
    if (mimeType.startsWith('image/')) return 'fa-image';
    if (mimeType === 'application/pdf') return 'fa-file-pdf';
    return 'fa-file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Enhanced processing functions with better feedback
async function processFiles(toolName) {
    if (currentFiles.length === 0) {
        showToast('No files selected for processing', 'warning');
        return;
    }
    
    const toolDisplayName = getToolDisplayName(toolName);
    showProgress(true, `Initializing ${toolDisplayName}...`);
    processedFiles = [];
    
    const processBtn = document.getElementById('process-btn');
    const downloadBtn = document.getElementById('download-btn');
    
    // Enhanced button state with animation
    processBtn.disabled = true;
    processBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    processBtn.classList.add('opacity-75', 'cursor-not-allowed');
    
    const startTime = Date.now();
    let processedCount = 0;
    
    try {
        showToast(`Starting ${toolDisplayName} for ${currentFiles.length} file(s)`, 'info', 2000);
        
        for (let i = 0; i < currentFiles.length; i++) {
            const file = currentFiles[i];
            const progressPercent = (i / currentFiles.length) * 90; // Reserve 10% for final steps
            
            updateProgress(progressPercent, `Processing ${file.name}... (${i + 1}/${currentFiles.length})`);
            
            let processedFile;
            
            try {
                switch (toolName) {
                    case 'image-to-pdf':
                        // Skip individual processing for image-to-pdf as we'll create a combined PDF later
                        if (file.type.startsWith('image/')) {
                            processedFile = file;
                            updateProgress(progressPercent + (90 / currentFiles.length) * 0.5, `Preparing ${file.name} for PDF...`);
                        }
                        break;
                    case 'pdf-to-images':
                        if (file.type === 'application/pdf') {
                            updateProgress(progressPercent + (90 / currentFiles.length) * 0.3, `Extracting images from ${file.name}...`);
                            const extractedImages = await extractImagesFromPDF(file);
                            if (extractedImages && extractedImages.length > 0) {
                                processedFiles = [...processedFiles, ...extractedImages];
                                processedCount += extractedImages.length;
                                updateProgress(progressPercent + (90 / currentFiles.length) * 0.8, `Extracted ${extractedImages.length} images from ${file.name}`);
                            }
                        }
                        break;
                    case 'image-compressor':
                        updateProgress(progressPercent + (90 / currentFiles.length) * 0.3, `Compressing ${file.name}...`);
                        processedFile = await compressImage(file);
                        if (processedFile) {
                            const compressionRatio = ((file.size - processedFile.size) / file.size * 100).toFixed(1);
                            updateProgress(progressPercent + (90 / currentFiles.length) * 0.8, `Compressed ${file.name} (${compressionRatio}% reduction)`);
                        }
                        break;
                    case 'image-resizer':
                        updateProgress(progressPercent + (90 / currentFiles.length) * 0.3, `Resizing ${file.name}...`);
                        processedFile = await resizeImage(file);
                        updateProgress(progressPercent + (90 / currentFiles.length) * 0.8, `Resized ${file.name}`);
                        break;
                    case 'format-converter':
                        const outputFormat = document.getElementById('output-format')?.value || 'jpeg';
                        updateProgress(progressPercent + (90 / currentFiles.length) * 0.3, `Converting ${file.name} to ${outputFormat.toUpperCase()}...`);
                        processedFile = await convertImageFormat(file);
                        updateProgress(progressPercent + (90 / currentFiles.length) * 0.8, `Converted ${file.name} to ${outputFormat.toUpperCase()}`);
                        break;
                    case 'batch-processor':
                        const batchFormat = document.getElementById(`batch-format-${i}`)?.value || 'jpeg';
                        updateProgress(progressPercent + (90 / currentFiles.length) * 0.3, `Batch processing ${file.name} to ${batchFormat.toUpperCase()}...`);
                        processedFile = await processBatchImage(file, i);
                        updateProgress(progressPercent + (90 / currentFiles.length) * 0.8, `Processed ${file.name}`);
                        break;
                    default:
                        processedFile = file;
                }
                
                if (processedFile && toolName !== 'pdf-to-images') {
                    processedFiles.push(processedFile);
                    processedCount++;
                }
                
            } catch (fileError) {
                console.error(`Error processing ${file.name}:`, fileError);
                showToast(`Failed to process ${file.name}`, 'error', 2000);
            }
        }
        
        updateProgress(95, 'Finalizing processing...');
        
        if (toolName === 'image-to-pdf' && processedFiles.length > 0) {
            updateProgress(97, 'Creating PDF from images...');
            const combinedPDF = await createPDFFromImages(currentFiles);
            processedFiles = [combinedPDF];
            processedCount = 1;
        }
        
        updateProgress(100, 'Processing complete!');
        
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);
        showResults();
        showToast(`Successfully processed ${processedCount} file(s) in ${processingTime}s!`, 'success', 4000);
        
    } catch (error) {
        console.error('Processing error:', error);
        showToast(`Error during ${toolDisplayName}: ${error.message || 'Please try again.'}`, 'error', 5000);
        updateProgress(0);
    } finally {
        setTimeout(() => {
            showProgress(false);
        }, 1000);
        
        // Reset button state with animation
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="fas fa-cog mr-2"></i>Process Files';
        processBtn.classList.remove('opacity-75', 'cursor-not-allowed');
        
        if (processedFiles.length > 0) {
            downloadBtn.classList.remove('hidden');
            downloadBtn.disabled = false;
            
            // Add success animation to download button
            downloadBtn.classList.add('animate-pulse');
            setTimeout(() => downloadBtn.classList.remove('animate-pulse'), 2000);
        }
    }
}

// Batch processing function
async function processBatchImage(file, index) {
    if (!file.type.startsWith('image/')) return file;
    
    const img = await loadImage(file);
    const formatSelect = document.getElementById(`batch-format-${index}`);
    const qualitySlider = document.getElementById(`batch-quality-${index}`);
    
    if (!formatSelect || !qualitySlider) return file;
    
    const format = formatSelect.value;
    const quality = qualitySlider.value / 100;
    
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Set white background for JPEG
    if (format === 'jpeg') {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.drawImage(img, 0, 0);
    
    const mimeType = `image/${format}`;
    const extension = format === 'jpeg' ? 'jpg' : format;
    const newFileName = file.name.replace(/\.[^/.]+$/, `.${extension}`);
    
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const newFile = new File([blob], newFileName, { type: mimeType });
            resolve(newFile);
        }, mimeType, quality);
    });
}

// Image processing functions
function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

async function compressImage(file) {
    const img = await loadImage(file);
    const quality = document.getElementById('quality-slider').value / 100;
    
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const newFile = new File([blob], file.name, { type: file.type });
            updateCompressionStats(file.size, blob.size);
            resolve(newFile);
        }, file.type, quality);
    });
}

function updateCompressionStats(originalSize, compressedSize) {
    const originalElement = document.getElementById('original-size');
    const compressedElement = document.getElementById('compressed-size');
    const savedElement = document.getElementById('saved-percentage');
    const statsContainer = document.getElementById('compression-stats');
    
    if (originalElement && compressedElement && savedElement) {
        const savedPercentage = Math.round(((originalSize - compressedSize) / originalSize) * 100);
        
        originalElement.textContent = formatFileSize(originalSize);
        compressedElement.textContent = formatFileSize(compressedSize);
        savedElement.textContent = `${savedPercentage}%`;
        
        statsContainer.classList.remove('hidden');
    }
}

async function resizeImage(file) {
    const img = await loadImage(file);
    const width = parseInt(document.getElementById('resize-width').value) || img.width;
    const height = parseInt(document.getElementById('resize-height').value) || img.height;
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const newFile = new File([blob], file.name, { type: file.type });
            resolve(newFile);
        }, file.type, 0.9);
    });
}

async function convertImageFormat(file) {
    const img = await loadImage(file);
    const format = document.getElementById('output-format').value;
    const quality = document.getElementById('convert-quality').value / 100;
    
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Set white background for JPEG
    if (format === 'jpeg') {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.drawImage(img, 0, 0);
    
    const mimeType = `image/${format}`;
    const extension = format === 'jpeg' ? 'jpg' : format;
    const newFileName = file.name.replace(/\.[^/.]+$/, `.${extension}`);
    
    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            const newFile = new File([blob], newFileName, { type: mimeType });
            resolve(newFile);
        }, mimeType, quality);
    });
}

async function createPDFFromImages(files) {
    const { jsPDF } = window.jspdf;
    const layout = document.getElementById('pdf-layout').value;
    const size = document.getElementById('pdf-size').value;
    const margin = parseInt(document.getElementById('pdf-margin').value);
    
    const pdf = new jsPDF(layout, 'pt', size);
    
    for (let i = 0; i < files.length; i++) {
        if (i > 0) pdf.addPage();
        
        const img = await loadImage(files[i]);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = pageWidth - (margin * 2);
        const imgHeight = (img.height * imgWidth) / img.width;
        
        const x = margin;
        const y = margin;
        
        pdf.addImage(imgData, 'JPEG', x, y, imgWidth, Math.min(imgHeight, pageHeight - (margin * 2)));
    }
    
    const pdfBlob = pdf.output('blob');
    return new File([pdfBlob], 'converted-images.pdf', { type: 'application/pdf' });
}

async function extractImagesFromPDF(file) {
    try {
        // Load the PDF file
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        const format = document.getElementById('pdf-extract-format').value;
        const quality = document.getElementById('pdf-extract-quality').value / 100;
        const dpi = parseInt(document.getElementById('pdf-extract-dpi').value);
        
        // Calculate scale factor based on DPI (72 is the default PDF DPI)
        const scaleFactor = dpi / 72;
        
        const extractedImages = [];
        
        // Process each page
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            
            // Get viewport at desired DPI
            const viewport = page.getViewport({ scale: scaleFactor });
            
            // Create canvas for rendering
            const canvas = createCanvas(viewport.width, viewport.height);
            const ctx = canvas.getContext('2d');
            
            // Render PDF page to canvas
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;
            
            // Set white background for JPEG
            if (format === 'jpeg') {
                const tempCanvas = createCanvas(viewport.width, viewport.height);
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.fillStyle = 'white';
                tempCtx.fillRect(0, 0, viewport.width, viewport.height);
                tempCtx.drawImage(canvas, 0, 0);
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                ctx.drawImage(tempCanvas, 0, 0);
            }
            
            // Convert canvas to blob
            const mimeType = `image/${format}`;
            const extension = format === 'jpeg' ? 'jpg' : format;
            const fileName = `page-${i}.${extension}`;
            
            const blob = await new Promise(resolve => {
                canvas.toBlob(blob => resolve(blob), mimeType, quality);
            });
            
            const imageFile = new File([blob], fileName, { type: mimeType });
            extractedImages.push(imageFile);
        }
        
        return extractedImages;
    } catch (error) {
        console.error('Error extracting images from PDF:', error);
        showToast('Error extracting images from PDF. Please try again.', 'error');
        return [];
    }
}

// Results and download functions
function showResults() {
    const results = document.getElementById('results');
    const resultsList = document.getElementById('results-list');
    
    results.classList.remove('hidden');
    resultsList.innerHTML = '';
    
    processedFiles.forEach((file, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg';
        resultItem.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${getFileIcon(file.type)} text-green-600 mr-3"></i>
                <div>
                    <div class="font-medium">${file.name}</div>
                    <div class="text-sm text-gray-500">${formatFileSize(file.size)}</div>
                </div>
            </div>
            <button onclick="downloadSingleFile(${index})" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                <i class="fas fa-download mr-1"></i>
                Download
            </button>
        `;
        resultsList.appendChild(resultItem);
    });
}

function downloadSingleFile(index) {
    const file = processedFiles[index];
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function downloadAllFiles() {
    if (processedFiles.length === 1) {
        downloadSingleFile(0);
        return;
    }
    
    // Create ZIP file
    const zip = new JSZip();
    
    processedFiles.forEach(file => {
        zip.file(file.name, file);
    });
    
    showProgress(true);
    
    try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'processed-files.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Files downloaded successfully!');
    } catch (error) {
        console.error('Download error:', error);
        showToast('Error downloading files. Please try again.', 'error');
    } finally {
        showProgress(false);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'o':
                e.preventDefault();
                if (currentTool) {
                    const fileInput = document.getElementById('file-input');
                    if (fileInput) fileInput.click();
                }
                break;
            case 'p':
                e.preventDefault();
                if (currentTool) {
                    const processBtn = document.getElementById('process-btn');
                    if (processBtn && !processBtn.disabled) processBtn.click();
                }
                break;
            case 's':
                e.preventDefault();
                if (currentTool && processedFiles.length > 0) {
                    downloadAllFiles();
                }
                break;
        }
    }
    
    if (e.key === 'Escape' && currentTool) {
        closeTool();
    }
    
    // Arrow keys navigation removed
});

// Close modal on background click
document.getElementById('tool-modal').addEventListener('click', (e) => {
    if (e.target.id === 'tool-modal') {
        closeTool();
    }
});

// Initialize PDF.js worker
// This needs pdfjsLib to be defined. It will be, because this script runs after the library is loaded.
if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

// PWA Service Worker (basic implementation)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        const swCode = `
            const CACHE_NAME = 'imagepdf-toolkit-v1';
            const urlsToCache = ['/'];
            
            self.addEventListener('install', (event) => {
                event.waitUntil(
                    caches.open(CACHE_NAME)
                        .then((cache) => cache.addAll(urlsToCache))
                );
            });
            
            self.addEventListener('fetch', (event) => {
                event.respondWith(
                    caches.match(event.request)
                        .then((response) => response || fetch(event.request))
                );
            });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        navigator.serviceWorker.register(swUrl)
            .then(() => console.log('Service Worker registered'))
            .catch(() => console.log('Service Worker registration failed'));
    });
}