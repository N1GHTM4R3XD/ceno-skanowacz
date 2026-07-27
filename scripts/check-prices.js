import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '../artifacts/price-tracker/public/data/tracker-data.json');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const delay = (min, max) => new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1) + min)));

async function fetchPrice(browser, url) {
  const userAgent = getRandomUserAgent();
  const context = await browser.newContext({
    userAgent,
    viewport: { width: 1920, height: 1080 },
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw'
  });
  
  const page = await context.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    console.log(`[Debug] Tytuł strony: ${await page.title()}`);
    // Zrzuty ekranu i HTML można włączyć lokalnie odkomentowując poniższe linie:
    // await page.screenshot({ path: `debug_${Date.now()}.png`, fullPage: true });
    // const html = await page.content();
    // require("fs").writeFileSync(`debug_${Date.now()}.html`, html);

    // Evaluate logic directly in browser
    const priceData = await page.evaluate(() => {
      const urlString = window.location.href;
      let priceText = null;
      let method = 'selector';
      
      if (urlString.includes('allegro.pl')) {
        const el = document.querySelector('div[aria-label^="cena"] > span') || document.querySelector('meta[itemprop="price"]');
        if (el) priceText = el.tagName === 'META' ? el.getAttribute('content') : el.innerText;
      } else if (urlString.includes('x-kom.pl')) {
        const el = document.querySelector('meta[itemprop="price"]') || document.querySelector('span[data-name="productPrice"]');
        if (el) priceText = el.tagName === 'META' ? el.getAttribute('content') : el.innerText;
      } else if (urlString.includes('amazon.pl')) {
        const el = document.querySelector('.a-price .a-offscreen');
        if (el) priceText = el.innerText;
      }

      // Mechanizm ratunkowy: regex (szukanie czegokolwiek co wygląda jak cena w treści strony)
      if (!priceText) {
        const regex = /\d+[ ,.]\d{2}\s?(zł|PLN)?/gi;
        const matches = document.body.innerText.match(regex);
        if (matches && matches.length > 0) {
          // Bierzemy pierwszą pasującą cenę.
          priceText = matches[0];
          method = 'regex';
        }
      }

      if (!priceText) return { cena: null, method: 'none', debugText: document.body.innerText.substring(0, 200) };
      const cleaned = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
      const cena = parseFloat(cleaned);
      return { cena: isNaN(cena) ? null : cena, method, raw: priceText };
    });

    const price = priceData.cena;
    console.log(`[Debug] Metoda znalezienia ceny: ${priceData.method}${priceData.raw ? ` (surowy tekst: ${priceData.raw})` : ''}`);

    await context.close();
    if (price === null) {
      console.warn(`[!] Nie znaleziono ceny dla: ${url}`);
    }
    return price;
  } catch (error) {
    console.error(`[Błąd] Scrapowanie ${url}:`, error.message);
    await context.close();
    return null;
  }
}

