// Smart Scout Popup Controller
document.addEventListener('DOMContentLoaded', () => {
  const apiUrlInput = document.getElementById('apiUrl');
  const jobIdInput = document.getElementById('jobId');
  const saveBtn = document.getElementById('saveBtn');
  const statusEl = document.getElementById('status');

  // Load saved settings
  chrome.storage.local.get(['apiUrl', 'activeJobId'], (data) => {
    apiUrlInput.value = data.apiUrl || 'https://smartscout.online';
    jobIdInput.value = data.activeJobId || '';
  });

  saveBtn.addEventListener('click', () => {
    const apiUrl = apiUrlInput.value.trim() || 'https://smartscout.online';
    const activeJobId = jobIdInput.value.trim();

    chrome.storage.local.set({ apiUrl, activeJobId }, () => {
      statusEl.style.display = 'block';
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 2500);
    });
  });
});
