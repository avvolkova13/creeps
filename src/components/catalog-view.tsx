"use client";

import { useState } from "react";
import type { CatalogState } from "@/lib/catalog";
import { filterProducts } from "@/lib/catalog";
import { parseAmountInput } from "@/lib/amount-input";
import { estimateRublesFromCreeps, formatEstimatedAmount } from "@/lib/currency";
import { projectConfig } from "@/config/project";
import { CatalogStatus } from "./catalog-status";
import { ProductGrid } from "./product-view";
import { CatalogSourceNote } from "./catalog-source-note";

function rubleHint(input: string) {
  const amount = parseAmountInput(input);
  if (amount === null || !Number.isFinite(amount * projectConfig.rublesPerCreep)) return "— ₽";
  return `≈ ${formatEstimatedAmount(estimateRublesFromCreeps(amount), "RUB", 2)}`;
}

export function CatalogView({ state, initialCategory = "" }: { state: CatalogState; initialCategory?: string }) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategory);
  const [condition, setCondition] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const ready = state.status === "ready";
  const categories = ready ? state.categories : [];
  const conditions = ready ? [...new Set(state.products.flatMap((product) => product.condition ? [product.condition] : []))] : [];
  const minPrice = parseAmountInput(min);
  const maxPrice = parseAmountInput(max);
  const invalidMin = min.trim() !== "" && (minPrice === null || !Number.isFinite(minPrice * projectConfig.rublesPerCreep));
  const invalidMax = max.trim() !== "" && (maxPrice === null || !Number.isFinite(maxPrice * projectConfig.rublesPerCreep));
  const reversed = minPrice !== null && maxPrice !== null && minPrice > maxPrice;
  const priceError = invalidMin || invalidMax ? "Введите сумму от нуля, используя цифры и запятую." : reversed ? "Цена «от» не должна превышать цену «до»." : "";
  const products = ready ? filterProducts(state.products, { query, categoryId, condition, minPrice: priceError ? null : minPrice, maxPrice: priceError ? null : maxPrice }) : [];
  const hasFilters = Boolean(query || categoryId || condition || min || max);
  const activeFilters = [
    categoryId ? `Категория: ${categories.find((category) => category.id === categoryId)?.name ?? "недоступна"}` : "",
    min ? `От ${min} Creeps (${rubleHint(min)})` : "",
    max ? `До ${max} Creeps (${rubleHint(max)})` : "",
    condition ? `Состояние: ${condition}` : "",
  ].filter(Boolean);
  const reset = () => { setQuery(""); setCategoryId(""); setCondition(""); setMin(""); setMax(""); };

  return <div className="catalog-layout">
    <div className="catalog-search panel"><label className="eyebrow" htmlFor="catalog-search">Поиск по товарам</label><div className="search-row"><input id="catalog-search" type="search" placeholder="Название скина" value={query} onChange={(event) => setQuery(event.target.value)} /><span aria-hidden="true">↗</span></div></div>
    <aside className="catalog-filters panel" aria-label="Фильтры каталога">
      <div className="filters-heading"><h2>Фильтры</h2><button className="filter-toggle button-secondary" type="button" aria-expanded={filtersOpen} aria-controls="filter-fields" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? "Скрыть" : "Показать"}</button></div>
      {activeFilters.length > 0 && <div className="active-filters" aria-label="Выбранные фильтры"><ul>{activeFilters.map((filter) => <li key={filter}>{filter}</li>)}</ul><button type="button" className="text-link" onClick={reset}>Сбросить всё ×</button></div>}
      <div id="filter-fields" className={`filter-fields ${filtersOpen ? "is-open" : ""}`}>
        <div className="field"><label htmlFor="category-filter">Категория</label><select id="category-filter" value={categoryId} disabled={!ready} onChange={(event) => setCategoryId(event.target.value)}><option value="">Все категории</option>{categoryId && !categories.some((category) => category.id === categoryId) && <option value={categoryId}>Категория недоступна</option>}{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{!ready && <p className="field-hint">Категории появятся вместе с товарами.</p>}</div>
        <fieldset disabled={!ready} className="price-filter"><legend>Цена в Creeps</legend><div className="range-fields">
          <div className="field"><label htmlFor="price-min">От</label><input id="price-min" inputMode="decimal" value={min} onChange={(event) => setMin(event.target.value)} aria-invalid={invalidMin || reversed} aria-describedby="min-rubles price-error" /><span id="min-rubles" className="field-hint">{rubleHint(min)}</span></div>
          <div className="field"><label htmlFor="price-max">До</label><input id="price-max" inputMode="decimal" value={max} onChange={(event) => setMax(event.target.value)} aria-invalid={invalidMax || reversed} aria-describedby="max-rubles price-error" /><span id="max-rubles" className="field-hint">{rubleHint(max)}</span></div>
        </div><p id="price-error" className="field-error" aria-live="polite">{priceError}</p></fieldset>
        {conditions.length > 0 && <div className="field"><label htmlFor="condition-filter">Состояние</label><select id="condition-filter" value={condition} onChange={(event) => setCondition(event.target.value)}><option value="">Все состояния</option>{conditions.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>}
        <button className="button-secondary reset-filters" type="button" onClick={reset} disabled={!hasFilters}>Сбросить фильтры <span aria-hidden="true">×</span></button>
      </div>
    </aside>
    <section className="catalog-results" aria-label="Товары"><div className="results-heading panel"><h2>Товары</h2><span aria-live="polite" className="field-hint">{ready ? `Найдено: ${products.length}` : "Нет данных о наличии"}</span></div>
      {ready && <div className="panel catalog-provenance"><CatalogSourceNote products={state.products} /></div>}
      {state.status !== "ready" ? <div className="panel"><CatalogStatus status={state.status} /></div> : products.length > 0 ? <ProductGrid products={products} categories={categories} /> : hasFilters ? <div className="panel empty-search" role="status"><h3>По вашему запросу ничего не найдено</h3><p>Попробуйте другое название или измените фильтры.</p><button className="button-secondary" onClick={reset}>Сбросить поиск и фильтры</button></div> : <div className="panel"><CatalogStatus status="empty" /></div>}
    </section>
  </div>;
}
