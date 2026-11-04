// Tira os acentos e mantém o resto: "Caminhão" -> "Caminhao". Base de busca, chave e slug.
export function semAcento(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
