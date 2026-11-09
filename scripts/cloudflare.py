"""Private deployment/review helper. Credential is read only by the API request. Never log it."""
import json,urllib.request,pathlib,os
ACCOUNT='abbb1b9304d4ac2efd8ac10fc3039459'
def api(path,method='GET',data=None,raw=None,content_type='application/json'):
 token=pathlib.Path(os.environ['CF_TOKEN_FILE']).read_text().strip()
 body=raw if raw is not None else json.dumps(data).encode() if data is not None else None
 req=urllib.request.Request('https://api.cloudflare.com/client/v4/'+path,data=body,method=method,headers={'Authorization':'Bearer '+token,'Content-Type':content_type})
 try:
  out=json.load(urllib.request.urlopen(req,timeout=40))
 except urllib.error.HTTPError as e:
  # API errors may include user input, never dump the request or authorization.
  raise RuntimeError('Cloudflare API HTTP '+str(e.code)) from None
 if not out.get('success'):raise RuntimeError(str(out.get('errors')))
 return out.get('result')
def query(sql,params=[]):
 config=json.loads(pathlib.Path(__file__).parents[1].joinpath('backend/config.json').read_text())
 return api('accounts/'+ACCOUNT+'/d1/database/'+config['database_id']+'/query','POST',{'sql':sql,'params':params})[0]
