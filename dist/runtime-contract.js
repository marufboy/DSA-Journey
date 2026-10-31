export function stdinLines(text){
 const value=String(text??'').replaceAll('\r\n','\n');
 if(!value)return [];
 const lines=value.split('\n');if(value.endsWith('\n'))lines.pop();return lines;
}
