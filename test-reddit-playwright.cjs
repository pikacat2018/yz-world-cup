const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: false,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    proxy: {
      server: "http://127.0.0.1:7897",
    },
  });

  const page = await browser.newPage();

  await page.goto("https://old.reddit.com/r/soccer/new/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  console.log("TITLE:", await page.title());
  console.log("URL:", page.url());

  await page.screenshot({ path: "reddit-debug.png", fullPage: true });

  const html = await page.content();

  console.log(html.slice(0, 3000));

  await browser.close();
})();