var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // Set your MySQL root password
    });

    // Create the database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    // Now connect to the created database
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

// CREATING TABLES //

    // Create a Users table if it doesn't exist
    await db.execute(`CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('owner', 'walker') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create Dogs table
    await db.execute(`CREATE TABLE IF NOT EXISTS Dogs (
    dog_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    size ENUM('small', 'medium', 'large') NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES Users(user_id)
    )`);

    // Create WalkRequests table
    await db.execute(`CREATE TABLE IF NOT EXISTS WalkRequests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    dog_id INT NOT NULL,
    requested_time DATETIME NOT NULL,
    duration_minutes INT NOT NULL,
    location VARCHAR(255) NOT NULL,
    status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
    )`);

    // Create WalkApplications table
    await db.execute(`CREATE TABLE IF NOT EXISTS WalkApplications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    walker_id INT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
    FOREIGN KEY (walker_id) REFERENCES Users(user_id),
    CONSTRAINT unique_application UNIQUE (request_id, walker_id)
    )`);

    // Create WalkRatings table
    await db.execute(`CREATE TABLE IF NOT EXISTS WalkRatings (
    rating_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    walker_id INT NOT NULL,
    owner_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
    FOREIGN KEY (walker_id) REFERENCES Users(user_id),
    FOREIGN KEY (owner_id) REFERENCES Users(user_id),
    CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
    )`);

// INSERTING DATA //

    // Insert data if Users table is empty
    const [users_rows] = await db.execute('SELECT COUNT(*) AS count FROM Users');
    if (users_rows[0].count === 0) {
      await db.execute(`
        INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('francene123', 'francene@example.com', 'hashed009', 'owner'),
        ('paulwalker', 'paul@example.com', 'hashed007', 'walker')
        `);
      }

// Insert data if Dogs table is empty
    const [dogs_rows] = await db.execute('SELECT COUNT(*) AS count FROM Dogs');
    if (dogs_rows[0].count === 0) {
      await db.execute(`
INSERT INTO Dogs (owner_id, name, size)
SELECT user_id, 'Max', 'medium'
FROM Users
WHERE user_id = (SELECT user_id FROM Users
WHERE username = 'alice123')`);

await db.execute(`
    INSERT INTO Dogs (owner_id, name, size)
    SELECT user_id, 'Bella', 'small'
    FROM Users
    WHERE user_id = (SELECT user_id FROM Users
    WHERE username = 'carol123')`);

await db.execute(`
INSERT INTO Dogs (owner_id, name, size)
SELECT user_id, 'Pickles', 'small'
FROM Users
WHERE user_id = (SELECT user_id FROM Users WHERE username = 'carol123')`);

await db.execute(`
INSERT INTO Dogs (owner_id, name, size)
SELECT user_id, 'Muffin', 'medium'
FROM Users
WHERE user_id = (SELECT user_id FROM Users
WHERE username = 'francene123')`);

await db.execute(`
INSERT INTO Dogs (owner_id, name, size)
SELECT user_id, 'Borris', 3
FROM Users WHERE user_id = (SELECT user_id FROM Users WHERE username = 'francene123')`);
      }

// Insert data if WalkRequests table is empty
    const [WR_rows] = await db.execute('SELECT COUNT(*) AS count FROM WalkRequests');
    if (WR_rows[0].count === 0) {
      await db.execute(`
INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
SELECT dog_id, '2025-06-10 08:00:00', 30, 'Parklands', 1 FROM Dogs
WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Max')`);

await db.execute(`
INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
SELECT dog_id, '2025-06-10 09:30:00', 45, 'Beachside Ave', 3
FROM Dogs WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Bella')`);

 await db.execute(`
INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
SELECT dog_id, '2025-06-10 10:30:00', 60, 'Springfield', 3 FROM Dogs
WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Borris')
`);

await db.execute(`
INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
SELECT dog_id, '2025-06-13 10:30:00', 30, 'Marion', 4 FROM Dogs
WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Muffin')`);

await db.execute(`
INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
SELECT dog_id, '2025-06-18 10:45:00', 20, 'Rapid Bay', 1 FROM Dogs
WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Pickles')
`);
      }

// Insert data if WalkApplications table is empty
    const [WA_rows] = await db.execute('SELECT COUNT(*) AS count FROM WalkApplications');
    if (WA_rows[0].count === 0) {
      await db.execute(`
        INSERT INTO WalkApplications (request_id, walker_id, status) VALUES
        (1, 2, 2),
        (2, 2, 2),
        (3, 5, 2),
        (4, 5, 2)
        `);
      }

// Insert data if WalkRatings table is empty
    const [ratings_rows] = await db.execute('SELECT COUNT(*) AS count FROM WalkRatings');
    if (ratings_rows[0].count === 0) {
      await db.execute(`
        INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
        (1, 2, 1, 4, "Max loved his walk thank you"),
        (2, 2, 3, 5, "Bella can't wait for new week"),
        (3, 5, 4, 3, "Borris doesn't like walking so 3 is the best you'll get"),
        (4, 5, 4, 1, "Muffin hates you, don't come back")
        `);
    }
  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

// Route to return dogs name, size and owner username as JSON
app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await db.execute(`SELECT d.name AS dog_name, d.size, o.username AS owner_username FROM Dogs d INNER JOIN Users o ON o.user_id = d.owner_id`);
    res.json(dogs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Dogs' });
  }
});

// Return all open walk requests, incl dog name, requested time, location & owner username as JSON
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [openRequests] = await db.execute(`
        SELECT r.request_id,
        d.name AS dog_name,
        r.requested_time,
        r.duration_minutes,
        r.location,
        o.username AS owner_username
        FROM WalkRequests r
        JOIN Dogs d ON r.dog_id = d.dog_id
        JOIN Users o ON d.owner_id = o.user_id
        WHERE r.status = 'open'
        `);
    res.json(openRequests);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Open Walk Requests' });
  }
});

// Return summary of each walker with their average rating and number of completed walks
// edited so that only ratings for completed walks show, in case there is other ratings data
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [walkers] = await db.execute(`
        SELECT o.username AS walker_username,
        (SELECT COUNT(rating)
        FROM WalkRatings w
        JOIN WalkRequests r ON w.request_id = r.request_id
        WHERE w.walker_id = o.user_id AND r.status = 'completed') AS total_ratings,
        (SELECT ROUND(AVG(rating),2)
        FROM WalkRatings w
        JOIN WalkRequests r ON w.request_id = r.request_id
        WHERE w.walker_id = o.user_id AND r.status = 'completed') AS average_rating,
        (SELECT COUNT(status)
        FROM WalkRequests r
        JOIN WalkRatings w ON r.request_id = w.request_id
        WHERE w.walker_id = o.user_id AND r.status = 'completed') AS completed_walks
        FROM Users o
        WHERE o.role = 'walker'
        `);
    res.json(walkers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Open Walk Requests' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
