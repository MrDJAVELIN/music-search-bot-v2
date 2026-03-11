import fs from "fs";
import path from "path";

const FILE = path.resolve("./lists.json");
let lists = {};

export function loadLists() {
  if (fs.existsSync(FILE)) {
    try {
      lists = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    } catch {
      lists = {};
    }
  }
}

function saveLists() {
  fs.writeFileSync(FILE, JSON.stringify(lists, null, 2));
}

export function addList(listId, tracks) {
  lists[listId] = tracks;
  saveLists();
}

export function getList(listId) {
  return lists[listId] || null;
}
