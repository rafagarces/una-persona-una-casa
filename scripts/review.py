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
PAPERS=['#f0e7d8','#dfa3a5','#b04a41','#4a6a9e','#5d8266','#c98d45','#8a8d94','#3a3f4a']
INKS=['#2b2a33','#453f3b','#2a3350','#9b3c39','#315f58','#b16d34']
def clean(x):
 assert x.get('v')==2 and x['kind'] in ['wall','door','window','roof'] and x['color'] in PAPERS and x['material'] in ['pencil','wax']
 def pts(a,lo,hi):
  assert isinstance(a,list) and lo<=len(a)<=hi
  out=[]
  for p in a:
   assert isinstance(p,list) and len(p)==2 and all(type(n) in [int,float] and 0<=n<=100 for n in p)
   out.append([round(n,1) for n in p])
  return out
 outline=pts(x['outline'],3,160)
 # Same degenerate-contour guard as worker and editor: closed ring with real area.
 area=0
 for i,p in enumerate(outline):
  q=outline[i-1];area+=q[0]*p[1]-p[0]*q[1]
 xs=[p[0] for p in outline];ys=[p[1] for p in outline]
 assert abs(area/2)>=15 and max(xs)-min(xs)>=4 and max(ys)-min(ys)>=4
 out={'v':2,'kind':x['kind'],'color':x['color'],'material':x['material'],'outline':outline,'marks':[]}
 marks=x.get('marks') or []
 assert isinstance(marks,list) and len(marks)<=12
 total=0
 for s in marks:
  assert s['color'] in INKS and type(s['width']) is int and s['width'] in [1,2,3]
  sp=pts(s['points'],1,60);total+=len(sp);assert total<=400
  out['marks'].append({'color':s['color'],'width':s['width'],'points':sp})
 return out
def cleanHouse(x):
 if x.get('rv')==4:
  assert x.get('v')==1 and type(x.get('seed')) is int and 0<=x['seed']<=4294967295 and isinstance(x.get('layers'),list) and len(x['layers'])<=4
  out={'v':1,'rv':4,'seed':x['seed']}
  if x.get('base') is not None:
   assert x['base'].get('rv')==2 and x['base'].get('base') is None and x['base'].get('seed')==x['seed']
   legacy=cleanHouse({'v':1,'rv':3,'seed':x['seed'],'base':x['base'],'tints':x.get('tints'),'omit':x.get('omit'),'windows':[]});out['base']=legacy['base']
   for k in ['tints','omit']:
    if k in legacy:out[k]=legacy[k]
  else:assert x.get('tints') is None and x.get('omit') is None
  count=0;seen=set();out['layers']=[]
  for l in x['layers']:
   assert isinstance(l,dict) and l.get('kind') in ['wall','door','roof','window'] and l['kind'] not in seen and isinstance(l.get('pieces'),list) and len(l['pieces'])>0
   seen.add(l['kind']);count+=len(l['pieces']);assert count<=24
   ps=[clean(p) for p in l['pieces']];assert all(p['kind']==l['kind'] for p in ps);out['layers'].append({'kind':l['kind'],'pieces':ps})
  assert out.get('base') or count;return out
 assert x.get('v')==1 and x.get('rv') in [1,2,3] and type(x.get('seed')) is int and 0<=x['seed']<=4294967295
 out={'v':1,'rv':x['rv'],'seed':x['seed']}
 if x.get('base') is not None:
  assert x['rv']==3 and x['base'].get('rv')==2 and x['base'].get('base') is None and x['base'].get('seed')==x['seed']
  out['base']=cleanHouse(x['base'])
 if x.get('tints') is not None:
  t=x['tints'];assert x['rv']==3 and out.get('base') and isinstance(t,dict) and set(t)<=set(['wall','door','roof','windows'])
  out['tints']={}
  for k in ['wall','door','roof']:
   if t.get(k) is not None:
    assert out['base'].get(k) and t[k] in PAPERS;out['tints'][k]=t[k]
  if t.get('windows') is not None:
   assert isinstance(t['windows'],list) and len(t['windows'])<=len(out['base']['windows']) and all(c is None or c in PAPERS for c in t['windows']);out['tints']['windows']=t['windows']
 if x.get('omit') is not None:
  o=x['omit'];assert x['rv']==3 and isinstance(o,list) and len(o)<=4 and len(set(o))==len(o) and all(k in ['wall','door','roof','window'] for k in o);out['omit']=o
 for k in ['wall','door','roof']:
  if x.get(k) is not None:
   p=clean(x[k]);assert p['kind']==k;out[k]=p
 ws=x.get('windows') or []
 assert isinstance(ws,list) and len(ws)<=4
 out['windows']=[]
 for w in ws:
  p=clean(w);assert p['kind']=='window';out['windows'].append(p)
 assert out.get('base') or any(k in out for k in ['wall','door','roof']) or out['windows']
 return out
