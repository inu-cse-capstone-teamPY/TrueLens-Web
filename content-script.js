// content-script.js

let debounceTimer = null;

document.addEventListener('selectionchange', () => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        const selectedText = window.getSelection().toString().trim();

        if (selectedText) {
            chrome.runtime.sendMessage({
                type: 'SELECTION_CHANGED',
                payload: { text: selectedText }
            });
        }
    }, 300);
});
