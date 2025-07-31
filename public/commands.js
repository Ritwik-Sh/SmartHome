async function executeCommand(device, action) {
  try {
    // Map device names to their ESP32 command format
    const commandMap = {
      'kitchenLight': 'KITCHEN_LIGHT',
      'livingRoomLight': 'LIVING_ROOM_LIGHT',
      'door': 'DOOR'
    };
    
    // Get the ESP32 format of the device name or use the original
    const espDevice = commandMap[device] || device.toUpperCase();
    
    // Prepare the command payload
    const payload = {
      user: 'ritwik',
      device: 'esp32', // Always send to esp32 device
      command: `${espDevice}_${action.toUpperCase()}`
    };

    console.log('Sending command:', payload);

    const res = await fetch('http://localhost:3000/command', {
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

// Make processAIResponse available globally
window.processAIResponse = processAIResponse;
