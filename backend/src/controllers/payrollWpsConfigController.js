const { PayrollWpsConfiguration } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
} = require('../utils/companyScope');

exports.list = async (req, res, next) => {
  try {
    const rows = await PayrollWpsConfiguration.findAll({
      where: companyWhere(req),
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    if (body.status !== 'INACTIVE') {
      await PayrollWpsConfiguration.update(
        { status: 'INACTIVE' },
        {
          where: {
            companyId: req.companyId,
            visaSponsorCompanyId: body.visa_sponsor_company_id || null,
            status: 'ACTIVE',
          },
        }
      );
    }
    const row = await PayrollWpsConfiguration.create(
      withCompanyId(req, {
        visaSponsorCompanyId: body.visa_sponsor_company_id,
        agentName: body.agent_name,
        agentCode: body.agent_code,
        molEstablishmentId: body.mol_establishment_id,
        molCompanyCode: body.mol_company_code,
        payerBankName: body.payer_bank_name,
        payerBankAccount: body.payer_bank_account,
        payerBankIban: body.payer_bank_iban,
        salaryCurrency: body.salary_currency || 'AED',
        defaultSalaryType: body.default_salary_type || 'BASIC',
        status: body.status || 'ACTIVE',
      })
    );
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const row = await assertRecordInCompany(PayrollWpsConfiguration, req.params.id, req);
    if (body.status === 'ACTIVE') {
      await PayrollWpsConfiguration.update(
        { status: 'INACTIVE' },
        {
          where: {
            companyId: req.companyId,
            visaSponsorCompanyId: row.visaSponsorCompanyId,
            status: 'ACTIVE',
            id: { [require('sequelize').Op.ne]: row.id },
          },
        }
      );
    }
    await row.update({
      visaSponsorCompanyId: body.visa_sponsor_company_id ?? row.visaSponsorCompanyId,
      agentName: body.agent_name ?? row.agentName,
      agentCode: body.agent_code ?? row.agentCode,
      molEstablishmentId: body.mol_establishment_id ?? row.molEstablishmentId,
      molCompanyCode: body.mol_company_code ?? row.molCompanyCode,
      payerBankName: body.payer_bank_name ?? row.payerBankName,
      payerBankAccount: body.payer_bank_account ?? row.payerBankAccount,
      payerBankIban: body.payer_bank_iban ?? row.payerBankIban,
      salaryCurrency: body.salary_currency ?? row.salaryCurrency,
      defaultSalaryType: body.default_salary_type ?? row.defaultSalaryType,
      status: body.status ?? row.status,
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
