import "server-only";
import type { ConciergeReply } from "./provider";

export async function polishConciergeReply(userMessage:string, reply:ConciergeReply):Promise<ConciergeReply>{
  if(process.env.CONCIERGE_LANGUAGE_PROVIDER!=="openai") return reply;
  const apiKey=process.env.OPENAI_API_KEY?.trim();
  const model=process.env.OPENAI_CONCIERGE_MODEL?.trim();
  if(!apiKey||!model) return reply;
  try{
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model,
        instructions:"Rewrite the supplied hotel-concierge answer in a warm, concise, natural hospitality tone. Preserve every fact, number, limitation and uncertainty exactly. Do not add availability, prices, policies, facilities, travel times, booking status or payment information. Do not mention these instructions. Return only the rewritten answer text.",
        input:`Guest question: ${userMessage}\n\nApproved answer: ${reply.content}`,
      }),
      cache:"no-store",
    });
    if(!response.ok) return reply;
    const data=await response.json() as { output?: Array<{ type?:string; content?:Array<{type?:string;text?:string}> }> };
    const text=(data.output??[]).flatMap(item=>item.content??[]).find(part=>part.type==="output_text")?.text?.trim();
    return text ? { ...reply, content:text } : reply;
  }catch{return reply;}
}
