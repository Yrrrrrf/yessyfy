import { test, expect, type Page } from "@playwright/test";
const main = "http://127.0.0.1:5173",
  vision = "http://127.0.0.1:5174",
  api = "http://127.0.0.1:7777";
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5xkAAAAASUVORK5CYII=",
  "base64",
);
async function signin(p: Page, origin: string, phone: string, ret = "/") {
  await p.goto(`${origin}/login?return=${encodeURIComponent(ret)}`);
  await p.locator("[name=phone]").fill(phone);
  await p.getByRole("button", { name: "Enviar código", exact: true }).click();
  await p.locator("[name=otp]").fill("111111");
  await p.getByRole("button", { name: "Verificar", exact: true }).click();
  await expect(p.locator(".user-pill")).toHaveCount(1);
}
async function book(p: Page) {
  await p.goto(`${main}/book`);
  await p.locator("[name=service]").selectOption("plomeria");
  await p
    .locator("textarea[name=description]")
    .fill("Reparar fuga en el lavabo del baño");
  await p.getByRole("button", { name: "Continuar", exact: true }).click();
  await p.locator("[name=street]").fill("Calle de prueba 123");
  await p.locator("[name=city]").selectOption("CDMX");
  await p.locator("[name=postal_code]").fill("01000");
  await p.locator("[name=date]").fill("2026-10-20");
  await p.locator("[name=access]").fill("Entrada lateral");
  await expect(p.locator("[name=slot]")).toBeEnabled();
  await p.locator("[name=slot]").selectOption("09:00-12:00");
  expect(
    await p.locator("form").evaluate((form: HTMLFormElement) =>
      Array.from(form.elements)
        .filter((e: any) => e.willValidate && !e.validity.valid)
        .map((e: any) => ({ name: e.name, message: e.validationMessage })),
    ),
  ).toEqual([]);
  await p
    .getByRole("button", { name: "Revisar cotización", exact: true })
    .click();
  await expect(p.locator(".quote-total")).toBeVisible();
}
async function confirmedBooking(p: Page) {
  await book(p);
  await p
    .getByRole("button", { name: "Confirmar solicitud", exact: true })
    .click();
  await expect(p).toHaveURL(/\/orders\/[^/]+$/);
  return p.url().split("/").at(-1)!;
}
test.beforeEach(async ({ request, page }) => {
  page.on("dialog", (d) => void d.accept());
  await request.post(`${api}/__test/reset`);
});
test("W01–W12 customer, field and operations share one durable order", async ({
  browser,
  request,
}) => {
  const customer = await browser.newContext(),
    worker = await browser.newContext(),
    operator = await browser.newContext();
  const c = await customer.newPage(),
    f = await worker.newPage(),
    o = await operator.newPage();
  const errors: string[] = [];
  for (const p of [c, f, o]) p.on("pageerror", (e) => errors.push(e.message));
  await signin(c, main, "5511111111");
  const id = await confirmedBooking(c);
  await c.reload();
  await expect(
    c.getByRole("heading", { name: "YSF-00001", exact: true }),
  ).toBeVisible();
  await signin(o, vision, "5533333333", `/ops/orders/${id}`);
  await o
    .getByRole("button", { name: "Seleccionar candidato", exact: true })
    .click();
  await o.getByRole("button", { name: "Enviar oferta", exact: true }).click();
  await signin(f, vision, "5522222222", "/radar");
  await f.getByRole("button", { name: "Aceptar oferta", exact: true }).click();
  await expect(f).toHaveURL(`${vision}/jobs/${id}`);
  await f
    .getByRole("button", { name: "Iniciar traslado", exact: true })
    .click();
  await f
    .getByRole("button", { name: "Confirmar llegada", exact: true })
    .click();
  await expect(f.locator(".status-badge")).toHaveText("En ejecución");
  await f
    .getByRole("link", { name: "Proponer trabajo adicional", exact: true })
    .click();
  await f
    .getByLabel("Motivo", { exact: true })
    .fill("Cambiar una válvula adicional");
  await f.getByLabel("Mano de obra · MXN").fill("100");
  await f.getByLabel("Materiales · MXN").fill("50");
  await f
    .getByRole("button", { name: "Proponer trabajo adicional", exact: true })
    .click();
  await c.reload();
  await c.getByRole("link", { name: "Autorizar", exact: true }).click();
  await c.getByRole("button", { name: "Autorizar", exact: true }).click();
  await expect(c.locator(".status-badge")).toHaveText("En ejecución");
  await f.goto(`${vision}/jobs/${id}?tab=evidence`);
  await f.getByRole("button", { name: "Abrir cámara", exact: true }).click();
  await expect(
    f.getByRole("alert").filter({ hasText: "La cámara no está disponible" }),
  ).toBeVisible();
  for (const phase of ["diagnostic_before", "proof_finished"]) {
    if (phase === "diagnostic_before")
      await f.route("**/client/operations/attachEvidence", async (route) => {
        await route.fetch();
        await route.abort("failed");
      });
    await f
      .locator("select")
      .filter({ has: f.locator(`option[value="${phase}"]`) })
      .selectOption(phase);
    await f.locator("input[type=file]").setInputFiles({
      name: `${phase}.png`,
      mimeType: "image/png",
      buffer: image,
    });
    await f
      .getByRole("button", { name: "Subir y adjuntar", exact: true })
      .click();
    if (phase === "diagnostic_before") {
      await expect(f.locator(".upload-row .error-text")).toBeVisible();
      await f.unroute("**/client/operations/attachEvidence");
      await f.reload();
      await f
        .getByRole("button", { name: "Subir y adjuntar", exact: true })
        .click();
    }
    await expect(f.locator(".upload-row")).toHaveCount(0);
  }
  await f
    .getByRole("button", {
      name: "Solicitar revisión del resultado",
      exact: true,
    })
    .click();
  await c.goto(`${main}/orders/${id}?tab=chat`);
  await f.goto(`${vision}/jobs/${id}?tab=chat`);
  await expect(
    c.getByRole("textbox", { name: "Conversación", exact: true }),
  ).toBeVisible();
  await c.context().setOffline(true);
  await f
    .getByRole("textbox", { name: "Conversación", exact: true })
    .fill("La evidencia está completa para tu revisión.");
  await f.getByRole("button", { name: "Enviar mensaje", exact: true }).click();
  await request.post(`${api}/__test/fault`, {
    data: { gap: true, gap_user_id: "customer-1" },
  });
  await c.context().setOffline(false);
  await expect(
    c.locator(".message").filter({ hasText: "La evidencia está completa" }),
  ).toBeVisible();
  await c.getByRole("link", { name: "Revisar resultado", exact: true }).click();
  await c
    .getByRole("button", {
      name: "Aceptar resultado y enviar reseña",
      exact: true,
    })
    .click();
  await o.reload();
  await o
    .getByRole("button", { name: "Aceptar evidencia QA", exact: true })
    .click();
  await o
    .getByRole("button", { name: "Solicitar conciliación", exact: true })
    .click();
  await expect(o.locator(".status-badge")).toHaveText("Completado");
  await c.reload();
  await expect(c.locator(".status-badge")).toHaveText("Completado");
  await c.getByRole("button", { name: "Documentos", exact: true }).click();
  await c
    .getByRole("button", {
      name: "Solicitar documento · Reporte del servicio",
      exact: true,
    })
    .click();
  await expect(
    c.getByText("Preparando documento", { exact: true }),
  ).toBeVisible();
  await expect(
    c.getByRole("link", { name: "Descargar", exact: true }),
  ).toHaveCount(0);
  await c.goto(`${main}/warranties`);
  await expect(c.locator(".warranty-card")).toHaveCount(1);
  await f.goto(`${vision}/wallet`);
  await expect(f.getByText("Pendiente", { exact: true }).first()).toBeVisible();
  await c.screenshot({
    path: "tests/results/main-desktop.png",
    fullPage: true,
  });
  const snapshot = await (await request.get(`${api}/__test/snapshot`)).json();
  expect(snapshot.orders).toHaveLength(1);
  expect(snapshot.orders[0].evidence).toHaveLength(2);
  expect(snapshot.orders[0].finance.payout).toBe("pending");
  expect(errors).toEqual([]);
  await Promise.all([customer.close(), worker.close(), operator.close()]);
});
test("W15 lost booking acknowledgement recovers exactly once after refresh", async ({
  page,
  request,
}) => {
  await signin(page, main, "5511111111");
  await book(page);
  await page.route("**/client/operations/createOrder", async (route) => {
    await route.fetch();
    await route.abort("failed");
  });
  await page
    .getByRole("button", { name: "Confirmar solicitud", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Consultar y recuperar acción",
      exact: true,
    }),
  ).toBeVisible();
  await page.unroute("**/client/operations/createOrder");
  await page.reload();
  await page
    .getByRole("button", { name: "Consultar y recuperar acción", exact: true })
    .click();
  await expect(page).toHaveURL(/\/orders\/[^/]+$/);
  const s = await (await request.get(`${api}/__test/snapshot`)).json();
  expect(s.orders).toHaveLength(1);
});
test("W17 work permissions, OTP verification and expired sessions", async ({
  page,
  request,
}) => {
  await signin(page, vision, "5511111111", "/ops");
  await expect(
    page.getByRole("heading", {
      name: "Este espacio requiere una cuenta autorizada",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar oferta" })).toHaveCount(
    0,
  );
  await signin(page, vision, "5533333333", "/radar");
  await expect(
    page.getByRole("heading", {
      name: "Este espacio requiere una cuenta autorizada",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Disponible para ofertas", exact: true }),
  ).toHaveCount(0);
  await page.goto(`${main}/login`);
  await page.locator("[name=phone]").fill("5511111111");
  await page
    .getByRole("button", { name: "Enviar código", exact: true })
    .click();
  await page.locator("[name=otp]").fill("999999");
  await page.getByRole("button", { name: "Verificar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Incorrect");
  await page.locator("[name=otp]").fill("111111");
  await page.getByRole("button", { name: "Verificar", exact: true }).click();
  await expect(page.locator(".user-pill")).toBeVisible();
  await request.post(`${api}/__test/expire`);
  await expect(page.locator(".user-pill")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Verifica tu celular para continuar",
      exact: true,
    }),
  ).toBeVisible();
});
test("mobile discovery, filters, themes and English preserve request drafts", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signin(page, main, "5511111111");
  await page.goto(`${main}/book`);
  await page.locator("[name=service]").selectOption("electricidad");
  await page
    .locator("textarea[name=description]")
    .fill("Revisión de los contactos del departamento");
  await page.locator("#language").selectOption("en");
  await expect(page.locator("textarea[name=description]")).toHaveValue(
    "Revisión de los contactos del departamento",
  );
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme",
    "vision-dark",
  );
  await page.reload();
  await expect(page.locator("textarea[name=description]")).toHaveValue(
    "Revisión de los contactos del departamento",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "tests/results/mobile-booking.png",
    fullPage: true,
  });
});

