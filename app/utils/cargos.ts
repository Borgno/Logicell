//Espelha os cargos do servidor (supabase-admin.server.ts). A checagem aqui é só
//para esconder menus/rotas — quem barra de verdade é o middleware da API.
//O valor interno "gestor" aparece na tela como Supervisor.
export type Cargo = "usuario" | "gestor" | "admin";

export const CARGO_LABEL: Record<Cargo, string> = {
  usuario: "Usuário",
  gestor: "Supervisor",
  admin: "Administrador",
};

export function cargoDe(user: any): Cargo {
  const role = user?.app_metadata?.role;
  return role === "admin" || role === "gestor" ? role : "usuario";
}

export const ehAdmin = (user: any) => cargoDe(user) === "admin";

//Supervisor ou acima: dashboard, automações e vínculo de faturistas.
export const ehGestor = (user: any) => cargoDe(user) !== "usuario";
