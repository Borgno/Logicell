import type { RouteHandler } from "@hono/zod-openapi";
import {
  createUser,
  getUser,
  listUsers,
  resetPassword,
  updateUser,
} from "../../services/users/users.service";
import type { HonoEnv } from "../../types";
import type {
  createPasswordResetRoute,
  createUserRoute,
  getUserRoute,
  listUsersRoute,
  updateUserRoute,
} from "./users.routes";

export const listUsersHandler: RouteHandler<typeof listUsersRoute, HonoEnv> = async (c) => {
  return c.json(await listUsers(c.req.valid("query")), 200);
};

export const createUserHandler: RouteHandler<typeof createUserRoute, HonoEnv> = async (c) => {
  const user = await createUser(c.get("user").id, c.req.valid("json"));
  c.header("Location", `/api/v1/users/${user.id}`);
  return c.json(user, 201);
};

export const getUserHandler: RouteHandler<typeof getUserRoute, HonoEnv> = async (c) => {
  return c.json(await getUser(c.req.valid("param").id), 200);
};

export const updateUserHandler: RouteHandler<typeof updateUserRoute, HonoEnv> = async (c) => {
  const user = await updateUser(c.get("user").id, c.req.valid("param").id, c.req.valid("json"));
  return c.json(user, 200);
};

// Sem Location: o reset não tem endereço próprio para consultar depois.
export const createPasswordResetHandler: RouteHandler<
  typeof createPasswordResetRoute,
  HonoEnv
> = async (c) => {
  const reset = await resetPassword(c.get("user").id, c.req.valid("param").id);
  return c.json(reset, 201);
};
