const Alexa = require('ask-sdk-core');
const request = require('request');

function getQuestion(callback) {
  return new Promise(function(resolve, reject) {
    request('https://opentdb.com/api.php?amount=1&category=23', { json: true }, function(err, res, body) {
      if (err) {
        console.log(err);
      } 
      else {
        callback(body);
      }
    })
  })
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speakOutput = "Welcome to History Trivia! To begin, please say a phrase like ask me a question";
      
    return handlerInput.responseBuilder.speak(speakOutput).withShouldEndSession(false).getResponse();
    
  },
};


const QuizHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'QuestionIntent';
  },
  handle(handlerInput) {
    return new Promise((resolve) => {
      getQuestion((result) => {
        console.log("inside quiz handler")
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        console.log(`slots: ${handlerInput.requestEnvelope.request.intent.slots}`)
        var question = result.results[0].question;
        var answer = result.results[0].correct_answer
        var incorrect_answers = result.results[0].incorrect_answers
        console.log(`question: ${question}`)
        console.log(`answer: ${answer}`)
        
        attributes.question = question
        attributes.correct_answer = answer
        
        var answers_list = []
        for (const index in incorrect_answers) {
          answers_list.push(incorrect_answers[index])
        }
        answers_list.push(answer)
        var shuffled_list = shuffle(answers_list)
        console.log(`shuffled_list: ${shuffled_list}`)
        var answer_options = "Is it ";
        for (const index in shuffled_list) {
          if (index == shuffled_list.length - 1) {
            answer_options += `or ${shuffled_list[index]}`
          }
          else {
            answer_options += `${shuffled_list[index]}, `; 
          }
        }
        attributes.answer_text = answer_options
        attributes.answer_list = shuffled_list
        
        const speakOutput = question + " " + answer_options;

        resolve(handlerInput.responseBuilder.speak(speakOutput).withShouldEndSession(false).getResponse());
      })
    });
  },
};

const AnswerHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AnswerIntent';
  },
  handle(handlerInput) {
    return new Promise((resolve) => {
      getQuestion((result) => {
        const attributes = handlerInput.attributesManager.getSessionAttributes();
        console.log(`user input: ${handlerInput.requestEnvelope.request.intent.slots.answer.value}`)
        var user_answer = handlerInput.requestEnvelope.request.intent.slots.answer.value
        var speakOutput = "answer handler"
        for (const index in attributes.answer_list) {
          console.log(`answer choice: ${attributes.answer_list[index]}`)
        }
        if (!attributes.answer_list.includes(user_answer)) {
          console.log(`user_answer: ${user_answer}`)
          console.log(`answer_list: ${attributes.answer_list}`)
          console.log(`typeof(answer_list): ${typeof(attributes.answer_list)}`)
          speakOutput = `I am sorry, that was not a valid response. Please select between ${attributes.answer_list}`
        }
        else {
          if (user_answer === attributes.correct_answer) {
            speakOutput = `Correct! That is the right answer`;
          }
          else {
            speakOutput = `I am sorry but that is incorrect. The correct answer is ${attributes.correct_answer}`
          }
        }
        

        resolve(handlerInput.responseBuilder.speak(speakOutput).getResponse());
      })
    });
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 'Ask me what happened today in history!';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const CancelAndStopHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
        || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    const speakOutput = 'Goodbye!';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    console.log(error.trace);
    console.log(JSON.stringify(handlerInput));

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    QuizHandler,
    AnswerHandler,
    HelpHandler,
    CancelAndStopHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
