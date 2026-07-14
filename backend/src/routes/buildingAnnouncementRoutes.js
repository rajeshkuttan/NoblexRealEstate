'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/buildingAnnouncementController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authMiddleware);
router.use(resolveCompanyContext);

router.get('/property-options', ctrl.listPropertyOptions);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/send', ctrl.send);

module.exports = router;
