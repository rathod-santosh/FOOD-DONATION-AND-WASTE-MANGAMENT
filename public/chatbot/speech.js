// Speech.js - Simple Text-to-Speech for chatbot
function speakText(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  } else {
    console.log("Text-to-speech not supported in this browser.");
  }
}

// Optional: Add speech recognition for voice input
function startVoiceInput() {
  if ('webkitSpeechRecognition' in window) {
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      document.getElementById("userInput").value = transcript;
      document.getElementById("sendButton").click();
    };

    recognition.start();
  } else {
    alert("Voice input not supported in this browser.");
  }
}

// You can call speakText(response) in chatbot.js after adding bot message if you want TTS.
