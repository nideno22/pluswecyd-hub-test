export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const apiKey = process.env.NEWS_API_KEY;
    const url = `https://newsapi.org/v2/everything?q=AI+인공지능&language=ko&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
    
    const r = await fetch(url);
    const data = await r.json();

    if (data.status !== 'ok') {
      // 영문 뉴스로 fallback
      const url2 = `https://newsapi.org/v2/everything?q=artificial+intelligence&language=en&sortBy=publishedAt&pageSize=10&apiKey=${apiKey}`;
      const r2 = await fetch(url2);
      const data2 = await r2.json();
      const articles = data2.articles.map(a => ({ title: a.title, url: a.url, source: a.source.name }));
      return res.status(200).json({ articles });
    }

    const articles = data.articles.map(a => ({ title: a.title, url: a.url, source: a.source.name }));
    res.status(200).json({ articles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
