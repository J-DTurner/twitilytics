// callDeepSeekAPI, callGeminiAPI
const axios = require('axios');
const { DEEPSEEK_API_KEY, GEMINI_API_KEY } = process.env;
if (!DEEPSEEK_API_KEY) console.error('Missing DEEPSEEK_API_KEY');
if (!GEMINI_API_KEY)  console.error('Missing GEMINI_API_KEY');

async function callDeepSeekAPI(prompt, maxTokens = 1000) {
  const url = 'https://api.deepseek.com/v1/chat/completions';
  const payload = {
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: maxTokens
  };
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${DEEPSEEK_API_KEY}`
  };
  const { data } = await axios.post(url, payload, { headers, timeout: 60000 });
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Invalid DeepSeek response');
  return content;
}

async function callGeminiAPI(prompt, imageUrl) {
  const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
  const base64 = Buffer.from(imgRes.data, 'binary').toString('base64');
  const mime = imgRes.headers['content-type'] || 'application/octet-stream';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{
      parts: [
        { inline_data: { mime_type: mime, data: base64 } },
        { text: prompt }
      ]
    }]
  };
  const { data } = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 45000
  });
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Invalid Gemini response');
  return text;
}

module.exports = { callDeepSeekAPI, callGeminiAPI }; 