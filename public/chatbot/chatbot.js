document.addEventListener("DOMContentLoaded", function () {
  const chatMessages = document.getElementById("chatMessages");
  const userInput = document.getElementById("userInput");
  const sendButton = document.getElementById("sendButton");
  const chatContainer = document.querySelector(".chat-container");
  const chatToggle = document.querySelector(".chat-toggle");

  // Toggle chat visibility
  if (chatToggle) {
    chatToggle.addEventListener("click", function () {
      chatContainer.classList.toggle("show");
    });
  }

  // Function to add message to chat
  function addMessage(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = sender === "user" ? "user-message" : "bot-message";
    messageDiv.textContent = message;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Function to get bot response
  function getBotResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    for (const key in responses) {
      if (lowerMessage.includes(key)) {
        return responses[key];
      }
    }
    return responses["default"];
  }

  // Event listener for send button
  sendButton.addEventListener("click", function () {
    const message = userInput.value.trim();
    if (message) {
      addMessage(message, "user");
      const response = getBotResponse(message);
      setTimeout(() => addMessage(response, "bot"), 500); // Delay for natural feel
      userInput.value = "";
    }
  });

  // Event listener for Enter key
  userInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      sendButton.click();
    }
  });

  // Initial greeting
  setTimeout(() => addMessage("Hello! I'm the Food Donation Assistant. How can I help you today?", "bot"), 1000);
});
