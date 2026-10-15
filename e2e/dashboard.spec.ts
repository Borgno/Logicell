import { expect, test } from "@playwright/test";
import { login, loginAsAdmin, USER } from "./helpers";

test("admin vê as operações por faturista, abre o detalhe e filtra; embaixo, os usuários", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  const porFaturista = page.getByRole("region", { name: "Por faturista" });
  // As operações do banco do E2E estão na Caixa de Entrada: tudo é "Sem faturista".
  const sem = porFaturista.getByRole("button", { name: /Sem faturista/ });
  await expect(sem).toContainText("3 documentos");

  await sem.click();
  await expect(porFaturista.getByText("Valor total")).toBeVisible();
  await porFaturista.getByRole("button", { name: /^BETA E2E/ }).click();
  await expect(
    porFaturista.getByRole("button", { name: "Remover filtro Top clientes" }),
  ).toBeVisible();
  await expect(porFaturista.getByText("R$ 1.500,00").first()).toBeVisible();

  // Filtro global na URL: o link guarda a visão.
  await page.getByRole("combobox", { name: "Cliente" }).click();
  await page.getByRole("option", { name: "ACME E2E" }).click();
  await expect(page).toHaveURL(/cliente=ACME\+E2E/);
  await expect(sem).toContainText("2 documentos");
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(sem).toContainText("3 documentos");

  const usuarios = page.getByRole("region", { name: "Usuários" });
  await expect(usuarios.getByRole("heading", { name: "Usuários por cargo" })).toBeVisible();
  const recent = usuarios.getByRole("heading", { name: "Últimos acessos" }).locator("..");
  await recent.getByRole("link", { name: /Administrador/ }).click();
  await expect(page).toHaveURL(/\/users\?userId=/);
});

test("usuário comum vê só as pastas dele, sem filtro de faturista nem os números de usuários", async ({
  page,
}) => {
  await login(page, USER.email, USER.password);
  await expect(page.getByText("As operações das suas pastas.")).toBeVisible();
  // Ele não é faturista de nenhuma pasta no banco do E2E.
  await expect(page.getByText("Nenhuma operação com esses filtros.")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Faturista" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Usuários" })).toHaveCount(0);
});
