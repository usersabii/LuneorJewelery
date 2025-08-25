export async function handler(event) {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    try {
      const body = JSON.parse(event.body || '{}');
  
      const res = await fetch(process.env.GS_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
  
      const text = await res.text();
      if (!res.ok) return { statusCode: res.status, body: text };
  
      return { statusCode: 200, body: text };
    } catch (e) {
      return { statusCode: 500, body: e.message };
    }
  }

  const GS_URL = process.env.GS_WEBAPP_URL || "https://script.google.com/macros/s/AKfycbwOK_615WQvwwfaEhXDQ4JZbhPfXL50iBDkrMzicXZ7IlxbTA72sn_Ag4Gqf7pFy8k/exec";

  export async function handler(event) {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    try {
      const body = JSON.parse(event.body || '{}');
  
      const res = await fetch(GS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
  
      const text = await res.text();
      if (!res.ok) return { statusCode: res.status, body: text };
      return { statusCode: 200, body: text };
    } catch (e) {
      return { statusCode: 500, body: e.message };
    }
  }
  