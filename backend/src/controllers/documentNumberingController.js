const { DocumentNumbering, sequelize } = require('../models');
const documentNumberingService = require('../services/documentNumberingService');

exports.getAll = async (req, res) => {
  try {
    const records = await DocumentNumbering.findAll();
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Error fetching document numbering:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const record = await DocumentNumbering.create(req.body);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error('Error creating document numbering:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await DocumentNumbering.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    await record.update(req.body);
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('Error updating document numbering:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.delete = async (req, res) => {
  try {
    const record = await DocumentNumbering.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    // Deactivate instead of delete
    await record.update({ isActive: false });
    res.json({ success: true, message: 'Deactivated successfully' });
  } catch (error) {
    console.error('Error deleting document numbering:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.generateNumber = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { documentName } = req.body;
    
    // Attempt generation through the unified service wrapper
    const generatedNumber = await documentNumberingService.generateDocumentNumber(documentName, t);
    
    // Even if no configuration exists, we return 404 cleanly since this is a strict generate endpoint
    if (!generatedNumber) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Configuration not found for this document' });
    }

    await t.commit();

    res.json({
      success: true,
      data: {
        number: generatedNumber
      }
    });

  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Error generating document number via explicit API:', error);
    res.status(400).json({ success: false, message: error.message || 'Server error' });
  }
};
