import { Telegraf, Markup, session } from "telegraf";
import "dotenv/config";

import { searchTracks } from "./sc/search.js";
import { streamTrack } from "./sc/download.js";
import { getClientId } from "./sc/clientId.js";
import { loadLists, addList, getList } from "./sc/lists.js";

await getClientId();
loadLists();

const bot = new Telegraf(process.env.TOKEN);
bot.use(session());

bot.start((ctx) => {
  ctx.reply(
    "Бот позволяет искать и скачивать треки с SoundCloud.\n" +
      "Просто отправьте название песни, выберите вариант из списка, и получите трек в формате MP3." +
      "\n\ndeveloped by @djvlnn"
  );
});

bot.on("text", async (ctx) => {
  const queryRaw = ctx.message?.text?.trim();
  if (!queryRaw) return ctx.reply("⚠️ | Введите название песни");

  const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
  let searchQuery = queryRaw;

  if (isGroup) {
    if (!ctx.message.entities || ctx.message.entities[0].type !== "bot_command")
      return;
    if (!queryRaw.startsWith("/msearch")) return;
    searchQuery = queryRaw.replace("/msearch", "").trim();
    if (!searchQuery)
      return ctx.reply("⚠️ | Введите название песни после команды /msearch");
  }

  const searchingMsg = await ctx.reply("🔎 | Поиск: 0 сек.");
  let seconds = 0;

  const timer = setInterval(async () => {
    seconds++;
    try {
      await ctx.editMessageText(`🔎 | Поиск: ${seconds} сек.`);
    } catch (err) {}
  }, 1000);

  const start = Date.now();
  let tracks = [];
  try {
    tracks = await searchTracks(searchQuery);
  } catch (err) {
    console.error(err);
    clearInterval(timer);
    await ctx.reply("❌ | Ошибка при поиске треков");
    return;
  }

  clearInterval(timer);

  const duration = ((Date.now() - start) / 1000).toFixed(2);

  if (!tracks.length) {
    try {
      await ctx.telegram.editMessageText(
        searchingMsg.chat.id,
        searchingMsg.message_id,
        undefined,
        `⚠️ | Ничего не найдено (${duration} сек.)`
      );
    } catch (err) {
      console.error("Не удалось обновить сообщение поиска:", err.message);
      await ctx.reply(`⚠️ | Ничего не найдено (${duration} сек.)`);
    }
    return;
  }

  const listId = Date.now().toString(36);
  addList(listId, tracks);

  const buttons = tracks.map((t, i) => [
    Markup.button.callback(
      `${i + 1}. ${t.title} - ${t.author}`,
      `dl_${listId}_${i}`
    )
  ]);

  try {
    await ctx.deleteMessage(searchingMsg.message_id);
  } catch (err) {}

  await ctx.reply(
    `✅ | Найдено ${tracks.length} треков за ${duration} сек.:`,
    Markup.inlineKeyboard(buttons)
  );
});

bot.action(/dl_(.+)_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();

  const [, listId, indexStr] = ctx.match;
  const index = Number(indexStr);

  const list = getList(listId);
  if (!list) return ctx.reply("Список устарел");

  const track = list[index];
  if (!track) return ctx.reply("Трек не найден");

  const user = ctx.from?.username
    ? "@" + ctx.from.username
    : `${ctx.from?.first_name || "unknown"} (${ctx.from?.id})`;

  const trackName = `${track.title} - ${track.author}`;

  console.log(`🎧 ${user} → ${trackName}`);

  await ctx.reply(`Скачиваю и отправляю: ${trackName}`);

  const stream = await streamTrack(track.url);
  const safeTitle = track.title.replace(/[\/\\?%*:|"<>]/g, "_") + ".mp3";

  await ctx.replyWithAudio({
    source: stream,
    filename: safeTitle,
    title: track.title,
    performer: track.author
  });
});

bot.launch(() => console.log(bot.botInfo.username + " started"));
