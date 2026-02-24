// flashcards. localStorage backed.
// shape: { decks: [{ id, name, cards: [{ id, front, back }] }] }

const STORAGE_KEY = "flashcards.v1";

let state = load();
let currentDeckId = null;
let studySession = null; // { deckId, queue, currentId, flipped }

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { decks: [] };
    const parsed = JSON.parse(raw);
    if (!parsed.decks) parsed.decks = [];
    return parsed;
  } catch (e) {
    console.warn("storage parse failed", e);
    return { decks: [] };
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getDeck(id) {
  return state.decks.find(d => d.id === id);
}

function shuffle(arr) {
  // fisher-yates
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- rendering ---

function renderDeckList() {
  const ul = document.getElementById("deckList");
  ul.innerHTML = "";

  if (state.decks.length === 0) {
    const li = document.createElement("li");
    li.textContent = "no decks yet";
    li.style.cursor = "default";
    li.style.color = "var(--muted)";
    ul.appendChild(li);
    return;
  }

  for (const d of state.decks) {
    const li = document.createElement("li");
    if (d.id === currentDeckId) li.classList.add("active");

    const name = document.createElement("span");
    name.textContent = d.name;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = d.cards.length + " cards";

    li.appendChild(name);
    li.appendChild(count);
    li.addEventListener("click", () => selectDeck(d.id));
    ul.appendChild(li);
  }
}

function renderDeckView() {
  const view = document.getElementById("deckView");
  if (!currentDeckId) { view.classList.add("hidden"); return; }

  const deck = getDeck(currentDeckId);
  if (!deck) { currentDeckId = null; view.classList.add("hidden"); return; }

  view.classList.remove("hidden");
  document.getElementById("currentDeckName").textContent = deck.name;

  const tbody = document.getElementById("cardsTbody");
  tbody.innerHTML = "";

  if (deck.cards.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 3;
    td.style.color = "var(--muted)";
    td.textContent = "no cards yet, add one above";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    for (const c of deck.cards) {
      const tr = document.createElement("tr");
      const front = document.createElement("td");
      front.textContent = c.front;
      const back = document.createElement("td");
      back.textContent = c.back;
      const actions = document.createElement("td");
      const del = document.createElement("button");
      del.className = "row-del";
      del.textContent = "remove";
      del.addEventListener("click", () => {
        if (!confirm("remove this card?")) return;
        deck.cards = deck.cards.filter(x => x.id !== c.id);
        save();
        renderAll();
      });
      actions.appendChild(del);
      tr.appendChild(front);
      tr.appendChild(back);
      tr.appendChild(actions);
      tbody.appendChild(tr);
    }
  }

  document.getElementById("studyBtn").disabled = deck.cards.length === 0;
}

function renderAll() {
  renderDeckList();
  renderDeckView();
}

// --- actions ---

function selectDeck(id) {
  currentDeckId = id;
  exitStudy();
  renderAll();
}

function addDeck(name) {
  const deck = { id: uid(), name: name, cards: [] };
  state.decks.push(deck);
  save();
  currentDeckId = deck.id;
  renderAll();
}

function addCard(deckId, front, back) {
  const deck = getDeck(deckId);
  if (!deck) return;
  deck.cards.push({ id: uid(), front: front, back: back });
  save();
  renderAll();
}

function deleteDeck(id) {
  state.decks = state.decks.filter(d => d.id !== id);
  if (currentDeckId === id) currentDeckId = null;
  save();
  renderAll();
}

// --- study mode (no scheduling yet, just flip through) ---

function startStudy(deckId) {
  const deck = getDeck(deckId);
  if (!deck) return;

  studySession = {
    deckId: deckId,
    queue: shuffle(deck.cards.map(c => c.id)),
    currentId: null,
    flipped: false
  };

  document.getElementById("deckView").classList.add("hidden");
  document.getElementById("studyView").classList.remove("hidden");
  document.getElementById("studyDeckName").textContent = deck.name + " — study";

  nextStudyCard();
}

function nextStudyCard() {
  const deck = getDeck(studySession.deckId);
  const empty = document.getElementById("studyEmpty");
  const card = document.getElementById("studyCard");
  const face = document.getElementById("cardFace");
  const nav = document.getElementById("navRow");

  if (studySession.queue.length === 0) {
    card.classList.add("hidden");
    empty.classList.remove("hidden");
    empty.querySelector("p").textContent = "you're done with this deck for now.";
    return;
  }

  empty.classList.add("hidden");
  card.classList.remove("hidden");

  studySession.currentId = studySession.queue[0];
  studySession.flipped = false;
  const c = deck.cards.find(x => x.id === studySession.currentId);

  face.textContent = c.front;
  face.classList.remove("flipped");
  nav.classList.add("hidden");
}

function flipCard() {
  if (!studySession || studySession.flipped) return;
  const deck = getDeck(studySession.deckId);
  const c = deck.cards.find(x => x.id === studySession.currentId);
  if (!c) return;
  studySession.flipped = true;
  const face = document.getElementById("cardFace");
  face.textContent = c.back;
  face.classList.add("flipped");
  document.getElementById("navRow").classList.remove("hidden");
}

function exitStudy() {
  studySession = null;
  document.getElementById("studyView").classList.add("hidden");
  if (currentDeckId) document.getElementById("deckView").classList.remove("hidden");
}

// --- wire up ---

document.getElementById("newDeckForm").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("newDeckName");
  const name = input.value.trim();
  if (!name) return;
  addDeck(name);
  input.value = "";
});

document.getElementById("newCardForm").addEventListener("submit", e => {
  e.preventDefault();
  if (!currentDeckId) return;
  const front = document.getElementById("cardFront").value.trim();
  const back = document.getElementById("cardBack").value.trim();
  if (!front || !back) return;
  addCard(currentDeckId, front, back);
  document.getElementById("cardFront").value = "";
  document.getElementById("cardBack").value = "";
  document.getElementById("cardFront").focus();
});

document.getElementById("deleteDeckBtn").addEventListener("click", () => {
  if (!currentDeckId) return;
  const deck = getDeck(currentDeckId);
  if (!deck) return;
  if (!confirm("delete deck '" + deck.name + "' and all its cards?")) return;
  deleteDeck(currentDeckId);
});

document.getElementById("studyBtn").addEventListener("click", () => {
  if (!currentDeckId) return;
  startStudy(currentDeckId);
});

document.getElementById("exitStudy").addEventListener("click", exitStudy);
document.getElementById("cardFace").addEventListener("click", flipCard);

document.getElementById("nextBtn").addEventListener("click", () => {
  if (!studySession) return;
  studySession.queue.shift();
  nextStudyCard();
});

renderAll();
