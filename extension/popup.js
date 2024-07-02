document.addEventListener("DOMContentLoaded", function () {
  const toggleSwitch = document.getElementById("toggleSwitch");

  chrome.storage.sync.get("isEnabled", (data) => {
    toggleSwitch.checked = data.isEnabled;
  });

  toggleSwitch.addEventListener("change", function () {
    chrome.storage.sync.set({ isEnabled: this.checked });
  });
});
