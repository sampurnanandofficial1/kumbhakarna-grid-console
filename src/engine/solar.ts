export type City={name:string;lat:number;lon:number};
export const CITIES:City[]=[{name:"Lucknow",lat:26.8467,lon:80.9462},{name:"Delhi",lat:28.6139,lon:77.209},{name:"Jaipur",lat:26.9124,lon:75.7873},{name:"Mumbai",lat:19.076,lon:72.8777},{name:"Chennai",lat:13.0827,lon:80.2707},{name:"Bengaluru",lat:12.9716,lon:77.5946}];
export type SolarHour={time:string;hour:number;ghi:number;rechargeKW:number};
export type SolarResult={hours:SolarHour[];mode:"LIVE"|"MODELLED";window:{start:number;end:number;label:string;fallback:boolean};movedKWh:number;city:City;threshold:number};
const dayOfYear=(d:Date)=>{const start=new Date(d.getFullYear(),0,0);return Math.floor((d.getTime()-start.getTime())/86400000);};
function clearSky(city:City,date:Date):number[]{
 const day=dayOfYear(date),gamma=2*Math.PI/365*(day-1),decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 return Array.from({length:24},(_,h)=>{const solarTime=h+(4*(city.lon-82.5))/60,eot=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma)),ha=(solarTime+eot/60-12)*Math.PI/12,lat=city.lat*Math.PI/180,cosz=Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(ha);return cosz>0?1098*cosz*Math.exp(-.057/cosz):0;});
}
export function findWindow(ghi:number[],threshold:number){
 let best={start:-1,end:-1},start=-1;
 for(let i=0;i<=ghi.length;i++){if(i<ghi.length&&ghi[i]>=threshold){if(start<0)start=i;}else if(start>=0){if(i-start>best.end-best.start)best={start,end:i};start=-1;}}
 if(best.start<0)return {start:23,end:29,label:"23:00–05:00 off-peak",fallback:true};
 return {start:best.start,end:best.end,label:String(best.start).padStart(2,"0")+":00–"+String(best.end%24||24).padStart(2,"0")+":00",fallback:false};
}
export async function loadSolar(city:City=CITIES[0],threshold=400):Promise<SolarResult>{
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);tomorrow.setHours(0,0,0,0);
 let ghi:number[]=[],mode:"LIVE"|"MODELLED"="MODELLED";
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6000);
  const url="https://api.open-meteo.com/v1/forecast?latitude="+city.lat+"&longitude="+city.lon+"&hourly=shortwave_radiation&timezone=Asia%2FKolkata&forecast_days=2";
  const res=await fetch(url,{signal:ctrl.signal});clearTimeout(timer);if(!res.ok)throw new Error("Weather API unavailable");
  const json=await res.json() as {hourly?:{time?:string[];shortwave_radiation?:number[]}};
  const times=json.hourly?.time||[],values=json.hourly?.shortwave_radiation||[];
  const rows=times.map((time,i)=>({time,ghi:values[i]??0})).filter(x=>x.time.startsWith(tomorrow.toISOString().slice(0,10)));
  if(rows.length>=24){ghi=rows.slice(0,24).map(x=>x.ghi);mode="LIVE";}
 }catch{mode="MODELLED";}
 if(mode==="MODELLED")ghi=clearSky(city,tomorrow);
 const window=findWindow(ghi,threshold),hours=ghi.map((v,h)=>({time:String(h).padStart(2,"0")+":00",hour:h,ghi:v,rechargeKW:window.fallback?0:(h>=window.start&&h<window.end?Math.max(.1,1.4/(window.end-window.start)):0)}));
 return {hours,mode,window,movedKWh:hours.reduce((s,x)=>s+x.rechargeKW,0),city,threshold};
}
