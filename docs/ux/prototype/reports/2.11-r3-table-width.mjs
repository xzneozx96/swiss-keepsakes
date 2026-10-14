// Round 3 (worker S): M06 Table width at 1024 on every departure, EN and DE: scroll container scrollWidth/clientWidth
// and the number of dashed boxes in the table. Run next to 2.10-lib.mjs against 5233: node 2.11-r3-table-width.mjs
import * as d from "./2.10-lib.mjs";
const { browser, page } = await d.open(1024);
await d.reset(page, "owner");
await d.go(page, "/store", 1200);
const ids = (await d.state(page)).data.tours.departures.map((x) => x.id);
for (const lang of ["EN", "DE"]) {
  for (const id of ids) {
    await d.go(page, `/store/bookings/departures/${id}`, 900);
    if (lang === "DE") await d.setLang(page, "DE");
    const r = await page.evaluate(() => { const t = document.querySelector("main table"); if (!t) return "no table"; const sc = t.parentElement; return `${sc.scrollWidth}/${sc.clientWidth} boxes ${t.querySelectorAll(".border-dashed").length}`; });
    console.log(lang, id, r);
  }
}
await browser.close();
