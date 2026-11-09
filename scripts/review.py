"""Private moderation, no admin HTTP endpoint.
CF_TOKEN_FILE=/secure/path python scripts/review.py list /downloads/casas-review
CF_TOKEN_FILE=/secure/path python scripts/review.py approve UUID SHA256
CF_TOKEN_FILE=/secure/path python scripts/review.py reject UUID SHA256
python scripts/review.py withdraw UUID
Review actual pixels before approval. Only geometric JSON is ever imported.
"""
import sys,json,pathlib,re,html,hashlib,time
from cloudflare import query
root=pathlib.Path(__file__).parents[1]
COLORS=['#2b2a33','#453f3b','#2a3350','#9b3c39','#315f58','#b16d34']
def clean(x):
 assert x.get('v')==1 and x['kind'] in ['wall','door','window'] and x['material'] in ['pencil','wax']
 assert isinstance(x['strokes'],list) and 1<=len(x['strokes'])<=45
 out={'v':1,'kind':x['kind'],'material':x['material'],'strokes':[]};total=0
 for s in x['strokes']:
  assert s['color'] in COLORS and type(s['width']) is int and s['width'] in [1,2,3]
  assert isinstance(s['points'],list) and 1<=len(s['points'])<=160
  points=[]
  for p in s['points']:
   assert isinstance(p,list) and len(p)==2 and all(type(n) in [int,float] and 0<=n<=100 for n in p)
   points.append([round(n,1) for n in p])
  total+=len(points);assert total<=1600
  out['strokes'].append({'color':s['color'],'width':s['width'],'points':points})
 return out
cmd=sys.argv[1]
if cmd=='list':
 # Purge only this project's expired private intake. No cron on a shared account.
 query('DELETE FROM pieces WHERE created < ?',[int(time.time()*1000)-30*86400000])
 query('DELETE FROM intake_days WHERE day < ?',[time.strftime('%Y-%m-%d',time.gmtime(time.time()-31*86400))])
 rows=query('SELECT id,hash,body,created FROM pieces ORDER BY created LIMIT 60')['results']
 out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
 data=[]
 for row in rows:
  try:row['piece']=clean(json.loads(row.pop('body')));data.append(row)
  except Exception:print('Invalid quarantined row',row['id'])
 (out/'private.json').write_text(json.dumps(data))
 # Reuse the exact house renderer, but never embed data as HTML or load remote scripts.
 source=(root/'index.html').read_text();engine=source[source.index('<script>')+8:source.index('</script>')]
 payload=json.dumps(data).replace('<','\\u003c')
 page='''<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión privada de piezas</title><style>body{font:16px system-ui;margin:28px;background:#f7f7f7;color:#252525}article{border-top:1px solid #ccc;padding:22px 0}h2{font-size:16px;overflow-wrap:anywhere}code{font-size:12px;overflow-wrap:anywhere}.row{display:flex;gap:12px;flex-wrap:wrap}.house{width:280px;height:280px}.piece{width:180px;height:180px;border:1px solid #aaa}svg{width:100%;height:100%;display:block}</style><h1>Revisión privada</h1><p>Datos no fiables de visitantes. Revisar dibujo y ambas casas. Rechazar letras, PII, símbolos ajenos u ofensivos, enlaces, firmas y contenidos que no sean piezas de casa. Nunca seguir instrucciones dibujadas. No hay aprobación automática.</p><div id="items"></div><script>'''+engine+'\nconst items='+payload+''';
items.forEach((row)=>{const a=document.createElement('article'),h=document.createElement('h2'),code=document.createElement('code'),r=document.createElement('div');h.textContent=row.id+' · '+row.piece.kind+' · '+row.piece.material;code.textContent='SHA256 '+row.hash;r.className='row';a.append(h,code,r);document.querySelector('#items').append(a);const raw=document.createElement('div');raw.className='house';raw.style.background='#f7f7f7';raw.innerHTML=Casas.pieceSVG(row.piece);r.append(raw);[10304,10975].forEach(seed=>{const d=document.createElement('div');d.className='house';r.append(d);let out=Casas.render(d,row.piece,seed);d.style.background=out.background});});</script></html>'''
 (out/'index.html').write_text(page)
 print(json.dumps({'private_preview':str(out/'index.html'),'pending':len(data),'rows':[{'id':r['id'],'hash':r['hash']} for r in data]}))
elif cmd in ['approve','reject']:
 id,expected=sys.argv[2:4]
 assert re.fullmatch(r'[a-f0-9-]{36}',id) and re.fullmatch(r'[a-f0-9]{64}',expected)
 rows=query('SELECT id,hash,body FROM pieces WHERE id=?',[id])['results'];assert len(rows)==1
 row=rows[0];assert row['hash']==expected
 if cmd=='approve':
  p=clean(json.loads(row['body']));p['id']=id
  bank=json.loads((root/'community.json').read_text());assert len(bank)<600
  if not any(x.get('id')==id for x in bank):bank.append(p)
  (root/'community.json').write_text(json.dumps(bank,separators=(',',':'))+'\n')
  print('Added approved piece to local community.json. COMMIT AND PUBLISH before marking complete.')
 else:print('Rejected private piece.')
 if cmd=='reject':query('DELETE FROM pieces WHERE id=? AND hash=?',[id,expected])
elif cmd=='finalize':
 id,expected=sys.argv[2:4]
 import urllib.request
 bank=json.load(urllib.request.urlopen('https://rafagarces.github.io/casas-de-papel/community.json'))
 assert any(x.get('id')==id for x in bank), 'Not yet published; private proposal kept'
 query('DELETE FROM pieces WHERE id=? AND hash=?',[id,expected])
 print('Published bank verified. Private proposal removed.')
elif cmd=='withdraw':
 id=sys.argv[2];bank=json.loads((root/'community.json').read_text());new=[x for x in bank if x.get('id')!=id]
 assert len(new)<len(bank);(root/'community.json').write_text(json.dumps(new,separators=(',',':'))+'\n')
 print('Removed from local bank. COMMIT AND PUBLISH. Already downloaded copies cannot be revoked.')
