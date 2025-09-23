const GS_URL = process.env.GS_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbxX5f2Co1vfdCxjbISfyiwJcqrhksoshPnM4wBB-ZG4s0_1oRBp8rC1YHfr9NKVYbY2/exec";

export async function handler(event){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  try{
    const body = JSON.parse(event.body || '{}');
    body.__kind = 'order'; // ← indique au Apps Script que c’est une commande

    const res  = await fetch(GS_URL, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    if (!res.ok) return { statusCode: res.status, body: text };
    return { statusCode: 200, body: text };
  }catch(e){
    return { statusCode: 500, body: String(e) };
  }
}
