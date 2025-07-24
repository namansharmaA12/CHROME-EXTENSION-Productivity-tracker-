// Background Script: Tracks time per domain with daily logs
function getTodayKey() {
  const today = new Date();
  return today.toISOString().split("T")[0]; // YYYY-MM-DD
}

let timeData = {}; // { "YYYY-MM-DD": { domain: seconds } }

// Load existing data
chrome.storage.local.get(["dailyTimeData"], (result) => {
  if (result.dailyTimeData) timeData = result.dailyTimeData;
});

// Listen for time updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "TRACK_TIME") {
    const todayKey = getTodayKey();
    if (!timeData[todayKey]) timeData[todayKey] = {};

    const { domain, seconds } = message;
    timeData[todayKey][domain] =
      (timeData[todayKey][domain] || 0) + seconds;

    chrome.storage.local.set({ dailyTimeData: timeData });
  }
});

// Open options if no API key
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (!result.geminiApiKey) {
      chrome.tabs.create({ url: "options.html" });
    }
  });
});
