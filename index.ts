import readline from 'node:readline/promises';



async function main() {
  console.log("Welcome to the Interactive CLI Application!");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });


  while(true){

    const userInput = await rl.question("USER: ");

    if(userInput === '/bye') break;

    if(userInput === '/clear'){
      console.clear();
      continue;
    }

    console.log(`You said ${userInput}`)
  
  }
  rl.close();
  
}


main();