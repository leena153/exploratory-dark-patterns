const puppeteer = require("puppeteer");
const fs = require("fs").promises;

async function scrollAndScreenshot(url, outputPath) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: false,
    });
    const page = await browser.newPage();

    // Set viewport size
    await page.setViewport({ width: 1920, height: 1080 });

    // Set custom user agent
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Viewer/99.9.8782.87"
    );

    //    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.goto(url, {});

    // Get the height of the rendered page
    const bodyHandle = await page.$("body");
    const { height } = await bodyHandle.boundingBox();
    await bodyHandle.dispose();

    // Scroll down the page by pressing PageDown
    const viewportHeight = page.viewport().height;
    let viewportIncr = 0;
    while (viewportIncr + viewportHeight < height) {
      await page.keyboard.press("PageDown");
      //     await page.waitForTimeout(1000); // Wait for 1 second
      await page.evaluate(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      viewportIncr = viewportIncr + viewportHeight;
    }

    // Scroll back to top
    await page.evaluate((_) => {
      window.scrollTo(0, 0);
    });

    // Wait an additional second after scrolling back to top
    //    await page.waitForTimeout(1000);
    await page.evaluate(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    // Take a screenshot of the entire page
    await page.screenshot({ path: outputPath, fullPage: true });

    console.log(`Full page screenshot saved as ${outputPath}`);
  } catch (error) {
    console.error("An error occurred during the screenshot process:", error);
    // Optionally, you can delete the partial screenshot file if it was created
    try {
      await fs.unlink(outputPath);
      console.log(`Partial screenshot file ${outputPath} was deleted.`);
    } catch (unlinkError) {
      // If the file doesn't exist or can't be deleted, just log it
      console.log(`No partial screenshot file to delete or deletion failed.`);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Usage
const url = "https://www.myntra.com";
// const url = 'https://www.amazon.in/safari-Broad-Fountain-Converter-Yellow/dp/B08RRWX6V1/ref=sr_1_1?dib=eyJ2IjoiMSJ9.4ItlhV8zoeZrbV-Up11HeD8A2C9MXaodjaSTRKFqBzwABk1mFLP3tFAQaEDBvJdTpqw_j-rXsnUhUrIuIOsUg7djEZT1lr6tKSvjVMKF3AlrKLfqH5AhB_FpAk9V8ciob15of3yWq0LvwgBI9IfsUA.2dXRiVALR2vONd1v0TpauFLvklB3TmLgcVewSgMJTDI&dib_tag=se&keywords=Lamy&qid=1719148893&refinements=p_n_feature_twelve_browse-bin%3A63823852031&rnid=63823844031&s=office&sr=1-1';
const outputPath = "full_webpage_screenshot.png";

scrollAndScreenshot(url, outputPath).catch((error) => {
  console.error("Error in main execution:", error);
});
