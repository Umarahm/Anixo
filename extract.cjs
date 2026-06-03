const fs = require('fs');
const html = fs.readFileSync('C:/Users/Ritesh/.gemini/antigravity-ide/brain/011ffc72-260a-42a8-b223-366a98d51057/.system_generated/steps/560/content.md', 'utf8');
const match = html.match(/"url":"(https:\\u002F\\u002Fmedia[0-9]?\.tenor\.com[^"]+\.gif)"/);
if(match) console.log(match[1]);
