var gulp	= require('gulp');
var gutil	= require('gulp-util');
var open	= require('gulp-open');
var watch	= require('gulp-watch');
var concat	= require('gulp-concat');
var plumber = require('gulp-plumber');
var gcallback = require('gulp-callback');

var sys		= require('sys');
var exec	= require('child_process').exec;
var express = require('express');
var tiny_lr	= require('tiny-lr')();
var serve_index 		= require('serve-index');
var connect_livereload	= require('connect-livereload');

// ----------------------------------------------------------------------------
// Config

var EXPRESS_PORT = 8080;
var EXPRESS_ROOT = __dirname;
var LIVERELOAD_PORT = 35729;
var APP_ROOT = '.';
var lr_files = [
	APP_ROOT + '/**/*.html',
	APP_ROOT + '/**/*.js',
	APP_ROOT + '/**/*.css',
	'!' + APP_ROOT + '/node_modules/**/*.*',
	'!' + APP_ROOT + '/bootstrap.js',
	'!' + APP_ROOT + '/gulpfile.js',
];

function shellCmd(error, stdout, stderr) { sys.puts(stdout); }

var io;
var clients = 0;
function broadcast()
{
	console.log('Trigger Firefox Addon CSS Update!');
	io.sockets.emit('update');
}

// ----------------------------------------------------------------------------
// Gulp tasks

gulp.task('default', ['server', 'socket-io', 'open', 'watch'], function() {});

gulp.task('socket-io', function() {
	var app = require('express')();
	var server = require('http').Server(app);
	io = require('socket.io')(server);
	
	server.listen(8888);
	
	app.use(express.static(__dirname + '/data/socket.io'));	
	app.get('/', function (req, res) {
		res.sendFile(__dirname + '/index.html');
	});

	io.on('connection', function (socket) {
		
		console.log('connected', socket.id);

		socket.on('request', function (data) {
			socket.emit('update');
		});

	});
});

gulp.task('server', function() {
	var app = express();

	app.use(connect_livereload({
		port: LIVERELOAD_PORT
  	}));
  	// TODO inspect how to list files from directories
  	app.use(serve_index(__dirname + '/' + APP_ROOT, {'icons': true}));
	app.use(express.static(__dirname + '/' + APP_ROOT));
	app.listen(EXPRESS_PORT);
});

gulp.task('open', function() {
	var options = {
		url: 'http://localhost:' + EXPRESS_PORT,
		app: 'firefox'
	};
	gulp.src(__filename).pipe(open('', options));
});

// ----------------------------------------------------------------------------
// Concat CSS

gulp.task('css', function(event) {
	var stream = gulp.src('dev/css/**/*.css')
		.pipe(plumber())
		.pipe(concat('overlay.css'))
		.pipe(gulp.dest(APP_ROOT + '/data'));
	return stream;
});

// ----------------------------------------------------------------------------
// Watch + LiveReload
 
gulp.task('watch', ['livereload'], function() {
	//watch(lr_files, notifyLivereload);
	watch('./dev/css/**/*.css', function(events, done) {
		gulp.start('css', function() {
			broadcast();
		});
	});
});

gulp.task('livereload', function() {
	tiny_lr.listen(LIVERELOAD_PORT);
});

function notifyLivereload(event) {
	var fileName = require('path').relative(EXPRESS_ROOT, event.path);
	tiny_lr.changed({
		body: {
			files: [fileName]
		}
	});
	gutil.log('[' + event.event + '] :', gutil.colors.cyan(fileName));
}
