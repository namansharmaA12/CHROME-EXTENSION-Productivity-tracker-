// Summarizer Logic (same as before)
document.getElementById("summarize").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';

  const summaryType = document.getElementById("summary-type").value;
  chrome.storage.sync.get(["geminiApiKey"], async (result) => {
    if (!result.geminiApiKey) {
      resultDiv.innerHTML =
        "API key not found. Please set your API key in the extension options.";
      return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { type: "GET_ARTICLE_TEXT" }, async (res) => {
        if (!res || !res.text) {
          resultDiv.innerText = "Could not extract article text from this page.";
          return;
        }
        try {
          const summary = await getGeminiSummary(
            res.text,
            summaryType,
            result.geminiApiKey
          );
          resultDiv.innerText = summary;
        } catch (error) {
          resultDiv.innerText = `Error: ${error.message || "Failed to generate summary."}`;
        }
      });
    });
  });
});

document.getElementById("copy-btn").addEventListener("click", () => {
  const summaryText = document.getElementById("result").innerText;
  if (summaryText && summaryText.trim() !== "") {
    navigator.clipboard
      .writeText(summaryText)
      .then(() => {
        const copyBtn = document.getElementById("copy-btn");
        const originalText = copyBtn.innerText;
        copyBtn.innerText = "Copied!";
        setTimeout(() => {
          copyBtn.innerText = originalText;
        }, 2000);
      })
      .catch((err) => console.error("Failed to copy text: ", err));
  }
});

// Gemini API Call
async function getGeminiSummary(text, summaryType, apiKey) {
  const maxLength = 20000;
  const truncatedText =
    text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  let prompt;
  switch (summaryType) {
    case "brief":
      prompt = `Provide a brief summary of the following article in 2-3 sentences:\n\n${truncatedText}`;
      break;
    case "detailed":
      prompt = `Provide a detailed summary of the following article, covering all main points and key details:\n\n${truncatedText}`;
      break;
    case "bullets":
      prompt = `Summarize the following article in 5-7 key points. Format each point as a line starting with "- ".\n\n${truncatedText}`;
      break;
    default:
      prompt = `Summarize the following article:\n\n${truncatedText}`;
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || "API request failed");
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary available.";
}

// Format time (minutes/seconds)
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// Load today's report
function loadDailyReport() {
  const todayKey = new Date().toISOString().split("T")[0];
  chrome.storage.local.get(["dailyTimeData"], (result) => {
    const trackerDiv = document.getElementById("time-tracker");
    const todayData = result.dailyTimeData?.[todayKey] || {};
    const domains = Object.entries(todayData);

    if (domains.length === 0) {
      trackerDiv.innerHTML = "<p>No activity tracked today.</p>";
      return;
    }

    let html = `<h4>Today's Activity (${todayKey})</h4><ul>`;
    domains.forEach(([domain, seconds]) => {
      html += `<li><strong>${domain}</strong>: ${formatTime(seconds)}</li>`;
    });
    html += "</ul>";
    trackerDiv.innerHTML = html;
  });
}
document.addEventListener("DOMContentLoaded", loadDailyReport);

function loadBlocklist() {
  chrome.storage.local.get(["blockedSites"], (result) => {
    const list = result.blockedSites || [];
    const blockListEl = document.getElementById("block-list");
    blockListEl.innerHTML = "";
    list.forEach((site, index) => {
      blockListEl.innerHTML += `<li>${site} <button data-index="${index}" class="remove-block">Remove</button></li>`;
    });
  });
}

document.getElementById("add-block").addEventListener("click", () => {
  const input = document.getElementById("block-input").value.trim();
  if (input) {
    chrome.storage.local.get(["blockedSites"], (result) => {
      const list = result.blockedSites || [];
      if (!list.includes(input)) {
        list.push(input);
        chrome.storage.local.set({ blockedSites: list }, loadBlocklist);
      }
    });
  }
});

document.getElementById("block-list").addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-block")) {
    const index = e.target.dataset.index;
    chrome.storage.local.get(["blockedSites"], (result) => {
      const list = result.blockedSites || [];
      list.splice(index, 1);
      chrome.storage.local.set({ blockedSites: list }, loadBlocklist);
    });
  }
});

document.addEventListener("DOMContentLoaded", loadBlocklist);

