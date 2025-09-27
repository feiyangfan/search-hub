// import OpenAI from 'openai';
// const client = new OpenAI({
//     apiKey: process.env.GROQ_API_KEY,
//     baseURL: 'https://api.groq.com/openai/v1',
// });
// // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export async function embedTexts(texts: string[]) {
//     const res = await client.embeddings.create({
//         model: 'text-embedding-3-small',
//         input: texts,
//     });
//     return res.data.map((d) => d.embedding as unknown as number[]);
// }
