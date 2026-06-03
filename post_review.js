const fs = require('fs');
const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.REPO;
const PR_NUMBER = parseInt(process.env.PR_NUMBER);
const HEAD_SHA = process.env.HEAD_SHA;

if (!GITHUB_TOKEN || !REPO || !PR_NUMBER || !HEAD_SHA) {
    console.error('Missing required env vars: GITHUB_TOKEN, REPO, PR_NUMBER, HEAD_SHA');
    process.exit(1);
}

const [owner, repo] = REPO.split('/');

const gh = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    },
});

// Parse a diff patch to get the set of new/changed line numbers
function getChangedLines(patch) {
    const changed = new Set();
    if (!patch) return changed;

    let currentLine = 0;
    for (const line of patch.split('\n')) {
        const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (hunkMatch) {
            currentLine = parseInt(hunkMatch[1]) - 1;
        } else if (line.startsWith('+')) {
            currentLine++;
            changed.add(currentLine);
        } else if (!line.startsWith('-')) {
            currentLine++;
        }
    }
    return changed;
}

async function main() {
    const reviews = JSON.parse(fs.readFileSync('reviews.json', 'utf-8'));

    // Fetch PR files to get diff patches
    const { data: prFiles } = await gh.get(`/repos/${owner}/${repo}/pulls/${PR_NUMBER}/files`);
    const diffMap = {};
    for (const f of prFiles) {
        diffMap[f.filename] = getChangedLines(f.patch);
    }

    const inlineComments = [];
    const summaryLines = ['## 🤖 Groq AI Code Review\n'];
    let hasErrors = false;

    for (const review of reviews) {
        if (review.error) {
            summaryLines.push(`> ⚠️ Could not review \`${review.file}\`: ${review.error}`);
            continue;
        }

        const changedLines = diffMap[review.file] || new Set();
        const issues = review.issues || [];

        if (issues.length === 0) {
            summaryLines.push(`### ✅ \`${review.file}\`\n_No issues found. Looks good!_\n`);
            continue;
        }

        const notInDiff = [];

        for (const issue of issues) {
            if (issue.severity === 'error') hasErrors = true;

            const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '💡';
            let body = `${icon} **${issue.title}**\n\n${issue.description}`;

            if (issue.fix) {
                body += `\n\n\`\`\`suggestion\n${issue.fix}\n\`\`\``;
            }

            if (issue.line && changedLines.has(issue.line)) {
                // Post as inline comment on the exact line
                inlineComments.push({
                    path: review.file,
                    line: issue.line,
                    side: 'RIGHT',
                    body,
                });
            } else {
                // Line not in diff — add to summary instead
                notInDiff.push(`- ${icon} **Line ${issue.line || '?'}** — **${issue.title}**: ${issue.description}`);
            }
        }

        if (notInDiff.length > 0) {
            summaryLines.push(`### 📄 \`${review.file}\`\n${review.summary || ''}\n\n${notInDiff.join('\n')}\n`);
        } else if (review.summary) {
            summaryLines.push(`### 📄 \`${review.file}\`\n${review.summary}\n`);
        }
    }

    const reviewBody = summaryLines.join('\n');
    const event = hasErrors ? 'REQUEST_CHANGES' : 'COMMENT';

    console.log(`\nPosting PR review:`);
    console.log(`  → Event: ${event}`);
    console.log(`  → Inline comments: ${inlineComments.length}`);
    console.log(`  → Summary lines: ${summaryLines.length}`);

    await gh.post(`/repos/${owner}/${repo}/pulls/${PR_NUMBER}/reviews`, {
        commit_id: HEAD_SHA,
        body: reviewBody,
        event,
        comments: inlineComments,
    });

    console.log('✅ Review posted successfully on PR!');
}

main().catch((err) => {
    const detail = err.response?.data ? JSON.stringify(err.response.data, null, 2) : err.message;
    console.error('❌ Failed to post review:', detail);
    process.exit(1);
});
