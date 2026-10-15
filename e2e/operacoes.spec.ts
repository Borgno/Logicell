import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

// A grid só renderiza as colunas visíveis: a tela larga deixa o Status à vista sem rolar de lado.
test.use({ viewport: { width: 1920, height: 1000 } });

// Caminho do dia a dia: a Caixa de Entrada, um filtro por coluna e mover para uma pasta.
test("filtra a Caixa de Entrada e move as operações para uma pasta", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "Caixa de Entrada" }).click();
  await expect(page.getByRole("heading", { name: "Caixa de Entrada" })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "9003" })).toBeVisible();

  await page.getByRole("button", { name: "Filtrar Cliente" }).click({ force: true });
  await page.getByLabel("Valor do filtro").fill("acme");
  await expect(page).toHaveURL(/filtro=cliente%3Acontains%3Aacme/);
  await page.keyboard.press("Escape");
  await expect(page.getByText("2 operações")).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "9003" })).toHaveCount(0);

  await page.getByRole("checkbox", { name: "Select All" }).check();
  await expect(page.getByText("2 selecionadas.")).toBeVisible();
  await page.getByRole("button", { name: "Mover para" }).click();
  await page.getByRole("option", { name: "Destino E2E" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Mover" }).click();
  await expect(page.getByText("2 operações movidas para Destino E2E")).toBeVisible();
  await expect(page.getByText("Nenhuma operação com esses filtros.")).toBeVisible();

  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.getByText("1 operação", { exact: true })).toBeVisible();

  // Placa duplicada pelo filtro na URL: o link guarda a visão.
  await page.goto("/caixa-de-entrada?filtro=placa:duplicados:");
  await expect(page.getByText("Nenhuma operação com esses filtros.")).toBeVisible();

  await page.getByRole("link", { name: "Pastas" }).click();
  await page.getByRole("row", { name: /Destino E2E/ }).click();
  await expect(page.getByRole("gridcell", { name: "9001" })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "9002" })).toBeVisible();
  // As duas placas iguais agora estão na mesma pasta.
  await page.goto(`${new URL(page.url()).pathname}?filtro=placa:duplicados:`);
  await expect(page.getByText("2 operações")).toBeVisible();
});

test("edita uma célula e a planilha sai com as linhas filtradas", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/caixa-de-entrada");
  await expect(page.getByRole("gridcell", { name: "9003" })).toBeVisible();

  const statusCol = await page
    .getByRole("columnheader")
    .evaluateAll(
      (els) => els.findIndex((el) => el.textContent?.trim().toUpperCase().startsWith("STATUS")) + 1,
    );
  const status = page.getByRole("row", { name: /9003/ }).locator(`[aria-colindex="${statusCol}"]`);
  await status.dblclick();
  await page.keyboard.type("CONFERIDO");
  await page.keyboard.press("Enter");
  await expect(status).toHaveText("CONFERIDO");
  await page.reload();
  await expect(
    page.getByRole("row", { name: /9003/ }).locator(`[aria-colindex="${statusCol}"]`),
  ).toHaveText("CONFERIDO");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar" }).click();
  expect((await download).suggestedFilename()).toBe("operacoes-caixa-de-entrada.xlsx");
});

test("arrastar a alça preenche o status nas linhas de baixo, e Ctrl+C copia as células", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "Pastas" }).click();
  await page.getByRole("row", { name: /Destino E2E/ }).click();
  await expect(page.getByRole("gridcell", { name: "9001" })).toBeVisible();

  const statusCol = await page
    .getByRole("columnheader")
    .evaluateAll(
      (els) => els.findIndex((el) => el.textContent?.trim().toUpperCase().startsWith("STATUS")) + 1,
    );
  const cell = (row: number) =>
    page.locator(`[aria-rowindex="${row + 1}"] [aria-colindex="${statusCol}"]`);

  await cell(1).dblclick();
  await page.keyboard.type("EM ANÁLISE");
  await page.keyboard.press("Enter");
  await expect(cell(1)).toHaveText("EM ANÁLISE");

  // Seleciona a célula e arrasta a alça do canto até a linha de baixo.
  await cell(1).click();
  const handle = cell(1).locator(".cursor-crosshair");
  const box = (await handle.boundingBox())!;
  const target = (await cell(2).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + 20, target.y + target.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect(cell(2)).toHaveText("EM ANÁLISE");
  await page.reload();
  await expect(cell(2)).toHaveText("EM ANÁLISE");

  // Arrastar de uma célula a outra seleciona o retângulo; Ctrl+C copia separado por tabulação.
  await cell(1).hover();
  await page.mouse.down();
  await cell(2).hover();
  await page.mouse.up();
  await page.keyboard.press("ControlOrMeta+c");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("EM ANÁLISE\nEM ANÁLISE");
});
