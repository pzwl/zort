import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();



const anthropic = new Anthropic();

async function main () {



    anthropic.messages.stream({
        messages: [{role: 'user', content: "aaj gwalior mein iiitm mein kya ho raha hai"}],
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1024,
    }).on('text', (text) => {
        console.log(text);
    });
   
}

main();