async function main() {
  console.log("Rozpoczynam sprawdzanie cen (Playwright)...");
  
  let rawData;
  try {
    rawData = await fs.readFile(DATA_PATH, 'utf-8');
  } catch (err) {
    console.error("Nie znaleziono pliku JSON. Próbuję pobrać pusty...");
    rawData = "{}";
  }
  
  let profiles = JSON.parse(rawData);
  const today = new Date().toISOString().split("T")[0];
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  let hasChanges = false;
  
  // Uruchomienie Chromium
  const browser = await chromium.launch({ headless: true });

  const stats = {
    checked: 0,
    success: 0,
    failed: 0,
    failedUrls: []
  };

  for (const [token, profile] of Object.entries(profiles)) {
    for (const product of profile.produkty) {
      for (const oferta of product.oferty || []) {
        stats.checked++;
        console.log(`\nSprawdzam: ${product.nazwa} w ${oferta.sklep}... (${oferta.url})`);
        
        const currentScrapedPrice = await fetchPrice(browser, oferta.url);
        
        if (currentScrapedPrice !== null) {
          stats.success++;
          if (currentScrapedPrice !== oferta.cena) {
            console.log(`Znalazłem nową cenę! Stara: ${oferta.cena}, Nowa: ${currentScrapedPrice}`);
            
            // Ignorujemy pierwszą zmianę z 0 (gdy użytkownik dodał ofertę z samej wklejki)
            if (currentScrapedPrice < oferta.cena && oferta.cena !== 0) {
              if (profile.email && profile.powiadomieniaEmail && profile.globalneAlerty && product.alert_wlaczony) {
                console.log(`Wysyłam powiadomienie do ${profile.email}...`);
                if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
                  try {
                    await transporter.sendMail({
                      from: `"Price Tracker" <${process.env.GMAIL_USER}>`,
                      to: profile.email,
                      subject: `Spadek ceny! ${product.nazwa}`,
                      text: `Dobra wiadomość!\nCena produktu ${product.nazwa} w sklepie ${oferta.sklep} spadła z ${oferta.cena} PLN na ${currentScrapedPrice} PLN.\n\nLink do oferty: ${oferta.url}`
                    });
                    console.log("Wysłano e-mail pomyślnie.");
                  } catch (e) {
                    console.error("Błąd wysyłania e-maila:", e.message);
                  }
                } else {
                  console.log("Pominięto wysyłkę e-mail: Brak konfiguracji GMAIL (secrets).");
                }
              }
            }
  
            oferta.cena = currentScrapedPrice;
            hasChanges = true;
          } else {
            console.log(`Cena bez zmian (${currentScrapedPrice} PLN).`);
          }
        } else {
          stats.failed++;
          stats.failedUrls.push(oferta.url);
        }
        
        // Losowe opóźnienie anty-ban (3 do 8 sekund)
        const delayMs = Math.floor(Math.random() * 5000) + 3000;
        console.log(`Odczekuję ${delayMs}ms...`);
        await delay(delayMs, delayMs);
      }
      
      // Aktualizuj trend i historię
      if (hasChanges && product.oferty && product.oferty.length > 0) {
        const lowestOffer = product.oferty.reduce((min, o) => 
          (o.cena + o.koszt_dostawy < min.cena + min.koszt_dostawy) ? o : min, product.oferty[0]);
        const minTotal = lowestOffer.cena + lowestOffer.koszt_dostawy;
        
        if (!product.historia) product.historia = [];
        const lastHistory = product.historia.length > 0 ? product.historia[product.historia.length - 1] : null;
        
        if (!lastHistory || lastHistory.data !== today || lastHistory.cena !== minTotal) {
           if (lastHistory && lastHistory.data === today) {
             lastHistory.cena = minTotal;
           } else {
             product.historia.push({ data: today, cena: minTotal });
           }
           if (lastHistory) {
             if (minTotal < lastHistory.cena) product.trend = "spadek";
             else if (minTotal > lastHistory.cena) product.trend = "wzrost";
             else product.trend = "brak_zmian";
           }
        }
      }
    }
  }

  await browser.close();

  // Podsumowanie
  console.log("\n--- PODSUMOWANIE SCRAPOWANIA ---");
  console.log(`Sprawdzono ofert: ${stats.checked}`);
  console.log(`Zakończono sukcesem: ${stats.success}`);
  console.log(`Zakończono błędem: ${stats.failed}`);
  if (stats.failed > 0) {
    console.log("Nieudane adresy URL:");
    stats.failedUrls.forEach(url => console.log(` - ${url}`));
  }
  console.log("--------------------------------\n");

  if (hasChanges) {
    console.log("Zapisywanie zmian w pliku JSON...");
    await fs.writeFile(DATA_PATH, JSON.stringify(profiles, null, 2), 'utf-8');
    console.log("Gotowe.");
  } else {
    console.log("Brak zmian w cenach, nie nadpisuję pliku.");
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
