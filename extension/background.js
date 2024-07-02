chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log("listener");
  if (request.message === "saveData") {
    console.log("hello from bg");
    sendResponse({ message: "success" });

    fetch("http://localhost:8000/post", {
      method: "POST",
      body: JSON.stringify({ data: request.data }),
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Response from httpbin.org:", data);
      })
      .catch((error) => {
        console.error("Error sending POST request:", error);
      });
  }
});
