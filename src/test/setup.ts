import { afterEach } from "vitest";

// Each test builds its own DOM; clear it and any persisted theme between tests.
afterEach(() => {
  document.body.innerHTML = "";
  delete document.documentElement.dataset["theme"];
  localStorage.clear();
});
