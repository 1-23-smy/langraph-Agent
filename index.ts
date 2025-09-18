import { MessagesAnnotation, StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import readline from 'node:readline/promises';
import { ChatGroq } from '@langchain/groq';
import chalk from 'chalk';
import { TavilySearch } from '@langchain/tavily';
import { writeFileTool, readFileTool, listFilesTool, fileSearchTool } from './tools/FileRelatedTool.js';
/* 
1. Create Node Functions.
2. Build the graph.
3. Compile and Execute the graph.
*/


const chat = new ChatGroq({
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
  maxRetries: 2,
  temperature: 0.7,
});

const tools: any = [new TavilySearch(), fileSearchTool, readFileTool, writeFileTool, listFilesTool];

const chatWithTools = chat.bindTools(tools);

const toolNode = new ToolNode(tools);

async function callLLM(state: { messages: Array<{ role: string; content: string }> }): Promise<Object> {
  // console.log("Calling LLM with state:", state);

  const response = await chatWithTools.invoke(state.messages);

  return { messages: [response] };
}

function shouldContinue(state: { messages: Array<{ role: string; content: string, tool_calls: string[] }> }): string {
  const lastMessage = state.messages[state.messages.length - 1];
  console.log("messages so far:", state);

  if (lastMessage && lastMessage.tool_calls.length > 0) {
    return 'tools';
  }

  return '__end__';
}

/* Build the graph */
const graph = new StateGraph(MessagesAnnotation);
graph.addNode("agent", callLLM);
graph.addNode("tools", toolNode);
graph.addEdge("__start__", "agent");
graph.addConditionalEdges("agent", shouldContinue);
graph.addEdge("tools", "agent");

const app = graph.compile();

async function main() {
  console.log(chalk.yellowBright("Welcome to the Interactive CLI Application! To exit, type '/bye'. To clear the console, type '/clear'."));
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });


  while (true) {

    const userInput = await rl.question("USER: ");

    if (userInput === '/bye') {
      rl.close();
      break;
    };

    if (userInput === '/clear') {
      console.clear();
      continue;
    }
    const finalstate: any = await app.invoke({
      messages: [{ role: "user", content: userInput }]
    });
    console.log(chalk.green("ASSISTANT:", finalstate.messages[finalstate.messages.length - 1].content));
  }
  rl.close();

}

main();