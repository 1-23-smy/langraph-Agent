import { tool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "fs";
import path from "path";


// For writing content to a file
export const writeFileTool = tool(
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

// For reading file contents
export const readFileTool = tool(
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

// For listing files in a directory
export const listFilesTool = tool(
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

//For searching files by name
export const fileSearchTool = tool(
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