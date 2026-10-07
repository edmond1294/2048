export async function onRequest(context) {
    const { request, env } = context;
    const method = request.method;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // 處理預檢請求 (CORS Options)
    if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // 🚫 敏感詞過濾清單
    const BANNED_WORDS = [
        'fuck', 'admin', '2048', 'cnm', '8964', '统一', '統一', 
        'tongyi', '91', '操', '肏', '幹', '干', '87', 'csn', 
        'nm', '納粹', '纳粹', '德意志', '低能', '唐三小', '洨', 
        'xjp', '习', '習'
    ];

    // GET: 讀取排行榜前 10 名
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

    // POST: 提交新分數 (含自動敏感詞替換)
    if (method === 'POST') {
        try {
            const { nickname, score } = await request.json();

            if (!nickname || typeof score !== 'number') {
                return new Response(JSON.stringify({ error: "無效的數據格式" }), { status: 400, headers: corsHeaders });
            }

            // 限制字數最多 12 字，為空時預設為 "無名貓咪"
            let cleanName = nickname.trim().substring(0, 12) || "無名貓咪";

            // 構建正則表達式，自動把敏感詞替換成 *** (不區分大小寫)
            const pattern = new RegExp(
                BANNED_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
                'gi'
            );

            cleanName = cleanName.replace(pattern, '***');

            // 寫入 D1 資料庫
            await env.DB.prepare(
                "INSERT INTO leaderboard (nickname, score) VALUES (?, ?)"
            ).bind(cleanName, score).run();

            return new Response(JSON.stringify({ success: true, filteredName: cleanName }), { headers: corsHeaders });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
        }
    }

    return new Response("Method not allowed", { status: 405 });
}
