var temp = '';

// DOM elements
const mainText = document.getElementById('mainText');
const textInput = document.getElementById('chatInput');

// Chat history
let chatHistory = [];

// Create chat history container
const chatContainer = document.querySelector('#chatContainer');

// Speech recognition setup
let recognition = null;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
const hasNativeSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// Initialize MediaRecorder for fallback STT
async function initMediaRecorder() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
            await transcribeAudio(audioBlob);
            audioChunks = [];
        };

        return true;
    } catch (error) {
        console.error('MediaRecorder initialization failed:', error);
        return false;
    }
}

// Transcribe audio using AssemblyAI
async function transcribeAudio(audioBlob) {
    try {
        mainText.textContent = 'Transcribing...';

        const formData = new FormData();
        formData.append('audio', audioBlob);

        const response = await fetch('/transcribe', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        textInput.value = data.text;
        processMessage(data.text, true); // true indicates voice input
    } catch (error) {
        console.error('Transcription failed:', error);
        mainText.textContent = 'Transcription failed. Please try again or type your message.';
    }
}

// Initialize speech if available
if (hasNativeSpeech) {
    try {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isRecording = true;
            updateMicButtonState();
            mainText.textContent = 'Listening...';
        };

        recognition.onend = () => {
            isRecording = false;
            updateMicButtonState();
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            textInput.value = transcript;
            processMessage(transcript, true); // true indicates voice input
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            mainText.textContent = 'Error: ' + event.error;
            isRecording = false;
            updateMicButtonState();
            if (event.error === 'not-allowed') {
                // Request microphone permission
                mainText.textContent = 'Please allow microphone access to use voice commands.';
                // Open browser's permission dialog
                navigator.mediaDevices.getUserMedia({ audio: true })
                    .then(() => {
                        mainText.textContent = 'Microphone access granted. You can now use voice commands.';
                        // Re-initialize recognition after permission is granted
                        recognition.start();
                    })
                    .catch(() => {
                        mainText.textContent = 'Microphone access denied. Voice commands will not work.';
                    });
            }
        };
    } catch (e) {
        console.error('Speech recognition setup failed:', e);
    }
}

