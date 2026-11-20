export const PAGE_LABELS = {
  restoration: "Restoration Lab",
  scenarios: "81 Scenarios",
  flex: "Flex Events",
  household: "Household App",
  console: "DISCOM Console",
  economics: "Business Case",
  method: "Method & Evidence",
} as const;

export type PageId = keyof typeof PAGE_LABELS;

export function isPageId(value: string): value is PageId {
  return Object.prototype.hasOwnProperty.call(PAGE_LABELS, value);
}

export function getPageTitle(value: string): string {
  return isPageId(value) ? PAGE_LABELS[value] : "Page not found";
}
