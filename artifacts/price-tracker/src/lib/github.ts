import { UserProfile } from "../types";

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;
const OWNER = import.meta.env.VITE_GITHUB_OWNER || "N1GHTM4R3XD";
const REPO = import.meta.env.VITE_GITHUB_REPO || "ceno-skanowacz";
const FILE_PATH = import.meta.env.VITE_GITHUB_FILE_PATH || "artifacts/price-tracker/public/data/tracker-data.json";

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

  // 1. Pobierz aktualny plik, żeby zdobyć SHA
  let sha = "";
  try {
    const getRes = await fetch(`${url}?t=${Date.now()}`, { headers, cache: "no-store" });
    if (!getRes.ok) {
      if (getRes.status === 404) {
        // Plik nie istnieje, będziemy tworzyć nowy (brak sha)
        console.warn("Plik tracker-data.json nie istnieje na GitHubie, zostanie utworzony.");
      } else {
        const errorData = await getRes.json().catch(() => ({}));
        throw new Error(errorData.message || `Błąd podczas pobierania pliku: ${getRes.status}`);
      }
    } else {
      const data = await getRes.json();
      sha = data.sha;
    }
  } catch (err: any) {
    console.error("Błąd podczas pobierania pliku z GitHub:", err);
    throw new Error(err.message || "Nie udało się połączyć z GitHub API.");
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

  const putRes = await fetch(url, {
    method: "PUT",
    headers,
    body,
  });

  if (!putRes.ok) {
    const errorData = await putRes.json().catch(() => ({}));
    console.error("Błąd zapisu do GitHuba:", errorData);
    throw new Error(errorData.message || `Błąd podczas zapisu: ${putRes.status}`);
  }
  
  try {
    localStorage.setItem("tracker-profiles-cache", JSON.stringify(newData));
    localStorage.setItem("tracker-profiles-cache-ts", Date.now().toString());
  } catch (e) {}
}
