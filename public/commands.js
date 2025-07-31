async function executeCommand(device, action) {
  try {
    const res = await fetch('https://localhost:3000/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'ritwik', device, command: `${device.toUpperCase()}_${action.toUpperCase()}` })
    });
    const data = await res.json();
    console.log('Command sent:', data);
  } catch (err) {
    console.error('Failed to send command:', err);
  }
}
