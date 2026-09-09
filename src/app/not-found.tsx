import Link from "next/link";

export default function NotFound() {
  return <main id="main-content" className="page-width inner-page"><section className="panel not-found"><p className="eyebrow">404</p><h1>Страница не найдена</h1><p>Проверьте адрес или вернитесь в каталог.</p><Link className="button-primary" href="/catalog">В каталог ↗</Link></section></main>;
}
