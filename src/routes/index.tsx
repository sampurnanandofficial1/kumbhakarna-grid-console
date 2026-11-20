import { createFileRoute } from "@tanstack/react-router";
import { PageScreen } from "../components/kumbha/pages";
export const Route = createFileRoute("/")({
  head:()=>({meta:[{title:"Kumbhakarna | Grid-Edge Console"},{name:"description",content:"A transparent simulation of residential inverter flexibility for distribution-grid reliability."}]}),
  component:()=> <PageScreen page="overview"/>,
});
