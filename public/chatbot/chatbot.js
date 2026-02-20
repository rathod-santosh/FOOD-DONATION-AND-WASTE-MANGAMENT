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
  async function getBotResponse(userMessage) {
    console.log('Chatbot: Sending message to backend:', userMessage);
    try {
      const response = await fetch('/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: userMessage }),
      });
      console.log('Chatbot: Fetch response status:', response.status);
      const data = await response.json();
      console.log('Chatbot: Received answer:', data.answer);
      return data.answer;
    } catch (error) {
      console.error('Chatbot: Error fetching response:', error);
      return "Sorry, I'm having trouble connecting right now. Please try again later.";
    }
  }

  // Event listener for send button
  sendButton.addEventListener("click", async function () {
    const message = userInput.value.trim();
    if (message) {
      addMessage(message, "user");
      const response = await getBotResponse(message);
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
