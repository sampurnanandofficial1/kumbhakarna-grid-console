import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppShell } from "../components/kumbha/ui";

function NotFoundComponent(){return <div className="page-container"><h1>Page not found</h1><p>The route does not exist.</p><Link to="/">Return to Overview</Link></div>;}
function ErrorComponent({error,reset}:ErrorComponentProps){
  console.error(error); const router=useRouter();
  useEffect(()=>{reportLovableError(error,{boundary:"tanstack_root_error_component"});},[error]);
  return <div className="page-container"><h1>This page did not load</h1><p>Try again or return to Overview.</p><button className="btn btn-primary" onClick={()=>{router.invalidate();reset();}}>Try again</button></div>;
}
export const Route=createRootRouteWithContext<{queryClient:QueryClient}>()({
  head:()=>({meta:[{charSet:"utf-8"},{name:"viewport",content:"width=device-width, initial-scale=1"},{title:"Kumbhakarna | Grid-Edge Console"},{name:"description",content:"Residential inverter orchestration for local distribution-grid reliability."},{property:"og:title",content:"Kumbhakarna | Grid-Edge Console"},{property:"og:description",content:"A browser-based simulation of restoration protection and verified flexibility."}],links:[{rel:"stylesheet",href:appCss},{rel:"icon",href:"/favicon.ico",type:"image/x-icon"}]}),
  shellComponent:RootShell,component:RootComponent,notFoundComponent:NotFoundComponent,errorComponent:ErrorComponent
});
function RootShell({children}:{children:ReactNode}){return <html lang="en"><head><HeadContent/></head><body>{children}<Scripts/></body></html>;}
function RootComponent(){const {queryClient}=Route.useRouteContext();return <QueryClientProvider client={queryClient}><AppShell><Outlet/></AppShell></QueryClientProvider>;}
