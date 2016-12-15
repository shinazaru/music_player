var youtubeStream = require('youtube-audio-stream');
var ffmpeg = require('fluent-ffmpeg');
var download = require('download-file')
var request = require('request');
// var Player = require('player');

var player = require('play-sound')(opts = {});


var song_que = [];


module.exports = {
	sent: function(req, res) {
		var request_body = req.body;
		var utb_id = request_body.utb_id || '';

		var load_url = 'http://localhost:1337/song_request/load_mp3?utb_id='+utb_id
		if (song_que.length < 1) {
			song_que.push(load_url);
			request('http://localhost:1337/song_request/play');
		} else {
			song_que.push(load_url);
		}
		res.status(201).send(song_que);
	},

	play: function(req, res){
		var utb_id = song_que[0];
		var options = { directory: "./sound/", filename: "play.mp3" }
		var load_url = utb_id
		// var player = new Player('./sound/play.mp3');

		download(load_url, options, function(err){
		    if (err) throw err
		    console.log("downloaded");
				res.status(201).send(song_que)

				player.play('./sound/play.mp3', function(err){
  				if (err) throw err
					if(song_que.length < 1){
						console.log('playend!');
					} else {
						console.log('play end!', song_que.shift());
						console.log('play next!', song_que[0]);
						request('http://localhost:1337/song_request/play');
					}
				})

				// player.play();//function(err, player_obj){
					// player.stop();
					// console.log(err);
					// console.log(player_obj);
					// if(song_que.length < 1){
					// 	console.log('playend!');
					// } else {
						// player.player_obj();
					// 	console.log('play next!', song_que.shift());
					// 	request('http://localhost:1337/song_request/play');
					// }
				// });
		});

	},

	load_mp3: function(req, res){
		var utb_id = req.param('utb_id') || ''
		var url = utb_id;

		console.log(url);
		try {
			youtubeStream(url).pipe(res);
		} catch (exception) {
			res.status(500).send(exception)
		}
	}
};
