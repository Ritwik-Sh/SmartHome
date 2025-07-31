// Input mode constants
const INPUT_MODE = {
    VOICE: 'voice',
    KEYBOARD: 'keyboard'
};

// DOM Elements
const inputToggleBtn = document.getElementById('inputToggle');
const inputToggleIcon = inputToggleBtn.querySelector('span');
const chatInput = document.getElementById('chatInput');

// Cookie management functions
function setCookie(name, value, days = 365) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}

function getCookie(name) {
    const cookies = document.cookie.split(';');
    const cookie = cookies.find(c => c.trim().startsWith(name + '='));
    return cookie ? cookie.split('=')[1] : null;
}

// Input mode management
function setInputMode(mode) {
    if (mode === INPUT_MODE.KEYBOARD) {
        // Show keyboard input, hide mic
        chatInput.classList.remove('hidden');
        micButton.classList.add('hidden');
        inputToggleIcon.classList.remove('fa-keyboard', 'fa-regular');
        inputToggleIcon.classList.add('fa-microphone', 'fas');
    } else {
        // Show mic, hide keyboard input
        chatInput.classList.add('hidden');
        micButton.classList.remove('hidden');
        inputToggleIcon.classList.add('fa-keyboard', 'fa-regular');
        inputToggleIcon.classList.remove('fa-microphone', 'fas');
    }
    setCookie('inputMode', mode);
}

// Toggle between input modes
function toggleInputMode() {
    const currentMode = getCookie('inputMode') || INPUT_MODE.VOICE;
    const newMode = currentMode === INPUT_MODE.VOICE ? INPUT_MODE.KEYBOARD : INPUT_MODE.VOICE;
    setInputMode(newMode);
}

// Initialize input mode
function initInputMode() {
    const savedMode = getCookie('inputMode') || INPUT_MODE.VOICE;
    setInputMode(savedMode);
}

// Event listeners
inputToggleBtn.addEventListener('click', toggleInputMode);

// Initialize on page load
document.addEventListener('DOMContentLoaded', initInputMode);
