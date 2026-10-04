// Smart Scout Content Script - Runs on LinkedIn and Naukri
(function() {
  'use strict';

  const isLinkedIn = window.location.hostname.includes('linkedin.com');
  const isNaukri = window.location.hostname.includes('naukri.com');

  // Utility to extract clean text
  const cleanText = (str) => (str || '').replace(/\s+/g, ' ').trim();

  // 1. Profile Extraction for LinkedIn
  function extractLinkedInProfile() {
    const isProfilePage = window.location.pathname.startsWith('/in/');
    if (!isProfilePage) return null;

    const nameEl = document.querySelector('h1.text-heading-xl, h1.inline.t-24, h1.top-card-layout__title, h1');
    const headlineEl = document.querySelector('.text-body-medium.break-words, .top-card-layout__headline, .inline-show-more-text');
    const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words, .top-card-layout__first-subline');
    const aboutEl = document.querySelector('#about ~ .display-flex .inline-show-more-text, section[data-section="summary"] p');

    const name = cleanText(nameEl ? nameEl.innerText : '');
    const headline = cleanText(headlineEl ? headlineEl.innerText : '');
    const location = cleanText(locationEl ? locationEl.innerText : '');
    const about = cleanText(aboutEl ? aboutEl.innerText : '');

    if (!name || name.length < 2) return null;

    // Collect visible experience items
    const expItems = [];
    document.querySelectorAll('#experience ~ .pvs-list__outer-container li .display-flex.flex-column').forEach((el, i) => {
      if (i < 3) {
        const text = cleanText(el.innerText);
        if (text && text.length > 10) expItems.push(text);
      }
    });

    return {
      name,
      headline: headline || 'Professional on LinkedIn',
      location: location || 'India',
      profileUrl: window.location.href.split('?')[0],
      source: 'linkedin.com',
      summary: about ? about.slice(0, 300) : `${name} - ${headline} located in ${location}.`,
      evidence: expItems.length ? expItems : [`Captured directly from verified profile at ${window.location.href.split('?')[0]}`]
    };
  }

  // 2. Search Results Extraction for LinkedIn
  function extractLinkedInSearchResults() {
    const isSearchPage = window.location.pathname.includes('/search/results/people');
    if (!isSearchPage) return [];

    const candidates = [];
    const cards = document.querySelectorAll('.reusable-search__result-container, li.reusable-search__result-container, .search-results-container li');

    cards.forEach((card) => {
      const link = card.querySelector('a[href*="/in/"]');
      if (!link) return;

      const profileUrl = link.href.split('?')[0];
      let name = cleanText(link.innerText || '');
      name = name.replace(/^View\s+|\s+'s\s+profile.*$/gi, '').replace(/LinkedIn Member/gi, '').trim();

      const headlineEl = card.querySelector('.entity-result__primary-subtitle, .subline-level-1');
      const locationEl = card.querySelector('.entity-result__secondary-subtitle, .subline-level-2');
      const snippetEl = card.querySelector('.entity-result__summary, .search-result__snippet');

      const headline = cleanText(headlineEl ? headlineEl.innerText : '');
      const location = cleanText(locationEl ? locationEl.innerText : '');
      const snippet = cleanText(snippetEl ? snippetEl.innerText : '');

      if (name && name.length >= 2 && profileUrl) {
        candidates.push({
          name,
          headline: headline || 'Professional on LinkedIn',
          location: location || 'India',
          profileUrl,
          source: 'linkedin.com',
          summary: snippet || `${name} (${headline}) - ${location}`,
          evidence: [
            snippet ? `Search snippet: ${snippet}` : `Captured from LinkedIn Search: ${headline}`,
            `Verified Profile: ${profileUrl}`
          ]
        });
      }
    });

    return candidates;
  }

  // 3. Profile & Search Extraction for Naukri
  function extractNaukriProfile() {
    const isProfilePage = window.location.pathname.includes('/profile') || window.location.pathname.includes('/candidate');
    if (!isProfilePage) return null;

    const nameEl = document.querySelector('.cand-name, .userName, h1');
    const headlineEl = document.querySelector('.cand-desig, .designation, .role');
    const expEl = document.querySelector('.cand-exp, .experience');
    const locEl = document.querySelector('.cand-loc, .location');
    const skillsEl = document.querySelector('.key-skills, .skills, .skill-tags');

    const name = cleanText(nameEl ? nameEl.innerText : '');
    if (!name || name.length < 2) return null;

    const headline = cleanText(headlineEl ? headlineEl.innerText : 'Candidate on Naukri');
    const location = cleanText(locEl ? locEl.innerText : 'India');
    const exp = cleanText(expEl ? expEl.innerText : '');
    const skills = cleanText(skillsEl ? skillsEl.innerText : '');

    return {
      name,
      headline: `${headline}${exp ? ` (${exp})` : ''}`,
      location: location || 'India',
      profileUrl: window.location.href.split('?')[0],
      source: 'naukri.com',
      summary: `Naukri Candidate: ${name} - ${headline}. Experience: ${exp}. Location: ${location}.`,
      evidence: [
        skills ? `Key Skills: ${skills}` : `Verified background on Naukri`,
        `Profile URL: ${window.location.href.split('?')[0]}`
      ]
    };
  }

  function extractNaukriSearchResults() {
    const isSearchPage = window.location.pathname.includes('/search') || window.location.pathname.includes('/resdex');
    if (!isSearchPage) return [];

    const candidates = [];
    const tuples = document.querySelectorAll('.tuple, .cust-job-tuple, article.jobTuple, .srp-jobtuple-wrapper');

    tuples.forEach((t) => {
      const link = t.querySelector('a.title, a.cand-name, a[href*="profile"], a[href*="candidate"]');
      if (!link) return;

      const profileUrl = link.href.split('?')[0];
      const name = cleanText(link.innerText || '');
      const roleEl = t.querySelector('.job-desc, .designation, .cand-desig, .subTitle');
      const locEl = t.querySelector('.loc, .location, .cand-loc');
      const expEl = t.querySelector('.exp, .experience, .cand-exp');
      const skillsEl = t.querySelector('.tags, .key-skills');

      const role = cleanText(roleEl ? roleEl.innerText : '');
      const location = cleanText(locEl ? locEl.innerText : '');
      const exp = cleanText(expEl ? expEl.innerText : '');
      const skills = cleanText(skillsEl ? skillsEl.innerText : '');

      if (name && name.length >= 2) {
        candidates.push({
          name,
          headline: `${role || 'Candidate'}${exp ? ` · ${exp}` : ''}`,
          location: location || 'India',
          profileUrl,
          source: 'naukri.com',
          summary: `${name} - ${role} (${exp}) in ${location}.`,
          evidence: [
            skills ? `Key Skills: ${skills}` : `Captured from Naukri search`,
            `Source URL: ${profileUrl}`
          ]
        });
      }
    });

    return candidates;
  }

  // 4. Injected Smart Scout Floating Widget
  function injectWidget() {
    if (document.getElementById('smartscout-widget-root')) return;

    const root = document.createElement('div');
    root.id = 'smartscout-widget-root';
    root.innerHTML = `
      <div id="smartscout-dock" class="smartscout-pill">
        <div class="smartscout-header">
          <div class="smartscout-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span>Smart Scout</span>
          </div>
          <button id="smartscout-minimize" title="Minimize">−</button>
        </div>
        <div id="smartscout-body" class="smartscout-body">
          <div id="smartscout-status" class="smartscout-status">Detecting candidate...</div>
          <div id="smartscout-actions" class="smartscout-actions">
            <button id="smartscout-capture-btn" class="smartscout-btn primary">1-Click Add to Pipeline</button>
            <button id="smartscout-batch-btn" class="smartscout-btn secondary" style="display:none;">Batch Capture Page</button>
          </div>
          <div class="smartscout-footer">
            <a href="https://smartscout.online/hire" target="_blank" class="smartscout-link">Open Smart Scout Dashboard →</a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    const dock = document.getElementById('smartscout-dock');
    const minimizeBtn = document.getElementById('smartscout-minimize');
    const statusEl = document.getElementById('smartscout-status');
    const captureBtn = document.getElementById('smartscout-capture-btn');
    const batchBtn = document.getElementById('smartscout-batch-btn');

    let isMinimized = false;
    minimizeBtn.addEventListener('click', () => {
      isMinimized = !isMinimized;
      document.getElementById('smartscout-body').style.display = isMinimized ? 'none' : 'block';
      minimizeBtn.innerText = isMinimized ? '+' : '−';
    });

    // Check what is on the page
    function updateState() {
      const profile = isLinkedIn ? extractLinkedInProfile() : extractNaukriProfile();
      const searchResults = isLinkedIn ? extractLinkedInSearchResults() : extractNaukriSearchResults();

      if (profile) {
        statusEl.innerHTML = `<b>${profile.name}</b><br><small>${profile.headline.slice(0, 45)}...</small>`;
        captureBtn.style.display = 'block';
        captureBtn.innerText = '1-Click Add to Pipeline';
        batchBtn.style.display = 'none';

        captureBtn.onclick = () => {
          sendToSmartScout([profile], captureBtn);
        };
      } else if (searchResults && searchResults.length > 0) {
        statusEl.innerHTML = `Found <b>${searchResults.length} candidates</b> on this page.`;
        captureBtn.style.display = 'none';
        batchBtn.style.display = 'block';
        batchBtn.innerText = `Batch Capture ${searchResults.length} Candidates`;

        batchBtn.onclick = () => {
          sendToSmartScout(searchResults, batchBtn);
        };
      } else {
        statusEl.innerText = isLinkedIn ? 'Browse to a LinkedIn profile or search results.' : 'Browse to a Naukri profile or search results.';
        captureBtn.style.display = 'none';
        batchBtn.style.display = 'none';
      }
    }

    // Send payload to background script
    function sendToSmartScout(candidates, btn) {
      btn.disabled = true;
      const originalText = btn.innerText;
      btn.innerText = 'Importing to Smart Scout...';

      chrome.runtime.sendMessage({
        action: 'IMPORT_CANDIDATES',
        candidates
      }, (response) => {
        btn.disabled = false;
        if (response && response.success) {
          btn.innerText = `✓ Imported ${response.count} Candidates!`;
          statusEl.innerHTML = `<span style="color:#059669;font-weight:bold;">Successfully added to Smart Scout pipeline.</span>`;
          setTimeout(() => {
            btn.innerText = originalText;
            updateState();
          }, 3500);
        } else {
          btn.innerText = 'Retry Import';
          const msg = (response && response.error) ? response.error : 'Connection error. Check settings.';
          statusEl.innerHTML = `<span style="color:#dc2626;">${msg}</span>`;
        }
      });
    }

    // Refresh state periodically and on URL changes
    updateState();
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        updateState();
      }
    }).observe(document, { subtree: true, childList: true });

    setInterval(updateState, 3000);
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWidget);
  } else {
    injectWidget();
  }
})();
