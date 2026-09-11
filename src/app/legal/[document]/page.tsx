import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { legalDocuments, type LegalDocumentId } from '@/config/legal';

export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(legalDocuments).map(document => ({ document })); }
function getDocument(id: string) { return Object.hasOwn(legalDocuments, id) ? legalDocuments[id as LegalDocumentId] : null; }
export async function generateMetadata({ params }: { params: Promise<{ document: string }> }): Promise<Metadata> {
  return { title: getDocument((await params).document)?.title ?? 'Документ' };
}
export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const doc = getDocument((await params).document);
  if (!doc) notFound();
  return <main id="main-content" className="page-width legal-page">
    <header className="panel legal-heading"><p className="eyebrow">Документы Creeps</p><h1>{doc.title}</h1><p>{doc.intro}</p></header>
    <article className="panel legal-body">
      {doc.sections.map(([title, text], index) => <section key={title}><h2>{index + 1}. {title}</h2><p>{text}</p></section>)}
      <nav aria-label="Другие документы">{Object.entries(legalDocuments).filter(([, item]) => item !== doc).map(([id, item]) => <Link key={id} href={`/legal/${id}`}>{item.title}</Link>)}</nav>
    </article>
  </main>;
}
