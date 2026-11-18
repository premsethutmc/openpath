/** Deduplicate asynchronous mount-time initialization, never cache learner state after it settles. */
import {Learner} from '../learner.ts';
import type {AppContent} from '../content.ts';
import type {Repo} from '../store.ts';
const opening=new WeakMap<Repo,Map<string,Promise<Learner>>>();
export function openArgumentConceptLearner(source:Learner,content:AppContent):Promise<Learner>{
 const id=`${source.profileId}:argument-concepts`,repo=source.repo;
 let byProfile=opening.get(repo);if(!byProfile){byProfile=new Map();opening.set(repo,byProfile);}
 const existing=byProfile.get(id);if(existing)return existing;
 const pending=(async()=>{
  const saved=await repo.load(id);
  return saved.length?Learner.open(content,repo,id,source.clock):Learner.create(content,repo,'Argument concept practice only (synthetic)','guardian',source.clock,id,'this_device_only');
 })();
 byProfile.set(id,pending);
 const clear=()=>{if(byProfile!.get(id)===pending)byProfile!.delete(id);};
 void pending.then(clear,clear);
 return pending;
}
