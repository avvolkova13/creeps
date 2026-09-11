"use client";
import { useSyncExternalStore } from 'react';
import { resetCatalogParams, updateCatalogParam } from '@/lib/catalog-params';
const eventName = 'creeps:catalog-search';
function subscribe(callback: () => void) {
  window.addEventListener('popstate', callback);
  window.addEventListener(eventName, callback);
  return () => { window.removeEventListener('popstate', callback); window.removeEventListener(eventName, callback); };
}
function write(search: string) {
  const url = `${window.location.pathname}${search ? '?' + search : ''}${window.location.hash}`;
  window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new Event(eventName));
}
export function setCatalogParam(key: string, value: string | readonly string[]) {
  write(updateCatalogParam(window.location.search, key, value));
}
export function clearCatalogFilters() { write(resetCatalogParams(window.location.search)); }
export function useCatalogSearch(initialSearch: string) {
  const search = useSyncExternalStore(subscribe, () => window.location.search.slice(1), () => initialSearch);
  return new URLSearchParams(search);
}
