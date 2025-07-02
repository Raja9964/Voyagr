const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const path = require('path');

const app = express();
const port = 3111; // Ensure the port is not in use

// Middleware for parsing JSON
app.use(bodyParser.json());

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'changeme',
    database: 'travel'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        throw err;
    }
    console.log('MySQL Connected...');
});

// Serve the index.html file at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Endpoint to register a new user
app.post('/users', (req, res) => {
    const { name, contact_number, email, address, age } = req.body;
    const insertQuery = `
        INSERT INTO Users (name, contact_number, email, address, age)
        VALUES (?, ?, ?, ?, ?)
    `;
    db.query(insertQuery, [name, contact_number, email, address, age], (err, result) => {
        if (err) {
            console.error('Error registering user:', err);
            return res.status(500).send('Error registering user');
        }
        console.log('User registered successfully');
        res.status(201).send('User registered successfully');
    });
});


// Endpoint to make a reservation
app.post('/reservations', (req, res) => {
    const { name, transportType, transportId, reservationDate } = req.body;
    const insertQuery = `
        INSERT INTO Reservation (user_id, transport_type, transport_id, reservation_date)
        VALUES (?, ?, ?, ?)
    `;
    db.query(insertQuery, [name, transportType, transportId, reservationDate], (err, result) => {
        if (err) {
            console.error('Error making reservation:', err);
            return res.status(500).send('Error making reservation');
        }
        console.log('Reservation made successfully');
        res.status(201).send('Reservation made successfully');
    });
});

// Endpoint to cancel a reservation
app.delete('/reservations/:reservationId', (req, res) => {
    const reservationId = req.params.reservationId;

    const deleteQuery = `
        DELETE FROM Reservation
        WHERE reservation_id = ?
    `;
    db.query(deleteQuery, [reservationId], (err, result) => {
        if (err) {
            console.error('Error canceling reservation:', err);
            return res.status(500).send('Error canceling reservation');
        }
        console.log('Reservation canceled successfully');
        res.status(200).send('Reservation canceled successfully');
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
