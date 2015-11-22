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
		return ((item.length>=3) && (item.indexOf("'")<0)
			&& (item.substr(0,1).toLocaleLowerCase()==item.substr(0,1)));
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

function binarySearch(list, item) {
    var min = 0;
    var max = list.length - 1;
    var guess;

    while (min <= max) {
        guess = Math.floor((min + max) / 2);

        if (list[guess] === item) {
            return guess;
        }
        else {
            if (list[guess] < item) {
                min = guess + 1;
            }
            else {
                max = guess - 1;
            }
        }
    }

    return -1;
}

var limit =  Number.MAX_SAFE_INTEGER;

if (process.argv.length>2) {

	if (process.argv.length>3) {
		limit = parseInt(process.argv[3],10);
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

	console.log('Removing plurals and lowercasing');
	nounInflector = new natural.NounInflector();
	var orig = '';
	var singular = '';
	for (var i=0;i<input.length;i++) {
		orig = input[i];
		singular = nounInflector.singularize(orig);
		//check each singular is actually a valid word in the original list
		if (binarySearch(input,singular)>=0) {
			input[i]=singular;
		}
		input[i] = input[i].toLocaleLowerCase();
	}
	console.log('Removing duplicates...');
	input = uniq(input);
	console.log('Sorting...');
	input.sort();
	console.log('After singularising and removing duplicates: '+input.length);

	var parsed = [];

	//http://stackoverflow.com/questions/10554052/what-are-the-major-differences-and-benefits-of-porter-and-lancaster-stemming-alg
	//var stemmer = natural.LancasterStemmer;
	var stemmer = natural.PorterStemmer;

	var stem = [];
	input.forEach(function(entry){
		stem.push(stemmer.stem(entry));
	});

	var result = '';
	input.forEach(function(entry,index) {
		result = stemmer.stem(entry);
		if (binarySearch(stem,result) == index) { //check is first usage of this stem
			parsed.push(entry);
		}
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
	var result = [];
	var metastr = '';
	var oldmeta = '*';
	var i = 0;

	console.log('Removing homophones..');
	parsed.forEach(function(entry,index) {
		result = metaphone.process(entry).sort();
	    metastr = result[0]+'+'+result[1];
		if (metastr!=oldmeta) {
			i=0;
			while ((meta[i]!=metastr) && (i<=index)) i++;
		}
		else {
			oldmeta=metastr;
		}
		if (i==index) { //check we are the first use of this phonetic string
			output.push(entry);
		}
	});
	console.log('After metaphoning to remove homophones: '+output.length);
	parsed = [];

	output.sort(function(a,b){
		return (cmp(a.length,b.length) || cmp(a,b));
	});

	// after this point binarySearch won't work

	var maxlen = 0;
	var top = 0;
	while (top<output.length) {
		if (top<=limit) maxlen = output[top].length;
		if (output[top].length>maxlen) {
			//console.log('Stopping at '+top);
			break;
		}
		else {
			top++;
		}
	}
	console.log('Words of length '+maxlen+' end at '+top);

	nth = 1;
	skip = 1;
	if (output.length<limit) {
		console.log('Not enough words in dictionary to meet requirement');
	}
	if (output.length>=top) {
		nth = limit/top;
		skip = (1.0/nth);
		console.log('Outputting every '+skip+' word, using '+nth);
	}

	var total = 0.0;
	var count = 0;
	filename = './dict/words'+limit;
	ws = fs.createWriteStream(filename);
	ws.once('open', function(fd) {
		for (var i=0;i<Math.min(output.length,top);i++) {
			total+=nth;
			//console.log(total+' at '+i)
			if ((Math.floor(total)>=count) && (count<limit)) {
				ws.write(output[i]+'\n');
				count++;
			}
		}
		ws.end();
		console.log('Requires max word length of '+maxlen);
	});
}
else {
	console.log('Usage: '+process.argv[1]+' infile [outfile]');
}