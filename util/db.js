const mysql = require("mysql"); // Importiert das Modul für mysql
require('dotenv').config();


async function query(query, params = null){
	return new Promise( async (resolve, _) => {


	var conn = mysql.createConnection({
		host: process.env.DB_HOST || "localhost",
		user: process.env.DB_USER || "root",
		password: process.env.DB_PASSWORD || "password",
		database: process.env.DB_DATABASE || "cats",
	});
	// console.log(query)

	conn.connect(function(err) {
		if(err){
		}
		else{
		  conn.query(query, params,  // Führt die Query aus
		  function (err, result) {
			if(err){
			conn.end()
			  console.log(`Error executing the query - ${err}`)
			}else{
				conn.end()
				return resolve(result);
		  }})
		}
	})
	}).catch(err => {
		return JSON.stringify({"error": err}) // Gibt Fehler zurück
	})
}


module.exports = {query} // Exportiert die Funktion query 