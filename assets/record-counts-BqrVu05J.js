const n=(r,t=0)=>{if(r==null||r==="")return t;if(typeof r=="number")return Number.isFinite(r)?r:t;const i=Number(r);return Number.isFinite(i)?i:t};export{n as t};
