## NLP - POSTAG Program

@Author: Yulong He <br>
@ver: 1.0.0 <br>
@Date: 2020.02.04 <br>






This NLP HMM POS tagging program is used to tag the corpus based on the PENN Tree Bank corpus. It is written in javascript and to run this program, you will need to install Node.js

To run this program, type the following in console:

```bash 
$node postag.js
```

The traning corpus used in the program is provided by the PENN Tree Bank and is required to put into the root directory where the 'postag.js' is presented. Fail to have the correct corpus name will also result in an error.

Please check if your root directory has the following tree structure:

```bash
└── *root
    ├── WSJ_02-21.pos (Training File)
    ├── WSJ_23.words (Corpus that needs to be tagged)
    └── postag.js 
```

 * If you wish to use your own training file, please go into the 'postag.js' and change the 'corpus_path' in line 7.
 * The tags used in this program comes from 'PENN Treebank P.O.S Tags', check https://www.ling.upenn.edu/courses/Fall_2003/ling001/penn_treebank_pos.html for specific meaning.


The basic structure of this program is:

1. Read the traning file and extract the frequency of each word tagged in that tag.
	
- (eg. 'CC': 'Apple': 15) this means that Apple is tagged 15 times as CC.
	
2. Create a hashtable to record the word frequency from previous extraction.

3. Calculate proability of the word within that tag and store that in the hash-table.
	
- (eg. 'CC':'Apple':0.5 if total count of CC is 30)
	
4. Again, read the training file but this time count the frequency of each state occurs after a specific state
	
- (eg. 'DT': 'CC': 1000) This means that the frequency of DT followed by CC is 1000
	
5. Do the same process as above, calculate the probability and put that into a hash-table.

   Step 1-5 are done within the functions:

```bash
    ├── countPOS
    ├── countState
    └── calculateProbability
```

6. Now the traning stage calculation is finished and we are ready to use it to tag the corpus.

7. To tag the sentence, we implement Viterbi Algorithm, but the basic logic is:

	- first we want to look up for the probability that the word exists in different state. (word observation probability)
	- second we want to find the probability of that state follow by the previous state (transition probability)
	- calculate the observation probability and transition probability.
	- choose the highest probability path until that state.
	- do the process recursively until we reach the end of sentence. (the process is tagged word by word)
	- calculate the score for the path, and choose the highest scoring path as the tagging sequence for the sentence.

8. return the tagged sequence as a 2D-array.

   Step 6-8, including OOV handling, are done within the funcitons:

```bash
  ├── tagSequence
```

OOV Case Handling:

- Since the training file contains limited words, we may encounter OOV case.
- This program handles the OOV case by:
	- assume the likelihood probability as 1/1000 for all OOV items.
	- choose the highest previous state as the major criteria to tag the word.
	- for example, if the previous state is DT, and we find CC has the highest probability followed by the DT, we will 	     choose CC as the tag for that word.

