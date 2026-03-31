import type { SiteScaffoldContentModel } from "./model";

export function renderSiteContentJson(model: SiteScaffoldContentModel): string {
  return `${JSON.stringify(model, null, 2)}\n`;
}
