async function e(e,t,n=!0){let r=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=AIzaSyAbsIgVtgULOCSIwUFPCuYdI8hA-Rw242M${n?`&alt=sse`:``}`,i=[{role:`user`,parts:[{text:`You are Quovexi AI Mentor – an expert computer science and programming tutor.
Your role:
- Answer coding, DSA, web dev, data science, and interview-prep questions clearly
- Provide step-by-step explanations with working code examples
- Encourage learners and suggest next steps
- Keep answers concise and practical
- NEVER provide answers to exam/test questions directly; guide the student to think`}]},...e];return fetch(r,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:i}),signal:t})}export{e as t};