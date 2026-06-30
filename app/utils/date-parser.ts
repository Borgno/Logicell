//Utilitários para parse e sanitização de dados vitais antes de chegarem ao Banco de Dados.
export class DateParser {

  //Converte uma string de data (frequentemente em formatos brasileiros)
  //para um objeto Date seguro para o banco de dados.
  // @param valor String com a data (ex: "26/12/2026")
  // @returns Date object ou null em caso de falha.
  
  static parseDataBrasileiraSegura(valor: string | Date | null | undefined): Date | null {
    if (!valor) return null;  
    // Se já for um objeto Date, validamos sua integridade e normalizamos para UTC meia-noite
    if (valor instanceof Date) {
      if (isNaN(valor.getTime())) return null;
      // Lemos com .getDate() (Local) e não .getUTCDate(), porque o XLSX 
      // monta o Date object usando o fuso local da máquina, o que causava o "shift" pro dia seguinte.
      return new Date(Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate()));
    }
    
    if (typeof valor !== 'string') return null;

    const str = valor.trim();
    let dataFinal: Date | null = null;

    // Regex para formatos Brasileiros: DD/MM/YYYY, DD/MM/YY, DD/MM
    const regexBR = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/;
    const matchBR = str.match(regexBR);

    if (matchBR) {
      const dia = parseInt(matchBR[1], 10);
      const mes = parseInt(matchBR[2], 10) - 1; // Meses em JS são 0-11
      let ano = matchBR[3] ? parseInt(matchBR[3], 10) : new Date().getFullYear();
      
      // Trata anos com 2 dígitos (ex: "26" -> "2026")
      if (ano < 100) ano += 2000; 
      
      dataFinal = new Date(Date.UTC(ano, mes, dia));
    }

    // Regex para formato ISO/SQL: YYYY-MM-DD HH:MM:SS
    // Isso ignora completamente a hora e fuso horário, focando só na data real.
    if (!dataFinal) {
      const regexISO = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/;
      const matchISO = str.match(regexISO);
      if (matchISO) {
        const ano = parseInt(matchISO[1], 10);
        const mes = parseInt(matchISO[2], 10) - 1;
        const dia = parseInt(matchISO[3], 10);
        dataFinal = new Date(Date.UTC(ano, mes, dia));
      }
    }

    // Fallback de segurança para formato genérico se tudo falhar
    if (!dataFinal) {
      const fallback = new Date(str);
      if (!isNaN(fallback.getTime())) {
        dataFinal = new Date(Date.UTC(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()));
      }
    }

    return dataFinal;
  }
}
