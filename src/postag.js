/*
NLP Program to extract the postage from a training corpus and then create a post tag for an untagged new corpus.
 */

// Require needed module
const fs = require('fs');
const training_path = 'WSJ_02-21.pos', corpus_path = 'WSJ_23.words', tagged_corpus_path = 'submission.pos';
const POStag = ['CC','CD','DT','EX','FW','IN','JJ','JJR','JJS','LS','MD','NN','NNS','NNP',
              'NNPS','PDT','POS','PRP','PP$','RB','RBR','RBS','RP','SYM','TO','UH','VB',
              'VBD','VBG','VBN','VBP','VBZ','WDT','WP','WP$','WRB','#','$','.',',',':',
              '\"\"','\'\'','``','PRP$','(',')','\'','\"'];

// In the data, TOKEN will be at index 0 and TAG will be at index 1
const [TOKEN, TAG] = [0,1];

// Two tables of frequency
let POStable = {}, STATEtable = {'Begin_Sent':{},'End_Sent':{}}, POStableProb = {}, STATEtableProb = {};

// Initialize the POStable based on the POStag
POStag.forEach(e => POStable[e] = {});
POStag.forEach(e => STATEtable[e] = {});

function countPOS(data) {
    for (const tag of Object.keys(POStable)) {
        if (data[TAG] === tag) {
            increaseCount(POStable,tag,data[TOKEN]);
        }
    }
}

function countState(current, prevState) {
    let currentState = current;
    // If prevStat is a blank line, then we increase the Begin_Sent state.
    if (prevState === undefined){
        increaseCount(STATEtable,'Begin_Sent',currentState);
        return currentState;
    }else {
        // If currentState reaches the line breaker(between sentences), increase count for the end state.
        if(currentState === undefined){
            increaseCount(STATEtable,'End_Sent',prevState);
            return undefined;
        }else {
            // If currentState and prevState both exist, then increase the count for current state to previous state.
            increaseCount(STATEtable,prevState,currentState);
            return currentState;
        }
    }
}

function increaseCount(table, currentState, prev) {
    if(isNaN(table[currentState][prev])){
        table[currentState][prev]=0;
        table[currentState][prev]++;
    }else {
        table[currentState][prev]++;
    }
}

function calculateProbability(table) {
    // Use temp array to calculate the sum within each object(TAG/STATE).
    let tempArry = [];
    let sum = [];
    let counter = 0;

    // Deep-copy of the object, so it will not change the original reference.
    const newTable = JSON.parse((JSON.stringify(table)));

    // Calculate the SUM for each object
    Object.values(table).forEach(tag => {
        // push every value in that object into a temp array for sum calculation
        Object.values(tag).forEach(frequency => tempArry.push(frequency));
        if (tempArry.length > 0){
            sum.push(tempArry.reduce((previousValue, currentValue) => previousValue + currentValue));
            tempArry.length = 0;
        }else {
            sum.push(0);
        }
    });

    // traverse through each frequency and divide it by the total number, we get probability.
    Object.entries(newTable).forEach(tag => {
         Object.entries(tag[1]).forEach(value => {
             newTable[tag[0]][value[0]] = value[1]/sum[counter];
         });
         counter++;
    });

    return newTable;
}

// 1. first we want to look up for the probability that the word exists in different state. (word observation probability)
// 2. second we want to find the probability of that state follow by the previous state (transition probability)
// 3. calculate the observation probability and transition probability.
// 4. choose the highest probability path until that state.
// 5. do the process recursively until we reach the end of sentence.

function tagSentence(sentence) {

    // Initialize the previous state as 'Begin_Sent'.
    let prevState = 'Begin_Sent';
    // Initialize the tag sequence as a 2D-array (better than object, since there will be duplicated keys)
    const tagSeq = [];

    //loop through the sentence, find the word
    sentence.forEach(word => {

        const wordProb = [];
        let OOV = false;

        //look over the table, find the word and its probability. Put the tag:probability into a 2D-array.
        Object.entries(POStableProb).forEach(tag => {
            Object.entries(tag[1]).forEach(prob => {
                if(prob[0] === word){
                    // If we find the word from table, push it to the word list. Otherwise, deem this word as an OOV.
                    wordProb.push([tag[0],prob[1]]);
                }
            });
        });

        if (wordProb.length === 0) (OOV = true);

        // If we unable to find the word, we want to predict the word based on the previous state.
        if (OOV === true){
            let [maxProb,maxState] = [0,'NN'];
            Object.entries(STATEtableProb).forEach(state => {
                if (state[0] === prevState){
                    Object.entries(state[1]).forEach(followState => {
                        if (followState[1] > maxProb){
                            maxProb = followState[1];
                            maxState = followState[0];
                        }
                    })
                }
            });
            tagSeq.push([word,maxState]);
            prevState = maxState;
        }else {
            // After we created the table, we want to look the probability of that state follow by the previous state.
            for(let i=0; i<wordProb.length; i++) {
                Object.entries(STATEtableProb).forEach(state =>{
                    if(state[0] === prevState){
                        Object.entries(state[1]).forEach(followState =>{
                            // Calculate word probability * transition probability and put back to the array.
                            if(followState[0] === wordProb[i][0]) wordProb[i][1] = followState[1]*wordProb[i][1];
                        });
                    }
                });
            }

            // Now we want to get the highest probability for this word. Assume the max is the first one.
            let [maxState,maxProb] = [wordProb[0][0],wordProb[0][1]];
            wordProb.forEach(e => {
                if(e[1] > maxProb){
                    maxProb = e[1];
                    maxState = e[0];
                }
            });
            // For Debug purposes
            // console.log(wordProb);
            // console.log(`MAX is ${[maxState,maxProb]}`);
            tagSeq.push([word,maxState]);
            prevState = maxState;
        }

    });


    return tagSeq;

}

function processFile() {

    let prev = undefined;
    let fs = require('fs'),
        readline = require('readline'),
        inStreamTraining = fs.createReadStream(training_path),
        inStreamCorpus = fs.createReadStream(corpus_path),
        outStreamCorpus = fs.createWriteStream(tagged_corpus_path),
        corpus = readline.createInterface(inStreamCorpus),
        training =  readline.createInterface(inStreamTraining);

    // Reading the corpus file that will be tagged.
    let sentence = [], wholeCorpus = [], lineNum = 0;
    corpus.on('line',line => {
        if(line.length !== 0){
            sentence.push(line);
        }else {
            wholeCorpus.push(sentence);
            sentence = [];
        }
        lineNum++;
    });

    corpus.on('close', line =>{
        console.log(`Finished reading corpus ${corpus_path} with ${lineNum} lines`);
    });

    // Reading the training file
    training.on('line', function (line) {
        const data = line.split(/[\t\s]+/);
        countPOS(data);
        prev = countState(data[TAG],prev);
    });

    training.on('close', function (line) {
        // Calculate the Probability Table for the training.
        POStableProb = calculateProbability(POStable);
        STATEtableProb = calculateProbability(STATEtable);
        console.log(`Finished Training Table Calculation`);
        console.log(`Tagging Corpus...`);
        wholeCorpus.forEach(sentence => {
            const tagged_sentence = tagSentence(sentence);
            tagged_sentence.forEach(word => {
                fs.appendFileSync(tagged_corpus_path,`${word[0]}\t${word[1]}\n`,'utf8');
            });
            fs.appendFileSync(tagged_corpus_path,'\n','utf8');
        });
        console.log(`Finished Output the Tagged Corpus ${tagged_corpus_path}`);
    });

}

processFile();
