import { expect, test, type Page } from "@playwright/test";
import ExcelJS from "exceljs";
import { USER, login, loginAsAdmin } from "./helpers";

// Planilha no formato do ERP, com a linha de totais em cima do cabeçalho.
async function planilha(ctes: string[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório");
  sheet.addRow(["", "", "", "TOTAL"]);
  sheet.addRow(["nm_agencia", "nm_pessoa_pagador", "nr_ctrc", "nr_nf", "vl_total"]);
  for (const cte of ctes) sheet.addRow(["MATRIZ - SP", "IMPORTADA E2E", cte, `NF${cte}`, 100]);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function importar(page: Page, nome: string, ctes: string[]) {
  await page.getByRole("button", { name: "Importar planilha" }).click();
  const dialog = page.getByRole("dialog", { name: "Importar planilha" });
  await dialog.getByLabel("Planilha", { exact: true }).setInputFiles({
    name: nome,
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: await planilha(ctes),
  });
  // Apenas adicionar: o Substituir apagaria as operações que os outros testes usam.
  await dialog.getByLabel("Apenas adicionar").check();
  await dialog.getByRole("button", { name: "Importar" }).click();
  await expect(dialog).toBeHidden();
}

test("importa pela Caixa de Entrada e desfaz a importação seguinte", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "Caixa de Entrada" }).click();
  await importar(page, "primeira.xlsx", ["8001"]);
  await expect(page.getByText("Planilha importada")).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "8001" })).toBeVisible();

  await page.getByRole("link", { name: "Importações" }).click();
  await importar(page, "segunda.xlsx", ["8002"]);
  await expect(page.getByRole("row", { name: /segunda\.xlsx/ })).toContainText("Versão atual");

  const primeira = page.getByRole("row", { name: /primeira\.xlsx/ });
  await primeira.getByRole("button", { name: "Voltar para esta" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("1 importação desfeita.")).toBeVisible();
  await expect(page.getByRole("row", { name: /segunda\.xlsx/ })).toHaveCount(0);

  await page.getByRole("link", { name: "Caixa de Entrada" }).click();
  await expect(page.getByRole("gridcell", { name: "8001" })).toBeVisible();
  await expect(page.getByRole("gridcell", { name: "8002" })).toHaveCount(0);
});

test("planilha sem as colunas obrigatórias mostra o erro no modal", async ({ page }) => {
  await login(page, USER.email, USER.password);
  await expect(page).toHaveURL("/");
  await page.goto("/importacoes");
  await page.getByRole("button", { name: "Importar planilha" }).click();
  const dialog = page.getByRole("dialog", { name: "Importar planilha" });
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("x").addRows([
    ["Agência", "CTRC"],
    ["MATRIZ - SP", "1"],
  ]);
  await dialog.getByLabel("Planilha", { exact: true }).setInputFiles({
    name: "errada.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
  });
  await dialog.getByRole("button", { name: "Importar" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Colunas obrigatórias faltando: NF, VALOR TOTAL",
  );
  // Usuário comum importa, mas não vê o botão de voltar.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Voltar para esta" })).toHaveCount(0);
});
