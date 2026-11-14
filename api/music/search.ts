import { sign } from "node:crypto"
type ApiRequest={method?:string;query?:Record<string,string|string[]|undefined>}
type ApiResponse={status:(code:number)=>ApiResponse;json:(value:unknown)=>void;setHeader:(name:string,value:string)=>void}
type Item={id:string;providerTrackId:string;title:string;artist:string;coverUrl:string;embedUrl:string;openUrl:string;platform:string;kind:"track"|"artist"|"album";duration:number}
let tokenCache:{value:string;expiresAt:number}|null=null
async function spotifyToken():Promise<string|null>{const id=process.env.SPOTIFY_CLIENT_ID?.trim(),secret=process.env.SPOTIFY_CLIENT_SECRET?.trim();if(!id||!secret)return null;if(tokenCache&&Date.now()<tokenCache.expiresAt-30000)return tokenCache.value;const r=await fetch("https://accounts.spotify.com/api/token",{method:"POST",headers:{Authorization:"Basic "+Buffer.from(id+":"+secret).toString("base64"),"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});if(!r.ok)return null;const b=await r.json() as {access_token?:string;expires_in?:number};if(!b.access_token)return null;tokenCache={value:b.access_token,expiresAt:Date.now()+(b.expires_in||3600)*1000};return tokenCache.value}
async function spotify(q:string,limit:number):Promise<Item[]>{const token=await spotifyToken();if(!token)return[];const url=new URL("https://api.spotify.com/v1/search");url.searchParams.set("q",q);url.searchParams.set("type","track,artist,album");url.searchParams.set("limit",String(Math.min(20,limit)));url.searchParams.set("market","GH");const r=await fetch(url.toString(),{headers:{Authorization:"Bearer "+token}});if(!r.ok)throw new Error("Spotify search returned HTTP "+r.status);const b=await r.json() as any;return [...(b.tracks?.items||[]).map((t:any)=>({id:"spotify-track-"+t.id,providerTrackId:t.id,title:t.name,artist:(t.artists||[]).map((a:any)=>a.name).join(", "),coverUrl:t.album?.images?.[0]?.url||"",embedUrl:"https://open.spotify.com/embed/track/"+t.id,openUrl:t.external_urls?.spotify||"https://open.spotify.com/track/"+t.id,platform:"Spotify",kind:"track" as const,duration:Math.round((t.duration_ms||0)/1000)})),...(b.artists?.items||[]).map((a:any)=>({id:"spotify-artist-"+a.id,providerTrackId:a.id,title:a.name,artist:a.name,coverUrl:a.images?.[0]?.url||"",embedUrl:"https://open.spotify.com/embed/artist/"+a.id,openUrl:a.external_urls?.spotify||"https://open.spotify.com/artist/"+a.id,platform:"Spotify",kind:"artist" as const,duration:0})),...(b.albums?.items||[]).map((a:any)=>({id:"spotify-album-"+a.id,providerTrackId:a.id,title:a.name,artist:(a.artists||[]).map((x:any)=>x.name).join(", "),coverUrl:a.images?.[0]?.url||"",embedUrl:"https://open.spotify.com/embed/album/"+a.id,openUrl:a.external_urls?.spotify||"https://open.spotify.com/album/"+a.id,platform:"Spotify",kind:"album" as const,duration:0}))].slice(0,limit)}
async function youtube(q:string,limit:number):Promise<Item[]>{const key=process.env.YOUTUBE_DATA_API_KEY?.trim();if(!key)return[];const url=new URL("https://www.googleapis.com/youtube/v3/search");url.searchParams.set("part","snippet");url.searchParams.set("type","video");url.searchParams.set("videoCategoryId","10");url.searchParams.set("videoEmbeddable","true");url.searchParams.set("videoSyndicated","true");url.searchParams.set("maxResults",String(Math.min(20,limit)));url.searchParams.set("regionCode","GH");url.searchParams.set("q",q);url.searchParams.set("key",key);const r=await fetch(url.toString());if(!r.ok)throw new Error("YouTube search returned HTTP "+r.status);const b=await r.json() as any;return(b.items||[]).flatMap((x:any)=>{const id=x.id?.videoId;if(!id)return[];return[{id:"youtube-video-"+id,providerTrackId:id,title:x.snippet?.title||"YouTube music video",artist:x.snippet?.channelTitle||"YouTube creator",coverUrl:x.snippet?.thumbnails?.high?.url||x.snippet?.thumbnails?.medium?.url||"",embedUrl:"https://www.youtube.com/embed/"+id,openUrl:"https://www.youtube.com/watch?v="+id,platform:"YouTube",kind:"track" as const,duration:0}]})}

let appleTokenCache:{value:string;expiresAt:number}|null=null
function base64Url(value:string|Buffer):string{return Buffer.from(value).toString("base64url")}
function appleDeveloperToken():string|null{
 const team=process.env.APPLE_MUSIC_TEAM_ID?.trim(),keyId=process.env.APPLE_MUSIC_KEY_ID?.trim(),rawKey=process.env.APPLE_MUSIC_PRIVATE_KEY
 if(!team||!keyId||!rawKey)return null
 if(appleTokenCache&&Date.now()<appleTokenCache.expiresAt-300000)return appleTokenCache.value
 const now=Math.floor(Date.now()/1000),header=base64Url(JSON.stringify({alg:"ES256",kid:keyId,typ:"JWT"})),payload=base64Url(JSON.stringify({iss:team,iat:now,exp:now+2592000}))
 const input=header+"."+payload,privateKey=rawKey.replace(/\\n/g,"\n")
 const signature=sign("sha256",Buffer.from(input),{key:privateKey,dsaEncoding:"ieee-p1363"}).toString("base64url")
 const value=input+"."+signature
 appleTokenCache={value,expiresAt:(now+2592000)*1000}
 return value
}
async function appleMusic(q:string,limit:number):Promise<Item[]>{
 const token=appleDeveloperToken()
 if(!token)return[]
 const storefront=(process.env.APPLE_MUSIC_STOREFRONT||"gh").trim().toLowerCase()
 const url=new URL("https://api.music.apple.com/v1/catalog/"+storefront+"/search")
 url.searchParams.set("term",q);url.searchParams.set("types","songs,artists,albums");url.searchParams.set("limit",String(Math.min(20,limit)))
 const response=await fetch(url.toString(),{headers:{Authorization:"Bearer "+token}})
 if(!response.ok)throw new Error("Apple Music search returned HTTP "+response.status)
 const body=await response.json() as any
 const output:Item[]=[]
 for(const [type,kind] of [["songs","track"],["artists","artist"],["albums","album"]] as const){
  const rows=body.results?.[type]?.data||[]
  for(const resource of rows){
   const a=resource.attributes||{},sourceUrl=a.url||""
   const embedUrl=sourceUrl?sourceUrl.replace("https://music.apple.com/","https://embed.music.apple.com/"):"https://embed.music.apple.com/"+storefront+"/"+(type==="songs"?"song":type==="artists"?"artist":"album")+"/"+resource.id
   const artwork=(a.artwork?.url||"").replace("{w}","600").replace("{h}","600")
   output.push({id:"apple-"+type+"-"+resource.id,providerTrackId:resource.id,title:a.name||"Apple Music item",artist:a.artistName||a.name||"Apple Music",coverUrl:artwork,embedUrl,openUrl:sourceUrl||embedUrl,platform:"Apple Music",kind,duration:Math.round((a.durationInMillis||0)/1000)})
  }
 }
 return output.slice(0,limit)
}


async function kusCatalog(q:string,limit:number):Promise<Item[]>{
 const root=(process.env.VITE_SUPABASE_URL||process.env.SUPABASE_URL||"").replace(/\/$/,"")
 const key=process.env.VITE_SUPABASE_ANON_KEY||process.env.SUPABASE_ANON_KEY||""
 if(!root||!key)return[]
 const term=q.replace(/[^\p{L}\p{N}\s'-]/gu," ").trim().replace(/\s+/g," ")
 if(!term)return[]
 const params=new URLSearchParams({select:"id,title,primary_artist,album_title,duration_ms,artwork_url,status",or:"(title.ilike.*"+term+"*,primary_artist.ilike.*"+term+"*,album_title.ilike.*"+term+"*)",status:"neq.unavailable",limit:String(limit)})
 const headers={apikey:key,Authorization:"Bearer "+key}
 const tracksResponse=await fetch(root+"/rest/v1/music_catalog_tracks?"+params.toString(),{headers})
 if(!tracksResponse.ok)return[]
 const tracks=await tracksResponse.json() as Array<{id:string;title:string;primary_artist:string;album_title?:string;duration_ms?:number;artwork_url?:string;status:string}>
 if(!tracks.length)return[]
 const ids=tracks.map(t=>t.id)
 const sourceParams=new URLSearchParams({select:"id,catalog_track_id,provider,provider_track_id,source_url,embed_url,playback_mode,availability",catalog_track_id:"in.("+ids.join(",")+")",availability:"eq.available"})
 const sourceResponse=await fetch(root+"/rest/v1/music_catalog_sources?"+sourceParams.toString(),{headers})
 if(!sourceResponse.ok)return[]
 const sources=await sourceResponse.json() as Array<{id:string;catalog_track_id:string;provider:string;provider_track_id:string;source_url:string;embed_url?:string;playback_mode:string;availability:string}>
 const providerNames:Record<string,string>={youtube:"YouTube",spotify:"Spotify",apple_music:"Apple Music",soundcloud:"SoundCloud",jamendo:"Jamendo",openverse:"Openverse",native:"KUS Music"}
 return sources.flatMap(source=>{const track=tracks.find(t=>t.id===source.catalog_track_id);if(!track)return[];return[{id:"kus-catalog-"+track.id+"-"+source.id,providerTrackId:source.provider_track_id,title:track.title,artist:track.primary_artist,coverUrl:track.artwork_url||"",embedUrl:source.embed_url||"",openUrl:source.source_url,platform:providerNames[source.provider]||source.provider,kind:"track" as const,duration:Math.round((track.duration_ms||0)/1000)}]}).slice(0,limit)
}

export default async function handler(req:ApiRequest,res:ApiResponse){res.setHeader("Cache-Control","no-store, max-age=0");if(req.method!=="GET")return res.status(405).json({ok:false,error:"Method not allowed"});const raw=req.query?.q,q=(Array.isArray(raw)?raw[0]:raw||"").trim().slice(0,120);const rawLimit=req.query?.limit,limit=Math.min(24,Math.max(1,Number(Array.isArray(rawLimit)?rawLimit[0]:rawLimit||12)||12));if(!q)return res.status(200).json({ok:true,items:[],hint:"Enter a search term."});const catalog=await kusCatalog(q,limit).catch(()=>[]);const [s,y,a]=await Promise.allSettled([spotify(q,limit),youtube(q,limit),appleMusic(q,limit)]);const items=[...catalog,...(s.status==="fulfilled"?s.value:[]),...(y.status==="fulfilled"?y.value:[]),...(a.status==="fulfilled"?a.value:[])];const hints=[];if(s.status==="rejected")hints.push(s.reason instanceof Error?s.reason.message:"Spotify search unavailable");if(y.status==="rejected")hints.push(y.reason instanceof Error?y.reason.message:"YouTube search unavailable");if(a.status==="rejected")hints.push(a.reason instanceof Error?a.reason.message:"Apple Music search unavailable");if(!process.env.SPOTIFY_CLIENT_ID||!process.env.SPOTIFY_CLIENT_SECRET)hints.push("Spotify text search needs SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.");if(!process.env.YOUTUBE_DATA_API_KEY)hints.push("YouTube text search needs YOUTUBE_DATA_API_KEY.");if(!process.env.APPLE_MUSIC_TEAM_ID||!process.env.APPLE_MUSIC_KEY_ID||!process.env.APPLE_MUSIC_PRIVATE_KEY)hints.push("Apple Music search needs APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID and APPLE_MUSIC_PRIVATE_KEY.");if(!items.length&&!hints.length)hints.push("No matching music was found.");return res.status(200).json({ok:true,query:q,providers:{kusCatalog:catalog.length>0,spotify:s.status==="fulfilled"&&!!process.env.SPOTIFY_CLIENT_ID&&!!process.env.SPOTIFY_CLIENT_SECRET,youtube:y.status==="fulfilled"&&!!process.env.YOUTUBE_DATA_API_KEY,appleMusic:a.status==="fulfilled"&&!!process.env.APPLE_MUSIC_TEAM_ID&&!!process.env.APPLE_MUSIC_KEY_ID&&!!process.env.APPLE_MUSIC_PRIVATE_KEY},items,count:items.length,hint:hints.join(" "),fetchedAt:new Date().toISOString()})}
