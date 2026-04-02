const { DocumentNumbering } = require('../models');

/**
 * Service to generate document numbers based on dynamic templates defined in Settings.
 */
class DocumentNumberingService {
  /**
   * Generates a new sequential number based on an attached configuration pattern.
   * If a template exists, it atomically locks the row, increments the ID, and formats the output.
   *
   * @param {string} documentName - e.g., "Purchase Order", "Lease", "Legal", etc.
   * @param {object} transaction - Mandatory Sequelize transaction object to ensure atomic locks.
   * @returns {Promise<string|null>} - Returns the formatted Document ID string, or null if no template exists.
   */
  async generateDocumentNumber(documentName, transaction) {
    if (!transaction) {
      throw new Error('Transaction is required for generating a Document Number to guarantee sequence safety.');
    }

    // Find active config; use row-level update lock
    let config = await DocumentNumbering.findOne({
      where: { documentName, isActive: true },
      lock: transaction.LOCK.UPDATE,
      transaction: transaction
    });

    // If no explicit UI settings template exists, return null so the parent can fallback to generic algorithms.
    if (!config) {
      return null;
    }

    let currentNumber = config.currentNumber || 0;
    const currentYear = new Date().getFullYear();
    const configYear = config.year;

    // Yearwise serial check
    if (config.yearwiseSerial) {
      if (!configYear || configYear !== currentYear) {
        currentNumber = 0;
        config.year = currentYear;
      }
    }

    // Increment
    currentNumber += 1;

    // Check Range limits
    if (config.rangeTo && currentNumber > config.rangeTo) {
      throw new Error(`The document numbering sequence for '${documentName}' has reached its maximum configured range (${config.rangeTo}).`);
    }

    config.currentNumber = currentNumber;
    await config.save({ transaction });

    // Formatting string
    let serialStr = String(currentNumber);
    
    // Pad to 4 digits by default if it's small to keep alignment clean
    if (serialStr.length < 4) {
      serialStr = serialStr.padStart(4, '0');
    }

    let generatedNumber = '';
    if (config.prefix) generatedNumber += `${config.prefix}-`;
    if (config.yearwiseSerial) generatedNumber += `${config.year}-`;
    generatedNumber += serialStr;
    if (config.suffix) generatedNumber += `-${config.suffix}`;

    return generatedNumber;
  }
}

module.exports = new DocumentNumberingService();
