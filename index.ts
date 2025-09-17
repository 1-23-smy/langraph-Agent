import { MessagesAnnotation, StateGraph, END } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import readline from 'node:readline/promises';
import { ChatGroq } from '@langchain/groq';
import chalk from 'chalk';
// import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { TavilySearch } from '@langchain/tavily';
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

const fileSearchTool = tool(
  async ({ query, directory }: { query: string; directory?: string }) => {
    const dir = directory || process.cwd();
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      const matchingFiles = files
        .filter(file => file.name.toLowerCase().includes(query.toLowerCase()))
        .map(file => ({
          name: file.name,
          type: file.isDirectory() ? 'directory' : 'file',
          path: path.join(dir, file.name)
        }));
      return `Found ${matchingFiles.length} files/directories matching "${query}" in ${dir}:\n${matchingFiles.map(f => `${f.type}: ${f.name} (${f.path})`).join('\n')}`;
    } catch (error) {
      return `Error searching directory: ${error}`;
    }
  },
  {
    name: "file_search",
    description: "Search for files and directories by name in a specified directory",
    schema: z.object({
      query: z.string().describe("The search query for file/directory names"),
      directory: z.string().optional().describe("The directory to search in (defaults to current working directory)"),
    }),
  }
);

const readFileTool = tool(
  async ({ filePath }: { filePath: string }) => {
    try {
      if (!fs.existsSync(filePath)) {
        return `File not found: ${filePath}`;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return `Contents of ${filePath}:\n${content}`;
    } catch (error) {
      return `Error reading file: ${error}`;
    }
  },
  {
    name: "read_file",
    description: "Read the contents of a file",
    schema: z.object({
      filePath: z.string().describe("The path to the file to read"),
    }),
  }
);

const writeFileTool = tool(
  async ({ filePath, content }: { filePath: string; content: string }) => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8');
      return `Successfully wrote to file: ${filePath}`;
    } catch (error) {
      return `Error writing to file: ${error}`;
    }
  },
  {
    name: "write_file",
    description: "Write content to a file",
    schema: z.object({
      filePath: z.string().describe("The path to the file to write"),
      content: z.string().describe("The content to write to the file"),
    }),
  }
);

const listFilesTool = tool(
  async ({ directory }: { directory?: string }) => {
    const dir = directory || process.cwd();
    try {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      const fileList = files.map(file => ({
        name: file.name,
        type: file.isDirectory() ? 'directory' : 'file',
        path: path.join(dir, file.name)
      }));
      return `Found ${fileList.length} files/directories in ${dir}:\n${fileList.map(f => `${f.type}: ${f.name} (${f.path})`).join('\n')}`;
    } catch (error) {
      return `Error listing files: ${error}`;
    }
  },
  {
    name: "list_files",
    description: "List all files and directories in a specified directory",
    schema: z.object({
      directory: z.string().optional().describe("The directory to list (defaults to current working directory)"),
    }),
  }
);
// const searchOnWebTool = tool(
//   async ({ query }: { query: string }) => {
//     // Simulate a web search

//     const searchResult = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
//     console.log(`Performing web search for query: "${query}"`);
//     console.log(`Search URL: ${searchResult}`);
//     console.log(`Simulated search results for query: "${query}" found results at: ${searchResult}`);
//     return `Simulated search results for query: "${query}"\n found results at: ${searchResult}`;
//   },
//   {
//     name: "search_web",
//     description: "Search the web for information",
//     schema: z.object({
//       query: z.string().describe("The search query"),
//     }),
//   }
// );
const tools:any = [ new TavilySearch(),fileSearchTool, readFileTool, writeFileTool, listFilesTool];

const chatWithTools = chat.bindTools(tools);

const toolNode = new ToolNode(tools);

async function callLLM(state: { messages: Array<{ role: string; content: string }> }): Promise<Object> {
  // Simulate a call to a language model
  // console.log("Calling LLM with state:", state);

const response = await chatWithTools.invoke(state.messages);
// console.log("ASSISTANT:", response.text);
// console.log("response", response);
// console.log("response text", response.text);

  return { messages: [response] };
}

/* Build the graph */

const graph = new StateGraph(MessagesAnnotation);
graph.addNode("agent", callLLM);
graph.addNode("tools", toolNode);
graph.addEdge("__start__", "agent");
graph.addConditionalEdges("agent", (state) => {
  const lastMessage = state.messages[state.messages.length - 1] as any;
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return END;
}, { "tools": "tools", [END]: END });
graph.addEdge("tools", "agent");

const app = graph.compile();

async function main() {
  console.log(chalk.yellowBright("Welcome to the Interactive CLI Application! To exit, type '/bye'. To clear the console, type '/clear'."));
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
    console.log(chalk.green("ASSISTANT:",  finalstate.messages[finalstate.messages.length - 1].content));
  }
  rl.close();
  
}

main();