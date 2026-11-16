type Req={method?:string;query?:Record<string,string|string[]|undefined>}
type Res={status:(code:number)=>Res;json:(value:unknown)=>void;setHeader:(name:string,value:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader("Cache-Control","no-store, max-age=0")
 if(req.method!=="GET")return res.status(405).json({ok:false,error:"Method not allowed"})
 return res.status(503).json({ok:false,provider:"Boomplay",configured:false,access:"agreement-required",message:"Boomplay does not offer an open public developer programme. Obtain a direct developer agreement and official API documentation from Boomplay before enabling requests.",requiredCredentials:["BOOMPLAY_CLIENT_ID","BOOMPLAY_CLIENT_SECRET"],supportedActions:["catalog-search","artist-discovery","official-playback-or-embed"],implementationStatus:"adapter-ready; provider protocol intentionally not guessed"})
}
