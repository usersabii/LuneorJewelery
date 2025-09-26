const GS_URL = process.env.GS_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbzOXpEENB1TmkRu9-BqtcGuxsneUarZF3fIe3H4QkJD3_qfyJ0nk7nBKOfSCa9Vv17T/exec";

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
