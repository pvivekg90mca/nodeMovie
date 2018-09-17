const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql');
const request = require('request');
 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
 
// connection configurations
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'nodejs'
});
 
// connect to database
conn.connect();
 
// Retrieve all movies from local database
app.get('/movies', function (req, res) {
    conn.query('SELECT * FROM Movie', function (error, results, fields) {
        console.log("All");
		if (error) throw error;
        return res.send({ error: false, data: results, message: 'Movie list.' });
    });
});
 
// Retrieve Movie by ID 
// If the record found in local database, retrieve it
// If the record not found in local database, call the OMDB API, store the data in local database and send data to response
app.get('/movies/:id', function (req, res) {
 
    var movieId = req.params.id;
	var qry = 'SELECT * FROM Movie where imdb_id = ?';
			 
    conn.query(qry, movieId, function (error, results, fields) {
        console.log("With ID");
		if (error) throw error;
        console.log("Total rows found: " + results.length)
	
		if(results.length > 0) { // Movie found in local database
			return res.send({ error: false, data: results, message: 'Movie with id.' });	
		}
		else { // Movie not found in local database
			request.get({
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				},
				url: "http://www.omdbapi.com/?i="+ movieId +"&apikey=de92e0da"
			}, function(error, response, body) { 
				if (!error && response.statusCode == 200) {
					var parsedBody = JSON.parse(body);
					
					console.log("Title : " + parsedBody.Title);
					console.log("Year : " + parsedBody.Year);
					console.log("Released : " + parsedBody.Released);
					console.log("Genre : " + parsedBody.Genre);		
					console.log("imdbID : " + parsedBody.imdbID);
					
					var releasedYear = parsedBody.Released.substr(parsedBody.Released.length - 4)
					
					var insertData = [
						[parsedBody.imdbID, parsedBody.Title, releasedYear, 4, parsedBody.Genre]
					];
					
					var sqlInsert = "INSERT INTO Movie (imdb_id, title, released_year, rating, genres) VALUES ?";
					conn.query(sqlInsert, [insertData], function(error, result, fields) {
						if (error) throw error;

						console.log("Number of rows affected : " + result.affectedRows);
					});
					
					return res.send({ error: false, data: response, message: 'Movie with id from 3rd party API.' });						
				} 
            });	
		}		
    }); 
});

// Retrieve Movie by Title 
// If the record found in local database, retrieve it
// If the record not found in local database, call the OMDB API, store the data in local database and send data to response
app.get('/movies/title/:title', function (req, res) {
 
    var movieTitle = req.params.title;
	var qry = 'SELECT * FROM Movie where title = ?';
			 
    conn.query(qry, movieTitle, function (error, results, fields) {
        if (error) throw error;
        console.log("Total rows found: " + results.length)
	
		if(results.length > 0) { // Movie found in local database
			return res.send({ error: false, data: results, message: 'Movie with Title.' });	
		}
		else { // Movie not found in local database
			request.get({
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				},
				url: "http://www.omdbapi.com/?t="+ movieTitle +"&apikey=de92e0da"
			}, function(error, response, body) { 
				if (!error && response.statusCode == 200) {
					var parsedBody = JSON.parse(body);
					
					console.log("Title : " + parsedBody.Title);
					console.log("Year : " + parsedBody.Year);
					console.log("Released : " + parsedBody.Released);
					console.log("Genre : " + parsedBody.Genre);		
					console.log("imdbID : " + parsedBody.imdbID);
					var releasedYear;
					if("N/A" != parsedBody.Released) {
						releasedYear = parsedBody.Released.substr(parsedBody.Released.length - 4);
					} else {
						releasedYear = parsedBody.Year;
					}
					
					var insertData = [
						[parsedBody.imdbID, parsedBody.Title, releasedYear, 4, parsedBody.Genre]
					];
					
					var sqlInsert = "INSERT INTO Movie (imdb_id, title, released_year, rating, genres) VALUES ?";
					conn.query(sqlInsert, [insertData], function(error, result, fields) {
						if (error) throw error;

						console.log("Number of rows affected : " + result.affectedRows);
					});
					
					return res.send({ error: false, data: response, message: 'Movie with Title from 3rd party API.' });						
				} 
            }); 	
		}	
    });
});

// Retrieve a Movie with released year 
app.get('/movies/year/:year', function (req, res) {
 
    var year = req.params.year;
	var years;
	var qryYear = 'SELECT * FROM Movie where released_year = ?';
	var qryYearRange = 'SELECT * FROM Movie where released_year >=? AND released_year <= ?';
	
	if(year.indexOf('-') > -1) {
		console.log('Year range');
		years = year.split('-');
		console.log(years);	
		conn.query(qryYearRange, [years[0],years[1]], function (error, results, fields) {
			if (error) throw error;
			return res.send({ error: false, data: results, message: 'Movies with released years range.' });
		});
	} else {
		console.log('Single year');
		conn.query(qryYear, year, function (error, results, fields) {
			if (error) throw error;
			return res.send({ error: false, data: results, message: 'Movies with released year.' });
		});
	}
});

// Retrieve a Movie with ratings 
// rating = 1-5
// range = h:higher, l:lower
app.get('/movies/ratings/:rating/:range', function (req, res) {
 
    var rating = req.params.rating;
	var range = req.params.range;
	var qryRatingLower = 'SELECT * FROM Movie where rating <= ?';
	var qryRatingHigher = 'SELECT * FROM Movie where rating >= ?';
	
	if(range == 'l') {
		console.log('Lower range');	
		conn.query(qryRatingLower, rating, function (error, results, fields) {
			if (error) throw error;
			return res.send({ error: false, data: results, message: 'Movies by Lower ratings.' });
		});
	} else if(range == 'h'){
		console.log('Higher range');
		conn.query(qryRatingHigher, rating, function (error, results, fields) {
			if (error) throw error;
			return res.send({ error: false, data: results, message: 'Movies by Higher ratings.' });
		});
	}
});

// Retrieve a Movie with genres 
app.get('/movies/genres/:genre', function (req, res) {
 
    var genre = req.params.genre;
	var qryGenre = "SELECT * FROM Movie where genres like '%"+ genre +"%'";
	
	console.log(genre);	
	conn.query(qryGenre, function (error, results, fields) {
		if (error) throw error;
		return res.send({ error: false, data: results, message: 'Movies by Genres.' });
	});
});

// Update ratings
app.put('/movies/update/ratings/:id/:rating', function (req, res) {
 
    var imdbId = req.params.id;
	var rating = req.params.rating;
	var qryUpdateRating = "UPDATE Movie SET rating = "+ rating +" where imdb_id = '"+ imdbId +"'";
	
	conn.query(qryUpdateRating, function (error, result, fields) {
		if (error) throw error;
		console.log("Number of rows affected : " + result.affectedRows);
		return res.send({ error: false, data: result, message: 'Rating updated' });
	});
});

// Update genres
app.put('/movies/update/genres/:id/:genre', function (req, res) {
 
    var imdbId = req.params.id;
	var genre = req.params.genre;
	var qryUpdateGenre = "UPDATE Movie SET genres = '"+ genre +"' where imdb_id = '"+ imdbId +"'";
	
	conn.query(qryUpdateGenre, function (error, result, fields) {
		if (error) throw error;
		console.log("Number of rows affected : " + result.affectedRows);
		return res.send({ error: false, data: result, message: 'Genre updated' });
	});
});

app.listen(8080, function () {
    console.log('Node app is running on port 8080');
});
 
module.exports = app;