import { expect, test } from "@playwright/test";
import { USER, login, loginAsAdmin } from "./helpers";

test("status: cria, renomeia, sobe na ordem, desativa e exclui", async ({ page }) => {
  await loginAsAdmin(page);
  await page.getByRole("link", { name: "Status" }).click();
  await expect(page.getByRole("heading", { name: "Status", level: 1 })).toBeVisible();

  const nome = `AGUARDANDO ${Date.now()}`;
  await page.getByRole("button", { name: "Novo status" }).click();
  const dialog = page.getByRole("dialog", { name: "Novo status" });
  await dialog.getByLabel("Nome").fill(nome);
  await dialog.getByRole("button", { name: "Criar status" }).click();
  const linha = page.getByRole("row", { name: new RegExp(nome) });
  await expect(linha).toContainText("Ativo");

  // Nome repetido aparece no campo.
  await page.getByRole("button", { name: "Novo status" }).click();
  await dialog.getByLabel("Nome").fill(nome.toLowerCase());
  await dialog.getByRole("button", { name: "Criar status" }).click();
  await expect(dialog.getByText("Já existe um status com este nome.")).toBeVisible();
  await page.keyboard.press("Escape");

  const novo = `${nome} CLIENTE`;
  await linha.getByRole("button", { name: `Renomear ${nome}` }).click();
  await page.getByRole("dialog").getByLabel("Nome").fill(novo);
  await page.getByRole("button", { name: "Renomear", exact: true }).click();
  const renomeado = page.getByRole("row", { name: new RegExp(novo) });
  await expect(renomeado).toBeVisible();

  // O último sobe uma posição: troca de lugar com o penúltimo.
  const nomes = () => page.getByRole("row").locator("td:nth-child(2)").allTextContents();
  const antes = await nomes();
  await renomeado.getByRole("button", { name: `Subir ${novo}` }).click();
  await expect.poll(nomes).toEqual([...antes.slice(0, -2), novo, antes.at(-2)]);

  await renomeado.getByRole("button", { name: `Desativar ${novo}` }).click();
  await expect(renomeado).toContainText("Inativo");

  await renomeado.getByRole("button", { name: `Excluir ${novo}` }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
  await expect(renomeado).toBeHidden();
});

test("usuário comum não vê nem acessa a tela de status", async ({ page }) => {
  await login(page, USER.email, USER.password);
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Status" })).toHaveCount(0);

  await page.goto("/status");
  await expect(page).toHaveURL("/");
  const res = await page.request.post("/api/v1/status", { data: { nome: "X" } });
  expect(res.status()).toBe(403);
});
