const { Builder, By, until, Actions } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BRANDS = ["Zara"];
const URL = "https://remixshop.com/bg/womens-clothes";

async function scrapeFirstPage() {
  let driver;

  try {
    const options = new chrome.Options();
    
    options.addArguments("disable-notifications");
    options.addArguments("start-maximized");

    driver = await new Builder().forBrowser("chrome").setChromeOptions(options).build();
    await driver.get(URL);

    try {
      const colorboxPopup = await driver.wait(
        until.elementLocated(By.id("colorbox")),
        3000
      );

      if (colorboxPopup) {
        console.log("Cookie popup detected, closing...");

        const agreeButton = await driver.wait(
          until.elementLocated(By.id("cookie-setting-agree")),
          5000
        );

        await driver.wait(until.elementIsVisible(agreeButton), 3000);
        await driver.wait(until.elementIsEnabled(agreeButton), 3000);

        await agreeButton.click();

        await driver.wait(until.stalenessOf(colorboxPopup), 5000);
        console.log("Cookie popup closed.");
      }
    } catch (err) {
      console.warn("No cookie popup found, proceeding...");
    }

    await driver.executeScript("window.scrollBy(0, 500)");

    const filterMenu = await driver.wait(
      until.elementLocated(By.css(".filters-condition")),
      5000
    );

    const actions = driver.actions({ async: true });
    await actions.move({ origin: filterMenu }).perform();
    console.log("Hovered over the filter menu.");

    await driver.sleep(4000);

    const newConditionFilter = await driver.wait(
      until.elementLocated(By.css("a.condition-new")),
      5000
    );

    await newConditionFilter.click();
    console.log("Selected 'New' condition filter.");

    await driver.wait(until.elementLocated(By.css(".product-item")), 5000);

    const pageHtml = await driver.getPageSource();
    const $ = require("cheerio").load(pageHtml);
    const products = [];

    $("li.product-item").each((_, element) => {
      const brand = $(element).find(".product-brand").text().trim();
      if (!BRANDS.includes(brand)) return;

      const product = {
        title: $(element).find(".product-title").text().trim(),
        brand,
        price: $(element).find(".price").text().trim(),
        size: $(element).attr("data-gtm-size") || "N/A",
        favorites: $(element).find(".fav-count").text().trim() || "0",
        link: "https://remixshop.com" + $(element).find(".product-photos").attr("href"),
        image: $(element).find(".product-photos img").attr("src"),
      };

      products.push(product);
    });

    console.log(products);
  } catch (error) {
    console.error("Error fetching page:", error.message);
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

scrapeFirstPage();
