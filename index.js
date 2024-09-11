const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3000; // You can change the port as needed

// Function to extract Facebook group URLs from a single page
async function extractUrlsFromPage(page) {
  const results = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(anchor => anchor.href);
  });
  return results.filter(url =>
    url.startsWith('https://www.facebook.com/groups') ||
    url.startsWith('https://facebook.com/groups')
  );
}

// Function to scrape Facebook group URLs across multiple pages
async function scrapeFacebookGroupUrls(query, numberOfPages) {
  // Launch Puppeteer browser
  const browser = await puppeteer.launch({
    headless: true, // Set to false if you want to see the browser action
  });

  const page = await browser.newPage();

  // Google search URL with the query parameter
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  // Go to the Google search result page
  await page.goto(searchUrl);

  let allUrls = [];

  for (let i = 0; i < numberOfPages; i++) {
    // Extract URLs from the current page
    const pageUrls = await extractUrlsFromPage(page);
    allUrls = allUrls.concat(pageUrls);

    // Check if we need to navigate to the next page
    if (i < numberOfPages - 1) { // Only navigate if more pages are to be scraped
      try {
        const nextButton = await page.$('a[aria-label="Next"]');
        if (!nextButton) break;

        await Promise.all([
          nextButton.click(),
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        ]);
      } catch (error) {
        console.error('Error while handling pagination:', error);
        break;
      }
    }
  }

  // Close the browser
  await browser.close();

  // Return the extracted URLs
  return allUrls;
}

// Express route to handle the scraping request
app.get('/scrape', async (req, res) => {
  const query = req.query.q || 'site:facebook.com/groups engineering'; // Default query if none is provided
  const numberOfPages = parseInt(req.query.pages) || 3; // Number of pages to scrape

  try {
    const facebookGroupUrls = await scrapeFacebookGroupUrls(query, numberOfPages);

    if (facebookGroupUrls.length === 0) {
      return res.json({ message: 'No Facebook group URLs found for the query.' });
    }

    return res.json({ urls: facebookGroupUrls });
  } catch (error) {
    console.error('Error occurred while scraping:', error);
    return res.status(500).json({ error: 'An error occurred while scraping.' });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
