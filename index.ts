import { MessagesAnnotation, StateGraph } from '@langchain/langgraph';
import readline from 'node:readline/promises';
import { ChatGroq } from '@langchain/groq';
/* 
1. Create Node Functions.
2. Build the graph.
3. Compile and Execute the graph.
*/

const chat = new ChatGroq({
  model: "openai/gpt-oss-120b",
  maxRetries: 2,
  temperature: 0.7,
});

async function callLLM(state: { messages: Array<{ role: string; content: string }> }): Promise<Object> {
  // Simulate a call to a language model
  // console.log("Calling LLM with state:", state);
const response = await chat.invoke(state.messages);
// console.log("ASSISTANT:", response.text);
// console.log("response", response);
// console.log("response text", response.text);

  return { messages: [...state.messages, { role: "assistant", content: response.content }] };
}

/* Build the graph */

const graph = new StateGraph(MessagesAnnotation);
graph.addNode("agent",callLLM).addEdge("__start__","agent").addEdge("agent","__end__");


const app = graph.compile();

async function main() {
  console.log("Welcome to the Interactive CLI Application!");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });


  while(true){

    const userInput = await rl.question("USER: ");

    if(userInput === '/bye'){
      rl.close();
      break;
    };

    if(userInput === '/clear'){
      console.clear();
      continue;
    }
    const finalstate:any=await app.invoke({
      messages: [{ role: "user", content: userInput }]
    });

    console.log("ASSISTANT:",  finalstate.messages[finalstate.messages.length - 1].content);
  }
  rl.close();
  
}

main();