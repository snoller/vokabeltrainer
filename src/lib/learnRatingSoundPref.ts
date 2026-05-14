const KEY = "vokabeltrainer:v1:learnRatingSound";

function dispatch() {
  window.dispatchEvent(new Event("vokabeltrainer:learnRatingSound"));
}

export function subscribeLearnRatingSound(cb: () => void) {
  window.addEventListener("vokabeltrainer:learnRatingSound", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("vokabeltrainer:learnRatingSound", cb);
    window.removeEventListener("storage", cb);
  };
}

/** Standard: Ton aus (mobilfreundlich); Nutzer:in kann aktivieren */
export function getLearnRatingSound(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setLearnRatingSound(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
    dispatch();
  } catch {
    /* ignore */
  }
}
