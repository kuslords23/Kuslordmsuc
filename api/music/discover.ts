import { sign } from "node:crypto"

type Req = { method?: string; headers?: Record<string, string | string[] | undefined> }
type Res = { status: (code: number) => Res; json: (value: unknown) => void; setHeader: (name: string, value: string) => void }
type DiscoveryTrack = { id:string; title:string; artist:string; artwork:string; embedUrl:string; openUrl:string; provider:string; providerId:string; kind:"track"|"video"; publishedAt?:string }
type DiscoveredArtist = { id:string; name:string; artwork:string; embedUrl:string; openUrl:string; provider:string; providerId:string; genres:string[]; popularity?:number }

let spotifyCache:{token:string;expires:number}|null=null
let appleCache:{token:string;expires:number}|null=null
const b64=(value:string|Buffer)=>Buffer.from(value).toString("base64url")

async function spotifyToken():Promise<string|null>{
  const id=process.env.SPOTIFY_CLIENT_ID?.trim(),secret=process.env.SPOTIFY_CLIENT_SECRET?.trim()
  if(!id||!secret)return null
  if(spotifyCache&&spotifyCache.expires>Date.now()+30000)return spotifyCache.token
  const response=await fetch("https://accounts.spotify.com/api/token",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(id+":"+secret).toString("base64"),"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"})
  if(!response.ok)return null
  const data=await response.json() as {access_token?:string;expires_in?:number}
  if(!data.access_token)return null
  spotifyCache={token:data.access_token,expires:Date.now()+(data.expires_in||3600)*1000}
  return data.access_token
}
async function spotifySearch(term:string):Promise<{tracks:DiscoveryTrack[];artists:DiscoveredArtist[]}>{
  const token=await spotifyToken();if(!token)return{tracks:[],artists:[]}
  const url=new URL("https://api.spotify.com/v1/search");url.searchParams.set("q",term);url.searchParams.set("type","track,artist");url.searchParams.set("limit","12");url.searchParams.set("market","GH")
  const response=await fetch(url.toString(),{headers:{Authorization:"Bearer "+token}});if(!response.ok)return{tracks:[],artists:[]}
  const data=await response.json() as any
  return{
    tracks:(data.tracks?.items||[]).map((item:any):DiscoveryTrack=>({id:"spotify:"+item.id,title:item.name,artist:(item.artists||[]).map((a:any)=>a.name).join(", "),artwork:item.album?.images?.[0]?.url||"",embedUrl:"https://open.spotify.com/embed/track/"+item.id,openUrl:item.external_urls?.spotify||"https://open.spotify.com/track/"+item.id,provider:"Spotify",providerId:item.id,kind:"track",publishedAt:item.album?.release_date})),
    artists:(data.artists?.items||[]).map((item:any):DiscoveredArtist=>({id:"spotify:"+item.id,name:item.name,artwork:item.images?.[0]?.url||"",embedUrl:"https://open.spotify.com/embed/artist/"+item.id,openUrl:item.external_urls?.spotify||"https://open.spotify.com/artist/"+item.id,provider:"Spotify",providerId:item.id,genres:Array.isArray(item.genres)?item.genres.slice(0,5):[],popularity:Number(item.popularity)||0}))
  }
}
async function youtubeSearch(term:string):Promise<DiscoveryTrack[]>{
  const key=process.env.YOUTUBE_DATA_API_KEY?.trim();if(!key)return[]
  const url=new URL("https://www.googleapis.com/youtube/v3/search");url.searchParams.set("part","snippet");url.searchParams.set("type","video");url.searchParams.set("videoCategoryId","10");url.searchParams.set("videoEmbeddable","true");url.searchParams.set("videoSyndicated","true");url.searchParams.set("maxResults","12");url.searchParams.set("regionCode","GH");url.searchParams.set("q",term);url.searchParams.set("key",key)
  const response=await fetch(url.toString());if(!response.ok)return[]
  const data=await response.json() as any
  return(data.items||[]).flatMap((item:any)=>{const id=item.id?.videoId;if(!id)return[];return[{id:"youtube:"+id,title:item.snippet?.title||"Music video",artist:item.snippet?.channelTitle||"YouTube creator",artwork:item.snippet?.thumbnails?.high?.url||item.snippet?.thumbnails?.medium?.url||"",embedUrl:"https://www.youtube.com/embed/"+id,openUrl:"https://www.youtube.com/watch?v="+id,provider:"YouTube",providerId:id,kind:"video" as const,publishedAt:item.snippet?.publishedAt}]})
}
function appleToken():string|null{
  const team=process.env.APPLE_MUSIC_TEAM_ID?.trim(),kid=process.env.APPLE_MUSIC_KEY_ID?.trim(),raw=process.env.APPLE_MUSIC_PRIVATE_KEY
  if(!team||!kid||!raw)return null
  if(appleCache&&appleCache.expires>Date.now()+300000)return appleCache.token
  const now=Math.floor(Date.now()/1000),header=b64(JSON.stringify({alg:"ES256",kid,typ:"JWT"})),payload=b64(JSON.stringify({iss:team,iat:now,exp:now+2592000})),input=header+"."+payload
  const signature=sign("sha256",Buffer.from(input),{key:raw.replace(/\\n/g,"\n"),dsaEncoding:"ieee-p1363"}).toString("base64url"),token=input+"."+signature
  appleCache={token,expires:(now+2592000)*1000};return token
}
async function appleSearch(term:string):Promise<{tracks:DiscoveryTrack[];artists:DiscoveredArtist[]}>{
  const token=appleToken();if(!token)return{tracks:[],artists:[]}
  const storefront=(process.env.APPLE_MUSIC_STOREFRONT||"gh").trim().toLowerCase(),url=new URL("https://api.music.apple.com/v1/catalog/"+storefront+"/search")
  url.searchParams.set("term",term);url.searchParams.set("types","songs,artists");url.searchParams.set("limit","12")
  const response=await fetch(url.toString(),{headers:{Authorization:"Bearer "+token}});if(!response.ok)return{tracks:[],artists:[]}
  const data=await response.json() as any
  const tracks=(data.results?.songs?.data||[]).map((item:any):DiscoveryTrack=>{const a=item.attributes||{},source=a.url||"";return{id:"apple:"+item.id,title:a.name||"Song",artist:a.artistName||"Artist",artwork:(a.artwork?.url||"").replace("{w}","600").replace("{h}","600"),embedUrl:source?source.replace("https://music.apple.com/","https://embed.music.apple.com/"):"",openUrl:source,provider:"Apple Music",providerId:item.id,kind:"track",publishedAt:a.releaseDate}})
  const artists=(data.results?.artists?.data||[]).map((item:any):DiscoveredArtist=>{const a=item.attributes||{},source=a.url||"";return{id:"apple:"+item.id,name:a.name||"Artist",artwork:(a.artwork?.url||"").replace("{w}","600").replace("{h}","600"),embedUrl:source?source.replace("https://music.apple.com/","https://embed.music.apple.com/"):"",openUrl:source,provider:"Apple Music",providerId:item.id,genres:Array.isArray(a.genreNames)?a.genreNames.slice(0,5):[]}})
  return{tracks,artists}
}
async function persistArtists(artists:DiscoveredArtist[]):Promise<boolean>{
  const root=(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL||"").replace(/\/$/,""),key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY
  if(!root||!key||!artists.length)return false
  const rows=artists.map(a=>({provider:a.provider.toLowerCase().replace(/[^a-z0-9]+/g,"_"),provider_artist_id:a.providerId,name:a.name,artwork_url:a.artwork||null,embed_url:a.embedUrl||null,profile_url:a.openUrl||null,genres:a.genres,popularity:a.popularity??null,last_seen_at:new Date().toISOString()}))
  const response=await fetch(root+"/rest/v1/music_discovered_artists?on_conflict=provider,provider_artist_id",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(rows)})
  return response.ok
}
export default async function handler(req:Req,res:Res){
  res.setHeader("Cache-Control","public, s-maxage=21600, stale-while-revalidate=86400")
  res.setHeader("Vary","Accept-Encoding")
  if(req.method!=="GET")return res.status(405).json({ok:false,error:"Method not allowed"})
  const terms=["Ghanaian Afrobeats new music","African Afrobeats Amapiano new music","international new music hits"]
  const results=await Promise.all(terms.map(async term=>{
    const [spotify,apple,videos]=await Promise.all([spotifySearch(term),appleSearch(term),youtubeSearch(term+" official music video")])
    return{tracks:[...spotify.tracks,...apple.tracks],artists:[...spotify.artists,...apple.artists],videos}
  }))
  const unique=(items:any[])=>Array.from(new Map(items.map(item=>[item.id,item])).values())
  const tracks=unique(results.flatMap(r=>r.tracks)).slice(0,24),videos=unique(results.flatMap(r=>r.videos)).slice(0,18),artists=unique(results.flatMap(r=>r.artists)).slice(0,24)
  const profilesPersisted=await persistArtists(artists).catch(()=>false)
  return res.status(200).json({ok:true,tracks,videos,artists,profilesPersisted,generatedAt:new Date().toISOString(),regions:["Ghana","Africa","International"]})
}
