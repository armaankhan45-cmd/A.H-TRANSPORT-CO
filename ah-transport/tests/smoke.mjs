import { chromium } from "playwright";

const BASE = "http://127.0.0.1:5173";
const errors = [];
const log = (...a) => console.log(...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto(BASE, { waitUntil: "networkidle" });
log("title:", await page.title());

await page.fill("input[type=email]", "admin@ahtransportco.com");
await page.fill("input[type=password]", "admin123");
await page.click("button[type=submit]");
await page.waitForTimeout(900);
log("logged in (welcome):", await page.locator("text=/Welcome back/").count());

const pages = ["Vehicles","Vehicle Papers","Maintenance","Expiry Dashboard","Drivers","Assignments","LR Generation","TCC Generation","Trips","Customers","Salary","Expenses","Reports","GPS Tracking","Users & Settings"];
for (const p of pages) {
  await page.click(`aside button:has-text("${p}")`);
  await page.waitForTimeout(300);
  const h1 = await page.locator("h1").first().innerText().catch(() => "NONE");
  log(`nav ${p} -> ${h1}`);
}

async function fillLabel(label, value) {
  const field = page.locator(`label:has-text("${label}")`).first();
  const el = field.locator("input, textarea, select").first();
  const tag = await el.evaluate((n) => n.tagName);
  if (tag === "SELECT") { await el.selectOption({ label: value }).catch(async () => { await el.selectOption({ index: 1 }); }); }
  else await el.fill(value);
}

// --------- LR ---------
await page.click('aside button:has-text("LR Generation")');
await page.waitForTimeout(300);
await page.click('button:has-text("New LR")');
await page.waitForTimeout(300);
log("LR auto number:", await page.locator('label:has-text("LR Number") input').first().inputValue());
await fillLabel("Consignor Name", "M/s Shree Chemicals Pvt. Ltd.");
await fillLabel("Consignee Name", "M/s Navrang Oil Traders");
await fillLabel("From", "Taloja");
await fillLabel("To", "Mahul");
await fillLabel("Nature of Goods", "Chemical Oil");
await fillLabel("Quantity", "24 KL");
await fillLabel("Gross Weight (kg)", "28500");
await fillLabel("Tare Weight (kg)", "8500");
log("auto net weight:", await page.locator('label:has-text("Net Weight") input').first().inputValue());
await page.locator('label:has-text("Vehicle") select').first().selectOption({ index: 2 }).catch(() => {});
await fillLabel("Freight as per Contract (₹)", "18500");
await page.click('button:has-text("Finalise")');
await page.waitForTimeout(600);
log("LR finalised toast:", await page.locator("text=/finalised/").count());
await page.locator("tbody tr").first().locator('button[title="View / print"]').click();
await page.waitForTimeout(500);
log("LR preview rendered:", await page.locator("#lr-print").count(), "| contains LORRY RECEIPT:", await page.locator("#lr-print >> text=LORRY RECEIPT").count());
await page.screenshot({ path: "tests/lr-preview.png" });
await page.locator(".fixed.inset-0 button.absolute, div.fixed button:has(svg.lucide-x)").first().click().catch(() => {});
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

// --------- Maintenance duration ---------
await page.click('aside button:has-text("Maintenance")');
await page.waitForTimeout(300);
await page.click('button:has-text("New Maintenance")');
await page.waitForTimeout(300);
await page.locator('label:has-text("Vehicle Number") select').first().selectOption({ index: 1 });
await page.locator('label:has-text("Maintenance Title") input').first().fill("Test engine work");
await page.locator('label:has-text("Start Date") input').first().fill("2026-11-10");
await page.locator('label:has-text("Expected Completion Date") input').first().fill("2026-11-15");
await page.locator('label:has-text("Actual End Date") input').first().fill("2026-11-15");
await page.waitForTimeout(300);
log("duration:", (await page.locator("text=/Auto-calculated duration/").first().innerText()).trim());
await page.click('button:has-text("Save Record")');
await page.waitForTimeout(500);
await page.click('button:has-text("Calendar")');
await page.waitForTimeout(400);
log("calendar visible:", await page.locator("text=Maintenance Calendar").count());
await page.screenshot({ path: "tests/maintenance-calendar.png" });

// --------- Salary ---------
await page.click('aside button:has-text("Salary")');
await page.waitForTimeout(300);
await page.click('button:has-text("Add Salary")');
await page.waitForTimeout(300);
await page.locator('label:has-text("Fixed Monthly Salary") input').first().fill("35000");
await page.locator('label:has-text("Bonus") input').first().fill("2000");
await page.locator('label:has-text("Advance") input').first().fill("5000");
await page.locator('label:has-text("Deductions") input').first().fill("500");
await page.waitForTimeout(300);
log("net payable:", (await page.locator("text=/Net payable:/").first().innerText()).trim());
await page.click('button:has-text("Cancel")');
await page.waitForTimeout(300);

// --------- Reports export ---------
await page.click('aside button:has-text("Reports")');
await page.waitForTimeout(300);
const dlPromise = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
await page.click('button:has-text("Excel")');
const dl = await dlPromise;
log("xlsx export:", dl ? dl.suggestedFilename() : "FAILED");
const pdfPromise = page.waitForEvent("download", { timeout: 15000 }).catch(() => null);
await page.click('button:has-text("PDF")');
const pdf = await pdfPromise;
log("pdf export:", pdf ? pdf.suggestedFilename() : "FAILED");

// --------- Vehicle maintenance block check (trip) ---------
await page.click("aside button:has-text('Trips')");
await page.waitForTimeout(300);
await page.click('button:has-text("New Trip")');
await page.waitForTimeout(300);
await page.locator('label:has-text("Customer") select').first().selectOption({ index: 1 });
await page.locator('label:has-text("Vehicle") select').first().selectOption({ index: 1 });
const blocked = await page.locator('label:has-text("Trip Status") select').first().selectOption("Loading");
await page.click('button:has-text("Save Trip")');
await page.waitForTimeout(500);
log("maintenance block message:", await page.locator("text=/Under Maintenance/").count());
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// screenshots
await page.click('aside button:has-text("Dashboard")');
await page.waitForTimeout(600);
await page.screenshot({ path: "tests/dashboard.png", fullPage: false });
await page.click('aside button:has-text("Vehicles")');
await page.waitForTimeout(400);
await page.screenshot({ path: "tests/vehicles.png" });

// --------- Driver login ---------
await page.click('button[title="Logout"]');
await page.waitForTimeout(400);
await page.fill("input[type=email]", "driver@ahtransportco.com");
await page.fill("input[type=password]", "driver123");
await page.click("button[type=submit]");
await page.waitForTimeout(900);
log("driver tabs present:", await page.locator("text=My Vehicle & Papers").count());
log("driver sees Salary nav:", await page.locator('aside button:has-text("Salary")').count());
log("driver sees My Trips tab:", await page.locator('button:has-text("My Trips")').count());
await page.click('button:has-text("My Salary")');
await page.waitForTimeout(400);
await page.screenshot({ path: "tests/driver-salary.png" });

// --------- Mobile ---------
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m = await mctx.newPage();
await m.goto(BASE, { waitUntil: "networkidle" });
await m.fill("input[type=email]", "driver@ahtransportco.com");
await m.fill("input[type=password]", "driver123");
await m.click("button[type=submit]");
await m.waitForTimeout(900);
await m.screenshot({ path: "tests/mobile-driver.png" });
log("mobile menu button:", await m.locator("header button").first().count());

log("CONSOLE ERRORS:", errors.length ? errors.slice(0, 10) : "none");
await browser.close();
