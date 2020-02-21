/*
NLP Program to extract the postage from a training corpus and then create a post tag for an untagged new corpus.
 */

// Require needed module
const fs = require('fs');
const path = './corpus/WSJ_02-21.pos';
const POStag = ['CC','CD','DT','EX','FW','IN','JJ','JJR','JJS','LS','MD','NN','NNS','NNP',
              'NNPS','PDT','POS','PRP','PP$','RB','RBR','RBS','RP','SYM','TO','UH','VB',
              'VBD','VBG','VBN','VBP','VBZ','WDT','WP','WP$','WRB','#','$','.',',',':',
              '\"\"','\'\'','``','PRP$','(',')','\'','\"'];

// In the data, TOKEN will be at index 0 and TAG will be at index 1
const [TOKEN, TAG] = [0,1];

// Two tables of frequency
let POStable = {}, STATEtable = {'Begin_Sent':{},'End_Sent':{}};

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
        if (tempArry.length > 1){
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
    console.log(sum);
    return newTable;
}

function processFile(inputFile) {

    let prev = undefined;
    let fs = require('fs'),
        readline = require('readline'),
        instream = fs.createReadStream(inputFile),
        outstream = new (require('stream'))(),
        rl = readline.createInterface(instream, outstream);

    rl.on('line', function (line) {
        const data = line.split(/[\t\s]+/);
        countPOS(data);
        prev = countState(data[TAG],prev);
    });

    rl.on('close', function (line) {
        fs.writeFileSync('src/POStable.json',JSON.stringify(POStable,null,' '));
        fs.writeFileSync('src/Statetable.json',JSON.stringify(STATEtable,null,' '));
        const table = calculateProbability(POStable);
        const table2 = calculateProbability(STATEtable);
        fs.writeFileSync('src/POStable2.json',JSON.stringify(table,null,' '));
        fs.writeFileSync('src/Statetable2.json',JSON.stringify(table2,null,' '));
    });

}

processFile(path);
