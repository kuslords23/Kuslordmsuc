import { createHmac, randomBytes } from "node:crypto"

type Req={method?:string;query?:Record<string,string|string[]|undefined>;body?:Record<string,unknown>}
type Res={status:(code:number)=>Res;json:(value:unknown)=>void;setHeader:(name:string,value:string)=>void}
const API="https://api.audiomack.com/v1"
function value(input:string|string[]|undefined,fallback=""){return(Array.isArray(input)?input[0]:input||fallback).trim()}
function oauthHeader(method:"GET"|"POST",url:string,params:Record<string,string>={}):string|null{
 const key=process.env.AUDIOMACK_CONSUMER_KEY?.trim(),secret=process.env.AUDIOMACK_CONSUMER_SECRET?.trim()
 if(!key||!secret)return null
 const oauth:Record<string,string>={"oauth_consumer_key":key,"oauth_nonce":randomBytes(16).toString("hex"),"oauth_signature_method":"HMAC-SHA1","oauth_timestamp":String(Math.floor(Date.now()/1000)),"oauth_version":"1.0"}
 const all={...params,...oauth},encoded=Object.keys(all).sort().map(k=>encodeURIComponent(k)+"="+encodeURIComponent(all[k])).join("&")
 const base=method+"&"+encodeURIComponent(url)+"&"+encodeURIComponent(encoded),signingKey=encodeURIComponent(secret)+"&"
 oauth.oauth_signature=createHmac("sha1",signingKey).update(base).digest("base64")
 return "OAuth "+Object.keys(oauth).sort().map(k=>encodeURIComponent(k)+'="'+encodeURIComponent(oauth[k])+'"').join(", ")
}
async function request(path:string,method:"GET"|"POST"="GET",params:Record<string,string>={}):Promise<any>{
 const url=API+path,header=oauthHeader(method,url,method==="GET"?params:{})
 if(!header)throw new Error("Audiomack API credentials are not configured.")
 const target=method==="GET"?url+"?"+new URLSearchParams(params).toString():url
 const response=await fetch(target,{method,headers:{Authorization:header,Accept:"application/json","Content-Type":"application/x-www-form-urlencoded"},body:method==="POST"?new URLSearchParams(params).toString():undefined})
 if(!response.ok)throw new Error("Audiomack API returned HTTP "+response.status)
 return response.json()
}
function normalize(items:any[]):any[]{return items.map(item=>({id:"audiomack:"+item.id,providerTrackId:String(item.id),title:item.title||item.name||"Untitled",artist:item.artist||item.artist_name||item.artist?.name||"Audiomack artist",coverUrl:item.image||item.thumbnail||item.artwork||"",embedUrl:item.url?String(item.url).replace("audiomack.com/","audiomack.com/embed/"):"",openUrl:item.url||"https://audiomack.com",platform:"Audiomack",kind:item.type==="album"?"album":"track",duration:Number(item.duration)||0,playbackMode:"provider-stream",license:"Audiomack platform terms apply"}))}
export default async function handler(req:Req,res:Res){
 res.setHeader("Cache-Control","no-store, max-age=0")
 if(req.method!=="GET"&&req.method!=="POST")return res.status(405).json({ok:false,error:"Method not allowed"})
 if(!process.env.AUDIOMACK_CONSUMER_KEY||!process.env.AUDIOMACK_CONSUMER_SECRET)return res.status(503).json({ok:false,provider:"Audiomack",configured:false,error:"Add AUDIOMACK_CONSUMER_KEY and AUDIOMACK_CONSUMER_SECRET after obtaining Audiomack developer access."})
 try{
  const action=value(req.query?.action,"search")
  if(req.method==="POST"||action==="play"){
   const id=String(req.body?.id||value(req.query?.id))
   if(!/^\d+$/.test(id))return res.status(400).json({ok:false,error:"A numeric Audiomack track ID is required."})
   const result=await request("/music/"+encodeURIComponent(id)+"/play","POST",{session:value(req.query?.session,randomBytes(12).toString("hex"))})
   const streamUrl=typeof result==="string"?result:result?.streaming_url||result?.url
   if(!streamUrl||!/^https:\/\//i.test(streamUrl))return res.status(502).json({ok:false,error:"Audiomack did not return a playable stream URL."})
   return res.status(200).json({ok:true,provider:"Audiomack",id,streamUrl,expiresAt:result?.streaming_url_timeout?Number(result.streaming_url_timeout)*1000:undefined,attribution:"Audiomack"})
  }
  if(action==="trending"){
   const data=await request("/music/trending","GET",{limit:String(Math.min(30,Math.max(1,Number(value(req.query?.limit,"12"))||12)))})
   return res.status(200).json({ok:true,provider:"Audiomack",items:normalize(data?.results||[])})
  }
  const q=value(req.query?.q).slice(0,120)
  if(!q)return res.status(400).json({ok:false,error:"Search query q is required."})
  const data=await request("/search","GET",{q,show:"songs",sort:value(req.query?.sort,"relevance"),limit:String(Math.min(30,Math.max(1,Number(value(req.query?.limit,"12"))||12)))})
  return res.status(200).json({ok:true,provider:"Audiomack",items:normalize(data?.results||[])})
 }catch(error){return res.status(502).json({ok:false,provider:"Audiomack",error:error instanceof Error?error.message:"Audiomack request failed"})}
}
