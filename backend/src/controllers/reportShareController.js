/**
 * Report Share Controller
 * Handles secure report sharing with email delivery
 * Part of: Phase 2 - Report Sharing APIs
 */

const { ReportShare, User } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sendReportByEmail } = require('../services/reportScheduler');

/**
 * Create a share link and send email
 */
exports.createShareLink = async (req, res) => {
  try {
    const { reportName, reportData, sharedWith, expiryDuration = 7, message } = req.body;
    const userId = req.user.id;

    // Validation
    if (!reportName || !reportData || !sharedWith) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: reportName, reportData, sharedWith'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = sharedWith.split(',').map(e => e.trim());
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid email addresses: ${invalidEmails.join(', ')}`
      });
    }

    // Generate secure token
    const shareToken = uuidv4();

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDuration));

    // Serialize report data
    const serializedReportData = typeof reportData === 'string' 
      ? reportData 
      : JSON.stringify(reportData);

    // Create share record
    const reportShare = await ReportShare.create({
      reportName,
      reportData: serializedReportData,
      shareToken,
      expiresAt,
      sharedBy: userId,
      sharedWith,
      message: message || null,
      accessCount: 0,
      isRevoked: false,
      isActive: true
    });

    // Generate share link
    const shareLink = `${process.env.CORS_ORIGIN || 'http://localhost:8080'}/shared/${shareToken}`;

    // Send email to recipients
    try {
      await sendReportByEmail({
        to: sharedWith,
        reportName,
        shareLink,
        expiresAt,
        message,
        senderName: req.user.name
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue even if email fails - user can copy link manually
    }

    res.status(201).json({
      success: true,
      message: 'Report share link created successfully',
      data: {
        id: reportShare.id,
        shareToken,
        shareLink,
        expiresAt,
        sharedWith
      }
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create share link',
      error: error.message
    });
  }
};

/**
 * Get shared report by token (public endpoint)
 */
exports.getSharedReport = async (req, res) => {
  try {
    const { token } = req.params;

    const reportShare = await ReportShare.findOne({
      where: {
        shareToken: token,
        isActive: true,
        isRevoked: false
      },
      include: [
        {
          model: User,
          as: 'sharer',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!reportShare) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or link is invalid'
      });
    }

    // Check if expired
    const now = new Date();
    if (now > new Date(reportShare.expiresAt)) {
      return res.status(410).json({
        success: false,
        message: 'This share link has expired'
      });
    }

    // Increment access count and update last accessed
    await reportShare.update({
      accessCount: reportShare.accessCount + 1,
      lastAccessedAt: now
    });

    // Parse report data
    let parsedReportData;
    try {
      parsedReportData = JSON.parse(reportShare.reportData);
    } catch {
      parsedReportData = reportShare.reportData;
    }

    res.status(200).json({
      success: true,
      data: {
        reportName: reportShare.reportName,
        reportData: parsedReportData,
        sharedBy: reportShare.sharer,
        sharedAt: reportShare.createdAt,
        expiresAt: reportShare.expiresAt,
        message: reportShare.message,
        accessCount: reportShare.accessCount
      }
    });
  } catch (error) {
    console.error('Get shared report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shared report',
      error: error.message
    });
  }
};

/**
 * Revoke share link
 */
exports.revokeShareLink = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const reportShare = await ReportShare.findOne({
      where: {
        id,
        sharedBy: userId,
        isActive: true
      }
    });

    if (!reportShare) {
      return res.status(404).json({
        success: false,
        message: 'Report share not found or you do not have permission to revoke it'
      });
    }

    await reportShare.update({
      isRevoked: true
    });

    res.status(200).json({
      success: true,
      message: 'Share link revoked successfully'
    });
  } catch (error) {
    console.error('Revoke share link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke share link',
      error: error.message
    });
  }
};

/**
 * Get user's share history
 */
exports.getShareHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: shares } = await ReportShare.findAndCountAll({
      where: {
        sharedBy: userId,
        isActive: true
      },
      attributes: ['id', 'reportName', 'shareToken', 'sharedWith', 'expiresAt', 'accessCount', 'isRevoked', 'createdAt', 'lastAccessedAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Add status for each share
    const enrichedShares = shares.map(share => {
      const shareData = share.toJSON();
      const now = new Date();
      const isExpired = now > new Date(shareData.expiresAt);
      
      let status = 'active';
      if (shareData.isRevoked) {
        status = 'revoked';
      } else if (isExpired) {
        status = 'expired';
      }

      return {
        ...shareData,
        status,
        shareLink: `${process.env.CORS_ORIGIN || 'http://localhost:8080'}/shared/${shareData.shareToken}`
      };
    });

    res.status(200).json({
      success: true,
      data: {
        shares: enrichedShares,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get share history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch share history',
      error: error.message
    });
  }
};
