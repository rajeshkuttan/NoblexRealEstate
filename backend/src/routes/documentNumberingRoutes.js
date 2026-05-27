const express = require('express');
const router = express.Router();
const controller = require('../controllers/documentNumberingController');
const { authenticateToken } = require('../middleware/auth');

const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
router.use(authenticateToken);
router.use(resolveCompanyContext);

router.get('/', controller.getAll);
router.post('/', controller.create);
router.post('/generate', controller.generateNumber);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

module.exports = router;
