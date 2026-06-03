const fs = require('fs');
const axios = require('axios');

const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) { console.error('GROQ_API_KEY not set'); process.exit(1); }

const codePath = process.argv[2];
if (!codePath || !fs.existsSync(codePath)) {
    console.error(JSON.stringify({ file: codePath, error: 'File not found', issues: [] }));
    process.exit(1);
}

const code = fs.readFileSync(codePath, 'utf-8');
const lines = code.split('\n');

const payload = {
    model: 'llama-3.3-70b-versatile',
    messages: [
        {
            role: 'system',
            content: `You are a senior code reviewer. Analyze the provided code and return ONLY a valid JSON object with NO markdown, NO explanation, just raw JSON.

Use this exact format:
{
  "summary": "One sentence summary of overall code quality",
  "issues": [
    {
      "line": <integer line number where the issue is>,
      "severity": "error" | "warning" | "suggestion",
      "title": "Short title (max 8 words)",
      "description": "Clear explanation of the problem and why it matters",
      "fix": "The corrected code for that line or block (just the code, no explanation)"
    }
  ]
}

Rules:
- severity "error" = bugs, security issues, crashes
- severity "warning" = bad practices, performance issues  
- severity "suggestion" = improvements, readability
- "line" must be the exact line number (1-indexed) in the file where the issue occurs
- "fix" must be valid code that replaces the problematic code
- If no issues, return empty array for issues`
        },
        {
            role: 'user',
            content: `Review this file: ${codePath}\n\nTotal lines: ${lines.length}\n\n\`\`\`\n${lines.map((l, i) => `${i + 1}: ${l}`).join('\n')}\n\`\`\``
        }
    ],
    max_tokens: 2048,
    temperature: 0.1,
    response_format: { type: 'json_object' }
};

axios
    .post('https://api.groq.com/openai/v1/chat/completions', payload, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
    })
    .then((res) => {
        const content = res.data.choices[0].message.content;
        try {
            const result = JSON.parse(content);
            result.file = codePath;
            console.log(JSON.stringify(result));
        } catch {
            console.error(JSON.stringify({ file: codePath, error: 'Failed to parse Groq response', issues: [] }));
        }
    })
    .catch((err) => {
        const msg = err.response ? JSON.stringify(err.response.data) : err.message;
        console.error(JSON.stringify({ file: codePath, error: msg, issues: [] }));
    });