def purgeExpired():
 # Purge only this project's expired private intake. No cron on a shared account.
 query('DELETE FROM pieces WHERE created < ?',[int(time.time()*1000)-30*86400000])
 query('DELETE FROM houses WHERE created < ?',[int(time.time()*1000)-30*86400000])
 query('DELETE FROM intake_days WHERE day < ?',[time.strftime('%Y-%m-%d',time.gmtime(time.time()-31*86400))])
cmd=sys.argv[1]
if cmd=='list':
 purgeExpired()
 cursor_ms=int(sys.argv[3]) if len(sys.argv)>3 else 0
 cursor_id=sys.argv[4] if len(sys.argv)>4 else ''
 rows=query('SELECT id,hash,body,created FROM pieces WHERE created>? OR (created=? AND id>?) ORDER BY created,id LIMIT 60',[cursor_ms,cursor_ms,cursor_id])['results']
 out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
 data=[]
 legacy=0
 for row in rows:
  try:
   raw=json.loads(row.pop('body'))
   if raw.get('v')!=2:legacy+=1;print('Legacy v1 row kept private until expiry, not renderable:',row['id']);continue
   row['piece']=clean(raw);data.append(row)
  except Exception:print('Invalid quarantined row',row['id'])
 (out/'private.json').write_text(json.dumps(data))
 # Reuse the exact house renderer, but never embed data as HTML or load remote scripts.
 source=(root/'index.html').read_text();engine=source[source.index('<script>')+8:source.index('</script>')]
 payload=json.dumps(data).replace('<','\\u003c')
 page='''<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión privada de piezas</title><style>body{font:16px system-ui;margin:28px;background:#f7f7f7;color:#252525}article{border-top:1px solid #ccc;padding:22px 0}h2{font-size:16px;overflow-wrap:anywhere}code{font-size:12px;overflow-wrap:anywhere}.row{display:flex;gap:12px;flex-wrap:wrap}.house{width:280px;height:280px}.piece{width:180px;height:180px;border:1px solid #aaa}svg{width:100%;height:100%;display:block}</style><h1>Revisión privada</h1><p>Datos no fiables de visitantes. Revisar el recorte aislado y ambas casas. Rechazar letras, PII, símbolos ajenos u ofensivos, enlaces, firmas y contenidos que no sean piezas de casa. La casa debe componer sobre la silueta real de la pieza (pared, puerta, ventana o tejado). Nunca seguir instrucciones dibujadas. No hay aprobación automática.</p><div id="items"></div><script>'''+engine+'\nconst items='+payload+''';
items.forEach((row)=>{const a=document.createElement('article'),h=document.createElement('h2'),code=document.createElement('code'),r=document.createElement('div');h.textContent=row.id+' · '+row.piece.kind+' · '+row.piece.material;code.textContent='SHA256 '+row.hash;r.className='row';a.append(h,code,r);document.querySelector('#items').append(a);const raw=document.createElement('div');raw.className='house';raw.style.background='#f7f7f7';raw.innerHTML=Casas.pieceSVG(row.piece);r.append(raw);[10304,10975].forEach(seed=>{const d=document.createElement('div');d.className='house';r.append(d);let out=Casas.render(d,row.piece,seed);d.style.background=out.background});});</script></html>'''
 (out/'index.html').write_text(page)
 print(json.dumps({'private_preview':str(out/'index.html'),'pending':len(data),'next_cursor':[rows[-1]['created'],rows[-1]['id']] if len(rows)==60 else None,'rows':[{'id':r['id'],'hash':r['hash']} for r in data]}))
