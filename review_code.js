const fs = require('fs');
const axios = require('axios');

const apiKey = process.env.AZURE_OPENAI_API_KEY;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deployment_name = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

if (!apiKey || !endpoint) {
    console.error('API key or endpoint not set.');
    process.exit(1);
}

const codePath = process.argv[2];
const code = fs.readFileSync(codePath, 'utf-8');

const payload = {
    messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        {
            role: 'user',
            content: `Please review the following Node.js code for potential improvements in readability, bug detection, and performance optimization:\n\n${code}`,
        },
    ],
    max_tokens: 500,
};

axios
    .post(`${endpoint}/openai/deployments/${deployment_name}/chat/completions?api-version=2023-03-15-preview`, payload, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
        },
    })
    .then((response) => {
        const review = response.data.choices[0].message.content;
        console.log(`Code Review for ${codePath}:\n${review}`);
    })
    .catch((error) => {
        if (error.response) {
            // The request was made and the server responded with a status code
            console.error(`Error reviewing ${codePath}:`, error.response.data);
        } else if (error.request) {
            // The request was made but no response was received
            console.error(`Error reviewing ${codePath}: No response received`, error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error(`Error reviewing ${codePath}:`, error.message);
        }
    });