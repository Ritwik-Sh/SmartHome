async function executeCommand(device, action) {
  try {
    const espDevice = device;
    
    // Prepare the command payload
    const payload = {
      user: 'ritwik',
      device: 'esp32', // Always send to esp32 device
      command: `${espDevice}_${action.toUpperCase()}`
    };

    console.log('Sending command:', payload);

    const res = await fetch('/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new TypeError("Received non-JSON response from server");
    }

    const data = await res.json();
    console.log('Command sent successfully:', data);
    return data;
  } catch (err) {
    console.error('Failed to send command:', err.message);
    throw err;
  }
}

function processAIResponse(response) {
  // Regular expression to match command patterns
  const commandRegex = /{Command:\s*{Device:([^,]+),\s*Action:([^}]+)}}/g;
  let match;

  // Find all commands in the response
  while ((match = commandRegex.exec(response)) !== null) {
    const device = match[1].trim();
    const action = match[2].trim();
    
    // Execute each command found
    executeCommand(device, action);
  }
}

const indicator = document.querySelector('#esp-status-indicator');
setInterval(async () => {
  try {
    const res = await fetch('/status');
    const data = await res.json();
    console.log('ESP Status:', data);
    
    if (data.online) {
      indicator.classList.remove('text-red-600');
      indicator.classList.add('text-emerald-500');
    } else {
      indicator.classList.remove('text-emerald-500');
      indicator.classList.add('text-red-600');
    }
  } catch (err) {
    console.error('Error checking ESP status:', err);
  }
}, 3000);

// Make processAIResponse available globally
window.processAIResponse = processAIResponse;
