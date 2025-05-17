const express = require('express');
const fetch = require('node-fetch');
const app = express();

// Trivia API helper
async function fetchQuestions() {
  const res = await fetch('https://opentdb.com/api.php?amount=5&type=multiple');
  const data = await res.json();
  return data.results;
}

// Store games in memory (use Redis in production)
let games = {};

// Start a new quiz
app.get('/quiz', async (req, res) => {
  const gameId = req.query.id || Math.random().toString(36).substring(2);
  const questions = await fetchQuestions();
  
  games[gameId] = {
    questions,
    currentQuestion: 0,
    score: 0
  };

  sendQuestion(res, gameId);
});

// Send question as a Frame
function sendQuestion(res, gameId) {
  const game = games[gameId];
  const question = game.questions[game.currentQuestion];
  const answers = [...question.incorrect_answers, question.correct_answer]
    .sort(() => Math.random() - 0.5); // Shuffle answers

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="og:title" content="Trivia Quiz" />
        <meta property="fc:frame:image" content="https://i.imgur.com/J0Q8X0A.png" />
        <meta property="fc:frame:button:1" content="${answers[0]}" />
        <meta property="fc:frame:button:2" content="${answers[1]}" />
        <meta property="fc:frame:button:3" content="${answers[2]}" />
        <meta property="fc:frame:button:4" content="${answers[3]}" />
        <meta property="fc:frame:post_url" content="https://your-vercel-url.vercel.app/answer?id=${gameId}" />
      </head>
    </html>
  `;
  res.send(html);
}

// Handle answers
app.post('/answer', express.json(), (req, res) => {
  const { id } = req.query;
  const buttonIndex = req.body.untrustedData.buttonIndex;
  const game = games[id];
  const question = game.questions[game.currentQuestion];
  const isCorrect = question.correct_answer === 
    question.incorrect_answers[buttonIndex - 1] || 
    (buttonIndex === 4 && question.correct_answer === question.correct_answer);

  if (isCorrect) game.score++;

  game.currentQuestion++;
  
  if (game.currentQuestion < game.questions.length) {
    sendQuestion(res, id);
  } else {
    // Show results
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="https://i.imgur.com/9EUF5Yx.png" />
          <meta property="fc:frame:button:1" content="You scored ${game.score}/5!" />
        </head>
      </html>
    `;
    res.send(html);
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));
