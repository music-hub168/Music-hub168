


const SUPABASE_URL = "https://tapyfnripwfgbdhirxee.supabase.co";
const SUPABASE_KEY = "sb_publishable_PY4JoBfyAN-4dQbTzP_EHA_Xju7p-wy";

const nameInput = document.getElementById("comment-name");
const commentInput = document.getElementById("comment-text");
const submitButton = document.getElementById("comment-submit");
const statusText = document.getElementById("comment-status");
const commentList = document.getElementById("comment-list");

function showStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

async function startComments() {
  if (!nameInput || !commentInput || !submitButton || !commentList) {
    showStatus("ERROR: Comment form elements are missing in index.html.");
    return;
  }

  if (!window.supabase) {
    showStatus("ERROR: Supabase library did not load.");
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  async function loadComments() {
    commentList.replaceChildren();

    const { data, error } = await db
      .from("comments")
      .select("id, name, comment, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("LOAD ERROR:", error);
      showStatus("LOAD ERROR: " + error.message);
      return;
    }

    if (!data || data.length === 0) {
      commentList.textContent = "No comments yet. Be the first!";
      showStatus("Connected. No comments yet.");
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
        "padding:14px;margin:12px 0;border:1px solid #ddd;" +
        "border-radius:12px;overflow-wrap:anywhere;";

      commentList.appendChild(card);
    });

    showStatus("Comments loaded successfully.");
  }

  submitButton.addEventListener("click", async (event) => {
    event.preventDefault();

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
    showStatus("Posting comment...");

    try {
      const { error } = await db
        .from("comments")
        .insert([{ name, comment }]);

      if (error) {
        console.error("POST ERROR:", error);
        showStatus("POST ERROR: " + error.message);
        return;
      }

      nameInput.value = "";
      commentInput.value = "";

      showStatus("Comment posted successfully!");
      await loadComments();
    } catch (error) {
      console.error("NETWORK ERROR:", error);
      showStatus("NETWORK ERROR: " + error.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  await loadComments();
}

startComments();
