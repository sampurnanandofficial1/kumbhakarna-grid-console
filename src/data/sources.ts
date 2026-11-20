export const sources = [
  {
    id: "eacpm",
    label: "EAC-PM Working Paper WP/53/2026, The Duck and The Camel (3 Jul 2026)",
    url: "https://eacpm.gov.in/wp-content/uploads/2026/07/2026.07.03_Working_Paper_Current.pdf",
  },
  {
    id: "powerpeak",
    label: "Power Peak Digest: EAC-PM flags 130 GWh storage need (Jul 2026)",
    url: "https://powerpeakdigest.com/eac-pm-flags-130gwh-storage-need-india/",
  },
  {
    id: "upstox",
    label: "Upstox News: India's evening electricity challenge (Jul 2026)",
    url: "https://upstox.com/news/business-news/latest-updates/why-your-evening-electricity-is-becoming-india-s-biggest-power-challenge/article-196591/",
  },
  {
    id: "curtailment",
    label: "MNRE written reply on solar curtailment, Apr–Jun 2026 (Energetica India)",
    url: "https://www.energetica-india.net/news/india-curtails-8133-gwh-of-solar-power-in-april-june-amid-grid-constraints",
  },
  {
    id: "mopSupply",
    label: "Ministry of Power, Lok Sabha reply (Feb 2026): hours of supply",
    url: "https://powermin.gov.in/sites/default/files/uploads/LS05022026_Eng.pdf",
  },
  {
    id: "leap",
    label: "Borah and Sane, A Review of Outage Reporting by Indian DISCOMs (Sep 2025)",
    url: "https://blog.theleapjournal.org/2025/09/a-review-of-outage-reporting-by-indian.html",
  },
  {
    id: "voll",
    label: "Resource and Energy Economics 77 (2024): value of electricity reliability, Delhi",
    url: "https://www.sciencedirect.com/science/article/pii/S0928765524000010",
  },
  {
    id: "mopMeters",
    label: "Ministry of Power, Rajya Sabha reply (Jul 2026): smart meters and RDSS DT meters",
    url: "https://www.powermin.gov.in/static/uploads/2026/07/f59419a881df9acc24bed8753f6d9fda.pdf",
  },
  {
    id: "mumbai",
    label: "Energy inefficiency in energy-poor households in Mumbai, Energy and Buildings (2025)",
    url: "https://www.sciencedirect.com/science/article/abs/pii/S0378778825012496",
  },
  {
    id: "prayasLoad",
    label: "Prayas (Energy Group): Electricity load patterns",
    url: "https://energy.prayaspune.org/our-work/article-and-blog/electricity-load-patterns",
  },
  {
    id: "iec",
    label: "IEC 60076-7:2018 Loading guide for mineral-oil-immersed power transformers",
    url: null,
  },
  {
    id: "bessRecord",
    label: "pv magazine: Indian state sets record low battery storage tariff (Nov 2025)",
    url: "https://www.pv-magazine.com/2025/11/26/indian-state-sets-record-low-battery-storage-tariff/",
  },
  { id: "msedcl", label: "SolarQuarter: MSEDCL 2-hour BESS award (22 Sep 2026)", url: null },
  {
    id: "shivalik",
    label: "DERC order approving BRPL Shivalik BESS, via Saur Energy (11 Sep 2026)",
    url: null,
  },
  {
    id: "luminous",
    label: "Luminous ConnectX product page",
    url: "https://www.luminousindia.com/digital-solution/connect-x",
  },
  {
    id: "ceaCyber",
    label: "CEA Cyber Security in Power Sector Regulations, 2024 (draft)",
    url: "https://cea.nic.in/wp-content/uploads/notification/2024/08/Draft_CEA_Cyber_Security_in_Power_Sectyor_Regulations_2024_English_Version.pdf",
  },
  {
    id: "eskom",
    label: "ECR News (South Africa): warning on post-load-shedding recharge frenzy",
    url: "https://www.ecr.co.za/news/news/recharge-frenzy-when-load-shedding-ramokgopa-worried/",
  },
  { id: "openmeteo", label: "Open-Meteo Forecast API (CC BY 4.0)", url: "https://open-meteo.com/" },
  {
    id: "team",
    label: "Team AA Jewels, Kumbhakarna Research & Strategy Master Report (3 Oct 2026), internal",
    url: null,
  },
] as const;
export const sourceById = Object.fromEntries(sources.map((s) => [s.id, s]));
