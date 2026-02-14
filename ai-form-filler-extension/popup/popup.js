document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    // Login screen elements removed
    const profileScreen = document.getElementById('profile-screen');

    // Profile Elements
    const saveBtn = document.getElementById('saveBtn');
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const browseBtn = document.getElementById('browseBtn');

    // Configuration - Hardcoded as requested
    const BACKEND_URL = "http://localhost:8000";
    // We don't send API key from client anymore, backend handles it via .env
    // But if backend expects a header, we can send a dummy or fixed one if needed.
    // main.py was updated to allow optional header, so we can omit it or send a dummy.
    const API_KEY = "";

    // Initialize
    loadProfile();

    // File Upload Handlers
    browseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#454545';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '';
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    // Save Profile Handler
    saveBtn.addEventListener('click', async () => {
        const profile = gatherProfileData();

        try {
            const response = await fetch(`${BACKEND_URL}/api/profile`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                    // No Authorization header needed as per new req
                },
                body: JSON.stringify(profile)
            });

            if (response.ok) {
                const btnOriginalText = saveBtn.innerHTML;
                saveBtn.innerHTML = 'saved!';
                setTimeout(() => saveBtn.innerHTML = btnOriginalText, 2000);
            } else {
                alert('Failed to save profile');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Error saving profile (check if backend is running)');
        }
    });

    async function handleFileUpload(file) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadText = document.querySelector('.upload-text');
        const originalText = uploadText.textContent;
        uploadText.textContent = 'uploading...';

        try {
            const response = await fetch(`${BACKEND_URL}/api/upload`, {
                method: 'POST',
                // No Auth header
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                uploadText.textContent = 'upload_complete';
                // Trigger auto-fill of profile form if relevant data found
                if (result.extracted_data) {
                    // Note: upload endpoint currently doesn't return extracted structure, 
                    // just confirms text extraction. 
                    // If we wanted to parse it immediately to fill the profile UI, 
                    // we'd need a different endpoint or update the upload one.
                    // For now, we just acknowledge the upload.
                }
                setTimeout(() => uploadText.textContent = originalText, 3000);
            } else {
                uploadText.textContent = 'upload_failed';
                setTimeout(() => uploadText.textContent = originalText, 3000);
            }
        } catch (error) {
            console.error('Upload error:', error);
            uploadText.textContent = 'error';
            setTimeout(() => uploadText.textContent = originalText, 3000);
        }
    }

    function gatherProfileData() {
        return {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            company: document.getElementById('company').value,
            jobTitle: document.getElementById('jobTitle').value,
            address: {
                street: document.getElementById('street').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zip: document.getElementById('zip').value
            }
        };
    }

    function fillProfileForm(data) {
        if (data.firstName) document.getElementById('firstName').value = data.firstName;
        if (data.lastName) document.getElementById('lastName').value = data.lastName;
        if (data.email) document.getElementById('email').value = data.email;
        if (data.phone) document.getElementById('phone').value = data.phone;
        if (data.company) document.getElementById('company').value = data.company;
        if (data.jobTitle) document.getElementById('jobTitle').value = data.jobTitle;
        if (data.address) {
            if (data.address.street) document.getElementById('street').value = data.address.street;
            if (data.address.city) document.getElementById('city').value = data.address.city;
            if (data.address.state) document.getElementById('state').value = data.address.state;
            if (data.address.zip) document.getElementById('zip').value = data.address.zip;
        }
    }

    async function loadProfile() {
        try {
            // Hardcoded ID '1' for single user demo
            const response = await fetch(`${BACKEND_URL}/api/profile/1`);
            if (response.ok) {
                const data = await response.json();
                fillProfileForm(data);
            }
        } catch (e) {
            console.log('No existing profile found or backend offline');
        }
    }
});
