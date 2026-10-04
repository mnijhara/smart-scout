// Smart Scout Web Bridge Script
// Injected into smartscout.online and localhost
(function() {
  // Signal to the Smart Scout web app that the extension is installed
  function notifyApp() {
    window.postMessage({
      type: 'SMARTSCOUT_EXTENSION_READY',
      installed: true,
      version: '1.0.0'
    }, '*');

    // Also mark on DOM for instant synchronous check
    document.documentElement.setAttribute('data-smartscout-extension', 'true');
  }

  notifyApp();
  window.addEventListener('load', notifyApp);

  // Listen for requests from the web app
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SMARTSCOUT_PING_EXTENSION') {
      window.postMessage({
        type: 'SMARTSCOUT_EXTENSION_PONG',
        installed: true,
        version: '1.0.0'
      }, '*');
    }

    if (event.data && event.data.type === 'SMARTSCOUT_SET_ACTIVE_JOB') {
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ activeJobId: event.data.jobId, apiUrl: window.location.origin });
      }
    }
  });
})();
