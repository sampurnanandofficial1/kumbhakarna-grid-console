import { createFileRoute } from "@tanstack/react-router";
import { PageScreen } from "../components/kumbha/pages";
function Pending(){return <main className="page-container"><div className="skeleton-title"/><div className="skeleton-card"/></main>;}
export const Route = createFileRoute("/$page")({
  ssr:false,
  pendingComponent:Pending,
  head:({params})=>({meta:[{title:"Kumbhakarna | "+params.page},{name:"description",content:"Kumbhakarna Grid-Edge Console prototype."}]}),
  component:()=>{const {page}=Route.useParams();return <PageScreen page={page as "restoration"|"scenarios"|"flex"|"household"|"console"|"economics"|"method"/>;},
});
