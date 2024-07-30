const fs = require('fs');
const axios = require('axios');

const apiKey = process.env.AZURE_OPENAI_API_KEY;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

const codePath = process.argv[2];
const code = fs.readFileSync(codePath, 'utf-8');

const payload = {
  prompt: `Review the following JavaScript code and suggest improvements:\n\n${code}`,
  max_tokens: 500
};

axios.post(endpoint, payload, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
}})
.then(response => {
    const review = response.data.choices[0].text;
    console.log(`Code Review for ${codePath}:\n${review}`);
})
.catch(error => {
    console.error(`Error reviewing ${codePath}: ${error.response ? error.response.data : error.message}`);
});
