import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { services } from '../../services';
import type { AppServices } from '../../services/contracts';
import type { AuditLog, User } from '../../types/domain';
import { entityLabels } from './activity-labels';

export function useAdminActivity(user:User|null,gateway:AppServices=services){
  const http=gateway.auth.mode==='http';
  const [logs,setLogs]=useState<AuditLog[]>([]),[clients,setClients]=useState<User[]>([]);
  const [selectedClient,setSelectedClient]=useState(''),[query,setQuery]=useState('');
  const serverSearch=http?query:'';
  const [limit,setLimit]=useState(30),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false),[total,setTotal]=useState(0),[cursor,setCursor]=useState<string|null>(null),[revision,setRevision]=useState(0);
  const [loadedFor,setLoadedFor]=useState('');
  const generation=useRef(0),busy=useRef(false),current=useRef({id:user?.id,query,role:user?.role});
  current.current={id:user?.id,query,role:user?.role};
  const viewKey=`${user?.id??''}/${user?.role??''}/${serverSearch}`;
  const load=useCallback(async(next?:string)=>{
    if(!user||user.role!=='admin')return;
    const visit=generation.current,owner=user.id;
    const valid=()=>generation.current===visit&&current.current.id===owner&&current.current.role==='admin'&&(!http||current.current.query===serverSearch);
    if(next&&busy.current)return;
    busy.current=true;if(next)setLoadingMore(true);else setLoading(true);setError('');
    try{
      if(http){
        if(!gateway.audit.listActivities)throw new Error('Consulta ainda não integrada.');
        const page=await gateway.audit.listActivities({search:serverSearch,...(next?{cursor:next}:{})});
        if(!valid())return;
        setLogs(old=>next?[...old,...page.items.filter(item=>!old.some(previous=>previous.id===item.id))]:page.items);
        setTotal(page.total);setCursor(page.nextCursor);
      }else{
        const [items,users]=await Promise.all([gateway.audit.listRecent(owner,500),gateway.users.listUsersWithHoursPlanInfo()]);
        if(!valid())return;
        setLogs(items);setClients(users.filter(candidate=>candidate.role==='client'));
      }
      setLoadedFor(`${owner}/admin/${serverSearch}`);
    }catch(caught:unknown){if(valid())setError(caught instanceof Error?caught.message:'Falha ao carregar atividades.');}
    finally{if(valid()){busy.current=false;setLoading(false);setLoadingMore(false);}}
  },[gateway,http,serverSearch,user?.id,user?.role]);
  useEffect(()=>{setClients([]);setSelectedClient('');},[user?.id,user?.role,http]);
  useEffect(()=>{
    generation.current++;busy.current=false;setLogs([]);setCursor(null);setTotal(0);setError('');setLoadingMore(false);
    if(!user||user.role!=='admin'){setLoading(false);return;}
    setLoading(true);
    const timer=window.setTimeout(()=>void load(),serverSearch?250:0);
    return()=>{window.clearTimeout(timer);generation.current++;};
  },[load,revision]);
  const filtered=useMemo(()=>loadedFor!==viewKey?[]:http?logs:logs.filter(log=>`${log.actorName??''} ${log.entityId} ${entityLabels[log.entity]??log.entity}`.toLowerCase().includes(query.toLowerCase())),[logs,query,http,loadedFor,viewKey]);
  function search(value:string){const next=value.slice(0,150);if(next===query)return;if(http)generation.current++;setQuery(next);setLimit(30);}
  function clearSearch(){search('');}
  async function loadMore(){if(http){if(cursor)await load(cursor);}else setLimit(current=>current+30);}
  function retry(){generation.current++;setRevision(value=>value+1);}
  return {http,clients,selectedClient,setSelectedClient,query,limit:http?filtered.length:limit,error,loading,loadingMore,total:http?(loadedFor===viewKey?total:0):filtered.length,hasMore:http?cursor!==null:limit<filtered.length,filtered,search,clearSearch,loadMore,retry};
}
export type AdminActivityViewModel=ReturnType<typeof useAdminActivity>;
