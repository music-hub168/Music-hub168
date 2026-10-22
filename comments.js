

const SUPABASE_URL = "https://tapyfnripwfgbdhirxee.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_TRfSyo4GtDm1e2Kd8EkAmg_mY0hfwkK";

const nameInput = document.getElementById("comment-name");
const commentInput = document.getElementById("comment-text");
const submitButton = document.getElementById("comment-submit");
const statusText = document.getElementById("comment-status");
const commentList = document.getElementById("comment-list");

let db = null;

function showStatus(message) {
  if (statusText) statusText.textContent = message;
}

function startComments() {
  if (!window.supabase) {
    showStatus("Error: Supabase library did not load. Check index.html.");
    return;
  }

  if (
    SUPABASE_URL === "https://tapyfnripwfgbdhirxee.supabase.co/rest/v1/" ||
    SUPABASE_KEY === "sb_publishable_TRfSyo4GtDm1e2Kd8EkAmg_mY0hfwkK"
  ) {
    showStatus("Error: Please add your Supabase URL and Publishable key.");
    return;
  }

  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  if (!nameInput || !commentInput || !submitButton || !commentList) {
    showStatus("Error: Comment form elements are missing from index.html.");
    return;
  }

  loadComments();

  submitButton.addEventListener("click", postComment);
}

async function loadComments() {
  commentList.replaceChildren();

  const { data, error } = await db
    .from("comments")
    .select("id, name, comment, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    showStatus("Could not load comments: " + error.message);
    console.error("Supabase load error:", error);
    return;
  }

  if (!data || data.length === 0) {
    commentList.textContent = "Be the first to leave a comment.";
    showStatus("Comments are ready.");
    return;
  }

  data.forEach((item) => {
    const card = document.createElement("article");
    const name = document.createElement("strong");
    const message = document.createElement("p");
    const date = document.createElement("small");

    name.textContent = item.name;
    message.textContent = item.comment;
    date.textContent = new Date(item.created_at).toLocaleString();

    card.append(name, message, date);
    card.style.cssText =
      "padding:12px;margin:12px 0;border:1px solid #ddd;border-radius:12px;overflow-wrap:anywhere;";

    commentList.appendChild(card);
  });

  showStatus("Comments loaded successfully.");
}

async function postComment() {
  if (!db) {
    showStatus("Error: Supabase is not connected.");
    return;
  }

  const name = nameInput.value.trim();
  const comment = commentInput.value.trim();

  if (!name || !comment) {
    showStatus("Please enter your name and comment.");
    return;
  }

  if (name.length > 40 || comment.length > 500) {
    showStatus("Name limit: 40 characters. Comment limit: 500.");
    return;
  }

  submitButton.disabled = true;
  showStatus("Posting your comment...");

  try {
    const { error } = await db
      .from("comments")
      .insert([{ name, comment }]);

    if (error) {
      console.error("Supabase post error:", error);
      showStatus("Could not post: " + error.message);
      return;
    }

    nameInput.value = "";
    commentInput.value = "";

    showStatus("Comment posted successfully!");
    await loadComments();
  } catch (error) {
    console.error("Unexpected comment error:", error);
    showStatus("Connection error: " + error.message);
  } finally {
    submitButton.disabled = false;
  }
}

startComments();
