"use client";

import { useState } from "react";
import { useCatalogSearch, setCatalogParam, clearCatalogFilters } from "./use-catalog-search";
import type { CatalogState, CatalogSort } from "@/lib/catalog";
import { filterProducts, sortProducts } from "@/lib/catalog";
import { parseAmountInput } from "@/lib/amount-input";
import { estimateRublesFromCreeps, formatEstimatedAmount } from "@/lib/currency";
import { projectConfig } from "@/config/project";
import { CatalogStatus } from "./catalog-status";
import { ProductGrid } from "./product-view";

const TYPE_LABELS: Record<string, string> = {knife: "Ножи", gloves: "Перчатки", pistol: "Пистолеты", smg: "Пистолеты-пулемёты", rifle: "Штурмовые винтовки", sniper_rifle: "Снайперские винтовки", shotgun: "Дробовики", machinegun: "Пулемёты"};
const COLORS: Record<string, [string, string]> = {red: ["Красный", "#ee5253"], orange: ["Оранжевый", "#ff9b48"], yellow: ["Жёлтый", "#f8df65"], green: ["Зелёный", "#a6e857"], blue: ["Синий", "#589afa"], purple: ["Фиолетовый", "#ad7eec"], pink: ["Розовый", "#f098cd"], white: ["Белый", "#edf5f6"], gray: ["Серый", "#8a97a9"], black: ["Чёрный", "#121720"]};
const EDITIONS = [{id:"stattrak", label:"StatTrak™"}, {id:"souvenir", label:"Сувенирные"}, {id:"vanilla", label:"Ванилла · только ножи"}];
const SORTS: {id: CatalogSort; label: string}[] = [{id:"recommended",label:"По умолчанию"},{id:"price-asc",label:"Цена по возрастанию"},{id:"price-desc",label:"Цена по убыванию"},{id:"quality",label:"Лучшее качество"},{id:"popularity",label:"Популярность"},{id:"discount",label:"Лучшие сделки"}];
const CONDITION_ORDER = ["Прямо с завода", "Немного поношенное", "После полевых испытаний", "Поношенное", "Закалённое в боях", "Без окраски"];
const unique = (values: (string | undefined)[]) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a,b) => a.localeCompare(b,"ru"));

type Choice = {id: string; label: string; count?: number};
function Choices({title, choices, selected, onChange, open = false, searchable = false}: {title: string; choices: Choice[]; selected: string[]; onChange: (items: string[]) => void; open?: boolean; searchable?: boolean}) {
  const [search, setSearch] = useState("");
  const visible = choices.filter(choice => choice.label.toLocaleLowerCase("ru").includes(search.toLocaleLowerCase("ru")));
  return <details className="filter-group" open={open || undefined}>
    <summary>{title}<span>{selected.length || ""}</span></summary>
    {searchable && <input className="weapon-search" type="search" aria-label={`Поиск: ${title}`} placeholder="Найти оружие" value={search} onChange={event => setSearch(event.target.value)} />}
    <div className="filter-options">{visible.map(choice => <label className="filter-choice" key={choice.id}>
      <input type="checkbox" checked={selected.includes(choice.id)} onChange={() => onChange(selected.includes(choice.id) ? selected.filter(id => id !== choice.id) : [...selected, choice.id])} />
      <span>{choice.label}</span>{choice.count != null && <small>{choice.count}</small>}
    </label>)}{!visible.length && <p className="field-hint">Совпадений нет</p>}</div>
  </details>;
}
function rubleHint(input: string) {
  const amount = parseAmountInput(input);
  if (amount === null || !Number.isFinite(amount * projectConfig.rublesPerCreep)) return "— ₽";
  return `≈ ${formatEstimatedAmount(estimateRublesFromCreeps(amount), "RUB", 2)}`;
}
function rangeError(min: string, max: string, limit: number, label: string) {
  const low = parseAmountInput(min), high = parseAmountInput(max);
  if ((min.trim() && (low === null || low > limit)) || (max.trim() && (high === null || high > limit))) return `${label}: введите число от 0${limit === 1 ? " до 1" : ""}.`;
  return low !== null && high !== null && low > high ? `${label}: значение «от» не должно превышать «до».` : "";
}

