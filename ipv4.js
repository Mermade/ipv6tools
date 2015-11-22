var fs = require('fs');
var crypto = require('crypto');

const sha1 = 'cc60d9312cfc12e28bf06917c6425e04745fc198';
const ERR_WYTAW = "Watchoo talkin' about Willis?";

var input = [];

function toAddress(phrase) {
	words = phrase.toLocaleLowerCase().split('.');
	if (words.length==4) {
		octets = '';
		for (var i=0;i<4;i++) {
			octets += (octets ? '.' : '') + input.indexOf(words[i]);
		}
		return octets;
	}
	else {
		return ERR_WYTAW;
	}
}

function toPhrase(address) {
	octets = address.split('.');
	if (octets.length==4) {
		phrase = '';
		for (var i=0;i<4;i++) {
			octet = parseInt(octets[i],10);
			phrase += (phrase ? '.' : '') + input[octet];
		}
		return phrase;
	}
	else {
		return ERR_WYTAW;
	}
}

if (process.argv.length>2) {
	instr = fs.readFileSync('./dict/words256','utf8');
	var shasum = crypto.createHash('sha1');
	shasum.update(instr);
	check = shasum.digest('hex');
	if (sha1 != check) {
		console.log('Your dictionary is corrupt: '+check);
	}
	else {
		input = instr.split('\n');
		if (input.length<256) {
			console.log('This should never happen');
		}
		else {
			parm = process.argv[2];
			if (parm == 'localhost') {
				console.log('127.0.0.1');
			}
			else if (parm == '127.0.0.1') {
				console.log('localhost');
			}
			else {
				if ('0123456789'.indexOf(parm[0])>=0) {
					console.log(toPhrase(parm));
				}
				else {
					console.log(toAddress(parm));
				}
			}
		}
	}
}
else {
	console.log('Usage: '+process.argv[1]+' addr|localhost|phrase');
}