import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, '../artifacts/price-tracker/public/data/tracker-data.json');

// Helper do scrapowania różnych sklepów
async function fetchPrice(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1'
      },
      timeout: 10000
    });
    const $ = cheerio.load(data);
    let priceText = null;

    if (url.includes('allegro.pl')) {
      // Przykład dla allegro
      priceText = $('div[aria-label^="cena"] > span, meta[itemprop="price"]').first().text() || $('meta[itemprop="price"]').attr('content');
    } else if (url.includes('x-kom.pl')) {
      // Przykład dla x-kom
      priceText = $('meta[itemprop="price"]').attr('content') || $('span[data-name="productPrice"]').text();
    } else if (url.includes('amazon.pl')) {
      // Przykład dla amazon
      priceText = $('.a-price .a-offscreen').first().text();
    }

    if (!priceText) {
      console.warn(`[!] Nie znaleziono ceny dla: ${url}`);
      return null;
    }

    // Wyciągnij liczby
    const cleaned = priceText.replace(/[^\d.,]/g, '').replace(',', '.');
    const cena = parseFloat(cleaned);
    
    if (isNaN(cena)) return null;
    return cena;
  } catch (error) {
    console.error(`[Błąd] Scrapowanie ${url}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("Rozpoczynam sprawdzanie cen...");
  
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

  for (const [token, profile] of Object.entries(profiles)) {
    for (const product of profile.produkty) {
      for (const oferta of product.oferty || []) {
        console.log(`Sprawdzam: ${product.nazwa} w ${oferta.sklep}...`);
        
        const currentScrapedPrice = await fetchPrice(oferta.url);
        if (currentScrapedPrice !== null && currentScrapedPrice !== oferta.cena) {
          console.log(`Znalazłem nową cenę! Stara: ${oferta.cena}, Nowa: ${currentScrapedPrice}`);
          
          // Cena spadła?
          if (currentScrapedPrice < oferta.cena) {
            // Czy wysłać maila?
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

          // Zaktualizuj cenę w obiekcie
          oferta.cena = currentScrapedPrice;
          
          // Dodaj historię na poziomie oferty (lub produktu w zaleznosci od potrzeb). Dla uproszczenia zaktualizujmy historię w produkcie jako min. 
          hasChanges = true;
        }
        // Mała przerwa anty-ban
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // Aktualizuj trend i ogólną historię produktu bazując na najniższej cenie ze wszystkich ofert
      if (hasChanges && product.oferty && product.oferty.length > 0) {
        const lowestOffer = product.oferty.reduce((min, o) => 
          (o.cena + o.koszt_dostawy < min.cena + min.koszt_dostawy) ? o : min, product.oferty[0]);
        const minTotal = lowestOffer.cena + lowestOffer.koszt_dostawy;
        
        if (!product.historia) product.historia = [];
        const lastHistory = product.historia.length > 0 ? product.historia[product.historia.length - 1] : null;
        
        if (!lastHistory || lastHistory.data !== today || lastHistory.cena !== minTotal) {
           // jeśli dzisiaj jeszcze nie było wpisu lub cena się zmieniła
           if (lastHistory && lastHistory.data === today) {
             lastHistory.cena = minTotal;
           } else {
             product.historia.push({ data: today, cena: minTotal });
           }
           // Ustal trend
           if (lastHistory) {
             if (minTotal < lastHistory.cena) product.trend = "spadek";
             else if (minTotal > lastHistory.cena) product.trend = "wzrost";
             else product.trend = "brak_zmian";
           }
        }
      }
    }
  }

  if (hasChanges) {
    console.log("Zapisywanie zmian w pliku JSON...");
    await fs.writeFile(DATA_PATH, JSON.stringify(profiles, null, 2), 'utf-8');
    console.log("Gotowe.");
  } else {
    console.log("Brak zmian w cenach.");
  }
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
