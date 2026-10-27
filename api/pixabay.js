// Vercel 서버리스 함수: 환경변수 PIXABAY_API_KEY 로 Pixabay를 호출해 키가 브라우저에 노출되지 않게 합니다.
module.exports = async (req, res) => {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) {
    return res.status(500).json({ error: "서버에 PIXABAY_API_KEY 환경변수가 없습니다." });
  }

  const q = String(req.query.q || "").trim();
  if (!q) {
    return res.status(400).json({ error: "검색어(q)가 필요합니다." });
  }
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);

  const url = "https://pixabay.com/api/"
    + `?key=${encodeURIComponent(key)}`
    + `&q=${encodeURIComponent(q)}`
    + `&image_type=photo&per_page=10&page=${page}&lang=ko`;

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: `Pixabay 오류 ${upstream.status}` });
    }
    const data = await upstream.json();
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.status(200).json({
      totalHits: data.totalHits,
      hits: data.hits.map(h => ({
        id: h.id,
        tags: h.tags,
        user: h.user,
        previewURL: h.previewURL,
        webformatURL: h.webformatURL,
        pageURL: h.pageURL,
      })),
    });
  } catch (e) {
    return res.status(502).json({ error: "Pixabay 호출에 실패했습니다." });
  }
};
