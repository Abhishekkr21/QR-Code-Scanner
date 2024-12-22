import config from './config.js';

const API_URL = config.API_URL;
let currentUser = null;
let authToken = localStorage.getItem('authToken');

const wrapper = document.querySelector('.wrapper')
const form = document.querySelector('#form1')
const fileInput = document.querySelector('#file')
const infoText = document.getElementById('ptext')
const textArea = document.getElementById('textArea')
const copyBtn = document.querySelector('.copy')
const closeBtn = document.querySelector('.close')
const toasts = document.getElementById('toasts')
const generateBtn = document.querySelector('.generate')
const scanBtn = document.querySelector('.scan')
const qrInput = document.querySelector('.qr-input')
const qrImg = document.querySelector('form img')

function createNotification(messagetext, type = 'success') {
    const notif = document.createElement('div')
    notif.classList.add('toast')
    notif.classList.add(type)
    notif.innerText = messagetext
    toasts.appendChild(notif)

    setTimeout(()=>{
        notif.remove()
    },2500)
}

function validateFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg']
    if (!validTypes.includes(file.type)) {
        infoText.innerText = "Please upload a valid image file (JPEG, PNG, or GIF)"
        return false
    }
    
    if (file.size > 2 * 1024 * 1024) {
        infoText.innerText = "File size should be less than 2MB"
        return false
    }
    
    return true
}

async function fetchRequest(formData, file) {
    infoText.innerText = "Scanning QR Code..."
    wrapper.classList.add("loading")
    
    if (file.size > 2 * 1024 * 1024) {
        infoText.innerText = "File size should be less than 2MB"
        wrapper.classList.remove("loading")
        return
    }

    fetch("https://api.qrserver.com/v1/read-qr-code/", {
        method: "POST",
        body: formData
    }).then(res => {
        if (!res.ok) throw new Error('Network response was not ok')
        return res.json()
    }).then(result => {
        if (!result || !result[0] || !result[0].symbol || !result[0].symbol[0]) {
            throw new Error('Invalid QR code')
        }
        
        const data = result[0].symbol[0].data
        wrapper.classList.remove("loading")
        
        if (!data) {
            infoText.innerText = "No QR code found in image"
            return
        }

        infoText.innerText = "Upload QR Code to Scan"
        textArea.innerText = data
        qrImg.src = URL.createObjectURL(file)
        wrapper.classList.add("active")
    }).catch((error) => {
        console.error('Error:', error)
        wrapper.classList.remove("loading")
        infoText.innerText = "Couldn't Scan QR Code. Please try again."
    })
}

function generateQR(text) {
    if (!text) {
        infoText.innerText = "Please enter text or URL"
        return
    }
    
    wrapper.classList.add("loading")
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`
    
    const tempImage = new Image()
    tempImage.onload = function() {
        qrImg.src = qrCodeUrl
        wrapper.classList.add("active")
        wrapper.classList.remove("generate-active")
        wrapper.classList.remove("loading")
        textArea.innerText = text
        infoText.innerText = "QR Code Generated Successfully"
    }
    tempImage.onerror = function() {
        wrapper.classList.remove("loading")
        infoText.innerText = "Failed to generate QR code"
    }
    tempImage.src = qrCodeUrl
}

fileInput.addEventListener('change', e => {
    let file = e.target.files[0]
    if (!file || !validateFile(file)) return
    let formData = new FormData()
    formData.append("file", file)
    fetchRequest(formData, file)
})

form.addEventListener('dragover', (e) => {
    e.preventDefault()
    form.classList.add('dragover')
})

form.addEventListener('dragleave', () => {
    form.classList.remove('dragover')
})

form.addEventListener('drop', (e) => {
    e.preventDefault()
    form.classList.remove('dragover')
    let file = e.dataTransfer.files[0]
    if (!file || !validateFile(file)) return
    let formData = new FormData()
    formData.append("file", file)
    fetchRequest(formData, file)
})

copyBtn.addEventListener("click",()=>{
    let text = textArea.textContent
    navigator.clipboard.writeText(text)
    createNotification()
})

form.addEventListener('click',()=>{
    fileInput.click()
})

closeBtn.addEventListener("click",()=>{
    wrapper.classList.remove("active")
    setTimeout(()=>{
        window.location.reload()
    },550)
})

generateBtn.addEventListener('click', () => {
    wrapper.classList.add('generate-active')
    wrapper.classList.remove('active')
    qrInput.value = ''
    qrImg.src = ''
    textArea.innerText = ''
    infoText.innerText = "Enter text to generate QR code"
})

scanBtn.addEventListener('click', () => {
    wrapper.classList.remove('generate-active')
    wrapper.classList.remove('active')
    qrInput.value = ''
    qrImg.src = ''
    textArea.innerText = ''
    infoText.innerText = "Upload QR Code to Scan"
})

document.querySelector('.generate-btn').addEventListener('click', () => {
    const text = qrInput.value.trim()
    generateQR(text)
})

// Add touch event handling
if ('ontouchstart' in window) {
    document.body.style.cursor = 'pointer';
    
    // Prevent double-tap zoom on buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.click();
        });
    });

    // Better mobile drag and drop handling
    form.addEventListener('touchstart', (e) => {
        e.preventDefault();
    });

    form.addEventListener('touchmove', (e) => {
        e.preventDefault();
    });
}

// Add orientation change handling
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        window.scrollTo(0, 0);
    }, 200);
});

// Improve file input handling for iOS
fileInput.addEventListener('click', (e) => {
    e.stopPropagation();
});

// Fix for iOS scroll bounce
document.body.addEventListener('touchmove', (e) => {
    if (wrapper.contains(e.target)) {
        e.preventDefault();
    }
}, { passive: false });

// Authentication functions
async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showDashboard();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError(error.message);
    }
}

async function register(name, email, password) {
    try {
        const response = await fetch(`${API_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            showDashboard();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError(error.message);
    }
}

