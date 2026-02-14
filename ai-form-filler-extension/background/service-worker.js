// AI Form Filler Background Service Worker

const BACKEND_URL = "http://localhost:8000";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autofill') {
        handleAutofill(request.data).then(sendResponse).catch(err => {
            console.error(err);
            sendResponse({ error: err.message });
        });
        return true; // Keep message channel open for async response
    }
});

async function handleAutofill(formData) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/autofill`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
                // No Authorization header needed as per new req
            },
            body: JSON.stringify({
                form_data: formData,
                profile_id: 1 // Default or selected profile
            })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        return { filledData: data.filled_data };

    } catch (error) {
        throw error;
    }
}
