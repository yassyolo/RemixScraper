const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const cheerio = require("cheerio");

const CONFIG = {
  BRANDS: ["Zara", "Nike", "Esprit"],
  EMAIL: "",
  PASSWORD: "",
  LOGIN_URL: "https://remixshop.com/bg",
  SIZES: ["XS", "S"],
  EU_SIZES: ["34", "36"]
};

async function setCookies(driver) {
  const cookies = [
    {
      name: "userToken",
      value: "",
      domain: ".remixshop.com",
      path: "/",
      httpOnly: true,
      secure: true
    },
    {
      name: "remixSession",
      value: "",
      domain: ".remixshop.com",
      path: "/",
      httpOnly: true,
      secure: true
    }
  ];
  for(const cookie of cookies){
    await driver.manage().addCookie(cookie);
  }

  await driver.navigate().refresh();
  console.log("Cookies set successfully.");
}
async function setupDriver() {
  const options = new chrome.Options();
  options.addArguments(
    "disable-notifications",
     "start-maximized", 
      "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  return new Builder().forBrowser("chrome").setChromeOptions(options).build();
}

async function closePopup(driver) {
  try {
    const colorboxPopup = await driver.wait(until.elementLocated(By.id("colorbox")), 3000);
    if (colorboxPopup) {
      console.log("Cookie popup detected, closing...");
      const agreeButton = await driver.wait(until.elementLocated(By.id("cookie-setting-agree")), 5000);
      await agreeButton.click();
      await driver.wait(until.stalenessOf(colorboxPopup), 5000);
      console.log("Cookie popup closed.");
    }
  } catch (err) {
    console.warn("No cookie popup found, proceeding...");
  }

  try {
    await driver.wait(until.stalenessOf(By.id("cboxOverlay")), 5000);
    console.log("Overlay closed.");
  } catch (err) {
    console.log("No overlay found, proceeding...");
  }

  await driver.executeScript(`
    let overlay = document.getElementById('cboxOverlay');
    if (overlay) overlay.remove();
  `);
}

async function login(driver) {
  try {
    const profileButton = await driver.wait(until.elementLocated(By.css("li.action-wrapper .rxicon-user")), 5000);
    await profileButton.click();
    await driver.sleep(2000);

    await driver.wait(until.elementLocated(By.id("login-modal")), 5000);
    await driver.findElement(By.id("UserEmailLoginModel_email")).sendKeys(CONFIG.EMAIL);
    await driver.findElement(By.id("UserEmailLoginModel_password")).sendKeys(CONFIG.PASSWORD);
    await driver.findElement(By.id("login-btn")).click();
    console.log("Logged in successfully.");
    await driver.sleep(2000);
  } catch (err) {
    console.warn("No login popup found, proceeding...");
  }
}

async function navigateToWomenCategory(driver) {
  await driver.wait(until.elementLocated(By.xpath("//li[@class='main-cat']/a[@rel='womens-clothes']")), 5000).click();
  console.log("Navigated to women's clothing category.");
}

async function applyFilters(driver) {
  /*const profileButton = await driver.wait(until.elementLocated(By.css("li.action-wrapper .rxicon-user")), 5000);
    await profileButton.click();
    await driver.sleep(2000);
    await profileButton.click();*/
  await driver.executeScript("window.scrollBy(0, 600)");
  await driver.sleep(3000);

  const filterConditions = await driver.wait(until.elementLocated(By.css(".filters-condition")), 4000);
  await driver.actions({ async: true }).move({ origin: filterConditions }).perform();
  console.log("Hovered over the filter menu.");
  
  const newConditionFilters = await driver.wait(until.elementsLocated(By.css("a.condition-new")), 5000);

  for (const filter of newConditionFilters) {
  await driver.wait(until.elementIsVisible(filter), 5000);
  await driver.wait(until.elementIsEnabled(filter), 5000);

  await filter.click();
  await driver.sleep(1000);
}


  const filterSizes = await driver.wait(until.elementLocated(By.css(".filters-sizes")), 4000);
  await driver.actions({async: true}).move({origin: filterSizes}).perform();
  
  for(const size of CONFIG.SIZES){
    await driver.wait(until.elementLocated(By.xpath(`//a[@class='sizes filter-hidden-input ' and @data-name='${size}']`)), 4000).click();
    console.log("Selected '{size}' size filter.");
    await driver.sleep(1000);
  }

  for(const size of CONFIG.EU_SIZES){
    await driver.wait(until.elementLocated(By.xpath(`//a[@class='size tab' and @data-name='${size}']`)), 4000).click();
    console.log("Selected '{size}' size filter.",size);
    await driver.sleep(1000);
  }

  const filtersBrands = await driver.wait(until.elementLocated(By.css(".filters-brands")), 4000);
  await driver.actions({async: true}).move({origin: filtersBrands}).perform();

  const brandInput = await driver.findElement(By.id("brand-search"));
await driver.wait(until.elementIsVisible(brandInput), 4000); 
  for(const brand of CONFIG.BRANDS){
    await driver.sleep(1000);

    await driver.executeScript("arguments[0].value='';", brandInput);
    await driver.sleep(1000);

    await brandInput.sendKeys(brand);
    await driver.sleep(1000);
  

    const brandSearchList = await driver.wait(
      until.elementLocated(By.id("brand-search-list")),
      4000
    );
    await driver.wait(until.elementIsVisible(brandSearchList), 4000);

    const firstBrandOption = await driver.wait(
      until.elementLocated(By.css("#brand-search-list .tt-suggestion.tt-selectable")),
      4000
    );

    if(!firstBrandOption) continue;
    await firstBrandOption.click();

    await driver.sleep(1000);
    console.log(`Selected brand: ${brand}`);
  }
  

  console.log("Selected 'New' condition filter.");
}

async function scrapeProducts(driver) {
  const pageHtml = await driver.getPageSource();
  const $ = cheerio.load(pageHtml);
  const products = [];

  $("li.product-item").each((_, element) => {
    const brand = $(element).find(".product-brand").text().trim();
    if (!CONFIG.BRANDS.includes(brand)) return;

    products.push({
      title: $(element).find(".product-title").text().trim(),
      brand,
      price: $(element).find(".price").text().trim(),
      size: $(element).attr("data-gtm-size") || "N/A",
      favorites: $(element).find(".fav-count").text().trim() || "0",
      link: "https://remixshop.com" + $(element).find(".product-photos").attr("href"),
      image: $(element).find(".product-photos img").attr("src")
    });
  });
  
  console.log(products);
}

async function scrapeFirstPage() {
  let driver;
  try {
    driver = await setupDriver();
    await driver.get(CONFIG.LOGIN_URL);
    await closePopup(driver);
    await setCookies(driver);
    //await login(driver);
    await navigateToWomenCategory(driver);
    await applyFilters(driver);
    await scrapeProducts(driver);
  } catch (error) {
    console.error("Error fetching page:", error.message);
  } finally {
    if (driver) await driver.quit();
  }
}

scrapeFirstPage();
