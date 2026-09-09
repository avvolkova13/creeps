"""Refresh an attributed public-page snapshot. No private APIs or purchase calls."""
import concurrent.futures
import hashlib
import json
import re
import urllib.request
from urllib.parse import urljoin
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.qa' / 'catalog-import'
CACHE.mkdir(parents=True, exist_ok=True)
HEADERS = {'User-Agent': 'Mozilla/5.0'}


def fetch(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=35) as response:
        return response.read(), response.headers.get_content_type()


class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def text(self):
        return ''.join(child if isinstance(child, str) else child.text() for child in self.children)

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Node):
                yield from child.walk()


class Tree(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def angular_state(html):
    match = re.search(r'<script id="skinbaron-frontend-state" type="application/json">(.*?)</script>', html, re.S)
    if not match:
        raise ValueError('SkinBaron public page state is missing')
    return json.loads(match.group(1))


def swap_rates(html):
    for raw in re.findall(r'self\.__next_f\.push\((.*?)\)</script>', html, re.S):
        value = json.loads(raw)
        if len(value) > 1 and isinstance(value[1], str):
            match = re.search(r'"currencies":(\{[^}]+\})', value[1])
            if match:
                rates = json.loads(match.group(1))
                if rates.get('USD') == 1 and rates.get('RUB', 0) > 0 and rates.get('EUR', 0) > 0:
                    return rates
    raise ValueError('Verified source exchange rates are missing')


CATEGORIES = {
    'knife': ('Ножи', 'Нож'),
    'rifle': ('Винтовки', 'Винтовка'),
    'pistol': ('Пистолеты', 'Пистолет'),
    'smg': ('Пистолеты-пулемёты', 'ПП'),
    'gloves': ('Перчатки', 'Перчатки'),
    'heavy': ('Тяжёлое оружие', 'Тяжёлое'),
}
CONDITIONS = {'Factory New': 'Прямо с завода', 'Minimal Wear': 'Немного поношенное', 'Field-Tested': 'После полевых испытаний', 'Well-Worn': 'Поношенное', 'Battle-Scarred': 'Закалённое в боях'}


def swap_category(name):
    plain = name.replace('StatTrak™ ', '').replace('Souvenir ', '').replace('★ ', '')
    weapon = plain.split(' | ')[0]
    if any(part in weapon for part in ['Knife', 'Bayonet', 'Karambit', 'Daggers']):
        return 'knife'
    if any(part in weapon for part in ['Gloves', 'Hand Wraps']):
        return 'gloves'
    if weapon in ['AK-47', 'M4A4', 'M4A1-S', 'AWP', 'SSG 08', 'SCAR-20', 'G3SG1', 'AUG', 'SG 553', 'Galil AR', 'FAMAS']:
        return 'rifle'
    if weapon in ['Glock-18', 'USP-S', 'P2000', 'P250', 'Desert Eagle', 'R8 Revolver', 'Tec-9', 'Five-SeveN', 'CZ75-Auto', 'Dual Berettas']:
        return 'pistol'
    if weapon in ['MAC-10', 'MP9', 'MP7', 'MP5-SD', 'P90', 'UMP-45', 'PP-Bizon']:
        return 'smg'
    if weapon in ['Nova', 'XM1014', 'MAG-7', 'Sawed-Off', 'M249', 'Negev']:
        return 'heavy'
    return None


def description(name, category, condition, extra=()):
    facts = [f'{CATEGORIES[category][1]} для Counter-Strike 2: {name}.', f'Состояние: {condition}.']
    facts.extend(extra)
    return ' '.join(facts)


def swap_products(html, captured):
    products = {}
    for node in Tree(html).root.walk():
        if node.attrs.get('data-nosnippet') != 'true':
            continue
        images = [item for item in node.walk() if item.tag == 'img' and '/images/730/' in item.attrs.get('src', '')]
        if len(images) != 1:
            continue
        image = images[0]
        name = re.sub(r'^Изображение ', '', image.attrs.get('alt', ''))
        match = re.search(r' \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$', name)
        category = swap_category(name)
        amount = re.search(r'\$([\d\s\u00a0.,]+)', node.text())
        wear = re.search(r'(?:FN|MW|FT|WW|BS)\s*/\s*(0\.\d+)', node.text())
        if not match or not category or not amount:
            continue
        condition = CONDITIONS[match.group(1)]
        name = name[:match.start()]
        price = float(re.sub(r'\s', '', amount.group(1)).replace(',', '.'))
        key = hashlib.sha256((name + condition + (wear.group(1) if wear else '')).encode()).hexdigest()[:12]
        products[key] = {'id': 'swap-' + key, 'name': name, 'description': description(name, category, condition), 'imageUrl': image.attrs['src'], 'categoryId': category, 'condition': condition, 'float': float(wear.group(1)) if wear else None, 'source': {'name': 'SkinSwap', 'url': 'https://skinswap.com/ru', 'imageUrl': image.attrs['src'], 'capturedAt': captured, 'price': price, 'currency': 'USD', 'kind': 'reference', 'floatPrecision': 'rounded'}}
    if not products:
        raise ValueError('SkinSwap product markup changed or returned no products')
    return list(products.values())


def baron_products(html, captured):
    state = angular_state(html)['promo-search-result-state']
    products = {}
    for group in state.values():
        for offer in group.get('aggregatedMetaOffers', []):
            item = offer.get('singleOffer', {})
            category = item.get('localizedVariantTypeName', '').lower()
            if category not in CATEGORIES or offer.get('appId') != 730 or item.get('isSoldAndPaid') or 'itemPrice' not in item:
                continue
            url = 'https://skinbaron.de/ru' + offer['offerLink']
            key = re.search(r'offerUuid=([^&]+)', url).group(1)
            name = ' '.join(filter(None, [item.get('statTrakString'), item['localizedName']]))
            item['localizedExteriorName'] = {'Not Painted': 'Без окраски'}.get(item['localizedExteriorName'], item['localizedExteriorName'])
            info = offer.get('extendedProductInformation', {})
            extra = [f"Редкость: {item['localizedRarityName']}."] if item.get('localizedRarityName') else []
            if info.get('collectionName'):
                extra.append(info['collectionName'] + '.')
            image_url = urljoin('https://skinbaron.de', item['imageUrl'])
            products[key] = {'id': 'baron-' + key, 'name': name, 'description': description(name, category, item['localizedExteriorName'], extra), 'imageUrl': image_url, 'categoryId': category, 'condition': item['localizedExteriorName'], 'float': item['wearPercent'] / 100 if 'wearPercent' in item else None, 'source': {'name': 'SkinBaron', 'url': url, 'imageUrl': image_url, 'capturedAt': captured, 'price': item['itemPrice'], 'currency': 'EUR', 'kind': 'offer', 'floatPrecision': 'precise' if item.get('isWearPrecise') else 'rounded'}}
    if not products:
        raise ValueError('SkinBaron returned no eligible offers')
    return list(products.values())


def save_image(product):
    stem = hashlib.sha256(product['imageUrl'].encode()).hexdigest()[:20]
    for extension in ['.webp', '.png', '.jpg']:
        if (ROOT / 'public' / 'catalog' / (stem + extension)).exists():
            product['imageUrl'] = '/catalog/' + stem + extension
            return product
    raw, mime = fetch(product['imageUrl'])
    extension = {'image/webp': '.webp', 'image/png': '.png', 'image/jpeg': '.jpg'}.get(mime)
    # SkinBaron's public marketing endpoint serves WebP as text/plain.
    if raw[:4] == b'RIFF' and raw[8:12] == b'WEBP':
        extension = '.webp'
    if not extension or len(raw) < 100:
        raise ValueError('Invalid product image: ' + product['id'])
    filename = stem + extension
    destination = ROOT / 'public' / 'catalog' / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(raw)
    product['imageUrl'] = '/catalog/' + filename
    return product


def enrich_description(product, descriptions):
    name = product['name'].replace('★ ', '').replace('StatTrak™ ', '').replace('Souvenir ', '')
    entry = descriptions.get(name)
    if not entry:
        return product
    try:
        html = fetch(entry['url'])[0].decode('utf-8')
        for raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
            data = json.loads(raw)
            if data.get('@type') == 'Product' and hashlib.sha256(data.get('description', '').encode()).hexdigest() == entry['sourceDescriptionHash']:
                product['description'] = entry['text'] + '\n\n' + product['description']
                product['source']['descriptionUrl'] = entry['url']
                break
    except Exception as error:
        print('Description not refreshed:', product['id'], type(error).__name__)
    return product


def main():
    captured = datetime.now(timezone.utc).isoformat()
    swap = fetch('https://skinswap.com/ru')[0].decode('utf-8')
    baron = fetch('https://skinbaron.de/ru')[0].decode('utf-8')
    (CACHE / 'skinswap.html').write_text(swap)
    (CACHE / 'skinbaron.html').write_text(baron)
    rates = swap_rates(swap)
    creep_rate = float(re.search(r'rublesPerCreep:\s*([\d.]+)', (ROOT / 'src/config/project.ts').read_text()).group(1))
    products = swap_products(swap, captured) + baron_products(baron, captured)
    for product in products:
        rubles_per_unit = rates['RUB'] / rates[product['source']['currency']]
        product['source']['rublesPerUnit'] = rubles_per_unit
        product['source']['exchangeRateUrl'] = 'https://skinswap.com/ru'
        product['priceCreeps'] = product['source']['price'] * rubles_per_unit / creep_rate
        if not 0 < product['priceCreeps'] < float('inf'):
            raise ValueError('Invalid price: ' + product['id'])
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        products = list(pool.map(save_image, products))
        descriptions = json.loads((ROOT / 'src/data/product-descriptions.json').read_text())
        products = list(pool.map(lambda product: enrich_description(product, descriptions), products))
    # Interleave sources and categories without inventing popularity rankings.
    products.sort(key=lambda p: (p['categoryId'], p['source']['name'], p['name']))
    buckets = {}
    for product in products:
        buckets.setdefault((product['categoryId'], product['source']['name']), []).append(product)
    ordered = []
    while any(buckets.values()):
        for bucket in buckets.values():
            if bucket:
                ordered.append(bucket.pop(0))
    categories = []
    for key, (label, _) in CATEGORIES.items():
        items = [p for p in products if p['categoryId'] == key]
        if items:
            examples = list(dict.fromkeys(p['name'].split(' | ')[0].replace('StatTrak™ ', '').replace('★ ', '') for p in items))[:3]
            categories.append({'id': key, 'name': label, 'description': ', '.join(examples) + '.'})
    snapshot = {'capturedAt': captured, 'mode': 'public-page-snapshot', 'exchangeRates': {'sourceUrl': 'https://skinswap.com/ru', 'usdRub': rates['RUB'], 'eurRub': rates['RUB'] / rates['EUR']}, 'categories': categories, 'products': ordered}
    destination = ROOT / 'src' / 'data' / 'catalog-snapshot.json'
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix('.tmp')
    temporary.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(destination)
    print(json.dumps({'products': len(products), 'categories': len(categories), 'sources': {name: sum(p['source']['name'] == name for p in products) for name in ['SkinSwap', 'SkinBaron']}, 'capturedAt': captured}, ensure_ascii=False))


if __name__ == '__main__':
    main()
