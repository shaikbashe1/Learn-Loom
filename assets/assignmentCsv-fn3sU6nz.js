function e(e){let t=[],n=[],r=``,i=!1,a=e.replace(/\r\n/g,`
`).replace(/\r/g,`
`);for(let e=0;e<a.length;e++){let o=a[e],s=a[e+1];o===`"`?i&&s===`"`?(r+=`"`,e++):i=!i:o===`,`&&!i?(n.push(r.trim()),r=``):o===`
`&&!i?(n.push(r.trim()),n.some(e=>e.length>0)&&t.push(n),n=[],r=``):r+=o}return(r.length>0||n.length>0)&&(n.push(r.trim()),n.some(e=>e.length>0)&&t.push(n)),t}function t(e){if(e==null)return``;let t=String(e);return/^[=+\-@\t\r]/.test(t)&&(t=`'${t}`),t.includes(`,`)||t.includes(`"`)||t.includes(`
`)?`"${t.replace(/"/g,`""`)}"`:t}function n(t,n){let r=[],i=[],a=[],o=e(t);if(o.length<2)return{valid:!1,data:[],errors:[`CSV file is empty or missing data rows.`],warnings:[]};let s=o[0].map(e=>e.toLowerCase().trim());for(let e of[`question_id`,`type`,`question`,`marks`])s.includes(e)||r.push(`Missing required header column: "${e}"`);if(r.length>0)return{valid:!1,data:[],errors:r,warnings:i};let c=s.indexOf(`question_id`),l=s.indexOf(`type`),u=s.indexOf(`question`),d=s.indexOf(`option_a`),f=s.indexOf(`option_b`),p=s.indexOf(`option_c`),m=s.indexOf(`option_d`),h=s.indexOf(`marks`),g=new Set;for(let e=1;e<o.length;e++){let t=o[e],i=e+1,s=t[c]?.trim(),_=(t[l]||``).toUpperCase().trim(),v=t[u]?.trim(),y=t[h]?.trim();if(!s){r.push(`Row ${i}: question_id cannot be empty.`);continue}g.has(s)&&r.push(`Row ${i}: Duplicate question_id "${s}". Each question_id must be unique.`),g.add(s),v||r.push(`Row ${i} (${s}): question text is required.`);let b=Number(y);(isNaN(b)||b<=0)&&r.push(`Row ${i} (${s}): marks must be a positive number, got "${y}".`);let x=[`MCQ`,`SHORT_ANSWER`,`OUTPUT_BASED`,`CODING`];if(!x.includes(_)){r.push(`Row ${i} (${s}): Invalid question type "${_}". Allowed types: ${x.join(`, `)}.`);continue}let S=_;if(S===`MCQ`){let e=t[d]?.trim(),n=t[f]?.trim();(!e||!n)&&r.push(`Row ${i} (${s}): MCQ requires at least option_a and option_b.`)}a.push({id:`${n}_${s}`,assignment_id:n,question_id:s,type:S,question:v||``,option_a:t[d]||void 0,option_b:t[f]||void 0,option_c:t[p]||void 0,option_d:t[m]||void 0,marks:isNaN(b)?1:b,order_index:e,allowed_languages:S===`CODING`?[`python`,`javascript`,`java`,`cpp`,`c`]:void 0,starter_code:S===`CODING`?{python:`# Write solution here

import sys

def solve():
    pass

if __name__ == "__main__":
    solve()
`,javascript:`// Read from process.stdin
const fs = require("fs");
const input = fs.readFileSync(0, "utf-8");
console.log(input.trim());
`}:void 0})}return{valid:r.length===0,data:a,errors:r,warnings:i}}function r(t,n,r){let i=[],a=[],o=[],s=e(t);if(s.length<2)return{valid:!1,data:[],errors:[`Answer Key CSV is empty or missing data rows.`],warnings:[]};let c=s[0].map(e=>e.toLowerCase().trim());if(!c.includes(`question_id`)||!c.includes(`correct_answer`))return{valid:!1,data:[],errors:[`Headers must include "question_id" and "correct_answer".`],warnings:[]};let l=c.indexOf(`question_id`),u=c.indexOf(`correct_answer`),d=new Set;for(let e=1;e<s.length;e++){let t=s[e],c=e+1,f=t[l]?.trim(),p=t[u]?.trim();if(!f){i.push(`Row ${c}: question_id cannot be empty.`);continue}d.has(f)&&i.push(`Row ${c}: Duplicate answer key for question_id "${f}".`),d.add(f),r&&!r.has(f)&&a.push(`Row ${c}: Answer key specifies "${f}" which was not found in the uploaded questions.`),p||i.push(`Row ${c} (${f}): correct_answer cannot be empty.`),o.push({id:`${n}_key_${f}`,assignment_id:n,question_id:f,correct_answer:p||``,case_sensitive:!1})}return{valid:i.length===0,data:o,errors:i,warnings:a}}function i(t,n,r){let i=[],a=[],o=[],s=e(t);if(s.length<2)return{valid:!1,data:[],errors:[`Coding Test-Case CSV is empty or missing rows.`],warnings:[]};let c=s[0].map(e=>e.toLowerCase().trim());if(!c.includes(`question_id`)||!c.includes(`expected_output`))return{valid:!1,data:[],errors:[`Headers must contain at least "question_id" and "expected_output".`],warnings:[]};let l=c.indexOf(`question_id`),u=c.indexOf(`input`),d=c.indexOf(`expected_output`),f=c.indexOf(`marks`),p=c.indexOf(`is_hidden`),m=0;for(let e=1;e<s.length;e++){let t=s[e],c=e+1,h=t[l]?.trim(),g=u>=0?t[u]??``:``,_=t[d]?.trim(),v=f>=0?t[f]?.trim():`5`,y=p>=0?t[p]?.trim().toLowerCase():`true`;if(!h){i.push(`Row ${c}: question_id cannot be empty.`);continue}r&&!r.has(h)&&a.push(`Row ${c}: Test case question_id "${h}" is not flagged as CODING type in questions.`),(_===void 0||_===``)&&i.push(`Row ${c} (${h}): expected_output is required.`);let b=Number(v);(isNaN(b)||b<=0)&&i.push(`Row ${c} (${h}): marks must be a positive number.`),m++,o.push({id:`${n}_tc_${h}_${m}`,assignment_id:n,question_id:h,input:g,expected_output:_||``,marks:isNaN(b)?5:b,is_hidden:y===`true`||y===`1`||y===`yes`})}return{valid:i.length===0,data:o,errors:i,warnings:a}}var a=`question_id,type,question,option_a,option_b,option_c,option_d,marks
Q1,MCQ,"Which data structure operates on a First-In, First-Out (FIFO) basis?",Stack,Queue,Tree,Graph,2
Q2,MCQ,"What is the time complexity of searching an element in a balanced Binary Search Tree?",O(1),O(n),O(log n),O(n^2),2
Q3,SHORT_ANSWER,"In JavaScript, which keyword declares a block-scoped constant variable?",,,,,2
Q4,OUTPUT_BASED,"What will be the output of: print(len(['a', 'b', 'c'] * 2)) in Python?",,,,,2
Q5,CODING,"Write a program that reads a line of text from standard input and prints the string reversed to standard output.",,,,,10`,o=`question_id,correct_answer
Q1,B
Q2,C
Q3,const
Q4,6`,s=`question_id,input,expected_output,marks,is_hidden
Q5,hello,olleh,5,false
Q5,LearnLoom,mooLnraeL,5,true`;export{i as a,r as i,a as n,n as o,s as r,t as s,o as t};