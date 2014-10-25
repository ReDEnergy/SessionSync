/*
 * Pretty Print - JavaScript Object Log
 */

'use strict';

var PrettyPrint = (function() {

	var indent = [];
	var indent_format = '	';
	var recursive = false;

	var ecapsulate = function ecapsulate(val) {
		if (val && val.length !== undefined)
			return '\'' + val + '\'';
		return val;
	};

	var logStartObj = function logStartObj(Obj) {
		console.log(indent.join('') + ecapsulate(Obj) + ' : {');
		indent.push(indent_format);
	};

	var logEndObj = function logEndObj() {
		indent.pop();
		console.log(indent.join('') + '}');
	};

	var logKeyValue = function logKeyValue(key, value) {
		var keyValue = ecapsulate(key) + ' : ' + ecapsulate(value);
		console.log(indent.join('') + keyValue);
	};

	var log = function log(Obj) {
		if (indent.length > 5) {
			logEndObj();
			return;
		}

		if (indent.length === 0) {
			indent.push(indent_format);
			console.log('{');
		}

		for (var key in Obj) {
			if (Obj.hasOwnProperty(key) == true && typeof(Obj[key]) !== 'function' )  {
				if (typeof(Obj[key]) === 'object' && recursive) {
					logStartObj(key);
					log(Obj[key]);
				}
				else
					logKeyValue(key, Obj[key]);
			}
		}
		logEndObj();
	};

	var logR = function logRecursive(Obj) {
		recursive = true;
		log(Obj);
		recursive = false;
	};

	return {
		log : log,
		logR : logR
	};
})();


exports.log = PrettyPrint.log;
exports.logR = PrettyPrint.logR;



