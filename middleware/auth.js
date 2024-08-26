const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const movie = require('../models/movie');

// Load environment variables
dotenv.config();

const authJWT = (req, res, next) => {
    // Extract the token from the Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).send('Access Denied');

    // Split the header to get the token
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).send('Access Denied');

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || '234567890');
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
};

module.exports = authJWT;
