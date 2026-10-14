// Espelha o UserSchema de server/routes/users/users.schemas.ts. O frontend não importa o servidor
// (regra do ESLint), então o contrato é repetido aqui.
// `gestor` aparece como "Supervisor" na tela.
export type Role = "admin" | "gestor" | "user";

export type User = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  // Supervisor do atendente. Só o cargo `user` tem.
  supervisor: { id: string; fullName: string } | null;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};
