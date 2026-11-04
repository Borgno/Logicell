import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../db/client";
import { ADMIN_EMAIL, findUser, setupApp, USER_EMAIL } from "../../test/helpers";
import { clearUserCache, findUserById, updateUser } from "./users.service";

beforeEach(async () => {
  await setupApp();
});

describe("cache do usuário por id", () => {
  it("a segunda leitura não vai ao banco", async () => {
    const { id } = await findUser(USER_EMAIL);
    await findUserById(id);
    // Escrita fora do service: o cache não fica sabendo, e só o TTL a enxerga.
    await prisma.user.update({ where: { id }, data: { name: "Mudado no banco" } });
    expect((await findUserById(id))?.name).toBe("Usuário Comum");

    clearUserCache();
    expect((await findUserById(id))?.name).toBe("Mudado no banco");
  });

  it("escrita pelo service troca a entrada", async () => {
    const admin = await findUser(ADMIN_EMAIL);
    const { id } = await findUser(USER_EMAIL);
    await findUserById(id);
    await updateUser(admin.id, id, { active: false });
    expect((await findUserById(id))?.active).toBe(false);
  });

  it("não guarda id inexistente", async () => {
    expect(await findUserById("00000000-0000-4000-8000-000000000000")).toBeNull();
  });
});
