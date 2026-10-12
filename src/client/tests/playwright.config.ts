import { defineConfig, devices } from "@playwright/test";
const env = {
  ...process.env,
  VITE_YESSYFY_API_ORIGIN: "http://127.0.0.1:7777",
  VITE_YESSYFY_MAIN_ORIGIN: "http://127.0.0.1:5173",
  VITE_YESSYFY_VISION_ORIGIN: "http://127.0.0.1:5174",
  VITE_YESSYFY_ENVIRONMENT: "browser-test",
};
export default defineConfig({
  testDir: "./browser",
  timeout: 90000,
  expect: { timeout: 15000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["json", { outputFile: "results/browser.json" }]],
  use: {
    ...devices["Desktop Chrome"],
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PW_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PW_EXECUTABLE_PATH,
          args: [
            "--no-sandbox",
            "--no-zygote",
            "--disable-gpu",
            "--disable-software-rasterizer",
          ],
        }
      : {},
  },
  webServer: [
    {
      command: "npm run fixture",
      url: "http://127.0.0.1:7777/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev:main",
      url: "http://127.0.0.1:5173",
      env,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev:vision",
      url: "http://127.0.0.1:5174",
      env,
      reuseExistingServer: false,
    },
  ],
});
