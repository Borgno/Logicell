import { data } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { requireUser } from "~/services/auth.server";
import prisma from "~/lib/prisma.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { response } = await requireUser(request);

  const url = new URL(request.url);
  const operacaoId = url.searchParams.get("id");
  const pastaId = url.searchParams.get("pastaId");
  const usuarioFiltro = url.searchParams.get("usuario");
  const intent = url.searchParams.get("intent");

  // Caso queira apenas a lista de usuários únicos para o filtro
  if (intent === "getUsers") {
    const usuarios = await prisma.auditoria.findMany({
      distinct: ['usuario'],
      select: { usuario: true },
      orderBy: { usuario: 'asc' }
    });
    return data({ usuarios: usuarios.map(u => u.usuario) }, { headers: response.headers });
  }

  const where: any = {};
  
  if (operacaoId && !isNaN(Number(operacaoId))) {
    where.operacaoId = Number(operacaoId);
  } else if (pastaId !== null) {
    where.operacao = {
      pastaId: pastaId === "null" || pastaId === "" ? null : Number(pastaId)
    };
  }

  if (usuarioFiltro) {
    where.usuario = usuarioFiltro;
  }

  const historico = await prisma.auditoria.findMany({
    where,
    include: {
      operacao: {
        select: { nr_ctrc: true, nm_agencia: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 150 // Aumentado um pouco o limite
  });

  return data({ historico }, { headers: response.headers });
}

export default function Auditoria() { return null; }
