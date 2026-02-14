// AI Form Filler Content Script

const SPARKLES_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>`;

function init() {
    // Initial scan
    scanAndInject();

    // Observe for dynamic content
    const observer = new MutationObserver((mutations) => {
        let shouldScan = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) {
                shouldScan = true;
            }
        });
        if (shouldScan) {
            scanAndInject();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function scanAndInject() {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        // Skip invalid types
        if (['hidden', 'submit', 'button', 'image', 'file', 'checkbox', 'radio'].includes(input.type)) return;
        if (input.dataset.aiAttached === 'true') return; // Already attached
        if (input.style.display === 'none' || input.offsetParent === null) return; // Hidden

        attachTrigger(input);
    });
}

function attachTrigger(input) {
    input.dataset.aiAttached = 'true';

    // Wrap input to position icon relatively (if possible without breaking layout)
    // Or just position absolute relative to parent if parent is relative.
    // Safest approach: Create a wrapper if not already wrapped, or just insert button after.
    // Inserting after and using negative margin or absolute positioning is common.

    // Let's try positioning the button absolute relative to the input's parent
    // We might need to ensure the parent is position: relative
    const parent = input.parentElement;
    const computedStyle = window.getComputedStyle(parent);
    if (computedStyle.position === 'static') {
        parent.style.position = 'relative';
    }

    const btn = document.createElement('div');
    btn.className = 'ai-trigger-btn';
    btn.innerHTML = SPARKLES_ICON;
    btn.title = "Auto-fill with AI";

    // Position inside the input, on the right
    // calculate position based on input size
    // For now, let's just append it and use CSS to position it over the input
    // We need to set top/right based on the input's position within the parent

    // Check if we can append to parent
    parent.appendChild(btn);

    // Position it
    // This is tricky for generic sites. 
    // A safer, more robust way: wrap the input in a div that we control.
    // But modifying DOM structure can break site CSS (e.g. flex/grid direct children).

    // Alternative: Position ANYWHERE using absolute coordinates matching the input
    // But then we have to handle scroll/resize.

    // Let's stick to parent-relative for now, assuming standard form layouts.
    // We'll align it to the right side of the input.
    const rect = input.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();

    // Use simple CSS styles applied to .ai-trigger-btn to float it right? No.
    // Let's try to just overlay it.

    btn.style.position = 'absolute';
    // Align to the right of the input, vertically centered
    // We can't rely on generic CSS classes, we must calculate.
    // Actually, simple "right: 10px; top: 50%; transform: translateY(-50%)" usually works if parent wraps input nicely.
    // If parent is huge (e.g. valid for whole row), we need to constrain to input.

    // Let's try to match input's offsetLeft + width
    // Re-eval strategy: Floating button is safer. But user said "every form element".
    // Floating button appearing on focus is cleaner. BUT user wants button *on* every element.
    // Let's try "Right edge of input".

    btn.style.right = '8px'; // Padding from right edge
    btn.style.top = `${input.offsetTop + (input.offsetHeight / 2) - 12}px`; // Center vertically relative to input top
    // Wait, input.offsetTop is relative to offsetParent. 
    // If we forced parent to be relative, then input.offsetTop is correct relative to parent.

    // Handle click
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const form = input.closest('form');
        if (form) {
            handleAutoFill(form, btn);
        } else {
            // Handle standalone input?
            alert("This input doesn't seem to belong to a form.");
        }
    });
}

// Re-use logic from previous version
async function handleAutoFill(form, btn) {
    // Show spinner
    btn.classList.add('processing');

    try {
        const formData = extractFormData(form);
        const response = await chrome.runtime.sendMessage({
            action: 'autofill',
            data: formData
        });

        if (response && response.filledData) {
            fillForm(form, response.filledData);
            // Flash success?
        }
    } catch (error) {
        console.error('Autofill error:', error);
    } finally {
        btn.classList.remove('processing');
    }
}

function extractFormData(form) {
    const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
    return inputs.map(input => {
        if (input.type === 'hidden' || input.type === 'submit' || input.style.display === 'none') return null;

        // Get label text
        let label = '';
        if (input.id) {
            const labelElem = document.querySelector(`label[for="${input.id}"]`);
            if (labelElem) label = labelElem.innerText;
        }
        if (!label) {
            // Try closest label wrap or previous element
            const parentLabel = input.closest('label');
            if (parentLabel) label = parentLabel.innerText;
        }

        return {
            id: input.id,
            name: input.name,
            type: input.type || input.tagName.toLowerCase(),
            label: label.trim(),
            placeholder: input.placeholder || '',
            value: input.value
        };
    }).filter(Boolean);
}

function fillForm(form, filledData) {
    if (!filledData) return;

    filledData.forEach(field => {
        // Find input by ID or Name
        let input = null;
        if (field.id) input = form.querySelector(`#${field.id}`);
        if (!input && field.name) input = form.querySelector(`[name="${field.name}"]`);

        if (input) {
            // Highlight change
            input.style.transition = 'background-color 0.5s';
            input.style.backgroundColor = 'rgba(109, 129, 150, 0.2)'; // Ink Wash accent

            input.value = field.value;
            // Trigger change events for frameworks like React/Angular
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            setTimeout(() => input.style.backgroundColor = '', 1500);
        }
    });
}

init();