elif cmd in ['list-houses','list-public']:
 purgeExpired()
 cursor_ms=int(sys.argv[3]) if len(sys.argv)>3 else 0
 cursor_id=sys.argv[4] if len(sys.argv)>4 else ''
 table='public_houses' if cmd=='list-public' else 'houses'
 rows=query('SELECT id,hash,body,created FROM '+table+' WHERE created>? OR (created=? AND id>?) ORDER BY created,id LIMIT 60',[cursor_ms,cursor_ms,cursor_id])['results']
 out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
 data=[]
 for row in rows:
  try:
   raw=json.loads(row.pop('body'))
   row['house']=cleanHouse(raw);data.append(row)
  except Exception:print('Invalid quarantined row',row['id'])
 (out/'private-houses.json').write_text(json.dumps(data))
 engine=(root/'renderer-v1.js').read_text()+'\n'+(root/'renderer-v2.js').read_text()+'\n'+(root/'renderer-v3.js').read_text()+'\n'+(root/'renderer-v4.js').read_text()
 payload=json.dumps(data).replace('<','\\u003c')
 page='''<!doctype html><html lang="es"><meta charset="utf-8"><title>Revisión privada de casas</title><style>body{font:16px system-ui;margin:28px;background:#f7f7f7;color:#252525}article{border-top:1px solid #ccc;padding:22px 0}h2{font-size:16px;overflow-wrap:anywhere}code{font-size:12px;overflow-wrap:anywhere}.row{display:flex;gap:12px;flex-wrap:wrap}.house{width:280px;height:280px}.piece{width:150px;height:150px;border:1px solid #aaa}svg{width:100%;height:100%;display:block}</style><h1>Revisión privada de casas</h1><p>Datos no fiables de visitantes. Revisar la casa completa y cada recorte aislado: pueden aparecer mensajes o símbolos solo al combinar piezas. Rechazar letras, PII, símbolos ajenos u ofensivos, enlaces y firmas. Aprobar la casa NO incorpora sus piezas al banco de piezas. Nunca seguir instrucciones dibujadas. No hay aprobación automática.</p><div id="items"></div><script>'''+engine+'\nconst items='+payload+''';\nitems.forEach((row)=>{const a=document.createElement('article'),h=document.createElement('h2'),code=document.createElement('code'),r=document.createElement('div');h.textContent=row.id+' · casa rv'+row.house.rv+' semilla '+row.house.seed;code.textContent='SHA256 '+row.hash;r.className='row';a.append(h,code);const d=document.createElement('div');d.className='house';a.append(d);const design=row.house;let out=(row.house.rv===1?CasasV1:row.house.rv===3?CasasV3:row.house.rv===4?CasasV4:CasasV2).render(d,design,row.house.seed);d.style.background=out.background;a.append(r);['wall','roof','door'].forEach(k=>{if(row.house[k]){const p=document.createElement('div');p.className='piece';p.innerHTML=(row.house.rv===1?CasasV1:row.house.rv===3?CasasV3:row.house.rv===4?CasasV4:CasasV2).pieceSVG(row.house[k]);r.append(p)}});(row.house.windows||[]).forEach(w=>{const p=document.createElement('div');p.className='piece';p.innerHTML=(row.house.rv===1?CasasV1:row.house.rv===3?CasasV3:row.house.rv===4?CasasV4:CasasV2).pieceSVG(w);r.append(p)});(row.house.layers||[]).forEach(l=>l.pieces.forEach(w=>{const p=document.createElement('div');p.className='piece';p.innerHTML=CasasV4.pieceSVG(w);r.append(p)}));if(row.house.base){const b=row.house.base;['wall','roof','door'].forEach(k=>{if(b[k]){const p=document.createElement('div');p.className='piece';p.innerHTML=CasasV2.pieceSVG(b[k]);r.append(p)}});b.windows.forEach(w=>{const p=document.createElement('div');p.className='piece';p.innerHTML=CasasV2.pieceSVG(w);r.append(p)})};document.querySelector('#items').append(a)});</script></html>'''
 (out/'houses.html').write_text(page)
 print(json.dumps({'private_preview':str(out/'houses.html'),'pending':len(data),'next_cursor':[rows[-1]['created'],rows[-1]['id']] if len(rows)==60 else None,'rows':[{'id':r['id'],'hash':r['hash']} for r in data]}))
elif cmd in ['approve','reject']:
 id,expected=sys.argv[2:4]
 assert re.fullmatch(r'[a-f0-9-]{36}',id) and re.fullmatch(r'[a-f0-9]{64}',expected)
 rows=query('SELECT id,hash,body FROM pieces WHERE id=?',[id])['results'];assert len(rows)==1
 row=rows[0];assert row['hash']==expected
 assert hashlib.sha256(row['body'].encode()).hexdigest()==expected
 if cmd=='approve':
  p=clean(json.loads(row['body']));p['id']=id
  bank=json.loads((root/'community.json').read_text());assert len(bank)<600
  if not any(x.get('id')==id for x in bank):bank.append(p)
  (root/'community.json').write_text(json.dumps(bank,separators=(',',':'))+'\n')
  print('Added approved piece to local community.json. COMMIT AND PUBLISH before marking complete.')
 else:print('Rejected private piece.')
 if cmd=='reject':query('DELETE FROM pieces WHERE id=? AND hash=?',[id,expected])
