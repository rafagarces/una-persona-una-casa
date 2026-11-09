import json,pathlib,uuid
from cloudflare import api,ACCOUNT
root=pathlib.Path(__file__).parents[1]
p=root/'backend/config.json'
if p.exists():db=json.loads(p.read_text())['database_id']
else:
 db=api('accounts/'+ACCOUNT+'/d1/database','POST',{'name':'casas-de-papel-pieces'})['uuid']
 p.write_text(json.dumps({'account_id':ACCOUNT,'database_id':db,'worker':'casas-de-papel-pieces'},indent=2)+'\n')
for sql in (root/'backend/schema.sql').read_text().split(';'):
 if sql.strip():api('accounts/'+ACCOUNT+'/d1/database/'+db+'/query','POST',{'sql':sql,'params':[]})
api('accounts/'+ACCOUNT+'/d1/database/'+db+'/query','POST',{'sql':'CREATE TRIGGER IF NOT EXISTS intake_count AFTER INSERT ON pieces BEGIN INSERT INTO intake_days(day,n) VALUES(NEW.day,1) ON CONFLICT(day) DO UPDATE SET n=n+1; END','params':[]})
for sql in ['CREATE TRIGGER IF NOT EXISTS intake_queue_add AFTER INSERT ON pieces BEGIN UPDATE intake_queue SET n=n+1 WHERE id=1; END','CREATE TRIGGER IF NOT EXISTS intake_queue_remove AFTER DELETE ON pieces BEGIN UPDATE intake_queue SET n=n-1 WHERE id=1; END','CREATE TRIGGER IF NOT EXISTS intake_count_houses AFTER INSERT ON houses BEGIN INSERT INTO intake_days(day,n) VALUES(NEW.day,1) ON CONFLICT(day) DO UPDATE SET n=n+1; END','CREATE TRIGGER IF NOT EXISTS intake_queue_add_houses AFTER INSERT ON houses BEGIN UPDATE intake_queue SET n=n+1 WHERE id=1; END','CREATE TRIGGER IF NOT EXISTS intake_queue_remove_houses AFTER DELETE ON houses BEGIN UPDATE intake_queue SET n=n-1 WHERE id=1; END']:
 api('accounts/'+ACCOUNT+'/d1/database/'+db+'/query','POST',{'sql':sql,'params':[]})
meta={'main_module':'worker.mjs','compatibility_date':'2026-11-01','bindings':[{'type':'d1','name':'DB','id':db}],'observability':{'enabled':False}}
boundary='----'+uuid.uuid4().hex
body=b''
for name,filename,typ,content in [('metadata',None,'application/json',json.dumps(meta).encode()),('worker.mjs','worker.mjs','application/javascript+module',(root/'backend/worker.mjs').read_bytes())]:
 body+=('--'+boundary+'\r\nContent-Disposition: form-data; name="'+name+'"'+('; filename="'+filename+'"' if filename else '')+'\r\nContent-Type: '+typ+'\r\n\r\n').encode()+content+b'\r\n'
body+=('--'+boundary+'--\r\n').encode()
r=api('accounts/'+ACCOUNT+'/workers/scripts/casas-de-papel-pieces','PUT',raw=body,content_type='multipart/form-data; boundary='+boundary)
api('accounts/'+ACCOUNT+'/workers/scripts/casas-de-papel-pieces/subdomain','POST',{'enabled':True,'previews_enabled':False})
sub=api('accounts/'+ACCOUNT+'/workers/subdomain')['subdomain']
print(json.dumps({'database_id':db,'subdomain':sub,'worker_id':r.get('id')}))
