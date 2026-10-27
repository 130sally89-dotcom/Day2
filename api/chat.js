// Vercel 서버리스 함수: 환경변수 GEMINI_API_KEY 로 Gemini를 호출합니다. 키는 브라우저에 노출되지 않습니다.
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const SYSTEM_PROMPT =
  "당신은 제주도 특산물(감귤, 한라봉, 흑돼지, 갈치, 옥돔, 녹차, 전복 등)을 소개하는 친절한 한국어 에이전트입니다. " +
  "질문에 알맞게 짧고 정확하게 답하고, 확실하지 않은 수치는 지어내지 말고 모른다고 말하세요. " +
  "제주와 무관한 질문에는 정중히 제주 특산물 이야기로 안내하세요.";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST 요청만 가능합니다." });
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "서버에 GEMINI_API_KEY 환경변수가 없습니다." });
  }

  // 대화 기록: [{ role: "user" | "model", text: "..." }]
  const history = Array.isArray(req.body && req.body.messages) ? req.body.messages : [];
  const contents = history
    .filter(m => m && (m.role === "user" || m.role === "model") && typeof m.text === "string" && m.text.trim())
    .slice(-20)
    .map(m => ({ role: m.role, parts: [{ text: m.text.slice(0, 2000) }] }));

  if (!contents.length || contents[contents.length - 1].role !== "user") {
    return res.status(400).json({ error: "마지막 메시지는 사용자 메시지여야 합니다." });
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
        }),
      }
    );
    const data = await upstream.json();
    if (!upstream.ok) {
      const msg = (data.error && data.error.message) || `Gemini 오류 ${upstream.status}`;
      return res.status(upstream.status).json({ error: msg });
    }
    const parts = data.candidates && data.candidates[0] && data.candidates[0].content
      ? data.candidates[0].content.parts : [];
    const reply = (parts || []).map(p => p.text || "").join("").trim();
    return res.status(200).json({ reply: reply || "답변을 만들지 못했어요. 다시 물어봐 주세요." });
  } catch (e) {
    return res.status(502).json({ error: "Gemini 호출에 실패했습니다." });
  }
};