test("private onboarding documents and an operations review preserve the operator identity", async ({
  browser,
}) => {
  const worker = await browser.newContext(),
    operator = await browser.newContext();
  const f = await worker.newPage(),
    o = await operator.newPage();
  await signin(f, vision, "5522222222", "/onboarding");
  await f.getByLabel("Documentos", { exact: true }).setInputFiles({
    name: "identity.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(
    f.getByText("✓ identity · identity.png", { exact: true }),
  ).toBeVisible();
  await f
    .getByRole("button", { name: "Enviar perfil a revisión", exact: true })
    .click();
  await expect(f.locator(".page-head .badge")).toHaveText("En revisión");
  await signin(o, vision, "5533333333", "/ops/collaborators");
  await o
    .locator(".panel")
    .filter({
      has: o.getByRole("heading", { name: "Roberto Morales", exact: true }),
    })
    .getByRole("button", { name: "Aceptar verificación", exact: true })
    .click();
  await expect(o.locator(".user-pill")).toHaveText("Mesa");
  await f.reload();
  await expect(f.locator(".page-head .badge")).toHaveText("Verificado");
  await worker.close();
  await operator.close();
});

test("W21/W22 modal dismissal leaves order intact, support is recorded, and filters survive refresh", async ({
  page,
  request,
}) => {
  await signin(page, main, "5511111111");
  const id = await confirmedBooking(page);
  await page
    .getByRole("button", { name: "Revisar cancelación", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".status-badge")).toHaveText("Por asignar");
  await page.goto(`${main}/orders/${id}/help`);
  await page
    .getByLabel("Describe el problema")
    .fill("Necesito confirmar la ventana de visita solicitada");
  await page
    .getByRole("button", { name: "Registrar caso", exact: true })
    .click();
  await expect(
    page.locator(".record-row").filter({ hasText: "Necesito confirmar" }),
  ).toBeVisible();
  const data = await (await request.get(`${api}/__test/snapshot`)).json();
  expect(data.cases).toHaveLength(1);
  await page.goto(`${main}/orders?status=disputed&text=YSF&page=1`);
  await page.reload();
  await expect(
    page.locator(".order-card").filter({ hasText: "YSF-00001" }),
  ).toBeVisible();
  expect(page.url()).toContain("status=disputed");
});

test("desktop and mobile shells pass automated accessibility checks", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto(main);
  await expect(page.locator(".service-card").first()).toBeVisible();
  await page.screenshot({
    path: "tests/results/main-desktop.png",
    fullPage: true,
  });
  let result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await signin(page, vision, "5533333333", "/ops");
  await expect(
    page.getByRole("heading", { name: "Resumen", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "tests/results/vision-desktop.png",
    fullPage: true,
  });
  result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page.goto(`${vision}/ops/dispatch`);
  await expect(page.locator(".leaflet-control-zoom")).toBeVisible();
  await page.goto(`${vision}/ops/templates`);
  await expect(page.locator(".template-row")).toHaveCount(14);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("W16 a changed quotation returns to review and needs a new explicit confirmation", async ({
  page,
  request,
}) => {
  await signin(page, main, "5511111111");
  await book(page);
  await page.route("**/client/operations/createOrder", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        kind: "conflict",
        message: "Quotation changed. Review before confirming.",
      }),
    }),
  );
  await page
    .getByRole("button", { name: "Confirmar solicitud", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dirección y horario", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirmar solicitud", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("[name=street]")).toHaveValue(
    "Calle de prueba 123",
  );
  await page.unroute("**/client/operations/createOrder");
  await page
    .getByRole("button", { name: "Revisar cotización", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar solicitud", exact: true })
    .click();
  await expect(page).toHaveURL(/\/orders\/[^/]+$/);
  expect(
    (await (await request.get(`${api}/__test/snapshot`)).json()).orders,
  ).toHaveLength(1);
});
