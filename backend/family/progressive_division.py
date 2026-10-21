"""Paper/cursor adapter over writing_math.check; no estimator or curriculum decisions."""
from rest_framework.exceptions import ValidationError
from .writing_math import cycles, check, CONTRACT


def plan(spec):
    if spec['topic'] != 'division':
        raise ValidationError({'topic':'Progressive paper is for division.'})
    a,b=spec['parameters']['dividend'],spec['parameters']['divisor']
    digits=str(a); rows=cycles(a,b); start=len(digits)-len(rows); fields=[]
    for i,row in enumerate(rows):
        col=start+i
        for role,region,width,position in [
            ('quotient','quotient',1,i),
            ('product',f'product-{i+1}',len(str(row['partial'])),None),
            ('difference','remainder' if i==len(rows)-1 else f'difference-{i+1}',len(str(row['partial'])),None),
        ]:
            fields.append({'id':f'{role}:{i}','role':role,'cycle':i,'column':col,
                           'width':width,'region':region,'position':position,
                           'label':f'{"Quotient place" if role=="quotient" else "Multiply row" if role=="product" else "Subtract row"} {i+1}'})
    return {'dividend':digits,'divisor':str(b),'start':start,'fields':fields}


def work(spec,draft_id,entries,through=None):
    """Confirmed child numbers plus verbatim copies of printed dividend digits. No filled arithmetic."""
    p=plan(spec); data={}; quotient=''
    for index,field in enumerate(p['fields']):
        if through is not None and index>through:break
        raw=entries.get(field['id'],'')
        if field['role']=='quotient':
            if len(quotient)==field['cycle'] and raw:quotient+=raw
            if quotient:data['quotient']=quotient
        elif raw:
            data[field['region']]=raw
            if field['role']=='difference' and field['column']+1<len(p['dividend']):
                data[f'bring-down-{field["cycle"]+1}']=raw+p['dividend'][field['column']+1]
    tokens=[]
    for r in spec['layout']['regions']:
        if r['id'] in data:
            tokens.append({'id':r['id'],'regionId':r['id'],'text':data[r['id']],
                           'bounds':{k:r[k] for k in ['x','y','width','height']},'strokeIds':[],
                           'confidence':None,'status':'confirmed','origin':'manual','recognizer':None,
                           'revision':0,'createdOrder':r['order']+1})
    return {'contract':CONTRACT,'id':str(draft_id),'problem':spec['problem'],'layout':spec['layout'],
            'revision':0,'updatedAt':'','paper':'blank','history':[],'future':[],
            'strokes':[],'erased':[],'tokens':tokens,'corrections':[]}


def update(spec,draft_id,previous,entry,operation,digit=None):
    p=plan(spec); fields=p['fields']; ids=[f['id'] for f in fields]
    if entry not in ids or operation not in ['digit','replace','backspace','finish']:
        raise ValidationError({'input':'Unknown paper position or operation.'})
    state={**previous,'entries':dict(previous.get('entries',{}))}; entries=state['entries']; index=ids.index(entry)
    if index>state.get('visible',0):raise ValidationError({'input':'This row is not open yet.'})
    raw=entries.get(entry,'')
    if operation in ['digit','replace']:
        if not isinstance(digit,str) or len(digit)!=1 or digit not in '0123456789':
            raise ValidationError({'input':'Type a digit.'})
        raw=digit if operation=='replace' else raw+digit
        if len(raw)>fields[index]['width']:
            return {**state,'active':entry,'feedback':{'outcome':'format','message':'Change this number with Backspace, or tap it to replace it.'}},None
    elif operation=='backspace':
        if not raw and index:
            index-=1;entry=ids[index];raw=entries.get(entry,'')
        raw=raw[:-1]
    entries[entry]=raw
    field=fields[index]
    partial=check(spec,work(spec,draft_id,entries,index))
    observed=next((o for o in partial['observations'] if o['region']==field['region'] and o['position']==field['position']),None)
    valid=bool(observed and observed['correct']) and partial['outcome']!='incorrect'
    full=check(spec,work(spec,draft_id,entries))
    state['complete']=full['outcome']=='complete'
    state['active']=entry
    state['feedback']=None
    if operation=='backspace':
        return state,None
    if valid:
        state['visible']=max(state.get('visible',0),min(index+1,len(fields)-1))
        state['active']=None if state['complete'] else ids[min(index+1,len(fields)-1)]
        if state['complete']:
            q=''.join(entries.get(f['id'],'') for f in fields if f['role']=='quotient')
            remainder=entries.get(fields[-1]['id'],'')
            state['feedback']={'outcome':'complete','message':f'Finished! {spec["problem"]["statement"]} = {q} remainder {remainder}.'}
        return state,{'outcome':'complete' if state['complete'] else 'step-correct','entry':entry}
    if partial['outcome']=='incomplete' and observed is None and raw:
        missing=next((f['id'] for f in fields[:index] if not entries.get(f['id'])),None)
        if missing:
            state['active']=missing
            state['feedback']={'outcome':'incomplete','message':'Finish this earlier number first.'}
            return state,None
    # No automatic correction, answer disclosure or diagnosis. A shorter entry may still be in progress.
    if not raw:
        state['feedback']={'outcome':'incomplete','message':'Enter this number.'} if operation=='finish' else None
    elif len(raw)<field['width'] and operation!='finish':
        state['feedback']={'outcome':'pending','message':'Keep typing. Tap Done or press Enter to finish this number.'}
    else:
        bad=next((o for o in partial['observations'] if not o['correct']),None)
        target=next((f['id'] for f in fields if bad and f['region']==bad['region'] and f['position']==bad['position']),entry)
        state['active']=target
        state['feedback']={'outcome':'incorrect','message':'Check this number. Tap it or use Backspace to change it.'}
        return state,{'outcome':'incorrect','entry':target}
    return state,None