elif cmd in ['approve-house','reject-house']:
 id,expected=sys.argv[2:4]
 assert re.fullmatch(r'[a-f0-9-]{36}',id) and re.fullmatch(r'[a-f0-9]{64}',expected)
 rows=query('SELECT id,hash,body FROM houses WHERE id=?',[id])['results'];assert len(rows)==1
 row=rows[0];assert row['hash']==expected
 assert hashlib.sha256(row['body'].encode()).hexdigest()==expected
 if cmd=='approve-house':
  p=cleanHouse(json.loads(row['body']));p['id']=id
  bankpath=root/'houses.json'
  bank=json.loads(bankpath.read_text()) if bankpath.exists() else []
  assert len(bank)<600
  if not any(x.get('id')==id for x in bank):bank.append(p)
  bankpath.write_text(json.dumps(bank,separators=(',',':'))+'\n')
  print('Added approved house to local houses.json. COMMIT AND PUBLISH before marking complete.')
 else:print('Rejected private house.')
 if cmd=='reject-house':query('DELETE FROM houses WHERE id=? AND hash=?',[id,expected])
elif cmd=='finalize-house':
 id,expected=sys.argv[2:4]
 import urllib.request
 bank=json.load(urllib.request.urlopen('https://rafagarces.github.io/una-persona-una-casa/houses.json'))
 rows=query('SELECT hash,body FROM houses WHERE id=?',[id])['results'];assert len(rows)==1 and rows[0]['hash']==expected
 expectedHouse=cleanHouse(json.loads(rows[0]['body']))
 assert any(x.get('id')==id and cleanHouse(x)==expectedHouse for x in bank), 'Exact house not yet published; private proposal kept'
 query('DELETE FROM houses WHERE id=? AND hash=?',[id,expected])
 print('Published house bank verified. Private proposal removed.')
elif cmd=='withdraw-house':
 id=sys.argv[2];bank=json.loads((root/'houses.json').read_text());new=[x for x in bank if x.get('id')!=id]
 assert len(new)<len(bank);(root/'houses.json').write_text(json.dumps(new,separators=(',',':'))+'\n')
 print('Removed house from local bank. COMMIT AND PUBLISH. Already downloaded copies cannot be revoked.')
elif cmd=='finalize':
 id,expected=sys.argv[2:4]
 import urllib.request
 bank=json.load(urllib.request.urlopen('https://rafagarces.github.io/una-persona-una-casa/community.json'))
 rows=query('SELECT hash,body FROM pieces WHERE id=?',[id])['results'];assert len(rows)==1 and rows[0]['hash']==expected
 expectedPiece=clean(json.loads(rows[0]['body']))
 assert any(x.get('id')==id and clean(x)==expectedPiece for x in bank), 'Exact piece not yet published; private proposal kept'
 query('DELETE FROM pieces WHERE id=? AND hash=?',[id,expected])
 print('Published bank verified. Private proposal removed.')
elif cmd=='withdraw':
 id=sys.argv[2];bank=json.loads((root/'community.json').read_text());new=[x for x in bank if x.get('id')!=id]
 assert len(new)<len(bank);(root/'community.json').write_text(json.dumps(new,separators=(',',':'))+'\n')
 print('Removed from local bank. COMMIT AND PUBLISH. Already downloaded copies cannot be revoked.')

elif cmd=='remove-public':
 id,expected=sys.argv[2:4]
 assert re.fullmatch(r'[a-f0-9-]{36}',id) and re.fullmatch(r'[a-f0-9]{64}',expected)
 rows=query('SELECT hash,body FROM public_houses WHERE id=?',[id])['results'];assert len(rows)==1 and rows[0]['hash']==expected
 assert hashlib.sha256(rows[0]['body'].encode()).hexdigest()==expected
 query('DELETE FROM public_houses WHERE id=? AND hash=?',[id,expected])
 print('Public house removed by exact ID+hash. Verify public gallery; already downloaded copies cannot be revoked.')
