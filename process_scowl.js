var natural = require('natural');
var fs = require('fs');

function uniq(a) {
    var seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

function tidy(a) {
	return a.filter(function(item) {
		return ((item.length>=3) && (item.indexOf("'")<0));
		// && (item.substr(0,1).toLocaleLowerCase==item.substr(0,1)));
	});
}

function cmp(a, b) {
    if (a > b) return +1;
    if (a < b) return -1;
    return 0;
}

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

var limit =  Number.MAX_SAFE_INTEGER;

if (process.argv.length>2) {

	if (process.argv.length>3) {
		limit = parseInt(process.argv[3],10);
		console.log(limit);
	}

	var infile = process.argv[2];
	console.log('Processing '+infile);
	var input = [];
	input = fs.readFileSync(infile,'utf8').split('\r\n');
	console.log('Words: '+input.length);

	input.sort();
	while (input[0]=='') { //remove (was)trailing blank line from input file
		input.remove(0,1);
	}

	input = tidy(input);
	console.log('After removing 1/2-letter words, proper nouns, possessives/contractions: '+input.length);

	nounInflector = new natural.NounInflector();
	for (var i=0;i<input.length;i++) {
		orig = input[i];
		singular = nounInflector.singularize(orig);
		locn = input.indexOf(singular);
		if (locn>=0) { //check each singular is actually a valid word in the original list
			input[i]=singular;
		}
		input[i] = input[i].toLocaleLowerCase();
		//if (input[i]!=orig) {
		//	console.log(orig+' > '+input[i]);
		//}
	}
	input = uniq(input);
	input.sort();
	console.log('After singularising and removing duplicates: '+input.length);

	var parsed = [];

	var stemmer = natural.PorterStemmer; //natural.LancasterStemmer;

	var stem = [];
	input.forEach(function(entry){
		stem.push(stemmer.stem(entry));
	});

	input.forEach(function(entry,index) {
		result = stemmer.stem(entry);
		//if (result!=entry) {
		//	console.log(result+' < '+entry)
		//}
		locn = stem.indexOf(result);
		if (locn == index) { //check is first usage of this stem
			parsed.push(entry);
		}
		//else {
		//	console.log('Omitting '+entry+' at '+index+' because '+result+' occurs at '+locn);
		//}
	});
	input = []; // no longer required
	console.log('After removing common stems: '+parsed.length);

	//-- check for homophones using a phonetic algorithm

	//var metaphone = natural.SoundEx;
	//var metaphone = natural.Metaphone;
	var metaphone = natural.DoubleMetaphone;

	var meta = [];
	parsed.forEach(function(entry){
		result = metaphone.process(entry).sort();
		//meta.push(result); //for SoundEx or Metaphone
		meta.push(result[0]+'+'+result[1]);
	});

	var output = [];
	parsed.forEach(function(entry,index) {
		result = metaphone.process(entry).sort();
		locn = meta.indexOf(result[0]+'+'+result[1]);
		if (locn==index) { //check we are the first use of this phonetic string
			output.push(entry);
		}
		//else {
		//	console.log(entry+' and '+parsed[locn]+' are homophones');
		//}
	});
	console.log('After metaphoning to remove homophones: '+output.length);

	output.sort(function(a,b){
		return (cmp(a.length,b.length) || cmp(a,b));
	});

	if (output.length<limit) {
		console.log('Not enough words in dictionary to meet requirement');
	}

	var maxlen = 0;
	filename = './dict/words'+limit;
	ws = fs.createWriteStream(filename);
	ws.once('open', function(fd) {
		for (var i=0;i<Math.min(output.length,limit);i++) {
			ws.write(output[i]+'\n');
			maxlen = output[i].length;
		}
		ws.end();
		console.log('Requires max word length of '+maxlen);
	});
}
else {
	console.log('Usage: '+process.argv[1]+' infile [outfile]');
}