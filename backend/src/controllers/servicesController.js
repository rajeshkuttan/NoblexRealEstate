const Service = require('../models/Service');
const { sequelize } = require('../config/database');

// Get all services for a specific entity (unit or lease)
exports.getServicesByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.query;

    if (!entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Both entityType and entityId are required'
      });
    }

    if (!['unit', 'lease'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entityType. Must be "unit" or "lease"'
      });
    }

    const services = await Service.findAll({
      where: {
        entityType,
        entityId: parseInt(entityId),
        isActive: true
      },
      order: [['sortOrder', 'ASC'], ['created_at', 'ASC']]
    });

    res.json({
      success: true,
      data: {
        services,
        count: services.length
      }
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services',
      error: error.message
    });
  }
};

// Get a single service by ID
exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: { service }
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service',
      error: error.message
    });
  }
};

// Create a new service
exports.createService = async (req, res) => {
  try {
    const {
      name,
      amount,
      isTaxable,
      billingMethod,
      entityType,
      entityId,
      description,
      sortOrder
    } = req.body;

    // Validation
    if (!name || amount === undefined || !entityType || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, amount, entityType, entityId'
      });
    }

    if (!['unit', 'lease'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entityType. Must be "unit" or "lease"'
      });
    }

    if (!['included_in_rental', 'charged_separately'].includes(billingMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billingMethod. Must be "included_in_rental" or "charged_separately"'
      });
    }

    const service = await Service.create({
      name,
      amount,
      isTaxable: isTaxable || false,
      billingMethod: billingMethod || 'charged_separately',
      entityType,
      entityId,
      description,
      sortOrder: sortOrder || 0,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service }
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create service',
      error: error.message
    });
  }
};

// Update a service
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      amount,
      isTaxable,
      billingMethod,
      description,
      sortOrder,
      isActive
    } = req.body;

    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Validate billingMethod if provided
    if (billingMethod && !['included_in_rental', 'charged_separately'].includes(billingMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid billingMethod. Must be "included_in_rental" or "charged_separately"'
      });
    }

    // Update fields
    if (name !== undefined) service.name = name;
    if (amount !== undefined) service.amount = amount;
    if (isTaxable !== undefined) service.isTaxable = isTaxable;
    if (billingMethod !== undefined) service.billingMethod = billingMethod;
    if (description !== undefined) service.description = description;
    if (sortOrder !== undefined) service.sortOrder = sortOrder;
    if (isActive !== undefined) service.isActive = isActive;

    await service.save();

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { service }
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update service',
      error: error.message
    });
  }
};

// Delete a service (soft delete by setting isActive to false)
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query; // Optional hard delete flag

    const service = await Service.findByPk(id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    if (hard === 'true') {
      // Hard delete - permanently remove from database
      await service.destroy();
      res.json({
        success: true,
        message: 'Service permanently deleted'
      });
    } else {
      // Soft delete - just mark as inactive
      service.isActive = false;
      await service.save();
      res.json({
        success: true,
        message: 'Service deleted successfully'
      });
    }
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete service',
      error: error.message
    });
  }
};

// Copy services from unit to lease
exports.copyUnitServicesToLease = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { unitId, leaseId } = req.body;

    if (!unitId || !leaseId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Both unitId and leaseId are required'
      });
    }

    // Get all active services from the unit
    const unitServices = await Service.findAll({
      where: {
        entityType: 'unit',
        entityId: unitId,
        isActive: true
      },
      order: [['sortOrder', 'ASC']],
      transaction
    });

    if (unitServices.length === 0) {
      await transaction.commit();
      return res.json({
        success: true,
        message: 'No services found for the unit',
        data: { services: [], count: 0 }
      });
    }

    // Create new services for the lease
    const leaseServices = await Promise.all(
      unitServices.map(async (unitService) => {
        return await Service.create({
          name: unitService.name,
          amount: unitService.amount,
          isTaxable: unitService.isTaxable,
          billingMethod: unitService.billingMethod,
          entityType: 'lease',
          entityId: leaseId,
          description: unitService.description,
          sortOrder: unitService.sortOrder,
          isActive: true
        }, { transaction });
      })
    );

    await transaction.commit();

    res.json({
      success: true,
      message: `Successfully copied ${leaseServices.length} service(s) to the lease`,
      data: {
        services: leaseServices,
        count: leaseServices.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error copying services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to copy services from unit to lease',
      error: error.message
    });
  }
};

// Bulk create services
exports.bulkCreateServices = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { services, entityType, entityId } = req.body;

    if (!services || !Array.isArray(services) || services.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Services array is required and must not be empty'
      });
    }

    if (!entityType || !entityId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Both entityType and entityId are required'
      });
    }

    // Create all services
    const createdServices = await Promise.all(
      services.map(async (service, index) => {
        return await Service.create({
          name: service.name,
          amount: service.amount,
          isTaxable: service.isTaxable || false,
          billingMethod: service.billingMethod || 'charged_separately',
          entityType,
          entityId,
          description: service.description,
          sortOrder: service.sortOrder !== undefined ? service.sortOrder : index,
          isActive: true
        }, { transaction });
      })
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdServices.length} service(s)`,
      data: {
        services: createdServices,
        count: createdServices.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error bulk creating services:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create services',
      error: error.message
    });
  }
};
