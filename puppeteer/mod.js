const puppeteer = require("puppeteer");
const bluebird = require("bluebird");
const fs = require("fs").promises;

async function scrollAndScreenshot(page, url, outputPath) {
  try {
    // Navigate to the URL
    await page.setViewport({ width: 1920, height: 1080 });

    // Set custom user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Viewer/99.9.8782.87"
    );

    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Function to scroll to the bottom of the page
    async function scrollToBottom() {
      await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if (totalHeight >= scrollHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 1000);
        });
      });
    }

    // Scroll to the bottom
    await scrollToBottom();

    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });

    // Wait for any additional content loading after scroll
    await setTimeout(() => {}, 2000);

    // Take screenshot of the entire page
    await page.screenshot({ path: outputPath, fullPage: true });

    console.log(`Screenshot saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error occurred while processing ${url}: ${error}`);
  }
}

const withBrowser = async (fn) => {
  const browser = await puppeteer.launch({
    headless: false,
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
};

const withPage = (browser) => async (fn) => {
  const page = await browser.newPage();
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
};

// Function to fetch child links from a URL
async function getChildLinks(url) {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded" });

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    const hostname = window.location.hostname;
    const uniqueLinks = new Set();
    anchors.forEach((anchor) => {
      const href = anchor.href;
      if (new URL(href).hostname === hostname) {
        uniqueLinks.add(href);
      }
    });
    return Array.from(uniqueLinks);
  });
  await browser.close();
  return links;
}

(async () => {
  const url = "https://hpsingh.info/";
  const links = await getChildLinks(url);

  const results = await withBrowser(async (browser) => {
    return bluebird.map(
      links,
      async (link) => {
        return withPage(browser)(async (page) => {
          const outputPath = `screenshots/${new Date().getTime()}_${Math.random()
            .toString(36)
            .substring(2, 15)}.png`;
          await scrollAndScreenshot(page, link, outputPath);
          return outputPath;
        });
      },
      { concurrency: 5 }
    );
  });

  console.log(results);
})();
