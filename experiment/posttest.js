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
      question: "What is the primary purpose of using simulation in amplifier circuit design?",
      answers: {
        a: "To reduce the number of transistors",
        b: "To avoid using capacitors",
        c: "To analyze and test circuit behavior before physical implementation",
        d: "To increase the PCB size"
      },
      correctAnswer: "c"
    },
    {
      question: "Which software is commonly used for simulating amplifier circuits?",
      answers: {
        a: "Photoshop",
        b: "SPICE",
        c: "Excel",
        d: "AutoCAD"
      },
      correctAnswer: "b"
    },
    {
      question: "What does an AC analysis in amplifier simulation evaluate?",
      answers: {
        a: "Battery life",
        b: "Signal frequency response",
        c: "Device packaging",
        d: "Wire color"
      },
      correctAnswer: "b"
    },
    {
      question: "Which component typically provides gain in an amplifier circuit?",
      answers: {
        a: "Resistor",
        b: "Capacitor",
        c: "Transistor",
        d: "Inductor"
      },
      correctAnswer: "c"
    },
    {
      question: "In simulation, what does the DC operating point help determine?",
      answers: {
        a: "Thermal resistance",
        b: "Frequency range",
        c: "Steady-state voltages and currents",
        d: "Color coding of wires"
      },
      correctAnswer: "c"
    },
    {
      question: "Which type of amplifier is commonly used for voltage amplification?",
      answers: {
        a: "Common-emitter",
        b: "Differential",
        c: "Class D",
        d: "Bridge rectifier"
      },
      correctAnswer: "a"
    },
    {
      question: "What does 'gain' in an amplifier circuit mean?",
      answers: {
        a: "The number of components used",
        b: "The increase in input signal strength",
        c: "The heat produced",
        d: "The signal delay"
      },
      correctAnswer: "b"
    },
    {
      question: "What must be done before running a simulation of a custom amplifier circuit?",
      answers: {
        a: "Build it physically",
        b: "Export it to PDF",
        c: "Set up all component parameters and wiring",
        d: "Calculate shipping cost"
      },
      correctAnswer: "c"
    },
    {
      question: "Why might one use a virtual oscilloscope in a simulation?",
      answers: {
        a: "To bake circuits",
        b: "To monitor signal voltages over time",
        c: "To print circuit diagrams",
        d: "To add color to the circuit"
      },
      correctAnswer: "b"
    },
    {
      question: "Which parameter indicates how much an amplifier boosts a signal?",
      answers: {
        a: "Gain",
        b: "Offset",
        c: "Impedance",
        d: "Bandwidth"
      },
      correctAnswer: "a"
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
