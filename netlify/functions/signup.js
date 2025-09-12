const GS_URL = process.env.GS_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbxpuyEB2REqABPXQKFc4_hHsf98k1U7N-fB8p9W6VGg5Z3lbPzOUVGOAWwAfIIf2Zg/exec";

export async function handler(event){
  if (event.httpMethod !== 'POST') return { statusCode:405, body:'Method Not Allowed' };
  try{
    const body = JSON.parse(event.body || '{}');
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

  