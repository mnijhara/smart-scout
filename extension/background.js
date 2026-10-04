// Smart Scout Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('Smart Scout Talent Sourcing Extension installed.');
  chrome.storage.local.get(['apiUrl'], (res) => {
    if (!res.apiUrl) {
      chrome.storage.local.set({ apiUrl: 'https://smartscout.online' });
    }
  });
});

// Relay candidate capture to Smart Scout API
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'IMPORT_CANDIDATES') {
    chrome.storage.local.get(['apiUrl', 'activeJobId'], async (settings) => {
      const baseUrl = (settings.apiUrl || 'https://smartscout.online').replace(/\/$/, '');
      const targetUrl = `${baseUrl}/api/recruiting/extension/import`;
      
      try {
        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobId: request.jobId || settings.activeJobId || '',
            candidates: request.candidates || []
          })
        });

        const data = await response.json();
        if (response.ok) {
          sendResponse({ success: true, count: data.imported || request.candidates.length, data });
        } else {
          sendResponse({ success: false, error: data.error || 'Failed to import candidates.' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message || 'Network error reaching Smart Scout.' });
      }
    });

    return true; // Keep channel open for async response
  }

  if (request.action === 'GET_STATUS') {
    chrome.storage.local.get(['apiUrl', 'activeJobId', 'lastImportCount'], (res) => {
      sendResponse(res);
    });
    return true;
  }
});
