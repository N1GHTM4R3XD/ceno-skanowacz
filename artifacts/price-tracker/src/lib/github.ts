import { UserProfile } from "../types";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const OWNER = import.meta.env.VITE_GITHUB_OWNER || "N1GHTM4R3XD";
const REPO = import.meta.env.VITE_GITHUB_REPO || "ceno-skanowacz";
const FILE_PATH = import.meta.env.VITE_GITHUB_FILE_PATH || "artifacts/price-tracker/public/data/tracker-data.json";

async function attemptSave(
  url: string,
  headers: Record<string, string>,
  newData: Record<string, UserProfile>,
  commitMessage: string
): Promise<void> {
  // 1. Pobierz aktualny SHA
  let sha = "";
  const getRes = await fetch(`${url}?t=${Date.now()}`, { headers, cache: "no-store" });
  if (!getRes.ok) {
    if (getRes.status === 404) {
      console.warn("Plik tracker-data.json nie istnieje na GitHubie, zostanie utworzony.");
    } else {
      const errorData = await getRes.json().catch(() => ({}));
      throw new Error(errorData.message || `Błąd podczas pobierania pliku: ${getRes.status}`);
    }
  } else {
    const data = await getRes.json();
    sha = data.sha;
  }

  // 2. Zakoduj nową zawartość do Base64 (z obsługą polskich znaków)
  const jsonString = JSON.stringify(newData, null, 2);
  const base64Content = btoa(
    new Uint8Array(new TextEncoder().encode(jsonString))
      .reduce((data, byte) => data + String.fromCharCode(byte), "")
  );

  // 3. Wyślij zaktualizowany plik metodą PUT
  const body = JSON.stringify({
    message: commitMessage,
    content: base64Content,
    ...(sha ? { sha } : {}),
  });

  const putRes = await fetch(url, { method: "PUT", headers, body });

  if (!putRes.ok) {
    const errorData = await putRes.json().catch(() => ({}));
    const msg = errorData.message || `Błąd podczas zapisu: ${putRes.status}`;
    // Rzuć z flagą żeby wiedzieć czy to konflikt SHA
    const err = new Error(msg) as any;
    err.isConflict = putRes.status === 409 || putRes.status === 422 || msg.includes("does not match");
    throw err;
  }
}

export async function saveDataToGitHub(
  newData: Record<string, UserProfile>,
  commitMessage: string
): Promise<void> {
  if (!GITHUB_TOKEN) {
    throw new Error("Brak tokena GitHub. Skonfiguruj zmienną środowiskową VITE_GITHUB_TOKEN.");
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };

  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await attemptSave(url, headers, newData, commitMessage);

      // Sukces – zaktualizuj cache
      try {
        localStorage.setItem("tracker-profiles-cache", JSON.stringify(newData));
        localStorage.setItem("tracker-profiles-cache-ts", Date.now().toString());
      } catch (e) {}

      return;
    } catch (err: any) {
      lastError = err;
      if (err.isConflict && attempt < MAX_RETRIES) {
        // Konflikt SHA – odczekaj chwilę i spróbuj ponownie ze świeżym SHA
        console.warn(`[GitHub] Konflikt SHA (próba ${attempt}/${MAX_RETRIES}), ponawiam...`);
        await new Promise((r) => setTimeout(r, 800 * attempt));
        continue;
      }
      break;
    }
  }

  console.error("Błąd zapisu do GitHuba:", lastError);
  throw new Error(lastError?.message || "Nie udało się zapisać danych.");
}
