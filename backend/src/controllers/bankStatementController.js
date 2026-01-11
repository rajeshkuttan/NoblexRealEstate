const { BankStatementImport, BankAccount } = require('../models');
const bankStatementParserService = require('../services/bankStatementParserService');

exports.uploadStatement = async (req, res) => {
  try {
    const { bankAccountId } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const result = await bankStatementParserService.parseStatement(file, bankAccountId, req.user.id);
    res.status(200).json({ success: true, message: 'Statement imported successfully', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to import statement', error: error.message });
  }
};

exports.getImportHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { count, rows: imports } = await BankStatementImport.findAndCountAll({
      include: [{ model: BankAccount, as: 'bankAccount', attributes: ['id', 'bankName', 'accountName'] }],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['importedAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: { imports, pagination: { total: count, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(count / limit) } }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch import history', error: error.message });
  }
};
