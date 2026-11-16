type Req={method?:string}
type Res={status:(code:number)=>Res;json:(value:unknown)=>void;setHeader:(name:string,value:string)=>void}
export default async function handler(req:Req,res:Res){
 res.setHeader("Cache-Control","no-store, max-age=0")
 if(req.method!=="GET")return res.status(405).json({ok:false,error:"Method not allowed"})
 return res.status(503).json({ok:false,provider:"ReverbNation",configured:false,access:"private-api",message:"ReverbNation currently labels its API as internal-use only. Request written API access or an approved partner integration before enabling catalogue search or playback.",requiredCredentials:["REVERBNATION_CLIENT_ID","REVERBNATION_CLIENT_SECRET"],supportedActions:["artist-discovery","catalog-search","official-embed-or-artist-authorized-playback"],implementationStatus:"adapter-ready; no undocumented endpoints or stream URLs are assumed"})
}
