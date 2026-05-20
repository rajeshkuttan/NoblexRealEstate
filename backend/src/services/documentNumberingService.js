const { DocumentNumbering, Property, Unit, Lease, PurchaseOrder, GoodsReceipt, Invoice, Payment, Ticket } = require('../models');

/**
 * Service to generate document numbers based on dynamic templates defined in Settings.
 */
class DocumentNumberingService {
  normalizeManualDocumentNumber(value) {
    if (value == null) return null;

    const normalized = String(value).trim();
    if (!normalized) return null;

    if (normalized.toLowerCase().includes('auto-generated')) {
      return null;
    }

    return normalized;
  }

  async getActiveConfiguration(documentName, transaction) {
    return DocumentNumbering.findOne({
      where: { documentName, isActive: true },
      lock: transaction ? transaction.LOCK.UPDATE : undefined,
      transaction: transaction || undefined
    });
  }

  async resolvePlotNumber(context = {}, transaction) {
    const directPlot = context.plotNumber != null ? String(context.plotNumber).trim() : '';
    if (directPlot) return directPlot;

    const directPropertyId = context.propertyId || context.deliveryPropertyId;
    if (directPropertyId) {
      const property = await Property.findByPk(directPropertyId, { transaction });
      if (property?.plotNumber) return String(property.plotNumber).trim();
    }

    const unitId = context.unitId || context.deliveryUnitId;
    if (unitId) {
      const unit = await Unit.findByPk(unitId, { transaction });
      if (unit?.propertyId) {
        const property = await Property.findByPk(unit.propertyId, { transaction });
        if (property?.plotNumber) return String(property.plotNumber).trim();
      }
    }

    if (context.leaseId) {
      const lease = await Lease.findByPk(context.leaseId, { transaction });
      if (lease?.unitId) {
        const unit = await Unit.findByPk(lease.unitId, { transaction });
        if (unit?.propertyId) {
          const property = await Property.findByPk(unit.propertyId, { transaction });
          if (property?.plotNumber) return String(property.plotNumber).trim();
        }
      }
    }

    if (context.purchaseOrderId) {
      const po = await PurchaseOrder.findByPk(context.purchaseOrderId, { transaction });
      if (po) {
        return this.resolvePlotNumber(
          {
            propertyId: po.propertyId,
            unitId: po.unitId,
            leaseId: po.leaseId,
          },
          transaction
        );
      }
    }

    if (context.goodsReceiptId) {
      const gr = await GoodsReceipt.findByPk(context.goodsReceiptId, { transaction });
      if (gr) {
        return this.resolvePlotNumber(
          {
            propertyId: gr.deliveryPropertyId,
            unitId: gr.deliveryUnitId,
            purchaseOrderId: gr.purchaseOrderId,
          },
          transaction
        );
      }
    }

    if (Array.isArray(context.goodsReceiptIds) && context.goodsReceiptIds.length > 0) {
      return this.resolvePlotNumber({ goodsReceiptId: context.goodsReceiptIds[0] }, transaction);
    }

    if (context.invoiceId) {
      const invoice = await Invoice.findByPk(context.invoiceId, { transaction });
      if (invoice?.leaseId) {
        return this.resolvePlotNumber({ leaseId: invoice.leaseId }, transaction);
      }
    }

    if (context.paymentId) {
      const payment = await Payment.findByPk(context.paymentId, { transaction });
      if (payment?.leaseId) {
        return this.resolvePlotNumber({ leaseId: payment.leaseId }, transaction);
      }
    }

    if (context.ticketId) {
      const ticket = await Ticket.findByPk(context.ticketId, { transaction });
      if (ticket?.unitId) {
        return this.resolvePlotNumber({ unitId: ticket.unitId }, transaction);
      }
    }

    return null;
  }
  /**
   * Generates a new sequential number based on an attached configuration pattern.
   * If a template exists, it atomically locks the row, increments the ID, and formats the output.
   *
   * @param {string} documentName - e.g., "Purchase Order", "Lease", "Legal", etc.
   * @param {object} transaction - Mandatory Sequelize transaction object to ensure atomic locks.
   * @returns {Promise<string|null>} - Returns the formatted Document ID string, or null if no template exists.
   */
  async generateDocumentNumber(documentName, transaction, context = {}) {
    if (!transaction) {
      throw new Error('Transaction is required for generating a Document Number to guarantee sequence safety.');
    }

    // Find active config; use row-level update lock
    let config = await this.getActiveConfiguration(documentName, transaction);

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
    if (config.includePlotNumber) {
      const plotNumber = await this.resolvePlotNumber(context, transaction);
      if (plotNumber) {
        generatedNumber += `${plotNumber}-`;
      }
    }
    generatedNumber += serialStr;
    if (config.suffix) generatedNumber += `-${config.suffix}`;

    return generatedNumber;
  }
}

module.exports = new DocumentNumberingService();
