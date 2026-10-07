export async function onRequest(context) {
    const { request, env } = context;
    const method = request.method;

    // 跨域 headers 處理
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // GET: 取得前 10 名排行榜
    if (method === 'GET') {
        try {
            const { results } = await env.DB.prepare(
                "SELECT nickname, score, created_at FROM leaderboard ORDER BY score DESC, id ASC LIMIT 10"
            ).all();

            return new Response(JSON.stringify(results), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    // POST: 上傳新分數
    if (method === 'POST') {
        try {
            const { nickname, score } = await request.json();

            if (!nickname || typeof score !== 'number') {
                return new Response(JSON.stringify({ error: "無效的數據格式" }), { status: 400, headers: corsHeaders });
            }

            // 過濾與限制暱稱長度
            const cleanName = nickname.trim().substring(0, 12) || "無名貓咪";

            await env.DB.prepare(
                "INSERT INTO leaderboard (nickname, score) VALUES (?, ?)"
            ).bind(cleanName, score).run();

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    return new Response("Method not allowed", { status: 405 });
}
