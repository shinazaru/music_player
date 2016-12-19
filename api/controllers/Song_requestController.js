var youtubeStream = require('youtube-audio-stream');
var ffmpeg = require('fluent-ffmpeg');
var download = require('download-file')
var request = require('request');
var async_module = require('async');
const os = require('os');

// https://www.npmjs.com/package/regex
var Regex = require("regex");

// https://www.npmjs.com/package/youtube-info
var fetchVideoInfo = require('youtube-info');

// https://www.npmjs.com/package/google-tts-api
var googleTTS = require('google-tts-api');

var player = require('play-sound')(opts = {});

var song_que = [];

module.exports = {
	checklist: function(req, res){
		res.status(201).send(_.map(song_que, function(song){ return song.title+"|"+song.id }));
	},

	clear_list: function(req, res){
		song_que = []
		res.status(201).send(_.map(song_que, function(song){ return song.title+"|"+song.id }));
	},

	delete_song: function(req, res){
		var request_body = req.body;
		var utb_id = request_body.utb_id || '';
		song_que = _.without(song_que, _.findWhere(song_que, {id: utb_id}));
		res.status(201).send(_.map(song_que, function(song){ return song.title+"|"+song.id }));
	},

	sent: function(req, res) {
		var request_body = req.body;
		var utb_id = request_body.utb_id || '';
		var msg = request_body.msg || '';

		async_module.waterfall([
			get_utube_vdo_id = function(cbAsync) {

				var regex_full  = /(https|http):\/\/www\.youtube\.com\/watch\?v=(.*)/;
				var regex_short = /(https|http):\/\/youtu\.be\/(.*)/;

				var result_full = utb_id.match(regex_full);
				var result_short = utb_id.match(regex_short);

				if(result_full) { //if https://www.youtube
					cbAsync(null, result_full[2]);
				} else if(result_short) { //if http://youtu.be
					cbAsync(null, result_short[2]);
				} else {
					cbAsync(null, null);
				}
			},
			get_vdo_info = function(utube_id, cbAsync){
				if(utube_id) {
					fetchVideoInfo(utube_id, function (err, videoInfo) {
					  if (err) {
							cbAsync(null, null);
						} else {
							cbAsync(videoInfo, utube_id);
						}
					});
				} else {
					cbAsync(null, null);
				}
			}
		],asyncComplete = function(vde_info, utube_id){
			var song_detail_obj = {
				id: utube_id || '',
				url: vde_info.url || '',
				title: vde_info.title || '',
				msg: msg
			}

			if (song_que.length < 1) {
				song_que.push(song_detail_obj);
				request('http://localhost:1337/song_request/play');
			} else {
				song_que.push(song_detail_obj);
			}
			res.status(201).send(_.map(song_que, function(song){ return song.title+"|"+song.id }));
		});
	},

	play: function(req, res){
		var song_obj = song_que[0];
		var options = { directory: "./sound/", filename: "play.mp3" }
		var load_url = 'http://localhost:1337/song_request/load_mp3?utb_id=' + song_que[0].url;

		async_module.waterfall([
			download_msg = function(cbAsync){
				if (song_obj.msg === ''){
					cbAsync(null ,false);
				} else {
					console.log('speech', song_obj.msg);
					googleTTS(song_obj.msg, (song_obj.lacale || 'th'), 0.5)   // speed normal = 1 (default), slow = 0.24
						.then(function (url) {
						  console.log(url); // https://translate.google.com/translate_tts?...
							download(url, { directory: "./sound/", filename: "msg.mp3" }, function(err){
								cbAsync(null ,true);
							});
						})
						.catch(function (err) {
						  console.error(err.stack);
							cbAsync(null ,false);
						});
				}
			}, play_msg = function(have_msg_sound, cbAsync){
				if (have_msg_sound) {
					console.log('play_msg');
					if (os.platform !== 'linux'){
						player.play('./sound/msg.mp3', { afplay: ['-v', 3 ] }, function(err){
							cbAsync(null);
						});
					} else {
						player.play('./sound/msg.mp3', function(err){
							cbAsync(null);
						});
					}
				} else {
					cbAsync(null);
				}
			}
		],asyncComplete = function(data){
			console.log('download', song_que[0].title);
			download(load_url, options, function(err){
			    if (err) throw err
			    console.log("downloaded");
					res.status(201).send(_.map(song_que, function(song){ return song.title }))

					player.play('./sound/play.mp3', function(err){
						if (err) throw err
						if(song_que.length == 0){
							console.log('playend!');
						} else {
							console.log('play end!', song_que.shift());
							console.log('play next!', song_que[0]);
						request('http://localhost:1337/song_request/play');
						}
					})
			});
		});
	},

	load_mp3: function(req, res){
		var utb_id = req.param('utb_id') || ''
		var url = utb_id;

		try {
			youtubeStream(url).pipe(res);
		} catch (exception) {
			res.status(500).send(exception)
		}
	}
};
