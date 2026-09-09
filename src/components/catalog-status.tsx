import Link from "next/link";

const messages = {
  unavailable: { title: "Витрина временно недоступна", text: "Сейчас не получается показать товары и их наличие. Загляните позже." },
  error: { title: "Не удалось загрузить товары", text: "Попробуйте обновить страницу немного позже." },
  loading: { title: "Загружаем товары", text: "Проверяем ассортимент и актуальные цены." },
  empty: { title: "Пока нет доступных товаров", text: "Когда товары появятся в продаже, вы увидите их здесь." },
  missing: { title: "Товар не найден", text: "Возможно, он больше не доступен. Посмотрите другие товары в каталоге." },
};

export function CatalogStatus({ status, product = false }: {
  status: keyof typeof messages; product?: boolean;
}) {
  const message = messages[status];
  return (
    <div className="catalog-status" role="status" aria-busy={status === "loading"}>
      <div className="status-mark" aria-hidden="true"><span>{status === "loading" ? "···" : "—"}</span></div>
      <div><h3>{product && status === "unavailable" ? "Не удалось загрузить товар" : message.title}</h3><p>{message.text}</p>
        {product && <Link className="text-link" href="/catalog">Вернуться в каталог ↗</Link>}
      </div>
    </div>
  );
}
