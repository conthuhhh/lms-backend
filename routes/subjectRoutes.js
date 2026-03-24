const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { csrfMiddleware } = require('../middleware/csrfMiddleware');

router.get('/', authMiddleware, subjectController.getAll);
router.get('/:id', authMiddleware, subjectController.getById);

router.post('/', authMiddleware, adminMiddleware, csrfMiddleware, subjectController.create);
router.put('/:id', authMiddleware, adminMiddleware, csrfMiddleware, subjectController.update);
router.delete('/:id', authMiddleware, adminMiddleware, csrfMiddleware, subjectController.delete);

module.exports = router;