export function CatalogView({state, initialSearch = ""}: {state: CatalogState; initialSearch?: string}) {
  const params = useCatalogSearch(initialSearch);
  const query = params.get("q") ?? "";
  const setQuery = (value: string) => setCatalogParam("q", value);
  const min = params.get("min") ?? "";
  const setMin = (value: string) => setCatalogParam("min", value);
  const max = params.get("max") ?? "";
  const setMax = (value: string) => setCatalogParam("max", value);
  const floatMin = params.get("floatMin") ?? "";
  const setFloatMin = (value: string) => setCatalogParam("floatMin", value);
  const floatMax = params.get("floatMax") ?? "";
  const setFloatMax = (value: string) => setCatalogParam("floatMax", value);
  const stickerQuery = params.get("stickerQuery") ?? "";
  const setStickerQuery = (value: string) => setCatalogParam("stickerQuery", value);
  const categoryIds = params.getAll("category");
  const setCategoryIds = (value: string[]) => setCatalogParam("category", value);
  const conditions = params.getAll("condition");
  const setConditions = (value: string[]) => setCatalogParam("condition", value);
  const weapons = params.getAll("weapon");
  const setWeapons = (value: string[]) => setCatalogParam("weapon", value);
  const itemTypes = params.getAll("type");
  const setItemTypes = (value: string[]) => setCatalogParam("type", value);
  const rarities = params.getAll("rarity");
  const setRarities = (value: string[]) => setCatalogParam("rarity", value);
  const colors = params.getAll("color");
  const setColors = (value: string[]) => setCatalogParam("color", value);
  const editions = params.getAll("edition");
  const setEditions = (value: string[]) => setCatalogParam("edition", value);
  const tradeLock = ["locked", "unlocked"].includes(params.get("tradeLock") ?? "") ? params.get("tradeLock")! : "";
  const setTradeLock = (value: string) => setCatalogParam("tradeLock", value);
  const hasStickers = params.get("stickers") === "1";
  const setHasStickers = (value: boolean) => setCatalogParam("stickers", value ? "1" : "");
  const sort = SORTS.find(option => option.id === params.get("sort"))?.id ?? "recommended";
  const setSort = (value: CatalogSort) => setCatalogParam("sort", value === "recommended" ? "" : value);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const ready = state.status === "ready";
  const inventory = ready ? state.products : [];
  const categories = ready ? state.categories : [];
  const priceError = rangeError(min, max, Number.MAX_VALUE / projectConfig.rublesPerCreep, "Цена");
  const floatError = rangeError(floatMin, floatMax, 1, "Float");
  const filtered = filterProducts(inventory, {query, categoryId:"", condition:"", categoryIds, conditions, weapons, itemTypes, rarities, colors, editions, minPrice: priceError ? null : parseAmountInput(min), maxPrice: priceError ? null : parseAmountInput(max), minFloat: floatError ? null : parseAmountInput(floatMin), maxFloat: floatError ? null : parseAmountInput(floatMax), tradeLock, hasStickers, stickerQuery});
  const products = sortProducts(filtered, sort);
  const chips: {label: string; remove: () => void}[] = [];
  const addGroup = (values: string[], setter: (values: string[]) => void, label: (id: string) => string = id => id) => values.forEach(value => chips.push({label:label(value), remove:() => setter(values.filter(id => id !== value))}));
  addGroup(categoryIds, setCategoryIds, id => categories.find(category => category.id === id)?.name ?? id);
  addGroup(conditions, setConditions); addGroup(weapons, setWeapons);
  addGroup(itemTypes, setItemTypes, id => TYPE_LABELS[id] ?? id); addGroup(rarities, setRarities);
  addGroup(colors, setColors, id => COLORS[id]?.[0] ?? id); addGroup(editions, setEditions, id => EDITIONS.find(edition => edition.id === id)?.label ?? id);
  if (query) chips.push({label:`Поиск: ${query}`,remove:() => setQuery("")});
  if (min) chips.push({label:`От ${min} Creeps (${rubleHint(min)})`,remove:() => setMin("")});
  if (max) chips.push({label:`До ${max} Creeps (${rubleHint(max)})`,remove:() => setMax("")});
  if (floatMin) chips.push({label:`Float от ${floatMin}`,remove:() => setFloatMin("")});
  if (floatMax) chips.push({label:`Float до ${floatMax}`,remove:() => setFloatMax("")});
  if (tradeLock) chips.push({label:tradeLock === "unlocked" ? "Без трейдлока у источника" : "С трейдлоком у источника",remove:() => setTradeLock("")});
  if (hasStickers) chips.push({label:"С наклейками / брелоками",remove:() => setHasStickers(false)});
  if (stickerQuery) chips.push({label:`Наклейка / брелок: ${stickerQuery}`,remove:() => setStickerQuery("")});
  const reset = () => { setResetVersion(version => version + 1); clearCatalogFilters(); };
  const attributeChoices = (key: "weapon" | "itemType" | "rarity", labels: Record<string,string> = {}): Choice[] => unique(inventory.map(product => product.attributes?.[key])).map(id => ({id, label:labels[id] ?? id, count:inventory.filter(product => product.attributes?.[key] === id).length}));
  return <div className="catalog-layout">
    <div className="catalog-search panel"><label className="eyebrow" htmlFor="catalog-search">Поиск по товарам</label><div className="search-row"><input id="catalog-search" type="search" placeholder="Название скина или оружия" value={query} onChange={event => setQuery(event.target.value)} /></div></div>
    <aside className="catalog-filters panel" aria-label="Фильтры каталога">
      <div className="filters-heading"><h2>Фильтры</h2><button className="filter-toggle button-secondary" type="button" aria-expanded={filtersOpen} aria-controls="filter-fields" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? "Скрыть" : "Показать"}{chips.length > 0 ? ` (${chips.length})` : ""}</button></div>
      <div id="filter-fields" className={`filter-fields ${filtersOpen ? "is-open" : ""}`}>
        <Choices title="Категории" open choices={categories.map(category => ({id:category.id,label:category.name,count:inventory.filter(product => product.categoryId === category.id).length}))} selected={categoryIds} onChange={setCategoryIds} />
        <Choices title="Тип оружия" choices={attributeChoices("itemType", TYPE_LABELS)} selected={itemTypes} onChange={setItemTypes} />
        <Choices key={`weapons-${resetVersion}`} title="Оружие" searchable choices={attributeChoices("weapon")} selected={weapons} onChange={setWeapons} />
        <fieldset disabled={!ready} className="price-filter"><legend>Цена в Creeps</legend><div className="range-fields">
          <div className="field"><label htmlFor="price-min">От</label><input id="price-min" inputMode="decimal" placeholder="0" value={min} onChange={event => setMin(event.target.value)} aria-invalid={Boolean(priceError)} aria-describedby="min-rubles price-error" /><span id="min-rubles" className="field-hint">{rubleHint(min)}</span></div>
          <div className="field"><label htmlFor="price-max">До</label><input id="price-max" inputMode="decimal" value={max} onChange={event => setMax(event.target.value)} aria-invalid={Boolean(priceError)} aria-describedby="max-rubles price-error" /><span id="max-rubles" className="field-hint">{rubleHint(max)}</span></div>
        </div><p id="price-error" className="field-error" aria-live="polite">{priceError}</p></fieldset>
        <Choices title="Состояние" open choices={CONDITION_ORDER.filter(id => inventory.some(product => product.condition === id)).map(id => ({id,label:id,count:inventory.filter(product => product.condition === id).length}))} selected={conditions} onChange={setConditions} />
        <details className="filter-group"><summary>Float<span>{floatMin || floatMax ? "1" : ""}</span></summary><div className="range-fields">
          <div className="field"><label htmlFor="float-min">От</label><input id="float-min" inputMode="decimal" placeholder="0" value={floatMin} onChange={event => setFloatMin(event.target.value)} aria-invalid={Boolean(floatError)} aria-describedby="float-error" /></div>
          <div className="field"><label htmlFor="float-max">До</label><input id="float-max" inputMode="decimal" placeholder="1" value={floatMax} onChange={event => setFloatMax(event.target.value)} aria-invalid={Boolean(floatError)} aria-describedby="float-error" /></div>
        </div><p className="field-hint">Меньше float — меньше износ</p><p id="float-error" className="field-error" aria-live="polite">{floatError}</p></details>
        <Choices title="Редкость" choices={attributeChoices("rarity")} selected={rarities} onChange={setRarities} />
        <details className="filter-group"><summary>Цвет<span>{colors.length || ""}</span></summary><div className="color-options">{unique(inventory.flatMap(product => [...(product.attributes?.colors ?? [])])).map(color => <button key={color} className="color-choice" type="button" aria-label={COLORS[color]?.[0] ?? color} title={COLORS[color]?.[0] ?? color} aria-pressed={colors.includes(color)} onClick={() => setColors(colors.includes(color) ? colors.filter(value => value !== color) : [...colors,color])}><span style={{backgroundColor:COLORS[color]?.[1] ?? color}} />{colors.includes(color) && <b aria-hidden="true">✓</b>}</button>)}</div></details>
        <Choices title="Особенности" choices={EDITIONS} selected={editions} onChange={setEditions} />
        <details className="filter-group"><summary>Наклейки и брелоки<span>{hasStickers || stickerQuery ? "1" : ""}</span></summary><label className="filter-choice"><input type="checkbox" checked={hasStickers} onChange={event => setHasStickers(event.target.checked)} /><span>Только с наклейками / брелоками</span></label><label className="field" htmlFor="sticker-search">Название<input id="sticker-search" type="search" placeholder="Например, Cloud9" value={stickerQuery} onChange={event => setStickerQuery(event.target.value)} /></label></details>
        <div className="field"><label htmlFor="trade-lock">Трейдлок у источника</label><select id="trade-lock" value={tradeLock} onChange={event => setTradeLock(event.target.value)}><option value="">Любой</option><option value="unlocked">Без трейдлока</option><option value="locked">С трейдлоком</option></select></div>
        <button className="button-secondary reset-filters" type="button" onClick={reset} disabled={!chips.length}>Сбросить фильтры <span aria-hidden="true">×</span></button>
      </div>
    </aside>
    <section className="catalog-results" aria-label="Товары">
      <div className="results-heading panel"><div><h2>Товары</h2><span aria-live="polite" className="field-hint">{ready ? `Найдено: ${products.length}` : "Нет данных о наличии"}</span></div><div className="catalog-sort field"><label htmlFor="catalog-sort">Сортировка</label><select id="catalog-sort" value={sort} onChange={event => setSort(event.target.value as CatalogSort)}>{SORTS.filter(option => option.id !== "popularity" || inventory.some(product => product.attributes?.popularity != null)).filter(option => option.id !== "discount" || inventory.some(product => product.attributes?.discountPercent != null)).map(option => <option key={option.id} value={option.id}>{option.label}</option>)}</select></div></div>
      {sort === "popularity" && <p className="sort-explanation">По оценкам SkinSwap. Товары без оценки — в конце.</p>}
      {sort === "discount" && <p className="sort-explanation">По разнице цены SkinBaron и Steam в данных источника. Товары без сравнения — в конце.</p>}
      {chips.length > 0 && <div className="filter-chips" aria-label="Выбранные фильтры">{chips.map((chip,index) => <button type="button" key={`${index}-${chip.label}`} onClick={chip.remove} aria-label={`Убрать фильтр: ${chip.label}`}>{chip.label}<span aria-hidden="true">×</span></button>)}<button className="clear-all" type="button" onClick={reset}>Сбросить всё</button></div>}
      {state.status !== "ready" ? <div className="panel"><CatalogStatus status={state.status} /></div> : products.length > 0 ? <ProductGrid products={products} categories={categories} /> : chips.length ? <div className="panel empty-search" role="status"><h3>По вашему запросу ничего не найдено</h3><p>Попробуйте другое название или измените фильтры.</p><button className="button-secondary" onClick={reset}>Сбросить поиск и фильтры</button></div> : <div className="panel"><CatalogStatus status="empty" /></div>}
    </section>
  </div>;
}
