const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config({ path: 'env.env' });

const app = express();
const movieRoutes = require('./routes/movies');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch(err => {
        console.log('Failed to connect to MongoDB', err);
    });

// Middleware
app.use(express.json());

// Middleware to protect routes
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).send('Access Denied');

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || '234567890');
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
};

// Register Route
app.post('/register', async (req, res) => {
    console.log("HELLo")
    const { username, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        // Hash password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create and save user
        const user = new User({ username, password: hashedPassword });
        await user.save();

        res.status(201).send('User registered successfully');
    } catch (err) {
        console.log(err);
        res.status(500).send('Error registering user');
    }
});

// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find user in database
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).send('Username or password is incorrect');
        }

        // Validate password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).send('Invalid password');
        }

        // Generate JWT token
        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || '234567890', { expiresIn: '1h' });

        res.status(200).json({ token });
    } catch (err) {
        console.log(err);
        res.status(500).send('Error logging in');
    }
});

// Protect /api/movies routes with JWT authentication
app.use('/api/movies', authenticateJWT, movieRoutes);



// Start server
const PORT =  3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
