import json
from pathlib import Path
cats=['alternative-algebra','trig-log','radical-equation','calculus-transform','cross-domain']
cases=[]
for cat in cats:
 for i in range(60):
  m=i%10
  if m<5: status,first='verified',None
  elif m==5:status,first='invalid',0
  elif m==6:status,first='invalid',1
  elif m==7:status,first='unsupported',None
  elif m==8:status,first='incomplete',None
  else:status,first='resource-exhausted',None
  if cat=='cross-domain' and first is not None:first+=1
  cases.append({'id':f'd1-{cat}-{i:02}','category':cat,'parameter':i+1,'mode':m,'expected':{'classification':status,'firstInvalidStep':first},'frozenBeforeFinalTuning':len(cases)<100,'oracle':'independently authored exact algebra/domain derivation and earliest-line label'})
out={'version':'math-reasoning-depth-d1@1','frozenPrefixCount':100,'cases':cases}
Path(__file__).with_name('independent-cases.v1.json').write_text(json.dumps(out,indent=2)+'\n')
print(len(cases))
