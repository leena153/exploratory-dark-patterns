var gfg = [];
var text = [];
var child_links = [];

function rmPriceTags(inputString) {
  var words = inputString.split(" ");
  var filteredWords = words.filter(function (word) {
    return word.indexOf("$") === -1;
  });

  var resultString = filteredWords.join(" ");
  return resultString;
}

function isNodeVisible(node) {
  if (!node) return false;
  if (
    node.style.display === "none" ||
    node.style.visibility === "hidden" ||
    node.style.opacity === "0" ||
    node.style.zIndex < 0
  ) {
    return false;
  }
  const rect = node.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }
  return true;
}

function recurse(i) {
  if (
    !(
      i.nodeType === 8 ||
      i.tagName === "SCRIPT" ||
      i.tagName === "STYLE" ||
      i.tagName === "NOSCRIPT"
    )
  ) {
    if (i.childElementCount == 0) {
      if (i.innerText != "" && i.innerText != null && isNodeVisible(i)) {
        var cleanedText = i.innerText.trim().replace("\n", "");
        cleanedText = rmPriceTags(cleanedText);
        if (cleanedText.length >= 6) {
          text.push(cleanedText);
        }
      }
    } else {
      for (j of i.childNodes) {
        if (j.tagName === "A" && j.href) {
          const url = new URL(j.href);
          if (url.hostname === window.location.hostname) {
            child_links.push(j.href);
          }
        }
        recurse(j);
      }
    }
  }
}

function recurse_childLinks(i) {
  if (
    !(
      i.nodeType === 8 ||
      i.tagName === "SCRIPT" ||
      i.tagName === "STYLE" ||
      i.tagName === "NOSCRIPT"
    )
  ) {
    if (i.childElementCount == 0) {
      if (i.innerText != "" && i.innerText != null && isNodeVisible(i)) {
        var cleanedText = i.innerText.trim().replace("\n", "");
        cleanedText = rmPriceTags(cleanedText);
        if (cleanedText.length >= 6) {
          gfg.push(i);
          text.push(cleanedText);
        }
      }
    } else {
      for (j of i.childNodes) {
        recurse_childLinks(j);
      }
    }
  }
}

console.log("content script");
console.log("child links", child_links);
recurse(document.body);

var data = JSON.stringify(text);

parent_url = window.location.href;
var temp = {parent_url: parent_url, child_link: "/", content: data};
data_dict = JSON.stringify(temp);

chrome.runtime.sendMessage({ message: "saveData", data: data_dict});

for (var k = 0; k < child_links.length; k++) {
  console.log("Scraping content from", child_links[k]);
  var childLink = child_links[k];
  fetch(childLink)
    // .then((response) => response.text())
    // .then((html) => {
    // console.log(html)
    // var parser = new DOMParser();
    // var doc = parser.parseFromString(html, "text/html");
    // var fetchedBody = doc.body;
    .then((response) => response.text())
    .then((html) => {
      var tempElement = document.createElement("div");
      tempElement.innerHTML = html;
      var scrapedContent = tempElement.innerText.trim().replace("\n", "");
      text.length = 0;
      recurse_childLinks(scrapedContent);
      console.log(text);
      var data = JSON.stringify(text);
      var temp = {
        parent_url: parent_url,
        child_link: childLink,
        content: data,
      };
      data_dict = JSON.stringify(temp);

      chrome.runtime.sendMessage({ message: "saveData", data: data_dict });
    })
    .catch((error) => {
      console.error("Error scraping content from", childLink, ":", error);
    });
}

// for (var k = 0; k < child_links.length; k++) {
//   console.log("Scraping content from", child_links[k]);
//   var childLink = child_links[k];
//   fetch(childLink)
//     .then((response) => response.text())
//     .then((html) => {
//       var tempElement = document.createElement("div");
//       tempElement.innerHTML = html;
//       var scrapedContent = tempElement.innerText.trim().replace("\n", "");
//       scrapedContent = rmPriceTags(scrapedContent);
//       console.log("Scraped content from", childLink, ":", scrapedContent);
//     })
//     .catch((error) => {
//       console.error("Error scraping content from", childLink, ":", error);
//     });
// }
