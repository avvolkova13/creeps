"""Extract filter facts from cached public pages; never infer missing listing data."""
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.qa/catalog-import'
CONDITIONS = {'Прямо с завода': 'factory new', 'Немного поношенное': 'minimal wear', 'После полевых испытаний': 'field-tested', 'Поношенное': 'well-worn', 'Закалённое в боях': 'battle-scarred'}
RARITIES = {'consumer grade': 'Ширпотреб', 'industrial grade': 'Промышленное качество', 'mil-spec grade': 'Армейское качество', 'restricted': 'Запрещённое', 'classified': 'Засекреченное', 'covert': 'Тайное', 'contraband': 'Контрабанда', 'extraordinary': 'Экстраординарное'}


def angular(path):
    if not path.exists():
        return {}
    match = re.search(r'<script id="skinbaron-frontend-state" type="application/json">(.*?)</script>', path.read_text(), re.S)
    return json.loads(match.group(1)) if match else {}


def enrich(products):
    infos = {}
    for path in CACHE.glob('*.html'):
        for raw in re.findall(r'self\.__next_f\.push\((.*?)\)</script>', path.read_text(), re.S):
            try:
                entry = json.loads(raw)
                if len(entry) > 1 and isinstance(entry[1], str) and '"itemInfo":{' in entry[1]:
                    info = json.JSONDecoder().raw_decode(entry[1].split('"itemInfo":', 1)[1])[0]
                    infos[info['skinSlug']] = info
            except (ValueError, KeyError, TypeError):
                continue
    baron = angular(CACHE / 'skinbaron.html')
    offers = {}
    for group in baron.get('promo-search-result-state', {}).values():
        for offer in group.get('aggregatedMetaOffers', []):
            uuid = parse_qs(urlparse(offer.get('offerLink', '')).query).get('offerUuid', [''])[0]
            if uuid and offer.get('singleOffer'):
                offers['baron-' + uuid] = offer
    models = {}
    def walk(nodes, depth=0):
        for node in nodes:
            if depth == 1 and node.get('vpId') and node.get('n', {}).get('en'):
                models[str(node['vpId'])] = node['n']['en']
            walk(node.get('c', []), depth + 1)
    walk(angular(CACHE / 'mecha-industries.html').get('menu-state', {}).get('nodes', []))
    # A shared canonical label prevents English/Russian source aliases splitting a model.
    def model_label(value):
        key = value.lower().replace('-', ' ').strip()
        return next((label for label in models.values() if label.lower().replace('-', ' ') == key), value)
    for product in products:
        facts = {}
        source = product['source']
        slug = urlparse(source.get('descriptionUrl', '')).path.rstrip('/').split('/')[-1]
        info = infos.get(slug)
        if info:
            qualities = info.get('qualities', {})
            facts.update(weapon=model_label(qualities.get('weapon', '')), itemType=qualities.get('type'), colors=qualities.get('colors', []), rarity=RARITIES.get(qualities.get('rarity')))
            variant_type = 'stattrak' if 'StatTrak' in product['name'] else 'souvenir' if 'Souvenir' in product['name'] else 'normal'
            variant = info.get('variants', {}).get(variant_type, {}).get(CONDITIONS.get(product.get('condition')), {})
            # Only a matching variant can supply StatTrak / Souvenir and rating facts.
            if variant:
                facts.update(stattrak=variant_type == 'stattrak', souvenir=variant_type == 'souvenir')
                rating = variant.get('popularity', {})
                if rating.get('count', 0) > 0:
                    facts['popularity'] = rating['average']
                    facts['popularityVotes'] = rating['count']
            facts['evidenceUrl'] = source['descriptionUrl']
        offer = offers.get(product['id'])
        if offer:
            single = offer['singleOffer']
            ids = single.get('externalVariantFilters', {}).get('variantPropertyIds', [])
            weapon = next((models[str(id)] for id in reversed(ids) if str(id) in models), '')
            if weapon:
                facts['weapon'] = weapon
            facts.update(rarity=single.get('localizedRarityName'), stattrak=bool(single.get('statTrakString')), tradeLocked=single.get('tradeLockHoursLeft', 0) > 0)
            facts['stickers'] = [sticker['localizedName'] for sticker in single.get('stickers', []) if sticker.get('localizedName')]
            steam = offer.get('steamMarketPrice')
            if steam and steam > 0:
                facts['discountPercent'] = (steam - single['itemPrice']) / steam * 100
            facts['itemType'] = {'knife':'knife','rifle':'rifle','pistol':'pistol','smg':'smg','gloves':'gloves'}.get(product['categoryId'])
            if weapon in ['SSG 08', 'AWP', 'SCAR-20', 'G3SG1']:
                facts['itemType'] = 'sniper_rifle'
            facts['evidenceUrl'] = source['url']
        # Vanilla is an explicitly unpainted knife name, not an unknown finish.
        if product['categoryId'] == 'knife':
            if product.get('condition') == 'Без окраски':
                facts['vanilla'] = True
            elif ' | ' in product['name']:
                facts['vanilla'] = False
        product['attributes'] = {key: value for key, value in facts.items() if value is not None and value != ''}
    return products


if __name__ == '__main__':
    path = ROOT / 'src/data/catalog-snapshot.json'
    snapshot = json.loads(path.read_text())
    snapshot['products'] = enrich(snapshot['products'])
    path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: sum(key in p['attributes'] for p in snapshot['products']) for key in ['weapon', 'itemType', 'rarity', 'colors', 'popularity', 'discountPercent', 'tradeLocked', 'stickers']}, ensure_ascii=False))
