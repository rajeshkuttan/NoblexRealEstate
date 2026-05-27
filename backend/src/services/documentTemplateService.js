const { CompanyDocumentTemplate, CompanySetting } = require('../models');

/**
 * @param {number} companyId
 * @param {string} documentType
 * @param {object} [companyRow] - optional preloaded company_settings row
 */
async function getTemplate(companyId, documentType, companyRow = null) {
  const company =
    companyRow ||
    (await CompanySetting.findByPk(companyId, {
      attributes: [
        'id',
        'companyName',
        'taxNumber',
        'vatNumber',
        'address',
        'city',
        'country',
        'phone',
        'email',
        'logo',
      ],
    }));

  const template = await CompanyDocumentTemplate.findOne({
    where: { companyId, documentType },
  });

  return {
    company: company
      ? {
          id: company.id,
          name: company.companyName,
          trn: company.taxNumber || company.vatNumber,
          address: company.address,
          city: company.city,
          country: company.country,
          phone: company.phone,
          email: company.email,
          logo: company.logo,
        }
      : null,
    template: template
      ? {
          documentType: template.documentType,
          headerTemplate: template.headerTemplate,
          footerTemplate: template.footerTemplate,
          logo: template.logo,
          signature: template.signature,
          stamp: template.stamp,
          showTrn: template.showTrn,
          showBank: template.showBank,
          watermark: template.watermark,
          showCompanyAddress: template.showCompanyAddress,
        }
      : {
          documentType,
          headerTemplate: null,
          footerTemplate: null,
          logo: null,
          signature: null,
          stamp: null,
          showTrn: true,
          showBank: true,
          watermark: null,
          showCompanyAddress: true,
        },
    displayName: company?.companyName || 'Company',
    displayLogo: template?.logo || company?.logo || null,
  };
}

module.exports = { getTemplate };
