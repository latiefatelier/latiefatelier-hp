"""Static and local HTTP checks; no external writes or reservation submissions."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote, parse_qs
from urllib.request import urlopen
import json,re,xml.etree.ElementTree as ET,hashlib

ROOT=Path(__file__).resolve().parent
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__();self.tags=[];self.ids=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);self.tags.append((tag,a))
        if 'id' in a:self.ids.append(a['id'])
pages={p.name:(p.read_text(encoding='utf-8'),Page(p.read_text(encoding='utf-8'))) for p in ROOT.glob('*.html')}
errors=[];assets=set();report=[]
def check(ok,msg):
    if not ok:errors.append(msg)
titles=[];descs=[]
for name,(text,dom) in pages.items():
    title=re.search('<title>(.*?)</title>',text)[1];titles.append(title)
    desc=[a['content'] for t,a in dom.tags if t=='meta' and a.get('name')=='description'];descs+=desc
    check(sum(t=='h1' for t,a in dom.tags)==1,f'{name}: H1 count')
    check(len(desc)==1 and len(desc[0])>30,f'{name}: description')
    check(len(dom.ids)==len(set(dom.ids)),f'{name}: duplicate ID')
    canonical=[a['href'] for t,a in dom.tags if t=='link' and a.get('rel')=='canonical']
    expected='https://latiefatelier.com/'+('' if name=='index.html' else name)
    check(canonical==[expected],f'{name}: canonical {canonical}')
    check('noindex' not in text,f'{name}: noindex')
    check('月・火定休' in text and '水〜金 15:00〜18:00 / 土日 10:00〜18:00' in text,f'{name}: hours')
    check(not re.search(r'土日祝限定|10:00-19:00|カット18:00|priceRange|"price"|VideoObject',text),f'{name}: stale hours/price/video schema')
    check('mobile-reserve-bar' in text,f'{name}: mobile CTA')
    check('Best Hair Latief' in text and '石田' in text,f'{name}: booking name explanation')
    for t,a in dom.tags:
        if t=='img':check(all(k in a for k in ['alt','width','height']),f'{name}: image attrs {a}')
        if t=='a' and a.get('target')=='_blank':check('noopener' in a.get('rel',''),f'{name}: external rel')
        refs=[]
        if t=='a':refs.append(a.get('href',''))
        if t in ['img','script','iframe']:refs.append(a.get('src',''))
        if t=='link' and a.get('rel') in ['stylesheet','preload']:refs.append(a.get('href',''))
        if a.get('srcset'):refs.extend(x.strip().split()[0] for x in a['srcset'].split(','))
        for ref in refs:
            if not ref:continue
            u=urlsplit(ref)
            if u.scheme:
                if u.hostname=='beauty.hotpepper.jp' and '/reserve/' in u.path:
                    q=parse_qs(u.query);check(q.get('storeId')==['H000819673'] and q.get('stylistId')==['T001129687'],f'{name}: booking query')
                if u.hostname=='lin.ee':check(u.path=='/6GPeVmwn',f'{name}: LINE link')
                continue
            target=unquote(u.path) or name
            check((ROOT/target).is_file(),f'{name}: missing {ref}')
            if u.fragment and target in pages:check(u.fragment in pages[target][1].ids,f'{name}: broken fragment {ref}')
            assets.add(target)
    page_nodes=[]
    for script in re.findall(r'<script type="application/ld\+json">([\s\S]*?)</script>',text):
        data=json.loads(script)
        for node in data.get('@graph',[data]):
            if node.get('@type') in ['WebPage','ImageGallery']:page_nodes.append(node)
            if node.get('@type')=='HairSalon':
                hours=node['openingHoursSpecification']
                check(hours[0]['dayOfWeek']==['Wednesday','Thursday','Friday'] and hours[0]['opens']=='15:00' and hours[0]['closes']=='18:00',f'{name}: weekday schema')
                check(hours[1]['dayOfWeek']==['Saturday','Sunday'] and hours[1]['opens']=='10:00' and hours[1]['closes']=='18:00',f'{name}: weekend schema')
    check(len(page_nodes)==1,f'{name}: connected page schema')
    if len(page_nodes)==1:
        check(page_nodes[0]['url']==expected and page_nodes[0]['name']==title and page_nodes[0]['description']==desc[0],f'{name}: schema matches metadata')
    if name!='index.html':check('aria-label="パンくず"' in text,f'{name}: visible breadcrumb')
    report.append({'page':name,'title':title,'h1':1,'canonical':canonical[0]})
check(len(titles)==len(set(titles)),'duplicate titles');check(len(descs)==len(set(descs)),'duplicate descriptions')
for name in ['index.html','hairstyle.html']:
    text=pages[name][0]
    for pair,nums in [('A',['01','02']),('B',['05','06']),('C',['07','08'])]:
        fragment=re.search(r'data-pair="'+pair+r'">([\s\S]*?)</div>',text)[1]
        check(re.findall(r'src="assets/images/cases/(\d+)-960.webp"',fragment)==nums,f'{name}: pair {pair}')
    check('background_edit' not in text,f'{name}: AI edited candidate')
case=pages['hairstyle.html'][0]
after=case.split('class="after-grid">')[1].split('</section>')[0]
check(re.findall(r'src="assets/images/cases/(\d+)-960.webp"',after)==['03','04','09'],'standalone photos')
bleach=pages['bleached-hair.html'][0]
check('AI生成の説明用イメージです。実施術のビフォーアフターではありません。' in bleach,'AI disclosure')
check('bleach-illustration' not in case,'AI image in real cases')
urls=[e.text for e in ET.parse(ROOT/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
check(set(urls)=={'https://latiefatelier.com/'+('' if n=='index.html' else n) for n in pages},'sitemap coverage')
image_ns='{http://www.google.com/schemas/sitemap-image/1.1}'
for url in ET.parse(ROOT/'sitemap.xml').getroot():
    page_url=url.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc').text
    page_name=page_url.removeprefix('https://latiefatelier.com/') or 'index.html'
    for loc in url.iter(image_ns+'loc'):
        path=loc.text.removeprefix('https://latiefatelier.com/')
        check((ROOT/path).is_file() and path in pages[page_name][0],f'image sitemap mismatch {path}')
        check('bleach-illustration' not in path and 'background_edit' not in path,'generated photo in real-image sitemap')
check((ROOT/'CNAME').read_text().strip()=='latiefatelier.com','CNAME')
check('Sitemap: https://latiefatelier.com/sitemap.xml' in (ROOT/'robots.txt').read_text(),'robots sitemap')
for target in sorted(assets | set(pages) | {'robots.txt','sitemap.xml'}):
    with urlopen('http://127.0.0.1:8765/'+target,timeout=10) as r:check(r.status==200,'HTTP '+target)
originals=ROOT.parent/'image-originals'
for p in json.loads((ROOT/'assets/images/cases/provenance.json').read_text(encoding='utf-8')):
    check(hashlib.sha256((originals/p['source']).read_bytes()).hexdigest()==p['source_sha256'],'original hash '+p['number'])
out={'checked_pages':len(pages),'checked_local_resources':len(assets),'checks':'H1, unique metadata, canonical, JSON-LD/metadata agreement, visible breadcrumbs, opening hours, links/fragments, image attrs/srcset, booking query, page/image sitemap, CNAME, original hashes, HTTP 200','errors':errors,'pages':report}
(ROOT.parent/'qa-static.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out,ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
