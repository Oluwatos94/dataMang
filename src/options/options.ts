// Options page script for credential management

// Check current credentials status
async function checkStatus() {
  try {
    const statusText = document.getElementById('statusText');
    // Send message to background to check if credentials exist
    chrome.runtime.sendMessage({ type: 'CHECK_CREDENTIALS' }, (response) => {
      if (response && response.hasCredentials) {
        statusText!.textContent = 'Credentials configured';
        (statusText as HTMLElement).style.color = '#155724';
      } else {
        statusText!.textContent = 'No credentials configured';
        (statusText as HTMLElement).style.color = '#856404';
      }
    });
  } catch (error) {
    const statusText = document.getElementById('statusText');
    if (statusText) {
      statusText.textContent = 'Error checking status';
    }
  }
}


document.getElementById('credentialsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;
  const privateKey = (document.getElementById('privateKey') as HTMLInputElement).value;
  const userId = (document.getElementById('userId') as HTMLInputElement).value;
  const appId = (document.getElementById('appId') as HTMLInputElement).value;
  const password = (document.getElementById('password') as HTMLInputElement).value;

  if (!apiKey || !password) {
    showStatus('API Key and Password are required', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // Send credentials to background script to store
    chrome.runtime.sendMessage({
      type: 'STORE_CREDENTIALS',
      credentials: {
        apiKey,
        privateKey: privateKey || undefined,
        userId: userId || undefined,
        appId: appId || 'pdm-extension'
      },
      password
    }, (response) => {
      if (response && response.success) {
        showStatus('Credentials saved successfully!', 'success');
        checkStatus();
        (document.getElementById('password') as HTMLInputElement).value = '';
      } else {
        showStatus('Failed to save credentials: ' + (response?.error || 'Unknown error'), 'error');
      }

      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Credentials';
    });
  } catch (error: any) {
    showStatus('Error: ' + error.message, 'error');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Credentials';
  }
});

function showStatus(message: string, type: string) {
  const statusEl = document.getElementById('statusMessage');
  if (!statusEl) return;

  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}

// Check status on load
checkStatus();
