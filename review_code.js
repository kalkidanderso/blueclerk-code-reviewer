const fs = require('fs');
const axios = require('axios');

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.error('GROQ_API_KEY is not set.');
    process.exit(1);
}

const codePath = process.argv[2];

if (!codePath || !fs.existsSync(codePath)) {
    console.error(`File not found: ${codePath}`);
    process.exit(1);
}

const code = fs.readFileSync(codePath, 'utf-8');

const payload = {
    model: 'llama-3.3-70b-versatile',
    messages: [
        {
            role: 'system',
            content:
                'You are an expert Node.js/TypeScript code reviewer. Be concise, specific, and constructive. Focus on bugs, security issues, performance, and readability. Use bullet points.',
        },
        {
            role: 'user',
            content: `Please review the following code file (${codePath}) for:\n- Bugs or logic errors\n- Security vulnerabilities\n- Performance improvements\n- Readability & best practices\n\n\`\`\`\n${code}\n\`\`\``,
        },
    ],
    max_tokens: 1024,
    temperature: 0.3,
};

axios
    .post('https://api.groq.com/openai/v1/chat/completions', payload, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
    })
    .then((response) => {
        const review = response.data.choices[0].message.content;
        console.log(`\n===== Code Review: ${codePath} =====\n${review}\n`);
    })
    .catch((error) => {
        if (error.response) {
            console.error(`Error reviewing ${codePath}:`, JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error(`Error reviewing ${codePath}: No response received`);
        } else {
            console.error(`Error reviewing ${codePath}:`, error.message);
        }
    });