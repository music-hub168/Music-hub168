
const SUPABASE_URL = "https://tapyfnripwfgbdhirxee.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_TRfSyo4GtDm1e2Kd8EkAmg_mY0hfwkK";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const nameInput = document.getElementById("comment-name");
const commentInput = document.getElementById("comment-text");
const submitButton = document.getElementById("comment-submit");
const statusText = document.getElementById("comment-status");
const commentList = document.getElementById("comment-list");

async function loadComments() {
  commentList.replaceChildren();

  const { data, error } = await db
    .from("comments")
    .select("id, name, comment, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    statusText.textContent = "Could not load comments. Please try again.";
    return;
  }

  if (!data.length) {
    commentList.textContent = "Be the first to leave a comment.";
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
      "padding:12px;margin:12px 0;border:1px solid #ddd;border-radius:12px;";

    commentList.appendChild(card);
  });
}

submitButton.addEventListener("click", async () => {
  const name = nameInput.value.trim();
  const comment = commentInput.value.trim();

  if (!name || !comment) {
    statusText.textContent = "Please enter your name and comment.";
    return;
  }

  if (name.length > 40 || comment.length > 500) {
    statusText.textContent = "Name limit: 40 characters. Comment limit: 500.";
    return;
  }

  submitButton.disabled = true;
  statusText.textContent = "Posting your comment...";

  const { error } = await db.from("comments").insert([{ name, comment }]);

  if (error) {
    statusText.textContent = "Could not post. Please check your connection and try again.";
  } else {
    nameInput.value = "";
    commentInput.value = "";
    statusText.textContent = "Your comment has been posted!";
    await loadComments();
  }

  submitButton.disabled = false;
});

loadComments();