// Speech synthesis setup with fallback
function speakResponse(text) {
    if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

// Function to stop speech synthesis
function stopSpeaking() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

// Toggle recording state
async function toggleRecording() {
    if (!recognition && !mediaRecorder) {
        const initialized = await initMediaRecorder();
        if (!initialized) {
            mainText.textContent = 'Speech input is not available. Please type your message.';
            return;
        }
    }

    if (isRecording) {
        if (recognition) {
            recognition.stop();
        } else if (mediaRecorder) {
            mediaRecorder.stop();
            isRecording = false;
            updateMicButtonState();
        }
    } else {
        if (recognition) {
            recognition.start();
        } else if (mediaRecorder) {
            audioChunks = [];
            mediaRecorder.start();
            isRecording = true;
            updateMicButtonState();
            mainText.textContent = 'Listening (using fallback system)...';
        }
    }
}

// Update microphone button appearance
function updateMicButtonState() {
    const micButton = document.querySelector('#micButton');
    if (!micButton) return;
    
    const micIcon = micButton.querySelector('span');
    if (isRecording) {
        micIcon.style.color = '#ff0000';
        micButton.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    } else {
        micIcon.style.color = '';
        micButton.style.backgroundColor = '';
    }
}

var messageIndex = 0;

// Add message to chat history - FIXED VERSION
function addMessageToChat(message, isUser = true) {
    // Add AI response first if there's a pending one and this is a user message
    if (isUser && temp && messageIndex > 0) {
        const AIMessageDiv = document.createElement('div');
        const AIBubble = document.createElement('div');
        AIMessageDiv.className = 'mb-4 text-left';
        AIBubble.className = 'inline-block rounded-lg p-3 max-w-[70%] bg-blue-500 text-white';
        
        // Clean the response and format commands
        const cleanedResponse = temp.replace(/{Command:.*?}}/g, match => `<code class="bg-blue-700 px-1 rounded">${match}</code>`);
        AIBubble.innerHTML = cleanedResponse;
        
        AIBubble.style.transition = 'all 0.3s ease';
        AIMessageDiv.appendChild(AIBubble);
        chatContainer.appendChild(AIMessageDiv);
        
        // Clear temp after displaying
        temp = '';
    }

    // Add user message
    if (isUser) {
        messageIndex++;
        const userMessageDiv = document.createElement('div');
        const userBubble = document.createElement('div');
        userMessageDiv.className = 'mb-4 text-right';
        userBubble.className = 'inline-block rounded-lg p-3 max-w-[70%] bg-gray-200 text-black';
        userBubble.textContent = message;
        userBubble.style.transition = 'all 0.3s ease';
        
        userMessageDiv.appendChild(userBubble);
        chatContainer.appendChild(userMessageDiv);
    }
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Process message using Puter AI - FIXED VERSION
async function processMessage(message, isVoiceInput = false) {
    if (!message.trim()) return;

    try {
        // Add user message to chat
        addMessageToChat(message, true);
        chatHistory.push({ role: 'user', content: message });

        // Prepare context with chat history
        var prompt = `
            There are a list of commands that the user can mean for controlling a device, the list of the devices, with options for their states are as follows.

            [
                {
                    "device": "kitchenLight",
                    "options": ["on", "off"]
                },
                {
                    "device": "livingRoomLight",
                    "options": ["on", "off"]
                },
                {
                    "device": "bedroomLight",
                    "options": ["on", "off"]
                },
                {
                    "device": "washroomLight",
                    "options": ["on", "off"]
                }
            ]
            
            If the user means one of these options, your response should be as in the example given below (without double quotes).

            User: "Turn on the kitchen's Lights"
            AI: "{Command: {Device:kitchenLight, Action:on}}"

            User: "Turn off the living room lights"
            AI: "{Command: {Device:livingRoomLight, Action:off}}"

            User: "Turn off all the lights"
            AI: "{Command: {Device:kitchenLight, Action:off}}{Command: {Device:livingRoomLight, Action:off}}{Command: {Device:bedroomLight, Action:off}}{Command: {Device:washroomLight, Action:off}}"

            User: "Tell me 2+2, and if the answer is even, turn off the kitchen lights."
            AI: "Two + Two is Four. {Command: {Device:kitchenLight, Action:off}}"

            Keep the response short, concise, and relevant.
            You aren't just controlling these devices, you can talk with the user too, if he asks a suitable question or gives an appropriate prompt where he wants something like that.
            
        `;
        
        const contextPrompt = chatHistory.map(msg =>
            `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n') + '\nAssistant:';
        prompt += contextPrompt;
        
        mainText.textContent = 'Thinking...';
        
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        
        // Store AI response - FIXED: Store the actual response content
        temp = data.response;

        // FIXED: Add assistant response to chat history with correct content
        chatHistory.push({ role: 'assistant', content: data.response });

        // Keep chat history manageable
        if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
        }

        // Process any commands in the response
        if (window.processAIResponse) {
            window.processAIResponse(data.response);
        } else {
            console.error("processAIResponse is not defined");
        }
        
        // Handle voice output
        if (isVoiceInput) {
            // Remove commands from speech response
            const speechText = data.response.replace(/{Command:.*?}}/g, '').trim();
            if (speechText) {
                speakResponse(speechText);
            }
        }
        
        // Update main text display with formatted response
        const formattedResponse = data.response.replace(/{Command:.*?}}/g, match => 
            `<code class="bg-gray-200 px-2 py-1 rounded text-sm">${match}</code>`
        );
        mainText.innerHTML = formattedResponse;

    } catch (error) {
        console.error('Error:', error);
        mainText.textContent = 'Error communicating with AI';
        // Also add error to chat
        temp = 'Sorry, I encountered an error processing your request.';
    }
}

// Handle text input submission
textInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const message = textInput.value;
        processMessage(message, false); // false indicates keyboard input
        textInput.value = '';
    }
});

// Add microphone button with visual feedback
const micButton = document.querySelector('#micButton');

let pressTimer;
let isLongPress = false;

// Handle mouse/touch events for press-and-hold
micButton.addEventListener('mousedown', (e) => {
    stopSpeaking(); // Stop any ongoing speech
    pressTimer = setTimeout(() => {
        isLongPress = true;
        toggleRecording(); // Start recording
    }, 300); // Wait 300ms to determine if it's a long press
});

micButton.addEventListener('mouseup', (e) => {
    clearTimeout(pressTimer);
    if (isLongPress) {
        toggleRecording(); // Stop recording if it was a long press
        isLongPress = false;
    } else if (e.button === 0) { // Left click
        toggleRecording(); // Toggle recording for normal clicks
    }
});

micButton.addEventListener('mouseleave', () => {
    if (isLongPress) {
        toggleRecording(); // Stop recording if mouse leaves during long press
        isLongPress = false;
    }
    clearTimeout(pressTimer);
});

// Touch events for mobile
micButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    stopSpeaking(); // Stop any ongoing speech
    pressTimer = setTimeout(() => {
        isLongPress = true;
        toggleRecording(); // Start recording
    }, 300);
});

micButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    clearTimeout(pressTimer);
    if (isLongPress) {
        toggleRecording(); // Stop recording if it was a long press
        isLongPress = false;
    } else {
        toggleRecording(); // Toggle recording for taps
    }
});

micButton.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    if (isLongPress) {
        toggleRecording(); // Stop recording if touch is cancelled during long press
        isLongPress = false;
    }
    clearTimeout(pressTimer);
});

// Show appropriate button state based on speech support
if (!hasNativeSpeech && micButton) {
    micButton.classList.replace('text-blue-800', 'text-yellow-500');
}