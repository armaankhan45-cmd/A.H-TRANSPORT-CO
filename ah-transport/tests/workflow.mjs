import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

const check = (ok, message) => { if (!ok) throw new Error(`FAIL: ${message}`); console.log(`PASS: ${message}`); };

try {
  await page.goto("http://127.0.0.1:5173");
  await page.locator('input[type="email"]').fill("admin@ahtransportco.com");
  await page.locator('input[type="password"]').fill("admin123");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.locator("aside button:has-text('Vehicles')").click();

  await page.getByRole("button", { name: /Add Vehicle/ }).click();
  await page.getByPlaceholder("MH43CK8150").fill("MH43CK8150");
  await page.getByRole("button", { name: /Add Vehicle/ }).last().click();
  await page.getByText("already in the demo fleet", { exact: false }).waitFor();
  check(await page.getByText("Vehicle MH43CK8150").count() > 0, "duplicate demo reg opens existing vehicle rather than silently failing");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /Add Vehicle/ }).click();
  await page.getByPlaceholder("MH43CK8150").fill("MH99ZZ4321");
  await page.getByRole("button", { name: /Add Vehicle/ }).last().click();
  await page.getByText("Vehicle added", { exact: false }).waitFor();
  check(await page.getByText("Vehicle MH99ZZ4321").count() > 0, "vehicle create saves and opens its record");

  await page.getByRole("button", { name: "Documents" }).click();
  await page.getByRole("button", { name: /Upload Document/ }).click();
  await page.locator('input[list="vehicle-paper-types"]').fill("Calibration Certificate");
  await page.locator('label').filter({ hasText: "Document Number" }).locator("input").fill("9 NO");
  await page.locator('label').filter({ hasText: "Expiry Date" }).locator('input[type="date"]').fill("2027-12-31");
  await page.locator('input[type="file"]').setInputFiles({ name: "paper.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==", "base64") });
  await page.getByText("✓ paper.jpg", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Save Document" }).click();
  check(await page.getByText("Calibration Certificate").count() > 0, "custom vehicle paper type, number, expiry and image save");

  await page.keyboard.press("Escape");
  await page.locator("aside button:has-text('Drivers')").click();
  await page.getByRole("button", { name: /Add Driver/ }).click();
  await page.locator("label").filter({ hasText: "Full Name" }).locator("input").fill("Demo Workflow Driver");
  await page.locator("label").filter({ hasText: "Mobile Number" }).locator("input").fill("9876501234");
  await page.locator("label").filter({ hasText: "Assigned Vehicle" }).locator("select").selectOption({ label: "MH99ZZ4321" });
  await page.getByRole("button", { name: "Save Driver" }).click();
  await page.getByText("Driver added and linked", { exact: false }).waitFor();
  check(await page.getByText("Demo Workflow Driver").count() > 0, "driver create and vehicle assignment save");

  await page.locator("aside button:has-text('LR Generation')").click();
  await page.getByRole("button", { name: /New LR/ }).click();
  await page.locator('label').filter({ hasText: "Vehicle" }).locator("select").first().selectOption({ label: "MH99ZZ4321 — Available" });
  await page.getByPlaceholder("Search / type consignor").fill("Demo Consignor");
  await page.getByPlaceholder("Search / type consignee").fill("Demo Consignee");
  await page.getByRole("textbox", { name: "From *" }).fill("Chembur");
  await page.getByRole("textbox", { name: "To *" }).fill("Pune");
  await page.getByRole("button", { name: "Save Draft" }).click();
  check(await page.getByText("saved as draft").count() > 0, "LR can be created against new vehicle");

  await page.locator("aside button:has-text('Vehicles')").click();
  await page.getByPlaceholder("Search reg no, type, chassis…").fill("MH99ZZ4321");
  await page.getByTitle("View").last().click();
  await page.getByRole("button", { name: "LRs" }).click();
  check(await page.getByText("Demo Consignor").count() > 0, "vehicle record immediately lists its linked LR");
  check(errors.length === 0, `no page or console errors (${errors.join(" | ")})`);
} finally {
  await browser.close();
}
