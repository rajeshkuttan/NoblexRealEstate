const csv = require('csv-parser');
const XLSX = require('xlsx');
const { BankStatementImport, BankTransaction, BankAccount } = require('../models');

class BankStatementParserService {
  async parseStatement(file, bankAccountId, userId) {
    const importRecord = await BankStatementImport.create({
      bankAccountId,
      fileName: file.originalname,
      fileType: this.getFileType(file.originalname),
      fileSize: file.size,
      importedBy: userId,
      status: 'processing'
    });

    try {
      const transactions = await this.parseFile(file, importRecord.fileType);
      let imported = 0, duplicates = 0, failed = 0;

      for (const txn of transactions) {
        try {
          const exists = await BankTransaction.findOne({
            where: {
              bankAccountId,
              transactionDate: txn.date,
              amount: txn.amount,
              reference: txn.reference
            }
          });

          if (exists) {
            duplicates++;
          } else {
            await BankTransaction.create({
              bankAccountId,
              transactionDate: txn.date,
              transactionType: txn.type,
              amount: txn.amount,
              balance: txn.balance,
              description: txn.description,
              reference: txn.reference,
              category: txn.category || 'uncategorized'
            });
            imported++;
          }
        } catch (error) {
          failed++;
        }
      }

      await importRecord.update({
        status: failed > 0 ? 'partially_completed' : 'completed',
        totalTransactions: transactions.length,
        importedTransactions: imported,
        duplicateTransactions: duplicates,
        failedTransactions: failed,
        processedAt: new Date()
      });

      return { success: true, imported, duplicates, failed };
    } catch (error) {
      await importRecord.update({ status: 'failed', errorLog: error.message });
      throw error;
    }
  }

  async parseFile(file, fileType) {
    switch (fileType) {
      case 'csv': return this.parseCSV(file.buffer);
      case 'xlsx': return this.parseExcel(file.buffer);
      default: throw new Error('Unsupported file type');
    }
  }

  parseCSV(buffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = require('stream');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(buffer);
      
      bufferStream
        .pipe(csv())
        .on('data', (data) => results.push(this.normalizeTransaction(data)))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  parseExcel(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    return data.map(row => this.normalizeTransaction(row));
  }

  normalizeTransaction(row) {
    return {
      date: new Date(row.date || row.Date || row.DATE),
      type: (row.type || row.Type || row.TYPE || 'debit').toLowerCase(),
      amount: parseFloat(row.amount || row.Amount || row.AMOUNT || 0),
      balance: parseFloat(row.balance || row.Balance || row.BALANCE || 0),
      description: row.description || row.Description || row.DESCRIPTION || '',
      reference: row.reference || row.Reference || row.REFERENCE || '',
      category: row.category || row.Category || null
    };
  }

  getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return ['csv', 'xlsx', 'xls'].includes(ext) ? (ext === 'xls' ? 'xlsx' : ext) : 'csv';
  }
}

module.exports = new BankStatementParserService();
