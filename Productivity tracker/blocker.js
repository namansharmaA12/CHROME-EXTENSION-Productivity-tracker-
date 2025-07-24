// blocker.js
(function () {
  // Get the current domain
  const currentDomain = window.location.hostname;

  // Fetch blocklist from storage
  chrome.storage.local.get(["blockedSites"], (result) => {
    const blockedSites = result.blockedSites || [];

    // Check if current site is in blocklist
    if (blockedSites.some(site => currentDomain.includes(site))) {
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;justify-content:center;
          align-items:center;height:100vh;text-align:center;background:#fff;">
          <h1 style="font-size:32px;color:#d9534f;">🚫 This site is blocked!</h1>
          <p style="font-size:18px;color:#333;">Stay focused and productive.</p>
        </div>
      `;
      document.body.style.background = "#fff";
    }
  });
})();