// QR Code history functions
async function saveQRCode(type, content, title = '') {
    if (!authToken) return;
    
    try {
        await fetch(`${API_URL}/api/qrcodes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ type, content, title })
        });
    } catch (error) {
        console.error('Error saving QR code:', error);
    }
}

async function loadQRHistory() {
    if (!authToken) return;
    
    try {
        const response = await fetch(`${API_URL}/api/qrcodes`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const qrCodes = await response.json();
        displayQRHistory(qrCodes);
    } catch (error) {
        console.error('Error loading QR history:', error);
    }
}

// Update your existing functions to save history
const originalGenerateQR = generateQR;
generateQR = async function(text) {
    await originalGenerateQR(text);
    if (authToken) {
        await saveQRCode('generate', text);
    }
}

const originalFetchRequest = fetchRequest;
fetchRequest = async function(formData, file) {
    await originalFetchRequest(formData, file);
    if (authToken && textArea.innerText) {
        await saveQRCode('scan', textArea.innerText);
    }
}

// UI functions
function showError(message) {
    console.error('Error:', message);
    createNotification(message, 'error');
}

function showLoginForm() {
    document.querySelector('.auth-container').classList.remove('hidden');
    document.querySelector('.login-form').classList.remove('hidden');
    document.querySelector('.register-form').classList.add('hidden');
    document.querySelector('.dashboard').classList.add('hidden');
    document.querySelector('.wrapper').classList.add('hidden');
}

function showRegisterForm() {
    document.querySelector('.auth-container').classList.remove('hidden');
    document.querySelector('.register-form').classList.remove('hidden');
    document.querySelector('.login-form').classList.add('hidden');
    document.querySelector('.dashboard').classList.add('hidden');
    document.querySelector('.wrapper').classList.add('hidden');
}

function showDashboard() {
    document.querySelector('.auth-container').classList.add('hidden');
    document.querySelector('.dashboard').classList.remove('hidden');
    document.querySelector('.wrapper').classList.remove('hidden');
    document.querySelector('.user-name').textContent = currentUser.name;
    loadQRHistory();
}

function displayQRHistory(qrCodes) {
    const historyList = document.querySelector('.history-list');
    historyList.innerHTML = '';

    qrCodes.forEach(qr => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const date = new Date(qr.createdAt).toLocaleDateString();
        const type = qr.type.charAt(0).toUpperCase() + qr.type.slice(1);
        
        item.innerHTML = `
            <h4>${qr.title || type}</h4>
            <p>${qr.content}</p>
            <small>${date}</small>
            ${qr.type === 'generate' ? 
                `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qr.content)}">` 
                : ''}
            <button class="share-btn" data-id="${qr._id}">Share</button>
        `;
        
        historyList.appendChild(item);
    });
}

// Add event listeners for auth forms
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    await login(email, password);
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.querySelector('input[type="text"]').value;
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;
    await register(name, email, password);
});

// Add event listeners for switching between forms
document.querySelector('.switch-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    showRegisterForm();
});

document.querySelector('.switch-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    showLoginForm();
});

// Add logout handler
document.querySelector('.logout-btn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    currentUser = null;
    authToken = null;
    showLoginForm();
});

// Add share functionality
document.querySelector('.history-list').addEventListener('click', async (e) => {
    if (e.target.classList.contains('share-btn')) {
        const qrId = e.target.dataset.id;
        const email = prompt('Enter email to share with:');
        if (email) {
            try {
                await fetch(`${API_URL}/api/qrcodes/${qrId}/share`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ email })
                });
                createNotification('QR Code shared successfully!');
            } catch (error) {
                showError('Failed to share QR Code');
            }
        }
    }
});

// Initialize the app
function initApp() {
    if (authToken) {
        showDashboard();
    } else {
        showLoginForm();
    }
}

// Call initApp when the page loads
document.addEventListener('DOMContentLoaded', initApp);
