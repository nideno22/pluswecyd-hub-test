export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { notionToken, pageId, question, history } = req.body;

  try {
    let notionContent = '';

    if (notionToken && pageId) {
      async function getPageContent(pid, depth = 0) {
        if (depth > 2) return '';
        const r = await fetch(`https://api.notion.com/v1/blocks/${pid}/children?page_size=100`, {
          headers: { 'Authorization': `Bearer ${notionToken}`, 'Notion-Version': '2022-06-28' }
        });
        const data = await r.json();
        if (!data.results) return '';
        let content = '';
        for (const block of data.results) {
          const type = block.type;
          const richText = block[type]?.rich_text;
          if (richText) content += richText.map(r => r.plain_text).join('') + '\n';
          if (type === 'child_page') {
            const subTitle = block.child_page?.title || '';
            const pageUrl = `https://www.notion.so/${block.id.replace(/-/g, '')}`;
            content += `\n[페이지: ${subTitle} | URL: ${pageUrl}]\n`;
            content += await getPageContent(block.id, depth + 1);
          }
        }
        return content;
      }
      notionContent = await getPageContent(pageId);
    }

    const messages = history && history.length > 0 ? [...history] : [];
    messages.push({ role: 'user', content: question });

    const system = notionContent
      ? `당신은 플러스위시드 허브 시스템의 AI 어시스턴트입니다. 친근하고 따뜻하게 답변해주세요.\n\n노션 팀원 정보:\n${notionContent}`
      : `당신은 플러스위시드 허브 시스템의 AI 어시스턴트입니다. 친근하고 따뜻하게 답변해주세요.`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 1000, system, messages })
    });

    const data = await claudeRes.json();
    if (data.error) throw new Error(data.error.message);
    res.status(200).json({ answer: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
