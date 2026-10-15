import { describe, expect, it } from "vitest";
import { parseData, parseNumero } from "./valores";

describe("parseData", () => {
  it("aceita DD/MM/AAAA, DD/MM/AA e ISO, à meia-noite UTC", () => {
    expect(parseData("05/03/2026")?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(parseData(" 5/3/26 ")?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
    expect(parseData("2026-03-05T12:00:00Z")?.toISOString()).toBe("2026-03-05T00:00:00.000Z");
  });

  it("recusa data que não existe e texto", () => {
    expect(parseData("31/02/2026")).toBeNull();
    expect(parseData("ontem")).toBeNull();
  });
});

describe("parseNumero", () => {
  it("aceita vírgula decimal com milhar, ponto decimal e R$", () => {
    expect(parseNumero("1.234,56")).toBe(1234.56);
    expect(parseNumero("1234.56")).toBe(1234.56);
    expect(parseNumero("R$ 10,5")).toBe(10.5);
  });

  it("recusa texto", () => {
    expect(parseNumero("abc")).toBeNull();
    expect(parseNumero("")).toBeNull();
  });
});
