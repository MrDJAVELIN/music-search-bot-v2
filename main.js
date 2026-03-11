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
  ctx.reply("Напиши название трека");
});

bot.on("text", async (ctx) => {
  const query = ctx.message.text;
  if (!query) return;

  const tracks = await searchTracks(query);
  if (!tracks.length) return ctx.reply("Ничего не найдено");

  const listId = Date.now().toString(36);
  addList(listId, tracks);

  const buttons = tracks.map((t, i) => [
    Markup.button.callback(
      `${i + 1}. ${t.title} - ${t.author}`,
      `dl_${listId}_${i}`
    )
  ]);

  await ctx.reply("Найденные треки:", Markup.inlineKeyboard(buttons));
});

bot.action(/dl_(.+)_(.+)/, async (ctx) => {
  await ctx.answerCbQuery();

  const [, listId, indexStr] = ctx.match;
  const index = Number(indexStr);

  const list = getList(listId);
  if (!list) return ctx.reply("Список устарел");

  const track = list[index];
  if (!track) return ctx.reply("Трек не найден");

  await ctx.reply(`Скачиваю и отправляю: ${track.title} - ${track.author}`);

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
