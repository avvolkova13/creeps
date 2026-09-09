import { CatalogStatus } from "@/components/catalog-status";

export default function Loading() {
  return <main id="main-content" className="page-width inner-page"><section className="panel"><h1>Каталог</h1><CatalogStatus status="loading" /></section></main>;
}
