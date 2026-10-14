// Espelha os schemas de server/routes/{pastas,regras,prazos}. O frontend não importa o servidor.

export type Pasta = {
  id: number;
  nome: string;
  cor: string | null;
  faturista: { id: string; fullName: string } | null;
};

export type TipoRegra = "agencia" | "cliente" | "produto";

export type Regra = { id: number; tipo: TipoRegra; valor: string; conflito: boolean };

export type PastaComRegras = Pick<Pasta, "id" | "nome" | "cor"> & { regras: Regra[] };

export type PrazoCliente = { id: number; cliente: string; prazoDias: number };

export type Prazos = { padraoDias: number; clientes: PrazoCliente[] };
