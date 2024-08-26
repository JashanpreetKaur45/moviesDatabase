const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const { body, param, validationResult } = require('express-validator');
const Movie = require('../models/movie');
const authJWT = require('../middleware/auth'); // Import the authentication middleware

// Ensure the uploads folder exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 }, // Limit file size to 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Apply authenticateJWT middleware to all movie routes
router.use(authJWT);

// Get all movies
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    try {
        const movies = await Movie.find().limit(limit).skip(startIndex);
        const totalMovies = await Movie.countDocuments();

        res.json({
            page,
            limit,
            totalPages: Math.ceil(totalMovies / limit),
            totalMovies,
            movies,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new movie
router.post('/', upload.single('poster'),
    [
        body('title').isString().notEmpty().withMessage('Title is required and should be a string'),
        body('publishingYear').isInt({ min: 1900 }).withMessage('Publishing year must be a valid year'),
        body('poster').optional().custom((value, { req }) => {
            if (!req.file) {
                throw new Error('Poster is required');
            }
            return true;
        }),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const movie = new Movie({
            title: req.body.title,
            publishingYear: req.body.publishingYear,
            poster: req.file ? req.file.path : null,
        });

        movie.save()
            .then(newMovie => res.status(201).json(newMovie))
            .catch(err => res.status(400).json({ message: err.message }));
    }
);

// Edit a movie
router.patch('/:id', upload.single('poster'),
    [
        param('id').isMongoId().withMessage('Invalid movie ID'),
        body('title').optional().isString().notEmpty().withMessage('Title should be a string'),
        body('publishingYear').optional().isInt({ min: 1900 }).withMessage('Publishing year must be a valid year'),
        body('poster').optional().custom((value, { req }) => {
            if (req.file && !req.file.mimetype.startsWith('image/')) {
                throw new Error('Only image files are allowed');
            }
            return true;
        }),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        let updatedData = {
            title: req.body.title,
            publishingYear: req.body.publishingYear,
        };

        if (req.file) {
            updatedData.poster = req.file.path;
        }

        try {
            const updatedMovie = await Movie.findByIdAndUpdate(req.params.id, updatedData, { new: true });
            if (!updatedMovie) {
                return res.status(404).json({ message: 'Movie not found' });
            }
            res.json(updatedMovie);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
);

module.exports = router;
