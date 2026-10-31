import {createLocalCppProvider} from '../local-cpp-provider.mjs';
import {startServer} from '../server.mjs';

try{
 const port=Number(process.env.PORT||5174);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer from 1 to 65535.');
 const provider=await createLocalCppProvider({distro:process.env.DSA_WSL_DISTRO||'Ubuntu'});
 const server=await startServer({port,provider});
 console.log(`DSA Journey: http://127.0.0.1:${server.address().port}`);
 console.log(`C++17 ready: ${provider.compiler} · ${provider.sandbox}`);
 for(const name of ['SIGINT','SIGTERM'])process.on(name,()=>server.close(()=>process.exit(0)));
}catch(error){console.error(`Local startup failed: ${error.message}`);process.exitCode=1;}
