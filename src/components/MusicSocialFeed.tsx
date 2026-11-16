import { useEffect,useState } from 'react'
import type { Track } from '../data/music'
import { supabase } from '../lib/supabase'
import './MusicSocialFeed.css'
type Share={id:string;user_id:string;track_post_id:string|null;playlist_id:string|null;body:string;created_at:string;likes:number;liked:boolean}
type PublicPlaylist={id:string;name:string;description:string}
export default function MusicSocialFeed({tracks,userId}:{tracks:Track[];userId?:string}){
 const [shares,setShares]=useState<Share[]>([]),[playlists,setPlaylists]=useState<PublicPlaylist[]>([]),[selectedTrack,setSelectedTrack]=useState(''),[selectedPlaylist,setSelectedPlaylist]=useState(''),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const load=async()=>{
  if(!supabase)return
  const [feed,playlistResult]=await Promise.all([
   supabase.from('music_social_shares').select('id,user_id,track_post_id,playlist_id,body,created_at,music_social_share_likes(user_id)').eq('visibility','public').order('created_at',{ascending:false}).limit(40),
   supabase.from('music_playlists').select('id,name,description').eq('visibility','public').order('updated_at',{ascending:false}).limit(30),
  ])
  if(feed.error){setMessage(feed.error.message);return}
  setPlaylists(playlistResult.data||[])
  setShares((feed.data||[]).map((row:any)=>({id:row.id,user_id:row.user_id,track_post_id:row.track_post_id,playlist_id:row.playlist_id,body:row.body,created_at:row.created_at,likes:row.music_social_share_likes?.length||0,liked:Boolean(userId&&row.music_social_share_likes?.some((l:any)=>l.user_id===userId))})))
 }
 useEffect(()=>{void load()},[userId])
 const publish=async()=>{if(!supabase||!userId)return;const track=tracks.find(t=>t.id===selectedTrack);if(!track&&!selectedPlaylist&&!body.trim())return;setBusy(true);const {error}=await supabase.from('music_social_shares').insert({user_id:userId,track_post_id:track?.postId||track?.id||null,playlist_id:selectedPlaylist||null,body:body.trim(),visibility:'public'});if(error)setMessage(error.message);else{setBody('');setSelectedTrack('');setSelectedPlaylist('');setMessage('Shared with the music community.');await load()}setBusy(false)}
 const toggleLike=async(share:Share)=>{if(!supabase||!userId){setMessage('Sign in to like community posts.');return}const result=share.liked?await supabase.from('music_social_share_likes').delete().eq('share_id',share.id).eq('user_id',userId):await supabase.from('music_social_share_likes').insert({share_id:share.id,user_id:userId});if(result.error)setMessage(result.error.message);else setShares(current=>current.map(s=>s.id===share.id?{...s,liked:!s.liked,likes:Math.max(0,s.likes+(s.liked?-1:1))}:s))}
 return <section className="msf"><div className="msf-head"><div><span>THE LISTENING ROOM</span><h2>Music community</h2><p>Share a track or a thought with the community. Posting is always an explicit action.</p></div><button onClick={()=>void load()}>Refresh</button></div>
 {userId?<div className="msf-compose"><textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="What are you listening to?" rows={3}/><div><select value={selectedTrack} onChange={e=>setSelectedTrack(e.target.value)}><option value="">Attach a track (optional)</option>{tracks.map(t=><option value={t.id} key={t.id}>{t.title} · {t.artist}</option>)}</select><select value={selectedPlaylist} onChange={e=>setSelectedPlaylist(e.target.value)}><option value="">Attach a public playlist (optional)</option>{playlists.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select><button disabled={busy||(!body.trim()&&!selectedTrack&&!selectedPlaylist)} onClick={()=>void publish()}>Share</button></div></div>:<p className="msf-note">Sign in to share music with the community.</p>}
 {message&&<p className="msf-message" role="status">{message}</p>}
 <div className="msf-feed">{shares.map(share=>{const track=tracks.find(t=>(t.postId||t.id)===share.track_post_id);const playlist=playlists.find(p=>p.id===share.playlist_id);return <article key={share.id}><div className="msf-author"><span>♫</span><div><strong>Music community member</strong><small>{new Date(share.created_at).toLocaleString()}</small></div></div>{share.body&&<p>{share.body}</p>}{playlist&&<div className="msf-track"><span>♫</span><div><strong>{playlist.name}</strong><small>Public playlist · {playlist.description||'Community playlist'}</small></div></div>}{track&&<div className="msf-track"><span>{track.cover.startsWith('http')?<img src={track.cover} alt=""/>:'♫'}</span><div><strong>{track.title}</strong><small>{track.artist}</small></div></div>}<button className={share.liked?'liked':''} onClick={()=>void toggleLike(share)}>{share.liked?'♥':'♡'} {share.likes} · Like</button></article>})}{!shares.length&&<p className="msf-note">No public music shares yet. Start the conversation with a track you love.</p>}</div></section>
}