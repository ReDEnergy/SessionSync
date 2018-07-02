var v = [];

function pp(val) {
	var x = {
		value: 'asd' + val,
		label: String.fromCharCode(val),
	};
	v.push(x);
}

for (let i = 0; i < 26; i++) {
	pp(97 + i);
}

for (let i = 0; i <= 9; i++) {
	pp(48 + i);
}

console.log(JSON.stringify(v));