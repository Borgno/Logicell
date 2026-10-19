import { expect, test, type Page } from "@playwright/test";
import { USER, login, loginAsAdmin } from "./helpers";

const unique = (prefix: string) => `${prefix} ${Date.now()}`;

async function createPasta(page: Page, nome: string) {
  await page.goto("/pastas");
  await page.getByRole("button", { name: "Nova pasta" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova pasta" });
  await dialog.getByLabel("Nome").fill(nome);
  await dialog.getByRole("button", { name: "Verde" }).click();
  await dialog.getByRole("button", { name: "Criar pasta" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: nome })).toBeVisible();
}

test("pasta: cria pela lista, edita, filtra e exclui", async ({ page }) => {
  await loginAsAdmin(page);
  const nome = unique("Pasta E2E");
  await createPasta(page, nome);

  await page.getByRole("button", { name: "Editar" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar pasta" });
  await dialog.getByLabel("Nome").fill(`${nome} editada`);
  await dialog.getByRole("combobox", { name: "Faturista" }).click();
  await page.getByRole("option", { name: "Usuário Comum" }).click();
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("heading", { name: `${nome} editada` })).toBeVisible();
  await expect(page.getByText("Faturista: Usuário Comum")).toBeVisible();

  // Na lista, busca e cor vão para a URL e para a API.
  await page.goto(`/pastas?search=${encodeURIComponent("editada")}&cor=%233b82f6`);
  await expect(page.getByText("Nenhuma pasta encontrada")).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Azul" }).click();
  await expect(page.getByRole("row", { name: new RegExp(`${nome} editada`) })).toBeVisible();
  await page.getByRole("row", { name: new RegExp(`${nome} editada`) }).click();

  await page.getByRole("button", { name: "Excluir pasta" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir pasta" }).click();
  await expect(page).toHaveURL("/pastas");
  await expect(page.getByRole("row", { name: new RegExp(`${nome} editada`) })).toHaveCount(0);
});

test("usuário comum cria pasta sem o campo de faturista e não vê automações", async ({ page }) => {
  await login(page, USER.email, USER.password);
  await expect(page).toHaveURL("/");
  await page.getByRole("link", { name: "Pastas" }).click();
  await page.getByRole("button", { name: "Nova pasta" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova pasta" });
  await expect(dialog.getByLabel("Nome")).toBeVisible();
  await expect(dialog.getByText("Faturista")).toHaveCount(0);
  await page.keyboard.press("Escape");

  await expect(page.getByRole("link", { name: "Automações" })).toHaveCount(0);
  await page.goto("/automacoes");
  await expect(page).toHaveURL("/");
});

test("automações: regra repetida em duas pastas genéricas aparece em conflito", async ({
  page,
}) => {
  await loginAsAdmin(page);
  const cliente = `CLIENTE ${Date.now()}`;
  const alfa = unique("Alfa");
  const beta = unique("Beta");
  for (const nome of [alfa, beta]) await createPasta(page, nome);

  for (const nome of [alfa, beta]) {
    await page.goto(`/automacoes`);
    await page.getByLabel("Buscar pasta").fill(nome);
    await page.getByRole("button", { name: new RegExp(nome) }).click();
    const drawer = page.getByRole("dialog", { name: nome });
    await drawer.getByLabel("Valor").fill(cliente.toLowerCase());
    await drawer.getByRole("button", { name: "Adicionar regra" }).click();
    await expect(drawer.getByRole("list", { name: "Regras de Cliente" })).toContainText(cliente);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
  }

  // A busca acha a pasta também pelo valor de uma regra, e o card diz qual regra bateu.
  await page.getByLabel("Buscar pasta").fill(cliente.toLowerCase());
  for (const nome of [alfa, beta]) {
    await expect(page.getByRole("button", { name: new RegExp(nome) })).toContainText(cliente);
  }

  // A pasta foi criada verde: o filtro azul esconde, o verde mostra.
  const main = page.getByRole("main");
  await page.getByLabel("Buscar pasta").fill(alfa);
  await main.getByRole("button", { name: "Azul" }).click();
  await expect(page.getByText("Nenhuma pasta encontrada")).toBeVisible();
  await main.getByRole("button", { name: "Verde" }).click();
  await expect(page.getByRole("button", { name: new RegExp(alfa) })).toBeVisible();

  // As duas pastas ficam marcadas, não só a da última regra.
  for (const nome of [alfa, beta]) {
    await page.getByLabel("Buscar pasta").fill(nome);
    await expect(page.getByRole("button", { name: new RegExp(nome) })).toContainText(
      "1 em conflito",
    );
  }
});

test("prazos: troca o padrão e cria uma exceção", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "Prazos de emissão" }).click();
  await page.getByLabel("Dias").fill("12");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Prazo padrão salvo")).toBeVisible();

  const cliente = `ACME ${Date.now()}`;
  await page.getByRole("button", { name: "Nova exceção" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova exceção" });
  await dialog.getByLabel("Cliente").fill(cliente.toLowerCase());
  await dialog.getByLabel("Prazo em dias").fill("30");
  await dialog.getByRole("button", { name: "Criar exceção" }).click();
  await expect(page.getByRole("row", { name: new RegExp(cliente) })).toContainText("30 dias");

  await page.reload();
  await expect(page.getByLabel("Dias")).toHaveValue("12");
});
