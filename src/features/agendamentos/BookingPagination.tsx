export function BookingPagination({page,setPage,total,isLoading,isSaving}: {page: number;setPage(page: number): void;total: number;isLoading: boolean;isSaving: boolean}) {
 if(total<=20)return null;
 return <nav aria-label="Paginação de agendamentos"><button type="button" className="btn btn-secondary" disabled={isLoading||isSaving||page<=1} onClick={()=>setPage(page-1)}>Anterior</button><span> Página {page} de {Math.ceil(total/20)} </span><button type="button" className="btn btn-secondary" disabled={isLoading||isSaving||page*20>=total} onClick={()=>setPage(page+1)}>Próxima</button></nav>;
}
