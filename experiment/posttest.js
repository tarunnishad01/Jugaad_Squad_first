/////////////////////////////////////////////////////////////////////////////

/////////////////////// Do not modify the below code ////////////////////////

/////////////////////////////////////////////////////////////////////////////

(function() {
  function buildQuiz() {
    // we'll need a place to store the HTML output
    const output = [];

    // for each question...
    myQuestions.forEach((currentQuestion, questionNumber) => {
      // we'll want to store the list of answer choices
      const answers = [];

      // and for each available answer...
      for (letter in currentQuestion.answers) {
        // ...add an HTML radio button
        answers.push(
          `<label>
            <input type="radio" name="question${questionNumber}" value="${letter}">
            ${letter} :
            ${currentQuestion.answers[letter]}
          </label>`
        );
      }

      // add this question and its answers to the output
      output.push(
        `<div class="question"> ${currentQuestion.question} </div>
        <div class="answers"> ${answers.join("")} </div>`
      );
    });

    // finally combine our output list into one string of HTML and put it on the page
    quizContainer.innerHTML = output.join("");
  }

  function showResults() {
    // gather answer containers from our quiz
    const answerContainers = quizContainer.querySelectorAll(".answers");

    // keep track of user's answers
    let numCorrect = 0;

    // for each question...
    myQuestions.forEach((currentQuestion, questionNumber) => {
      // find selected answer
      const answerContainer = answerContainers[questionNumber];
      const selector = `input[name=question${questionNumber}]:checked`;
      const userAnswer = (answerContainer.querySelector(selector) || {}).value;

      // if answer is correct
      if (userAnswer === currentQuestion.correctAnswer) {
        numCorrect++;
        // answerContainers[questionNumber].style.color = "lightgreen";
      } else {
        answerContainers[questionNumber].style.color = "red";
      }
    });

    // show number of correct answers out of total
    resultsContainer.innerHTML = `${numCorrect} out of ${myQuestions.length}`;
  }

  const quizContainer = document.getElementById("quiz");
  const resultsContainer = document.getElementById("results");
  const submitButton = document.getElementById("submit");

/////////////////////////////////////////////////////////////////////////////

/////////////////////// Do not modify the above code ////////////////////////

///////////////////////////////////////////////////
const myQuestions = [
  {
    question: "Which simulation result confirms the amplifier is working as intended?",
    answers: {
      a: "No current flow",
      b: "Output voltage equals input",
      c: "Amplified output signal with correct phase",
      d: "No signal at output"
    },
    correctAnswer: "c"
  },
  {
    question: "What is a key advantage of using simulation before building a custom amplifier circuit?",
    answers: {
      a: "Increases PCB size",
      b: "Avoids need for testing",
      c: "Identifies issues without physical components",
      d: "Reduces gain"
    },
    correctAnswer: "c"
  },
  {
    question: "In a simulated amplifier circuit, what might a clipped output waveform suggest?",
    answers: {
      a: "Proper amplification",
      b: "Noise filtering",
      c: "Power supply limitations or overdrive",
      d: "Component mismatch"
    },
    correctAnswer: "c"
  },
  {
    question: "Which parameter is measured in transient analysis during simulation?",
    answers: {
      a: "Gain at different frequencies",
      b: "Output impedance",
      c: "Time-domain signal response",
      d: "Steady-state current only"
    },
    correctAnswer: "c"
  },
  {
    question: "What role does a bypass capacitor play in amplifier circuit simulation?",
    answers: {
      a: "Suppresses power supply ripple",
      b: "Increases resistance",
      c: "Inverts the signal",
      d: "Adds noise"
    },
    correctAnswer: "a"
  },
  {
    question: "Which configuration gives high input impedance in amplifier design?",
    answers: {
      a: "Common-emitter",
      b: "Common-base",
      c: "Emitter-follower",
      d: "Bridge rectifier"
    },
    correctAnswer: "c"
  },
  {
    question: "Why is feedback used in amplifier circuit simulations?",
    answers: {
      a: "To increase distortion",
      b: "To reduce bandwidth",
      c: "To stabilize gain and reduce noise",
      d: "To add oscillations"
    },
    correctAnswer: "c"
  },
  {
    question: "Which parameter would most directly indicate distortion in a simulated amplifier output?",
    answers: {
      a: "THD (Total Harmonic Distortion)",
      b: "DC bias level",
      c: "Resistance",
      d: "Capacitance"
    },
    correctAnswer: "a"
  },
  {
    question: "What is typically adjusted to set the gain in a custom amplifier simulation?",
    answers: {
      a: "Transistor color",
      b: "Feedback resistor values",
      c: "Power cord length",
      d: "Simulation file format"
    },
    correctAnswer: "b"
  },
  {
    question: "What does bandwidth of an amplifier indicate in a simulation?",
    answers: {
      a: "Range of supply voltage",
      b: "Signal delay time",
      c: "Range of frequencies it can amplify effectively",
      d: "Circuit size"
    },
    correctAnswer: "c"
  }
];


/////////////////////////////////////////////////////////////////////////////

/////////////////////// Do not modify the below code ////////////////////////

/////////////////////////////////////////////////////////////////////////////

  // display quiz right away
  buildQuiz();

  // on submit, show results
  submitButton.addEventListener("click", showResults);
})();

/////////////////////////////////////////////////////////////////////////////

/////////////////////// Do not modify the above code ////////////////////////

/////////////////////////////////////////////////////////////////////////////
