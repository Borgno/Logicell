import { redirect } from "react-router";

export function loader() {
  return redirect("/caixa-de-entrada");
}

export default function Index() {
  return null;
}
