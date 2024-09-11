const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3000; // You can change the port as needed

// Function to extract Facebook group URLs
async function scrapeFacebookGroupUrls(query) {
  // Launch Puppeteer browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],  // Required for environments like Render
  });

  const page = await browser.newPage();

  // Google search URL with the query parameter
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  // Go to the Google search result page
  await page.goto(searchUrl);

  // Wait for search results to load
  await page.waitForSelector('div#search');

  // Extract URLs from the search results
  const urls = await page.evaluate(() => {
    const results = Array.from(document.querySelectorAll('a')).map(anchor => anchor.href);
    return results.filter(url => url.startsWith('https://www.facebook.com/groups') || url.startsWith('https://facebook.com/groups'));
  });

  // Close the browser
  await browser.close();

  // Return the extracted URLs
  return urls;
}

// Express route to handle the scraping request
app.get('/scrape', async (req, res) => {
  const query = req.query.q || 'site:facebook.com/groups engineering'; // Default query if none is provided

  try {
    const facebookGroupUrls = await scrapeFacebookGroupUrls(query);

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
