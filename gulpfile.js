var gulp	= require('gulp');
var gutil	= require('gulp-util');
var open	= require('gulp-open');
var sys		= require('sys');
var exec	= require('child_process').exec;
var serveIndex = require('serve-index');

// =============================================================================

var EXPRESS_PORT = 8080;
var EXPRESS_ROOT = __dirname;
var LIVERELOAD_PORT = 35729;
var APP_ROOT = '.';
var lr_files = [
	APP_ROOT + '/**/*.html',
	APP_ROOT + '/**/*.js',
	APP_ROOT + '/**/*.css',
];

function shellCmd(error, stdout, stderr) { sys.puts(stdout); }

/**
 * Gulp tasks
 */

gulp.task('default', ['server', 'open', 'watch'], function() {});

gulp.task('open', function() {
	var options = {
		url: 'http://localhost:' + EXPRESS_PORT,
		app: 'firefox'
	};
	gulp.src('gulpfile.js').pipe(open('', options));
});

gulp.task('server', function() {
	var express = require('express');
	var app = express();
	app.use(require('connect-livereload')({
    	port: LIVERELOAD_PORT
  	}));
  	// TODO inspect how to list files from directories
  	app.use(serveIndex(__dirname + '/' + APP_ROOT, {'icons': true}));
	app.use(express.static(__dirname + '/' + APP_ROOT));
	app.listen(EXPRESS_PORT);
});

gulp.task('livereload', function() {
	lr = require('tiny-lr')();
	lr.listen(LIVERELOAD_PORT);
});

gulp.task('watch', ['livereload'], function() {
	gulp.watch(lr_files, notifyLivereload);
	gulp.watch("./dev/css/**/*.css", ['css']);
});


/**
 * Concat CSS
 */

var concat = require('gulp-concat');

gulp.task('css', function() {
	var files = "./dev/css/**/*.css";
	gulp.src(files)
		.pipe(concat('overlay.css'))
		.pipe(gulp.dest(APP_ROOT + '/data'));
	console.log('Concat CSS');
});


/**
 * Functions
 */
function notifyLivereload(event) {
	var fileName = require('path').relative(EXPRESS_ROOT, event.path);
	lr.changed({
		body: {
			files: [fileName]
		}
	});
	gutil.log('file changed:', gutil.colors.cyan(fileName));
}
