import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '../artifacts/price-tracker/public/data/tracker-data.json');

const BLOCKED_DOMAINS = ['allegro.pl', 'mediaexpert.pl', 'zalando.pl'];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0'
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
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000); // Oczekujemy dodatkowe sekundy na wyrenderowanie JS i challenge Cloudflare
    
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
      } else if (urlString.includes('empik.com')) {
        const el = document.querySelector('meta[itemprop="price"]') || document.querySelector('[data-ta="price"]') || document.querySelector('.css-price') || document.querySelector('.price');
        if (el) priceText = el.tagName === 'META' ? el.getAttribute('content') : el.innerText;
      } else if (urlString.includes('orlybeauty.pl')) {
        // Cena widoczna jako tekst "49,00 cena dla detalistów" – szukamy linka z ceną
        const el = document.querySelector('a[href*="koszyk"], .cena, [class*="cena"], [class*="price"], a.add_to_cart');
        if (el) {
          priceText = el.innerText;
        } else {
          // Fallback: szukaj w treści linków
          const links = Array.from(document.querySelectorAll('a'));
          const priceLink = links.find(a => /\d+[,.]\d{2}\s*(zł|pln)/i.test(a.innerText));
          if (priceLink) priceText = priceLink.innerText;
        }
      } else if (urlString.includes('wearmedicine.com')) {
        const el = document.querySelector('meta[itemprop="price"]')
          || document.querySelector('[class*="price"]')
          || document.querySelector('[class*="Price"]')
          || document.querySelector('.product-price')
          || document.querySelector('[itemprop="price"]');
        if (el) priceText = el.tagName === 'META' ? el.getAttribute('content') : el.innerText;
      }

      // Mechanizm ratunkowy: regex
      if (!priceText || !/\d/.test(priceText)) {
        const priceContainer = document.querySelector('.product-price, .price, [class*="price"], [itemprop="offers"]');
        const regex = /\d{1,5}(?:[,.]\d{2})?\s?(?:zł|pln)/gi;
        
        let matches = priceContainer ? priceContainer.innerText.match(regex) : null;
        if (matches && matches.length > 0) {
          priceText = matches[0];
          method = 'regex-container';
        } else {
          matches = document.body.innerText.match(regex);
          if (matches && matches.length > 0) {
            priceText = matches[0];
            method = 'regex-body';
          }
        }
      }

      if (!priceText) return { cena: null, method: 'none', debugText: document.body.innerText.substring(0, 200) };
      const cleaned = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
      const cena = parseFloat(cleaned);
      
      let freeDeliveryThreshold = null;
      const freeDeliveryRegex = /(darmow|bezpłatn)[a-ząćęłńóśźż]*\s+(dostaw|wysyłk)[a-ząćęłńóśźż]*\s+od\s+(\d+[ ,.]?\d*)\s?(zł|pln)/i;
      const deliveryMatch = document.body.innerText.match(freeDeliveryRegex);
      if (deliveryMatch) {
        freeDeliveryThreshold = `od ${deliveryMatch[3]} zł`;
      }

      let ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      if (!ogImage) {
        ogImage = document.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
      }

      let fetchedTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
      if (!fetchedTitle) {
        let titleEl = document.querySelector('title');
        if (titleEl && titleEl.innerText) {
          fetchedTitle = titleEl.innerText.split('-')[0].trim();
        }
      }
      if (!fetchedTitle) {
        let h1 = document.querySelector('h1');
        if (h1 && h1.innerText) {
          fetchedTitle = h1.innerText.trim();
        }
      }

      return { cena: isNaN(cena) ? null : cena, method, raw: priceText, freeDeliveryThreshold, ogImage, fetchedTitle };
    });

    const price = priceData.cena;
    console.log(`[Debug] Metoda znalezienia ceny: ${priceData.method}${priceData.raw ? ` (surowy tekst: ${priceData.raw})` : ''}`);
    if (priceData.freeDeliveryThreshold) {
      console.log(`[Debug] Znaleziono darmową dostawę: ${priceData.freeDeliveryThreshold}`);
    }

    if (price === null) {
      console.warn(`[!] Nie znaleziono ceny dla: ${url}. Zapisuję dane debugowania...`);
      try {
        await fs.mkdir(path.join(__dirname, 'debug'), { recursive: true });
        const domain = new URL(url).hostname.replace(/[^a-z0-9]/gi, '_');
        const timestamp = Date.now();
        const baseName = path.join(__dirname, 'debug', `${domain}_${timestamp}`);
        
        await page.screenshot({ path: `${baseName}.png`, fullPage: true });
        const html = await page.content();
        await fs.writeFile(`${baseName}.html`, html, 'utf-8');
        console.log(`[Debug] Zapisano zrzut ekranu i HTML do folderu debug (${domain}_${timestamp}).`);
      } catch (debugErr) {
        console.error("[Błąd] Nie udało się zapisać plików debugowania:", debugErr.message);
      }
    }

    await context.close();
    return priceData;
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
    skipped: 0,
    failedUrls: []
  };
  const aggregatedEmails = {};

  for (const [token, profile] of Object.entries(profiles)) {
    if (!profile.produkty || !Array.isArray(profile.produkty)) continue;
    
    for (const product of profile.produkty) {
      for (const oferta of product.oferty || []) {
        stats.checked++;
        console.log(`\nSprawdzam: ${product.nazwa} w ${oferta.sklep}... (${oferta.url})`);
        
        try {
          const u = new URL(oferta.url);
          const domain = u.hostname.replace('www.', '').toLowerCase();
          
          if (BLOCKED_DOMAINS.some(d => domain.includes(d))) {
            console.log(`[Pominięto] Domena blokująca scraper: ${domain}`);
            stats.skipped++;
            if (!oferta.wymaga_recznego_sprawdzenia) {
              oferta.wymaga_recznego_sprawdzenia = true;
              hasChanges = true;
            }
            continue;
          }
        } catch(e) {}
        
        if (oferta.wymaga_recznego_sprawdzenia) {
          oferta.wymaga_recznego_sprawdzenia = false;
          hasChanges = true;
        }

        let currentData = null;
        const isAmazon = oferta.url.includes('amazon.pl');
        const maxAttempts = isAmazon ? 3 : 1;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          currentData = await fetchPrice(browser, oferta.url);
          if (currentData !== null && currentData.cena !== null) {
            break; // Sukces
          }
          if (attempt < maxAttempts) {
            console.log(`[Amazon] Próba ${attempt} nieudana (możliwa captcha). Ponawiam za chwilę...`);
            await delay(3000, 6000);
          }
        }
        
        if (currentData !== null && currentData.cena !== null) {
          stats.success++;
          const currentScrapedPrice = currentData.cena;
          
          if (!product.zdjecie_url && currentData.ogImage) {
            product.zdjecie_url = currentData.ogImage;
            console.log(`[Zaktualizowano zdjęcie] Pobrano zdjęcie ze sklepu: ${currentData.ogImage}`);
            hasChanges = true;
          }
          
          if (currentData.fetchedTitle && !product.nazwa_edytowana_recznie && product.nazwa !== currentData.fetchedTitle) {
            product.nazwa = currentData.fetchedTitle;
            console.log(`[Zaktualizowano nazwę produktu] Pobrano nazwę ze sklepu: ${currentData.fetchedTitle}`);
            hasChanges = true;
          }
          
          if (currentData.freeDeliveryThreshold) {
            if (oferta.darmowa_dostawa_z !== currentData.freeDeliveryThreshold) {
              oferta.darmowa_dostawa_z = currentData.freeDeliveryThreshold;
              console.log(`Zaktualizowano próg darmowej dostawy: ${currentData.freeDeliveryThreshold}`);
              hasChanges = true;
            }
          }

          if (currentScrapedPrice !== oferta.cena) {
            console.log(`Znalazłem nową cenę! Stara: ${oferta.cena}, Nowa: ${currentScrapedPrice}`);
            
            // Ignorujemy pierwszą zmianę z 0 (lub null)
            if (currentScrapedPrice < oferta.cena && oferta.cena !== 0 && oferta.cena !== null) {
              if (profile.email && profile.powiadomieniaEmail && profile.globalneAlerty && product.alert_wlaczony) {
                if (!aggregatedEmails[profile.email]) {
                  aggregatedEmails[profile.email] = [];
                }
                aggregatedEmails[profile.email].push({
                  nazwa: product.nazwa,
                  sklep: oferta.sklep,
                  staraCena: oferta.cena,
                  nowaCena: currentScrapedPrice,
                  url: oferta.url
                });
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
  console.log(`Pominięto (znana blokada): ${stats.skipped}`);
  console.log(`Zakończono błędem: ${stats.failed}`);
  if (stats.failed > 0) {
    console.log("Nieudane adresy URL:");
    stats.failedUrls.forEach(url => console.log(` - ${url}`));
  }
  console.log("--------------------------------\n");

  // Wysyłanie zbiorczych powiadomień e-mail
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    const emailEntries = Object.entries(aggregatedEmails);
    if (emailEntries.length === 0) {
      console.log("Nie wykryto promocji – wiadomość nie została wysłana.");
    } else {
      for (const [email, drops] of emailEntries) {
        if (drops.length === 0) continue;
        
        console.log(`Wykryto ${drops.length} promocje(ji) dla ${email} – wysyłanie zbiorczego e-maila.`);
        
        const count = drops.length;
        const lastDigit = count % 10;
        const lastTwo = count % 100;
        let odmiana = 'obniżek cen';
        if (count === 1) odmiana = 'obniżkę ceny';
        else if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 10 || lastTwo >= 20)) odmiana = 'obniżki cen';
        
        const subject = `🔔 Wykryto ${count} ${odmiana}`;
        
        let text = `Dobra wiadomość! Wykryliśmy spadki cen dla Twoich obserwowanych produktów:\n\n`;
        drops.forEach((drop, idx) => {
          text += `${idx + 1}. ${drop.nazwa}\n`;
          text += `   Sklep: ${drop.sklep}\n`;
          text += `   Cena: spadła z ${drop.staraCena} PLN na ${drop.nowaCena} PLN\n`;
          text += `   Link: ${drop.url}\n\n`;
        });
        
        text += `---\nJest to automatyczne powiadomienie wygenerowane przez aplikację Price Tracker.`;
        
        try {
          await transporter.sendMail({
            from: `"Price Tracker" <${process.env.GMAIL_USER}>`,
            to: email,
            subject,
            text
          });
          console.log("Zbiorczy e-mail został wysłany pomyślnie.");
        } catch (e) {
          console.error(`Błąd wysyłania e-maila do ${email}:`, e.message);
        }
      }
    }
  } else if (Object.keys(aggregatedEmails).length > 0) {
    console.log("Pominięto wysyłkę e-mail: Brak konfiguracji GMAIL (secrets).");
  } else {
    console.log("Nie wykryto promocji – wiadomość nie została wysłana.");
  }

  // Zapisz metadane ostatniej synchronizacji (zawsze, niezależnie od zmian cen)
  const allSucceeded = stats.failed === 0;
  profiles._meta = {
    ostatnia_synchronizacja: new Date().toISOString(),
    status: allSucceeded ? "sukces" : "czesciowy_blad",
    sprawdzono: stats.checked,
    sukces: stats.success,
    bledy: stats.failed,
    pominieto: stats.skipped,
  };

  console.log("Zapisywanie danych...");
  await fs.writeFile(DATA_PATH, JSON.stringify(profiles, null, 2), 'utf-8');
  console.log("Gotowe.");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
