import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// Forms debounce the unit field by 300ms before fetching occupancy; with the default 1s
// budget those findBy* calls go flaky whenever the suite runs under load.
configure({ asyncUtilTimeout: 3000 });

afterEach(() => {
  cleanup();
});
