import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

try {
  const models = await client.models.list();

  console.log("CONEXIÓN OK");
  console.log("Primer modelo:", models.data[0].id);
} catch (error) {
  console.error("ERROR:");
  console.error(error);
}