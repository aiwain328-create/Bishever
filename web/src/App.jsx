// Simplified NimbusNotes V2 React app (UI + local-first features)
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
const LS_KEY = 'nimbus_v2_state';
function loadState(){ try{ const raw=localStorage.getItem(LS_KEY); if(!raw) throw new Error('no'); return JSON.parse(raw);}catch{ const id=uid(); const now=new Date().toISOString(); return { notebooks:[{id,name:'My Notebook',color:'#7c3aed',emoji:'📒',createdAt:now}], notes:[{id:uid(),notebookId:id,title:'Welcome to Nimbus Notes v2',content:'This is a demo note.',tags:['demo'],attachments:[],createdAt:now,updatedAt:now}], scratch:'Quick scratch…' }; }}
function saveState(s){ localStorage.setItem(LS_KEY, JSON.stringify(s)); }
function previewFromContent(content,length=140){ const plain=content.replace(/[#*_`>\-\[\]]/g,'').replace(/\n+/g,' ').trim(); return plain.length>length?plain.slice(0,length)+'…':plain; }

export default function App(){
  const [state,setState]=useState(loadState);
  const [query,setQuery]=useState('');
  const [selectedNotebookId,setSelectedNotebookId]=useState(state.notebooks[0]?.id||null);
  const [selectedNoteId,setSelectedNoteId]=useState(state.notes[0]?.id||null);
  const [showPreview,setShowPreview]=useState(false);
  const [tagFilter,setTagFilter]=useState([]);

  useEffect(()=>{ saveState(state); },[state]);
  const notebooks=state.notebooks;
  const allTags=useMemo(()=>Array.from(new Set(state.notes.flatMap(n=>n.tags))).sort(),[state.notes]);
  const notesSorted=[...state.notes].sort((a,b)=>a.updatedAt<b.updatedAt?1:-1);
  const filteredNotes=notesSorted.filter(n=>(!selectedNotebookId||n.notebookId===selectedNotebookId)&&(tagFilter.length===0||tagFilter.every(t=>n.tags.includes(t)))&&(n.title.toLowerCase().includes(query.toLowerCase())||n.content.toLowerCase().includes(query.toLowerCase())));
  const current=filteredNotes.find(n=>n.id===selectedNoteId)||filteredNotes[0]||null;

  function createNotebook(){ const id=uid(); const nb={id,name:`Notebook ${notebooks.length+1}`,color:'#7c3aed',emoji:'📒',createdAt:new Date().toISOString()}; setState(s=>({...s,notebooks:[nb,...s.notebooks]})); setSelectedNotebookId(id); }
  function createNote(){ const nbId=selectedNotebookId||notebooks[0]?.id; if(!nbId) return; const now=new Date().toISOString(); const note={id:uid(),notebookId:nbId,title:'Untitled',content:'',tags:[],attachments:[],createdAt:now,updatedAt:now}; setState(s=>({...s,notes:[note,...s.notes]})); setSelectedNoteId(note.id); }
  function updateNote(id,patch){ setState(s=>({...s,notes:s.notes.map(n=>n.id===id?{...n,...patch,updatedAt:new Date().toISOString()}:n)})); }
  function deleteNote(id){ setState(s=>({...s,notes:s.notes.filter(n=>n.id!==id)})); if(selectedNoteId===id) setSelectedNoteId(null); }
  function addTagsToCurrent(input){ if(!current) return; const newTags=input.split(',').map(t=>t.trim()).filter(Boolean); const uniq=Array.from(new Set([...(current.tags||[]),...newTags])); updateNote(current.id,{tags:uniq}); }
  function removeTagFromCurrent(tag){ if(!current) return; updateNote(current.id,{tags:current.tags.filter(t=>t!==tag)}); }
  async function attachFiles(files){ if(!current||!files||files.length===0) return; const list=[]; for(const f of Array.from(files)){ const url=URL.createObjectURL(f); list.push({id:uid(),name:f.name,size:f.size,type:f.type||'application/octet-stream',url,createdAt:new Date().toISOString()}); } updateNote(current.id,{attachments:[...(current.attachments||[]),...list]}); }
  function removeAttachment(attId){ if(!current) return; updateNote(current.id,{attachments:current.attachments.filter(a=>a.id!==attId)}); }

  return (
    <div style={{display:'grid',gridTemplateRows:'56px 1fr 64px',height:'100vh'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px',borderBottom:'1px solid #eee',background:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}><strong>Nimbus Notes</strong></div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <input placeholder='Search notes…' value={query} onChange={e=>setQuery(e.target.value)} style={{padding:6,width:240}} />
          <div style={{position:'relative'}}>
            <button>Settings</button>
          </div>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'280px 360px 1fr'}}>
        <div style={{borderRight:'1px solid #eee',overflowY:'auto',background:'#fff'}}>
          <div style={{display:'flex',justifyContent:'space-between',padding:12}}><strong>Notebooks</strong><button onClick={createNotebook}>New</button></div>
          <div style={{padding:8}}>
            {notebooks.map(nb=> (
              <div key={nb.id} onClick={()=>setSelectedNotebookId(nb.id)} style={{borderLeft:`4px solid ${nb.color}`,padding:8,marginBottom:8,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><span style={{marginRight:8}}>{nb.emoji}</span>{nb.name}</div></div>
              </div>
            ))}
          </div>
        </div>
        <div style={{borderRight:'1px solid #eee',overflowY:'auto',background:'#fff'}}>
          <div style={{display:'flex',justifyContent:'space-between',padding:12}}><strong>Notes</strong><div><button onClick={createNote}>New</button></div></div>
          <div style={{padding:8}}>
            <div style={{marginBottom:8}}>
              {allTags.map(tag=> (<button key={tag} onClick={()=>setTagFilter(tf=>tf.includes(tag)?tf.filter(t=>t!==tag):[...tf,tag])} style={{marginRight:6}}>{tag}</button>))}
            </div>
            {filteredNotes.length===0 && <div style={{color:'#666'}}>No notes</div>}
            {filteredNotes.map(n=> (
              <div key={n.id} onClick={()=>setSelectedNoteId(n.id)} style={{padding:8,marginBottom:8,border:'1px solid #f1f1f1',cursor:'pointer'}}>
                <div style={{fontWeight:600}}>{n.title||'Untitled'}</div>
                <div style={{fontSize:12,color:'#666'}}>{previewFromContent(n.content)}</div>
                <div style={{marginTop:6}}>{(n.tags||[]).map(t=>(<span key={t} style={{fontSize:11,marginRight:6}}>#{t}</span>))}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{overflowY:'auto',background:'#fff'}}>
          {current ? (
            <div style={{padding:16}}>
              <div style={{display:'flex',gap:8}}>
                <input value={current.title} onChange={e=>updateNote(current.id,{title:e.target.value})} style={{fontSize:18,fontWeight:600,flex:1,padding:8}} />
                <button onClick={()=>setShowPreview(p=>!p)}>{showPreview?'Hide':'Show'} Preview</button>
              </div>
              {!showPreview ? (
                <textarea value={current.content} onChange={e=>updateNote(current.id,{content:e.target.value})} style={{width:'100%',minHeight:300,marginTop:12,padding:8}} />
              ) : (
                <div style={{padding:12,background:'#fafafa',minHeight:300,marginTop:12}}>{current.content}</div>
              )}
              <div style={{marginTop:12}}>
                {(current.tags||[]).map(tag=>(<span key={tag} style={{marginRight:6}}>{tag} <button onClick={()=>removeTagFromCurrent(tag)}>x</button></span>))}
                <input placeholder='Add tags (comma separated)' onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addTagsToCurrent(e.target.value); e.target.value=''; } }} style={{marginLeft:8}} />
              </div>
              <div style={{marginTop:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <strong>Attachments</strong>
                  <label style={{cursor:'pointer'}}><input type='file' multiple style={{display:'none'}} onChange={e=>attachFiles(e.target.files)} /> <button>Add files</button></label>
                </div>
                <div style={{marginTop:8}}>
                  {(current.attachments||[]).length===0? <div style={{color:'#666'}}>No attachments</div> : (
                    <div>{current.attachments.map(att=>(<div key={att.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:8,border:'1px solid #f1f1f1',marginBottom:8}}><div><div style={{fontWeight:600}}>{att.name}</div><div style={{fontSize:12,color:'#666'}}>{(att.size/1024).toFixed(1)} KB</div></div><div><a href={att.url} target='_blank' rel='noreferrer'><button>Open</button></a><button onClick={()=>removeAttachment(att.id)}>Remove</button></div></div>))}</div>
                  )}
                </div>
              </div>
              <div style={{marginTop:12}}><button onClick={()=>deleteNote(current.id)} style={{color:'red'}}>Delete Note</button></div>
            </div>
          ):(<div style={{padding:16,color:'#666'}}>Select or create a note</div>)}
        </div>
      </div>
      <div style={{borderTop:'1px solid #eee',display:'flex',alignItems:'center',gap:12,padding:'8px 12px',background:'#fff'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}><strong>Scratchpad</strong></div>
        <input value={state.scratch} onChange={e=>setState(s=>({...s,scratch:e.target.value}))} style={{flex:1,padding:8}} />
        <div style={{display:'flex',gap:8}}><button onClick={()=>navigator.clipboard.writeText(state.scratch)}>Copy</button><button onClick={()=>setState(s=>({...s,scratch:''}))}>Clear</button></div>
      </div>
    </div>
  );
}
