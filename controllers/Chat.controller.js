import { embedQuery, generateReply } from "../lib/gemini.js";
import { searchKnowledge } from "../lib/retrieval.js";

const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 1000;

// Hard ceiling on replies per day across all visitors, so a bot can't run up
// the Gemini bill. Resets when the server restarts or the date changes.
const DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT || 2000);
let usage = { day: "", count: 0 };

const takeDailySlot = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (usage.day !== today) usage = { day: today, count: 0 };
  if (usage.count >= DAILY_LIMIT) return false;
  usage.count += 1;
  return true;
};

const clean = (v, max) => String(v || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").trim().slice(0, max);

const buildSystemPrompt = (chunks, page) => `You are the customer support assistant on the website of Digital Security Solutions (DSS), a CCTV and security systems supplier and installer in Delhi, established 2008.

Contact: phone/WhatsApp +91 99996 05550, landline 011-42420035, email info@digitalsecurityindia.com. Hours: Monday–Sunday, 10:30 AM–7:30 PM. Head office: Shakarpur, Delhi-110092. Service area: Delhi, Noida, Greater Noida, Ghaziabad, Gurgaon and projects across India.

Rules:
- Answer using the CONTEXT below and the contact facts above. If the answer is not there, say you're not sure and suggest calling, WhatsApp, or booking a free site survey. Never make up products, models, specifications, stock, prices, discounts, warranty terms or delivery times.
- Never quote prices. Explain what affects the price, suggest [the CCTV cost calculator](/tools/cctv-cost-calculator) for a rough estimate, and offer a free site survey / quotation at /enquiry, or the "Get Price" button on product pages.
- Help the customer choose: ask one short clarifying question when needed (property type, number of cameras/doors, indoor/outdoor, budget).
- Only discuss DSS, its products and services, and general security-system advice. Politely decline anything unrelated.
- Keep replies short: under 120 words, plain sentences or a few "- " bullet points. Use **bold** sparingly.
- Link to pages with markdown, using only paths that appear in the CONTEXT or these: /products, /solutions, /enquiry, /blogs, /about, /tools/cctv-cost-calculator, /tools/compare-products. Example: [Book a free site survey](/enquiry).
- Reply in the customer's language (English, Hindi or Hinglish).
- If the customer wants a call back or a quote, ask them to use [the enquiry form](/enquiry) or WhatsApp; do not collect phone numbers in chat.
${page ? `\nThe customer is currently viewing: ${page}\n` : ""}
CONTEXT:
${chunks.map((c, i) => `[${i + 1}] ${c.title}${c.url ? ` (${c.url})` : ""}\n${c.text}`).join("\n\n")}`;

export const ChatWithAssistant = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ message: "The AI assistant isn't available right now. Please call or WhatsApp us." });
    }

    const raw = Array.isArray(req.body.messages) ? req.body.messages.slice(-MAX_HISTORY) : [];
    const messages = raw
      .map((m) => ({ role: m?.role === "assistant" ? "model" : "user", text: clean(m?.text, MAX_MESSAGE_CHARS) }))
      .filter((m) => m.text);

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ message: "Please type a question." });
    }
    // Gemini requires the conversation to start with a user turn.
    while (messages[0].role !== "user") messages.shift();

    if (!takeDailySlot()) {
      return res.status(429).json({ message: "Our assistant is busy right now. Please call or WhatsApp us at +91 99996 05550." });
    }

    // Short follow-ups ("price?", "and outdoor?") need the previous question for retrieval.
    const userTexts = messages.filter((m) => m.role === "user").map((m) => m.text);
    const lastQuestion = userTexts[userTexts.length - 1];
    const searchText = lastQuestion.length < 60 && userTexts.length > 1
      ? `${userTexts[userTexts.length - 2]}\n${lastQuestion}`
      : lastQuestion;

    const page = clean(req.body.page, 200);
    const chunks = await searchKnowledge(await embedQuery(page ? `${searchText}\n(${page})` : searchText), 6);

    const { text } = await generateReply({ systemPrompt: buildSystemPrompt(chunks, page), messages });

    const seen = new Set();
    const sources = chunks
      .filter((c) => c.url && c.score > 0.6 && !seen.has(c.url) && seen.add(c.url))
      .slice(0, 3)
      .map((c) => ({ title: c.title, url: c.url }));

    return res.status(200).json({
      reply: text || "Sorry, I couldn't answer that. Please call or WhatsApp us at +91 99996 05550.",
      sources,
    });
  } catch (error) {
    console.error("Chat error:", error.message);
    return res.status(500).json({ message: "Something went wrong. Please try again, or call/WhatsApp us at +91 99996 05550." });
  }
};
